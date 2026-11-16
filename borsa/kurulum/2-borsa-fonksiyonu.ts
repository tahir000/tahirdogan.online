// Borsa Tahtası: Borsa MCP aktarıcısı ve ortak fiyat deposu (Supabase Edge Function, adı "borsa").
//
// Sayfa Borsa MCP sunucusunu doğrudan çağıramaz, çünkü sunucu web sayfalarından gelen isteklere izin vermiyor.
// Bu işlev üç iş yapar:
//   1. Aktarma: giriş yapmış kullanıcının isteğini sunucuya iletir ({tool, input}).
//   2. Fiyat deposu: günlük fiyat geçmişini ve son fiyatları veritabanında tutar; ikinci isteyen beklemez
//      ({tool: "gecmis"} ve {tool: "kot"}).
//   3. Cihaz özeti: telefondaki bildirim denetimi ve ana ekran bileşeni, uygulama kapalıyken cihaz anahtarıyla
//      portföy özetini ve fiyat seviyelerinin durumunu ister ({cihaz: "..."}).
//
// İşlev "Verify JWT" kapalı yayınlanır: kimliği kendisi denetler (kullanıcı oturumu ya da cihaz anahtarı).
// Dosya bilerek düz JavaScript yazıldı; tür bildirimi yoktur.
// deno-lint-ignore-file

const KAYNAK = "https://borsa.surucu.dev/mcp";

// Sayfanın kullandığı araçlar. Listede olmayan araç çağrılamaz.
const IZINLI = new Set([
  "get_quote",
  "get_historical_data",
  "get_financial_ratios",
  "get_corporate_actions",
  "get_analyst_data",
  "get_earnings",
  "get_sector_comparison",
  "scan_stocks",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Max-Age": "86400",
};

const TABAN = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
// Sunucu yetkisi: değer Supabase tarafından işleve verilir, hiçbir dosyaya yazılmaz.
const SERVIS = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
const SEMBOL = /^[A-Z0-9]{2,6}$/;
const PARCA = 28;      // sunucu bir aydan uzun aralıkları haftalık veriye çevirir; geçmiş 28 günlük parçalarla alınır
const HEDEF = 720;     // tutulan geçmiş (gün)
const DAKIKA_SINIRI = 240;

function yanit(durum, govde) {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
const bugunIST = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const gunEkle = (t, n) => { const d = new Date(t + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const yuv = (x) => Math.round(x * 1e4) / 1e4;
function piyasaAcik() {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
  const al = (t) => (p.find((x) => x.type === t) || {}).value || "";
  const dk = Number(al("hour")) * 60 + Number(al("minute"));
  return !["Sat", "Sun"].includes(al("weekday")) && dk >= 9 * 60 + 55 && dk <= 18 * 60 + 15;
}

/* ---------- Veritabanı (sunucu yetkisiyle) ---------- */
function db(yol, secenek) {
  const s = secenek || {};
  return fetch(TABAN + "/rest/v1/" + yol, {
    ...s,
    headers: { apikey: SERVIS, Authorization: "Bearer " + SERVIS, "Content-Type": "application/json", ...(s.headers || {}) },
    signal: AbortSignal.timeout(10000),
  });
}
async function rpc(ad, govde) {
  const r = await db("rpc/" + ad, { method: "POST", body: JSON.stringify(govde) });
  if (!r.ok) { console.log(JSON.stringify({ olay: "db-hata", ad, durum: r.status })); return { ok: false, veri: null }; }
  let veri = null; try { veri = await r.json(); } catch (_e) { /* boş yanıt */ }
  return { ok: true, veri };
}
// Her istekte bir kez: dakikalık istek sınırı ve veri kaynağının durumu tek sorguda okunur.
// Kapı çalışmazsa (eski kurulum, veritabanı hatası) istek engellenmez; aktarma sürer.
let kapaliKadar = 0;     // bu zamana kadar kaynağa gidilmez
let arizali = false;     // son denemeler başarısızdı: ilk başarıda durum sıfırlanır
async function kapi(kim, sinir) {
  if (!SERVIS) return true;
  try {
    const q = await rpc("istek_kapisi", { p_kim: kim, p_sinir: sinir });
    if (!q.ok || !q.veri || typeof q.veri !== "object") return true;
    kapaliKadar = q.veri.kapali > 0 ? Date.now() + q.veri.kapali * 1000 : 0;
    arizali = q.veri.ariza > 0;
    return q.veri.izin !== false;
  } catch (_e) { return true; }
}
async function bildir(tamam) {
  if (!SERVIS) return 0;
  try { const q = await rpc("kaynak_bildir", { p_tamam: tamam }); return q.ok && typeof q.veri === "number" ? q.veri : 0; } catch (_e) { return 0; }
}
const kaynakKapali = () => Date.now() < kapaliKadar;

/* ---------- Borsa MCP çağrısı ---------- */
// Kaynak yoğun saatlerde hiç yanıt vermeyebiliyor. Bu yüzden:
//   - istek araca göre 10 ile 25 saniyede kesilir ve yeniden denenmez (yeniden denemeyi sayfa yapar);
//   - zaman aşımı ya da 5xx yanıtta kaynak kısa bir süre "kapalı" sayılır: o sürede buraya hiç gelinmez,
//     çağıran eldeki son veriyi verir. Süre her başarısızlıkta uzar, ilk başarıda sıfırlanır (kurulum/6).
// Hatalar kayda yazılır (Edge Functions, borsa, Logs); kayıtta kullanıcı bilgisi yoktur.
const SURE = { get_quote: 10000, get_historical_data: 15000, scan_stocks: 25000 };
async function kaynak(tool, input) {
  if (kaynakKapali()) return { ok: false, durum: 503, govde: { hata: "kaynak-kapali", tekrar: Math.ceil((kapaliKadar - Date.now()) / 1000) } };
  const govde = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: tool, arguments: input } });
  const bas = Date.now();
  let r = null, metin = "";
  try {
    r = await fetch(KAYNAK, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
      body: govde,
      signal: AbortSignal.timeout(SURE[tool] || 15000),
    });
    metin = await r.text();
  } catch (e) {
    r = null;
    console.log(JSON.stringify({ olay: "kaynak-hata", arac: tool, ms: Date.now() - bas, hata: String((e && e.name) || e) + ": " + String((e && e.message) || "").slice(0, 160) }));
  }
  if (!r || r.status >= 500) {
    if (r) console.log(JSON.stringify({ olay: "kaynak-durum", arac: tool, durum: r.status, ms: Date.now() - bas, govde: metin.slice(0, 160) }));
    const sn = await bildir(false);
    kapaliKadar = Math.max(kapaliKadar, Date.now() + Math.max(sn, 20) * 1000);
    arizali = true;
    return r ? { ok: false, durum: 502, govde: { hata: "kaynak", durum: r.status } } : { ok: false, durum: 504, govde: { hata: "kaynak-zaman" } };
  }
  if (!r.ok) {
    console.log(JSON.stringify({ olay: "kaynak-durum", arac: tool, durum: r.status, ms: Date.now() - bas, govde: metin.slice(0, 160) }));
    return { ok: false, durum: 502, govde: { hata: "kaynak", durum: r.status } };
  }
  if (arizali) { arizali = false; kapaliKadar = 0; await bildir(true); }

  // Sunucu yanıtı olay akışı (text/event-stream) ya da düz JSON olarak verebilir.
  let j = null;
  if ((r.headers.get("content-type") || "").includes("text/event-stream")) {
    for (const satir of metin.split(/\r?\n/)) {
      if (!satir.startsWith("data:")) continue;
      try {
        const o = JSON.parse(satir.slice(5).trim());
        if (o && (o.result !== undefined || o.error !== undefined)) j = o;
      } catch (_e) { /* yarım satır: geç */ }
    }
  } else {
    try { j = JSON.parse(metin); } catch (_e) { /* aşağıda ele alınır */ }
  }
  if (!j) {
    console.log(JSON.stringify({ olay: "kaynak-bicim", arac: tool, tur: r.headers.get("content-type"), govde: metin.slice(0, 160) }));
    return { ok: false, durum: 502, govde: { hata: "kaynak-bicim" } };
  }
  if (j.error) {
    console.log(JSON.stringify({ olay: "kaynak-jsonrpc", arac: tool, hata: String(j.error.message || "").slice(0, 160) }));
    return { ok: false, durum: 502, govde: { hata: "kaynak", ayrinti: String(j.error.message || "").slice(0, 200) } };
  }
  return { ok: true, sonuc: j.result || {} };
}
const metinOf = (r) => (r && Array.isArray(r.content) ? r.content.filter((b) => b && b.type === "text").map((b) => b.text).join("\n") : "");

/* ---------- Yanıt ayrıştırma (sayfadaki ayrıştırıcının aynısı) ---------- */
function num(v) { if (v == null) return null; if (typeof v === "number") return isFinite(v) ? v : null; const s = String(v).trim(); if (!s) return null; const n = Number(s); return isFinite(n) ? n : null; }
function parseBorsa(p) {
  const out = { sec: {}, rows: [], tab: {} };
  let sec = "_", tsv = false, head = null;
  for (const raw of String(p == null ? "" : p).split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (line.startsWith("```")) { tsv = !tsv; head = null; continue; }
    if (tsv) {
      if (!line) continue;
      const cells = line.split("\t");
      if (!head) { head = cells.map((c) => c.trim()); continue; }
      const o = {}; head.forEach((h, i) => { o[h] = cells[i] === undefined ? "" : cells[i].trim(); });
      out.rows.push(o); (out.tab[sec] = out.tab[sec] || []).push(o); continue;
    }
    const h = line.match(/^#{2,4}\s+(.+)$/); if (h) { sec = h[1].trim(); continue; }
    const kv = line.match(/^([A-Za-z0-9_ .\-]+):\s*(.*)$/); if (kv) (out.sec[sec] = out.sec[sec] || {})[kv[1].trim()] = kv[2].trim();
  }
  return out;
}
function toBars(rows) {
  const m = new Map();
  for (const r of rows) {
    const t = String(r.date != null ? r.date : r.Date != null ? r.Date : r.tarih != null ? r.tarih : "").slice(0, 10);
    const c = num(r.close != null ? r.close : r.Close);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || c == null || c <= 0) continue;
    const o = num(r.open != null ? r.open : r.Open), h = num(r.high != null ? r.high : r.High), l = num(r.low != null ? r.low : r.Low), v = num(r.volume != null ? r.volume : r.Volume);
    const oo = o == null ? c : o;
    m.set(t, { t, o: oo, h: Math.max(h == null ? c : h, oo, c), l: Math.min(l == null ? c : l, oo, c), c, v: v == null ? 0 : v });
  }
  return Array.from(m.values()).sort((a, b) => (a.t < b.t ? -1 : 1));
}
function seyrekMi(bars) {
  if (bars.length < 4) return false;
  const f = []; for (let i = 1; i < bars.length; i++) f.push((Date.parse(bars[i].t) - Date.parse(bars[i - 1].t)) / 864e5);
  f.sort((a, b) => a - b); return f[Math.floor(f.length / 2)] > 4;
}
// Bir geçmiş yanıtını hisselere ayırır. Günlük olmayan (haftalık, aylık) yanıt hata sayılır.
function parcaAyir(ham, grup) {
  const P = parseBorsa(ham), rows = P.tab.data || P.rows, out = {}, yok = new Set(), gecersiz = new Set();
  const ara = String((P.sec.data && P.sec.data.bar_interval) || "").toLowerCase();
  if (ara && ara !== "daily") throw new Error("seyrek");
  if (rows.length && rows[0].data !== undefined) {
    rows.forEach((x) => {
      const s = String(x.symbol || "").toUpperCase(); let L = null;
      try { L = JSON.parse(String(x.data).replace(/\b(NaN|Infinity|-Infinity)\b/g, "null")); } catch (_e) { /* geç */ }
      if (Array.isArray(L)) out[s] = toBars(L);
    });
  } else {
    // İstenen hisselerden yalnızca biri veri döndürdüyse yanıt tek hisse biçimine geçer: hisse adı "data" bölümünde yazar.
    const tek = String((P.sec.data && P.sec.data.symbol) || (grup.length === 1 ? grup[0] : "")).toUpperCase();
    if (tek && rows.length) out[tek] = toBars(rows);
  }
  Object.keys(out).forEach((s) => { if (seyrekMi(out[s])) throw new Error("seyrek"); });
  const re = /^> Not: ([A-Z0-9]{2,6}): (.*)$/gm; let m;
  while ((m = re.exec(ham))) { if (/No data found/.test(m[2])) yok.add(m[1]); else gecersiz.add(m[1]); }     // o aralıkta verisi olmayan ve tanınmayan hisseler
  return { out, yok, gecersiz };
}

/* ---------- Fiyat geçmişi deposu ---------- */
const cubukNesne = (bars) => { const o = {}; bars.forEach((b) => { o[b.t] = [yuv(b.o), yuv(b.h), yuv(b.l), yuv(b.c), Math.round(b.v)]; }); return o; };
const parcala = (L, n) => { const out = []; for (let i = 0; i < L.length; i += n) out.push(L.slice(i, i + n)); return out; };

async function pencere(grup, a, e) {
  // Tek hissede yanıt biçimi değişiyor; çoklu biçimde kalmak için endeks eklenir.
  const cagri = grup.length === 1 && grup[0] !== "XU100" ? grup.concat("XU100") : grup;
  const q = await kaynak("get_historical_data", { symbol: cagri, market: "bist", start_date: a, end_date: e });
  if (!q.ok || q.sonuc.isError) return null;
  try { return parcaAyir(metinOf(q.sonuc), cagri); } catch (_e) { return null; }
}

// Depoyu okur, eskimişse bugünü içeren parçayı yeniler, süre yettiğince geriye doğru doldurur.
// Döndürdüğü: sembol -> {ilk, son, dip, taze, b}, ayrıca veri alınamayan ve hiç verisi olmayan hisseler.
async function gecmisGetir(syms, bitis, yalnizTaze) {
  const bugun = bugunIST(), hedef = gunEkle(bugun, -HEDEF), kayit = new Map(), hata = new Set(), bos = new Set();
  const r = await db("gecmis?sembol=in.(" + syms.join(",") + ")&select=sembol,ilk,son,dip,taze,b");
  if (!r.ok) throw new Error("depo");
  for (const x of await r.json()) kayit.set(x.sembol, { ilk: x.ilk, son: x.son, dip: !!x.dip, taze: Date.parse(x.taze) || 0, b: x.b || {} });

  const yaz = async (satirlar) => {
    if (!satirlar.length) return;
    const q = await rpc("gecmis_yaz", { satirlar });
    if (!q.ok) { satirlar.forEach((s) => hata.add(s.sembol)); return; }
    for (const s of satirlar) {
      const k = kayit.get(s.sembol) || { ilk: s.ilk, son: s.son, dip: false, taze: 0, b: {} };
      Object.assign(k.b, s.b);
      if (s.ilk < k.ilk) k.ilk = s.ilk;
      if (s.son > k.son) k.son = s.son;
      k.dip = k.dip || !!s.dip;
      if (s.taze) k.taze = Math.max(k.taze, Date.parse(s.taze));
      kayit.set(s.sembol, k);
    }
  };

  // Uzun süredir istenmemiş kayıt baştan başlar; yoksa eski veriyle yeni parça arasında boşluk kalırdı.
  const eski = syms.filter((s) => kayit.has(s) && kayit.get(s).son < gunEkle(bugun, -(PARCA - 4)));
  if (eski.length) { await rpc("gecmis_sifirla", { p_semboller: eski }); eski.forEach((s) => kayit.delete(s)); }

  // Bugünü içeren parça: seans sürerken 15 dakikada, kapalıyken saatte bir yenilenir.
  const omur = piyasaAcik() ? 15 * 60e3 : 60 * 60e3, simdi = Date.now(), a0 = gunEkle(bugun, -(PARCA - 1));
  const tazeIst = syms.filter((s) => { const k = kayit.get(s); return !k || k.son < bugun || simdi - k.taze > omur; });
  await Promise.all(parcala(tazeIst, 10).map(async (grup) => {
    const q = await pencere(grup, a0, bugun);
    if (!q) { grup.forEach((s) => { if (!kayit.has(s)) hata.add(s); }); return; }
    const satirlar = [];
    for (const s of grup) {
      const k = kayit.get(s); let bars = q.out[s];
      if (!bars && q.yok.has(s)) bars = [];
      if (!bars && q.gecersiz.has(s)) { if (!k) bos.add(s); continue; }     // kaynağın tanımadığı sembol
      if (!bars) { if (!k) hata.add(s); continue; }
      if (!bars.length && !k) { bos.add(s); continue; }
      satirlar.push({ sembol: s, ilk: k ? k.ilk : a0, son: bugun, dip: false, taze: new Date().toISOString(), b: cubukNesne(bars) });
    }
    await yaz(satirlar);
  }));

  // Geriye doldurma: aynı başlangıç tarihini paylaşan hisseler birlikte, üç parça yan yana istenir.
  while (!yalnizTaze && Date.now() < bitis) {
    const aday = syms.filter((s) => { const k = kayit.get(s); return k && !k.dip && k.ilk > hedef && !hata.has(s); });
    if (!aday.length) break;
    const say = new Map(); aday.forEach((s) => { const i = kayit.get(s).ilk; say.set(i, (say.get(i) || 0) + 1); });
    const ilk = Array.from(say.entries()).sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? 1 : -1))[0][0];
    const grup = aday.filter((s) => kayit.get(s).ilk === ilk).slice(0, 10);
    const P = [0, 1, 2].filter((i) => gunEkle(ilk, -i * PARCA) > hedef).map((i) => [gunEkle(ilk, -(i + 1) * PARCA), gunEkle(ilk, -i * PARCA - 1)]);
    const sonuc = await Promise.all(P.map((p) => pencere(grup, p[0], p[1])));
    const satirlar = [];
    for (const s of grup) {
      const k = kayit.get(s), b = {}; let yeniIlk = k.ilk, dip = false, ilerledi = false;
      for (let i = 0; i < P.length; i++) {            // yeniden eskiye; ilk hatada dur ki kapsanan dönem kesintisiz kalsın
        const q = sonuc[i]; if (!q) break;
        const bars = q.out[s];
        if (!bars) { if (q.yok.has(s)) dip = true; break; }
        if (!bars.length) { dip = true; break; }
        Object.assign(b, cubukNesne(bars)); yeniIlk = P[i][0]; ilerledi = true;
      }
      if (ilerledi || dip) satirlar.push({ sembol: s, ilk: yeniIlk, son: k.son, dip, taze: null, b });
      else hata.add(s);
    }
    await yaz(satirlar);
  }
  return { bugun, hedef, kayit, hata, bos };
}

/* ---------- Son fiyatlar ---------- */
async function kotGetir(syms, omur) {
  const out = {}, zaman = {}, eskiler = {}, simdi = Date.now();
  const r = await db("kotasyon?sembol=in.(" + syms.join(",") + ")&select=sembol,veri,zaman");
  if (r.ok) for (const x of await r.json()) { if (simdi - Date.parse(x.zaman) < omur) { out[x.sembol] = x.veri; zaman[x.sembol] = Date.parse(x.zaman); } else eskiler[x.sembol] = x; }
  const eksik = syms.filter((s) => !out[s] && s !== "XU100");
  await Promise.all(parcala(eksik, 10).map(async (grup) => {
    const q = await kaynak("get_quote", { symbol: grup, market: "bist" });
    if (!q.ok || q.sonuc.isError) return;
    const P = parseBorsa(metinOf(q.sonuc)); let rows = P.rows;
    if (!rows.length && P.sec.data && P.sec.data.symbol) rows = [P.sec.data];     // tek hissede yanıt tablo değil
    const yeni = [];
    for (const x of rows) {
      const s = String(x.symbol || "").toUpperCase(), f = num(x.current_price);
      if (!SEMBOL.test(s) || f == null) continue;
      out[s] = { f, fk: num(x.pe_ratio), pddd: num(x.pb_ratio), z52: num(x.week_52_high), d52: num(x.week_52_low), pd: num(x.market_cap), tem: num(x.dividend_yield), hacim: num(x.volume) };
      zaman[s] = Date.now();
      yeni.push({ sembol: s, veri: out[s], zaman: new Date().toISOString() });
    }
    if (yeni.length) await db("kotasyon", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(yeni) });
  }));
  // Kaynak yanıt vermediyse eldeki son fiyat verilir; ne zamandan kaldığı da bildirilir.
  syms.forEach((s) => { if (!out[s] && eskiler[s]) { out[s] = eskiler[s].veri; zaman[s] = Date.parse(eskiler[s].zaman); } });
  const zs = Object.values(zaman).filter((z) => z > 0);
  return { veri: out, enEski: zs.length ? new Date(Math.min(...zs)).toISOString() : null };
}

/* ---------- Aktarılan yanıtların önbelleği ---------- */
// Sık değişmeyen yanıtlar saklanır: süresi dolmamışsa kaynağa gidilmez, kaynak yanıt vermiyorsa eskisi verilir.
// Fiyat geçmişi burada tutulmaz; onun kendi deposu var.
const OMUR = {
  get_quote: 60e3,
  scan_stocks: 10 * 60e3,
  get_financial_ratios: 12 * 3600e3,
  get_corporate_actions: 12 * 3600e3,
  get_analyst_data: 12 * 3600e3,
  get_earnings: 12 * 3600e3,
  get_sector_comparison: 12 * 3600e3,
};
function kararli(v) {      // anahtarları sıralı JSON: aynı girdi hep aynı anahtarı versin
  if (Array.isArray(v)) return "[" + v.map(kararli).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + kararli(v[k])).join(",") + "}";
  return JSON.stringify(v);
}
async function aktar(tool, input) {
  const omur = SERVIS ? OMUR[tool] : 0;
  let anahtar = "", eski = null;
  if (omur) {
    try {
      anahtar = await sha256Hex(tool + "|" + kararli(input));
      const r = await db("onbellek?anahtar=eq." + anahtar + "&select=yanit,zaman&limit=1");
      const x = r.ok ? (await r.json())[0] : null;
      if (x) { if (Date.now() - Date.parse(x.zaman) < omur) return yanit(200, x.yanit); eski = x.yanit; }
    } catch (_e) { anahtar = ""; }
  }
  const q = await kaynak(tool, input);
  if (q.ok) {
    if (anahtar && !q.sonuc.isError) {
      try { await db("onbellek", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ anahtar, arac: tool, yanit: q.sonuc, zaman: new Date().toISOString() }]) }); } catch (_e) { /* önbellek yazılamadı: yanıt yine verilir */ }
    }
    return yanit(200, q.sonuc);
  }
  if (eski) return yanit(200, eski);
  return yanit(q.durum, q.govde);
}

/* ---------- Cihaz özeti: bildirim denetimi ve ana ekran bileşeni ---------- */
async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function cihazIstegi(anahtar) {
  if (!SERVIS || !/^[0-9a-f]{64}$/.test(anahtar)) return yanit(401, { hata: "cihaz" });
  const r = await db("cihazlar?ozet=eq." + (await sha256Hex(anahtar)) + "&select=id,user_id&limit=1");
  if (!r.ok) return yanit(503, { hata: "depo" });
  const c = (await r.json())[0];
  if (!c) return yanit(401, { hata: "cihaz" });
  if (!(await kapi("c:" + c.id, 6))) return yanit(429, { hata: "sinir" });
  db("cihazlar?id=eq." + c.id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ son_gorulme: new Date().toISOString() }) }).catch(() => {});

  const h = await db("hisseler?user_id=eq." + c.user_id + "&select=sembol,adet,maliyet,alarm_ust,alarm_alt&order=sembol&limit=60");
  if (!h.ok) return yanit(503, { hata: "depo" });
  const liste = (await h.json()).filter((x) => SEMBOL.test(x.sembol));
  const taban = { zaman: new Date().toISOString(), acik: piyasaAcik(), ozet: null, hisseler: [], alarmlar: [] };
  if (!liste.length) return yanit(200, taban);

  const syms = liste.map((x) => x.sembol);
  const [g, k2] = await Promise.all([gecmisGetir(syms, 0, true), kotGetir(syms, 3 * 60e3)]);
  const kot = k2.veri;
  taban.veriZamani = k2.enEski;
  taban.kaynak = kaynakKapali() ? "kapali" : "tamam";
  let deger = 0, gun = 0, kz = 0, mal = 0, elde = 0;
  for (const x of liste) {
    const k = g.kayit.get(x.sembol), gunler = k ? Object.keys(k.b).sort() : [];
    const son = gunler.length ? k.b[gunler[gunler.length - 1]][3] : null, once = gunler.length > 1 ? k.b[gunler[gunler.length - 2]][3] : null;
    const f = kot[x.sembol] && kot[x.sembol].f != null ? kot[x.sembol].f : son;
    if (f == null) continue;
    const adet = Number(x.adet) || 0, maliyet = Number(x.maliyet) || 0, y = once ? (f / once - 1) * 100 : null;
    if (adet > 0) {
      elde++; deger += adet * f;
      if (once) gun += adet * (f - once);
      if (maliyet > 0) { kz += adet * (f - maliyet); mal += adet * maliyet; }
    }
    taban.hisseler.push({ s: x.sembol, f, y, d: adet > 0 ? adet * f : 0 });
    const ust = Number(x.alarm_ust) || 0, alt = Number(x.alarm_alt) || 0;
    if (ust > 0) taban.alarmlar.push({ s: x.sembol, tur: "ust", seviye: ust, f, asildi: f >= ust });
    if (alt > 0) taban.alarmlar.push({ s: x.sembol, tur: "alt", seviye: alt, f, asildi: f <= alt });
  }
  if (elde) taban.ozet = { deger, gun, gunY: deger - gun > 0 ? (gun / (deger - gun)) * 100 : null, kz: mal > 0 ? kz : null, kzY: mal > 0 ? (kz / mal) * 100 : null, adet: elde };
  // Bileşende gösterilecekler: önce eldekiler (değere göre), sonra izlenenler (günlük değişime göre).
  taban.hisseler.sort((p, q) => q.d - p.d || Math.abs(q.y || 0) - Math.abs(p.y || 0));
  taban.hisseler = taban.hisseler.slice(0, 8).map((x) => ({ s: x.s, f: x.f, y: x.y, elde: x.d > 0 }));
  return yanit(200, taban);
}

/* ---------- İstek ---------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return yanit(405, { hata: "yontem" });
  if (!TABAN) return yanit(500, { hata: "ayar" });

  let g;
  try { g = await req.json(); } catch (_e) { return yanit(400, { hata: "govde" }); }
  if (!g || typeof g !== "object") return yanit(400, { hata: "govde" });

  // Telefon: cihaz anahtarıyla özet.
  if (typeof g.cihaz === "string") {
    try { return await cihazIstegi(g.cihaz); } catch (e) { console.log(JSON.stringify({ olay: "cihaz-hata", hata: String((e && e.message) || e).slice(0, 160) })); return yanit(503, { hata: "cihaz-ozet" }); }
  }

  // Yalnızca giriş yapmış kullanıcılar: gelen oturum anahtarı Supabase'e sorulur.
  const yetki = req.headers.get("Authorization") || "";
  const anahtar = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!yetki.startsWith("Bearer ")) return yanit(401, { hata: "oturum" });
  let kim;
  try {
    const k = await fetch(TABAN + "/auth/v1/user", { headers: { Authorization: yetki, apikey: anahtar }, signal: AbortSignal.timeout(10000) });
    if (!k.ok) return yanit(401, { hata: "oturum" });
    kim = await k.json();
    if (!kim || !kim.id) return yanit(401, { hata: "oturum" });
  } catch (_e) {
    return yanit(503, { hata: "oturum-kontrol" });
  }

  if (typeof g.tool !== "string") return yanit(400, { hata: "arac" });
  if (!g.input || typeof g.input !== "object" || Array.isArray(g.input)) return yanit(400, { hata: "girdi" });
  if (JSON.stringify(g.input).length > 4000) return yanit(400, { hata: "girdi" });
  if (!(await kapi("k:" + kim.id, DAKIKA_SINIRI))) return yanit(429, { hata: "sinir" });

  // Ortak depodan fiyat geçmişi ya da son fiyatlar.
  if (g.tool === "gecmis" || g.tool === "kot") {
    const syms = Array.isArray(g.input.semboller) ? Array.from(new Set(g.input.semboller.map((s) => String(s).toUpperCase()))) : [];
    if (!syms.length || syms.length > (g.tool === "kot" ? 60 : 12) || !syms.every((s) => SEMBOL.test(s))) return yanit(400, { hata: "girdi" });
    if (!SERVIS) return yanit(501, { hata: "depo" });
    try {
      if (g.tool === "kot") {
        const k = await kotGetir(syms, 60e3);
        return yanit(200, { zaman: new Date().toISOString(), veri: k.veri, veriZamani: k.enEski, kaynak: kaynakKapali() ? "kapali" : "tamam" });
      }
      // "bas" verilirse yalnızca o günden sonraki çubuklar döner (geçmişi tam olan sayfa için günlük yenileme).
      const bas = typeof g.input.bas === "string" && /^\d{4}-\d{2}-\d{2}$/.test(g.input.bas) ? g.input.bas : "";
      const q = await gecmisGetir(syms, Date.now() + 20000, false), alt0 = gunEkle(q.bugun, -800), alt = bas > alt0 ? bas : alt0, veri = {};
      for (const s of syms) {
        const k = q.kayit.get(s);
        if (!k) { veri[s] = { hata: q.bos.has(s) ? "bos" : "kaynak" }; continue; }
        veri[s] = { ilk: k.ilk, son: k.son, dip: k.dip, tam: k.dip || k.ilk <= q.hedef, b: Object.keys(k.b).filter((t) => t >= alt).sort().map((t) => [t].concat(k.b[t])) };
      }
      return yanit(200, { bugun: q.bugun, veri, kaynak: kaynakKapali() ? "kapali" : "tamam" });
    } catch (e) {
      console.log(JSON.stringify({ olay: "depo-hata", arac: g.tool, hata: String((e && e.message) || e).slice(0, 160) }));
      return yanit(503, { hata: "depo" });
    }
  }

  // Aktarma.
  if (!IZINLI.has(g.tool)) return yanit(400, { hata: "arac" });
  return await aktar(g.tool, g.input);
});
