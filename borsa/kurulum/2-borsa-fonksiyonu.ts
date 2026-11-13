// Borsa Tahtası: Borsa MCP aktarıcısı (Supabase Edge Function, adı "borsa").
// Sayfa Borsa MCP sunucusunu doğrudan çağıramaz, çünkü sunucu web sayfalarından gelen isteklere izin vermiyor.
// Bu fonksiyon isteği giriş yapmış kullanıcı adına sunucuya iletir ve yanıtı sayfaya geri verir.

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

function yanit(durum: number, govde: unknown): Response {
  return new Response(JSON.stringify(govde), {
    status: durum,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return yanit(405, { hata: "yontem" });

  // Yalnızca giriş yapmış kullanıcılar: gelen oturum anahtarı Supabase'e sorulur.
  const yetki = req.headers.get("Authorization") ?? "";
  const anahtar = req.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const taban = Deno.env.get("SUPABASE_URL") ?? "";
  if (!yetki.startsWith("Bearer ") || !taban) return yanit(401, { hata: "oturum" });
  try {
    const k = await fetch(taban + "/auth/v1/user", {
      headers: { Authorization: yetki, apikey: anahtar },
      signal: AbortSignal.timeout(10000),
    });
    if (!k.ok) return yanit(401, { hata: "oturum" });
    const kim = await k.json();
    if (!kim || !kim.id) return yanit(401, { hata: "oturum" });
  } catch (_e) {
    return yanit(503, { hata: "oturum-kontrol" });
  }

  let g: { tool?: unknown; input?: unknown };
  try {
    g = await req.json();
  } catch (_e) {
    return yanit(400, { hata: "govde" });
  }
  if (!g || typeof g.tool !== "string" || !IZINLI.has(g.tool)) return yanit(400, { hata: "arac" });
  if (!g.input || typeof g.input !== "object" || Array.isArray(g.input)) return yanit(400, { hata: "girdi" });
  if (JSON.stringify(g.input).length > 4000) return yanit(400, { hata: "girdi" });

  // Sunucu ara ara takılabiliyor: istek 25 saniyede kesilir, ağ hatasında ya da 5xx yanıtta bir kez yeniden denenir.
  // Hatalar kayda yazılır (Edge Functions, borsa, Logs); kayıtta kullanıcı bilgisi yoktur.
  const govde = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: g.tool, arguments: g.input } });
  let r: Response | null = null;
  let metin = "";
  for (let deneme = 1; deneme <= 2; deneme++) {
    const bas = Date.now();
    try {
      r = await fetch(KAYNAK, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
        body: govde,
        signal: AbortSignal.timeout(25000),
      });
      metin = await r.text();
      if (r.ok) break;
      console.log(JSON.stringify({ olay: "kaynak-durum", arac: g.tool, deneme, durum: r.status, ms: Date.now() - bas, govde: metin.slice(0, 160) }));
      if (r.status < 500) break;
    } catch (e) {
      r = null;
      console.log(JSON.stringify({ olay: "kaynak-hata", arac: g.tool, deneme, ms: Date.now() - bas, hata: String((e as Error)?.name ?? e) + ": " + String((e as Error)?.message ?? "").slice(0, 160) }));
    }
    if (deneme === 1) await new Promise((res) => setTimeout(res, 800));
  }
  if (!r) return yanit(504, { hata: "kaynak-zaman" });
  if (!r.ok) return yanit(502, { hata: "kaynak", durum: r.status });

  // Sunucu yanıtı olay akışı (text/event-stream) ya da düz JSON olarak verebilir.
  let j: { result?: unknown; error?: { message?: string } } | null = null;
  if ((r.headers.get("content-type") ?? "").includes("text/event-stream")) {
    for (const satir of metin.split(/\r?\n/)) {
      if (!satir.startsWith("data:")) continue;
      try {
        const o = JSON.parse(satir.slice(5).trim());
        if (o && (o.result !== undefined || o.error !== undefined)) j = o;
      } catch (_e) { /* yarım satır: geç */ }
    }
  } else {
    try {
      j = JSON.parse(metin);
    } catch (_e) { /* aşağıda ele alınır */ }
  }
  if (!j) {
    console.log(JSON.stringify({ olay: "kaynak-bicim", arac: g.tool, tur: r.headers.get("content-type"), govde: metin.slice(0, 160) }));
    return yanit(502, { hata: "kaynak-bicim" });
  }
  if (j.error) {
    console.log(JSON.stringify({ olay: "kaynak-jsonrpc", arac: g.tool, hata: String(j.error.message ?? "").slice(0, 160) }));
    return yanit(502, { hata: "kaynak", ayrinti: String(j.error.message ?? "").slice(0, 200) });
  }
  return yanit(200, j.result ?? {});
});
