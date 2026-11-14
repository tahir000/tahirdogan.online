// Türkü Defteri: liste, türkü çalışma sayfası, sap şeması ve düğmeler.
(function () {
  'use strict';
  var TD = window.TurkuDefteri;
  var P = TD.perde;
  var SVG = 'http://www.w3.org/2000/svg';
  function $(id) { return document.getElementById(id); }
  function el(ad, sinif, metin) {
    var e = document.createElement(ad);
    if (sinif) e.className = sinif;
    if (metin !== undefined) e.textContent = metin;
    return e;
  }

  // ---- Ayarlar (yalnızca bu cihazda) ---------------------------------------------
  var AYAR_ANAHTARI = 'turku-defteri-ayar';
  var ayar = { ses: true, metronom: false, sayim: true, soz: true, sap: true, akort: 0 };
  try {
    var kayitli = JSON.parse(localStorage.getItem(AYAR_ANAHTARI) || '{}');
    Object.keys(ayar).forEach(function (k) { if (typeof kayitli[k] === typeof ayar[k]) ayar[k] = kayitli[k]; });
  } catch (e) { /* saklama kapalıysa varsayılanlarla devam */ }
  function ayarKaydet() {
    try { localStorage.setItem(AYAR_ANAHTARI, JSON.stringify(ayar)); } catch (e) { /* önemli değil */ }
  }

  var calici = new TD.Calici();
  var durum = { turku: null, kita: 1, hiz: 100, donguOlcu: null, bekleyenBas: null };
  var notaDugmeleri = [];
  var olcuKutulari = [];
  var uyanik = null;

  // ---- Liste ---------------------------------------------------------------------
  var ZORLUK = { kolay: 'kolay', orta: 'orta', zor: 'zor' };
  function listeCiz() {
    var ul = $('turku-listesi');
    ul.textContent = '';
    (TD.dizin || []).forEach(function (t) {
      var li = el('li');
      var a = el('a', 'satir');
      a.href = '#/' + t.id;
      a.appendChild(el('b', '', t.ad));
      var parcalar = [];
      if (t.yore) parcalar.push(t.yore);
      parcalar.push(t.usul + (t.usulAdi ? ' ' + t.usulAdi.toLowerCase() : ''));
      parcalar.push(t.olcu + ' ölçü');
      if (ZORLUK[t.zorluk]) parcalar.push(ZORLUK[t.zorluk]);
      a.appendChild(el('span', '', parcalar.join(' · ')));
      var ok = el('i', '', '›');
      ok.setAttribute('aria-hidden', 'true');
      a.appendChild(ok);
      li.appendChild(a);
      ul.appendChild(li);
    });
    $('liste-notu').textContent = (TD.dizin || []).length + ' türkü. Yenileri eklendikçe burada görünür.';
  }

  // ---- Nota hücresi --------------------------------------------------------------
  // Süre işareti: {cizgi, nokta, uzatma, yazi}
  function sureIsareti(s) {
    var k = s[0] + '/' + s[1];
    var tablo = {
      '1/4': [0, 0, 0], '1/8': [1, 0, 0], '1/16': [2, 0, 0], '1/32': [3, 0, 0],
      '3/8': [0, 1, 0], '3/16': [1, 1, 0], '3/32': [2, 1, 0],
      '1/2': [0, 0, 1], '3/4': [0, 0, 2], '1/1': [0, 0, 3]
    };
    var t = tablo[k];
    if (!t) return { cizgi: 0, nokta: false, uzatma: 0, yazi: k };
    return { cizgi: t[0], nokta: !!t[1], uzatma: t[2], yazi: '' };
  }

  function taban(sure) {
    if (sure <= 1 / 32) return 28;
    if (sure <= 1 / 16) return 33;
    if (sure <= 1 / 8) return 37;
    if (sure <= 3 / 16) return 42;
    if (sure <= 1 / 4) return 48;
    if (sure <= 3 / 8) return 58;
    if (sure <= 1 / 2) return 68;
    return 84;
  }

  function adYaz(hedef, ad) {
    var g = P.gorunum(ad);
    var span = el('span', 'ad' + (g.yer ? ' ' + g.yer : ''), g.harf + g.isaret);
    if (g.koma) span.appendChild(el('sup', '', g.koma));
    hedef.appendChild(span);
    return span;
  }

  function konumMetni(ad) {
    var k = P.konum(ad);
    if (!k) return 'bu sapta perdesi yok';
    return P.telBilgisi(k.tel).ad + ' tel, ' + (k.perde ? k.perde + '. perde' : 'boş');
  }

  function notaHucresi(n, vurusBasi) {
    var b = el('button', 'nota');
    b.type = 'button';
    b.setAttribute('data-i', n.i);
    b.style.flex = (n.sure * 32).toFixed(2) + ' 1 ' + taban(n.sure) + 'px';
    if (vurusBasi) b.classList.add('vurus');
    b._taban = taban(n.sure) + (vurusBasi ? 5 : 0);
    b._sure = n.sure;
    var ust = el('span', 'ust');
    var isaret = sureIsareti(n.s);
    if (n.ad === 'Es') {
      b.classList.add('es');
      ust.appendChild(el('span', 'ad', 'es'));
      b.setAttribute('aria-label', 'es, ' + P.sureAdi(n.s));
    } else {
      if (n.bagli) b.classList.add('bagli');
      if (n.carpma) ust.appendChild(el('span', 'carpma', n.carpma.map(function (c) { var g = P.gorunum(c); return g.harf + g.isaret + g.koma; }).join(' ')));
      adYaz(ust, n.ad);
      b.setAttribute('aria-label', P.okunus(n.ad) + ', ' + konumMetni(n.ad) + ', ' + P.sureAdi(n.s) + (n.bagli ? ', öncekine bağlı' : ''));
    }
    var ek = (isaret.nokta ? '·' : '') + new Array(isaret.uzatma + 1).join(' –') + (isaret.yazi ? ' ' + isaret.yazi : '');
    if (ek) ust.appendChild(el('span', 'ek', ek));
    b.appendChild(ust);
    var sure = el('span', 'sure');
    for (var i = 0; i < isaret.cizgi; i++) sure.appendChild(el('i'));
    b.appendChild(sure);
    if (n.ad === 'Es') b.appendChild(el('span', 'perde yok', ''));
    else {
      var k = P.konum(n.ad);
      b.appendChild(el('span', 'perde ' + (k ? k.tel : 'yok'), k ? String(k.perde) : '?'));
    }
    var hece = n.hece.replace(/_/g, ' ');
    if (hece.charAt(hece.length - 1) === '/') hece = hece.slice(0, -1);
    b.appendChild(el('span', 'hece', hece));
    return b;
  }

  // ---- Türkü sayfası -------------------------------------------------------------
  function vurusSinirlari(turku) {
    var u = turku.usul, liste = [], t = 0, i;
    if (u.kalip) for (i = 0; i < u.kalip.length; i++) { liste.push(t); t += u.kalip[i] / 8; }
    else if (u.payda === 8 && u.pay % 3 === 0) for (i = 0; i < u.pay / 3; i++) liste.push(i * 3 / 8);
    else for (i = 0; i < u.pay; i++) liste.push(i / u.payda);
    return liste;
  }

  // Ölçü tek satıra sığmıyorsa: az taşıyorsa hücreler daraltılır, çok taşıyorsa ölçü
  // ortasına en yakın vuruş başından ikiye bölünür (tek nota alt satırda kalmasın diye).
  function olcuSigdir(satir, genislik) {
    var hucreler = Array.prototype.slice.call(satir.children);
    var toplam = hucreler.reduce(function (a, h) { return a + h._taban; }, 0);
    if (toplam <= genislik || hucreler.length < 2) return;
    if (toplam <= genislik * 1.25) {
      var oran = genislik / toplam;
      hucreler.forEach(function (h) {
        h.style.flexBasis = Math.floor((h._taban - (h.classList.contains('vurus') ? 5 : 0)) * oran) + 'px';
      });
      return;
    }
    var sure = hucreler.reduce(function (a, h) { return a + h._sure; }, 0);
    var gecen = 0, enIyi = 1, enIyiFark = Infinity;
    for (var i = 1; i < hucreler.length; i++) {
      gecen += hucreler[i - 1]._sure;
      var fark = Math.abs(gecen - sure / 2) - (hucreler[i].classList.contains('vurus') ? sure / 8 : 0);
      if (fark < enIyiFark) { enIyiFark = fark; enIyi = i; }
    }
    hucreler[enIyi].classList.remove('vurus');
    satir.insertBefore(el('span', 'kir'), hucreler[enIyi]);
  }

  function notalariCiz() {
    var t = durum.turku;
    var kap = $('t-notalar');
    kap.textContent = '';
    durum.genislik = kap.clientWidth;
    notaDugmeleri = [];
    olcuKutulari = [];
    var sinirlar = vurusSinirlari(t);
    var olcuBoyu = t.usul.pay / t.usul.payda;
    var simdiki = null, olcuNo = -1;
    calici.liste.forEach(function (n) {
      if (n.olcu !== olcuNo) {
        olcuNo = n.olcu;
        var kutu = el('section', 'olcu');
        kutu.setAttribute('data-olcu', olcuNo);
        var ust = el('div', 'olcu-ust');
        var no = el('button', 'olcu-no', String(olcuNo + 1));
        no.type = 'button';
        no.setAttribute('aria-label', (olcuNo + 1) + '. ölçü, döngüye al');
        ust.appendChild(no);
        if (t.olculer[olcuNo].b) ust.appendChild(el('span', 'bolum-adi', t.olculer[olcuNo].b));
        kutu.appendChild(ust);
        simdiki = el('div', 'notalar');
        kutu.appendChild(simdiki);
        kap.appendChild(kutu);
        olcuKutulari[olcuNo] = kutu;
      }
      var olcuIci = n.bas - olcuNo * olcuBoyu;
      var basta = n.sira > 0 && sinirlar.some(function (s) { return Math.abs(s - olcuIci) < 1e-6; });
      var hucre = notaHucresi(n, basta);
      notaDugmeleri[n.i] = hucre;
      simdiki.appendChild(hucre);
    });
    if (durum.genislik) olcuKutulari.forEach(function (kutu) { olcuSigdir(kutu.lastChild, durum.genislik); });
  }

  function sozleriCiz() {
    var t = durum.turku;
    var kap = $('t-sozler');
    kap.textContent = '';
    var var_mi = false;
    for (var k = 1; k <= t.kita; k++) {
      var dizeler = P.sozMetni(t, k);
      if (!dizeler.length) continue;
      var_mi = true;
      if (t.kita > 1) kap.appendChild(el('h3', '', k + '. kıta'));
      kap.appendChild(el('p', '', dizeler.join('\n')));
    }
    $('t-soz-bolum').hidden = !var_mi;
  }

  function kitaDugmeleri() {
    var t = durum.turku;
    var kap = $('t-kita');
    kap.textContent = '';
    kap.hidden = t.kita < 2;
    for (var k = 1; k <= t.kita; k++) {
      var b = el('button', '', k + '. kıta');
      b.type = 'button';
      b.setAttribute('data-kita', k);
      b.setAttribute('aria-pressed', k === durum.kita ? 'true' : 'false');
      kap.appendChild(b);
    }
  }

  function kitaSec(k) {
    var olcu = calici.liste[calici.etkin] ? calici.liste[calici.etkin].olcu : 0;
    var caliyordu = calici.caliyor;
    durum.kita = k;
    calici.yukle(durum.turku, k);
    calici.hiz = durum.hiz / 100;
    notalariCiz();
    kitaDugmeleri();
    donguUygula();
    var ilk = ilkNota(olcu);
    calici.etkin = ilk;
    etkinGoster(ilk, false);
    if (caliyordu) calici.cal(true);
  }

  function ilkNota(olcu) {
    for (var i = 0; i < calici.liste.length; i++) if (calici.liste[i].olcu === olcu) return i;
    return 0;
  }
  function sonNota(olcu) {
    for (var i = calici.liste.length - 1; i >= 0; i--) if (calici.liste[i].olcu === olcu) return i;
    return calici.liste.length - 1;
  }

  function turkuGoster(id) {
    var t = TD.turkuler[id];
    durum.turku = t;
    durum.kita = 1;
    durum.hiz = 100;
    durum.donguOlcu = null;
    durum.bekleyenBas = null;
    document.title = t.ad + ' · Türkü Defteri';
    $('t-ad').textContent = t.ad;
    var kunye = [];
    if (t.yore) kunye.push(t.yore);
    kunye.push(t.usul.pay + '/' + t.usul.payda + (t.usul.ad ? ' ' + t.usul.ad.toLowerCase() : ''));
    if (t.dizi) kunye.push(t.dizi.toLowerCase() + ', ' + t.karar.toLowerCase() + ' kararlı');
    kunye.push('bozuk düzen');
    kunye.push('dörtlük ' + t.tempo);
    $('t-kunye').textContent = kunye.join(' · ');
    $('t-taslak').hidden = t.durum !== 'taslak';
    $('t-kaynak').textContent = 'Nota: ' + t.kaynak + ' (github.com/MTG/SymbTr, CC BY-NC-SA 4.0). Bağlama perdelerine bilgisayarla uyarlandı' +
      (t.dizi ? '; makam adı kaynaktaki adıdır.' : '.') + (t.aciklama ? ' ' + t.aciklama : '');
    calici.yukle(t, 1);
    calici.hiz = 1;
    ayarUygula();
    $('liste').hidden = true;
    $('turku').hidden = false;
    kitaDugmeleri();
    notalariCiz();
    sozleriCiz();
    hizGoster();
    donguUygula();
    sapKur();
    etkinGoster(0, false);
    window.scrollTo(0, 0);
    altBosluk();
  }

  function turkuAc(id) {
    var kayit = null;
    (TD.dizin || []).forEach(function (t) { if (t.id === id) kayit = t; });
    if (!kayit) { location.hash = '#/'; return; }
    if (TD.turkuler && TD.turkuler[id]) { turkuGoster(id); return; }
    TD.yuklendi = function (gelen) { if (gelen === id && location.hash === '#/' + id) turkuGoster(id); };
    var s = document.createElement('script');
    s.src = 'veri/' + id + '.js';
    s.onerror = function () {
      $('liste-notu').textContent = kayit.ad + ' yüklenemedi. Bağlantını denetleyip yeniden dene.';
      location.hash = '#/';
    };
    document.head.appendChild(s);
  }

  function listeGoster() {
    calici.durdur();
    document.title = 'Türkü Defteri';
    $('turku').hidden = true;
    $('liste').hidden = false;
    document.body.style.paddingBottom = '';
    window.scrollTo(0, 0);
  }

  function yonlendir() {
    var m = /^#\/([a-z0-9-]+)$/.exec(location.hash);
    if (m) turkuAc(m[1]);
    else listeGoster();
  }

  // ---- Etkin nota ve sap şeması --------------------------------------------------
  var sap = { genislik: 0, x: null, isaret: null, yazi: null, sonraki: null, telY: {} };

  function sapKur() {
    var svg = $('sap');
    svg.style.display = ayar.sap ? '' : 'none';
    if (!ayar.sap) { altBosluk(); return; }
    var w = svg.clientWidth || svg.parentNode.clientWidth;
    if (!w) return;
    sap.genislik = w;
    svg.setAttribute('viewBox', '0 0 ' + w + ' 88');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var x0 = 30, x1 = w - 6;
    var enUzak = P.yerSent(P.PERDELER[P.PERDELER.length - 1] * 50) + 0.012;
    sap.x = function (yer) { return x0 + (yer / enUzak) * (x1 - x0); };
    sap.telY = { ust: 16, orta: 36, alt: 56 };
    function ciz(ad, oz) {
      var e = document.createElementNS(SVG, ad);
      Object.keys(oz).forEach(function (k) { e.setAttribute(k, oz[k]); });
      svg.appendChild(e);
      return e;
    }
    P.PERDELER.forEach(function (adim) {
      var x = sap.x(P.yerSent(P.perdeSent(adim)));
      ciz('line', { x1: x, y1: 8, x2: x, y2: 64, 'class': 'perde-cizgi' + (adim % 2 ? ' koma' : '') });
    });
    ciz('line', { x1: x0, y1: 7, x2: x0, y2: 65, 'class': 'esik' });
    P.TELLER.forEach(function (tel) {
      var y = sap.telY[tel.kod];
      ciz('line', { x1: x0, y1: y, x2: x1, y2: y, 'class': 'tel' });
      var yazi = ciz('text', { x: 0, y: y + 3.5 });
      yazi.textContent = tel.ad;
    });
    // Alt teldeki ana seslerin adları
    [[4, 'si'], [6, 'do'], [10, 're'], [14, 'mi'], [16, 'fa'], [20, 'sol'], [24, 'la'], [30, 'do'], [34, 're']].forEach(function (c) {
      var x = sap.x(P.yerSent(c[0] * 50));
      var yazi = ciz('text', { x: x - 2, y: 82, 'text-anchor': 'end' });
      yazi.textContent = c[1];
    });
    sap.sonraki = ciz('circle', { r: 7, 'class': 'sonraki', visibility: 'hidden' });
    sap.isaret = ciz('circle', { r: 9.5, 'class': 'isaret', visibility: 'hidden' });
    sap.yazi = ciz('text', { 'class': 'isaret-yazi', 'text-anchor': 'middle', visibility: 'hidden' });
    altBosluk();
  }

  // Parmağın basacağı yer: perdenin hemen gerisi.
  function sapYeri(k) {
    if (k.perde === 0) return { x: sap.x(0), y: sap.telY[k.tel] };
    var bu = P.yerSent(P.perdeSent(P.PERDELER[k.perde - 1]));
    var onceki = k.perde > 1 ? P.yerSent(P.perdeSent(P.PERDELER[k.perde - 2])) : 0;
    return { x: sap.x(onceki + (bu - onceki) * 0.62), y: sap.telY[k.tel] };
  }

  function sapGoster(i) {
    if (!ayar.sap || !sap.x) return;
    var n = calici.liste[i];
    var k = n && n.ad !== 'Es' ? P.konum(n.ad) : null;
    if (k) {
      var yer = sapYeri(k);
      sap.isaret.setAttribute('cx', yer.x);
      sap.isaret.setAttribute('cy', yer.y);
      sap.isaret.setAttribute('visibility', 'visible');
      sap.yazi.setAttribute('x', yer.x);
      sap.yazi.setAttribute('y', yer.y + 3.6);
      sap.yazi.textContent = String(k.perde);
      sap.yazi.setAttribute('visibility', 'visible');
    } else {
      sap.isaret.setAttribute('visibility', 'hidden');
      sap.yazi.setAttribute('visibility', 'hidden');
    }
    // Sıradaki farklı ses
    var j = i + 1, k2 = null;
    while (j < calici.liste.length && (calici.liste[j].ad === 'Es' || calici.liste[j].bagli)) j++;
    if (j < calici.liste.length && (!n || calici.liste[j].ad !== n.ad)) k2 = P.konum(calici.liste[j].ad);
    if (k2) {
      var y2 = sapYeri(k2);
      sap.sonraki.setAttribute('cx', y2.x);
      sap.sonraki.setAttribute('cy', y2.y);
      sap.sonraki.setAttribute('visibility', 'visible');
    } else sap.sonraki.setAttribute('visibility', 'hidden');
  }

  var sonEtkin = null, sonOlcu = -1;
  function etkinGoster(i, kaydir) {
    if (sonEtkin) sonEtkin.classList.remove('etkin');
    var hucre = notaDugmeleri[i];
    var n = calici.liste[i];
    if (!hucre || !n) return;
    hucre.classList.add('etkin');
    sonEtkin = hucre;
    var anlik = $('anlik');
    anlik.textContent = '';
    if (n.ad === 'Es') anlik.appendChild(el('b', '', 'es'));
    else {
      var g = P.gorunum(n.ad);
      anlik.appendChild(el('b', '', (g.yer ? g.yer + ' ' : '') + g.harf + g.isaret + g.koma));
      anlik.appendChild(document.createTextNode(' · ' + konumMetni(n.ad)));
    }
    anlik.appendChild(document.createTextNode(' · ' + P.sureAdi(n.s)));
    sapGoster(i);
    if (kaydir && n.olcu !== sonOlcu) {
      var kutu = olcuKutulari[n.olcu];
      var r = kutu.getBoundingClientRect();
      var panel = $('panel').offsetHeight;
      var gorunur = window.innerHeight - panel;
      if (r.top < 8 || r.bottom > gorunur - 8) {
        var hedef = window.pageYOffset + r.top - Math.max(12, (gorunur - r.height) * 0.3);
        var yumusak = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        try { window.scrollTo({ top: hedef, behavior: yumusak ? 'smooth' : 'auto' }); } catch (e) { window.scrollTo(0, hedef); }
      }
    }
    sonOlcu = n.olcu;
  }

  function altBosluk() {
    if ($('turku').hidden) return;
    document.body.style.paddingBottom = ($('panel').offsetHeight + 16) + 'px';
  }

  // ---- Döngü ---------------------------------------------------------------------
  function donguUygula() {
    var d = durum.donguOlcu;
    olcuKutulari.forEach(function (kutu, o) {
      kutu.classList.toggle('dongude', !!d && o >= d.bas && o <= d.son);
    });
    var dugme = $('dongu');
    dugme.setAttribute('aria-pressed', d ? 'true' : 'false');
    dugme.textContent = d ? (d.bas === d.son ? 'Döngü ' + (d.bas + 1) : 'Döngü ' + (d.bas + 1) + '–' + (d.son + 1)) : 'Döngü';
    calici.dongu = d ? { bas: ilkNota(d.bas), son: sonNota(d.son) } : null;
  }

  function olcuSecildi(o) {
    var d = durum.donguOlcu;
    if (d && durum.bekleyenBas !== null && o !== durum.bekleyenBas) {
      durum.donguOlcu = { bas: Math.min(durum.bekleyenBas, o), son: Math.max(durum.bekleyenBas, o) };
      durum.bekleyenBas = null;
    } else {
      durum.donguOlcu = { bas: o, son: o };
      durum.bekleyenBas = o;
    }
    donguUygula();
    if (!calici.caliyor) {
      calici.etkin = ilkNota(durum.donguOlcu.bas);
      etkinGoster(calici.etkin, false);
    }
  }

  // ---- Düğmeler ------------------------------------------------------------------
  function hizGoster() { $('hiz-deger').textContent = '%' + durum.hiz; }
  function hizDegis(fark) {
    durum.hiz = Math.max(40, Math.min(130, durum.hiz + fark));
    calici.hiz = durum.hiz / 100;
    hizGoster();
  }

  function ayarUygula() {
    calici.sesAcik = ayar.ses;
    calici.metronom = ayar.metronom;
    calici.sayim = ayar.sayim;
    calici.kaydirma = ayar.akort;
    if (calici.ses.telKazanc) calici.ses.telKazanc.gain.value = ayar.ses ? 1 : 0;
    document.body.classList.toggle('sozsuz', !ayar.soz);
  }

  function ekranUyanik(acik) {
    try {
      if (acik && navigator.wakeLock && !uyanik) {
        navigator.wakeLock.request('screen').then(function (k) { uyanik = k; }, function () {});
      } else if (!acik && uyanik) {
        uyanik.release();
        uyanik = null;
      }
    } catch (e) { /* desteklenmiyorsa ekran kendi ayarıyla kapanır */ }
  }

  calici.nota = function (i) { etkinGoster(i, true); };
  calici.durum = function (caliyor) {
    $('cal-yazi').textContent = caliyor ? 'Durdur' : 'Çal';
    $('cal-simge').setAttribute('d', caliyor ? 'M6 5h4v14H6zM14 5h4v14h-4z' : 'M7 4v16l13-8z');
    ekranUyanik(caliyor);
  };

  function bagla() {
    $('cal').addEventListener('click', function () { if (calici.caliyor) calici.durdur(); else calici.cal(); });
    $('geri-adim').addEventListener('click', function () { calici.adim(-1); });
    $('ileri-adim').addEventListener('click', function () { calici.adim(1); });
    $('hiz-eksi').addEventListener('click', function () { hizDegis(-10); });
    $('hiz-arti').addEventListener('click', function () { hizDegis(10); });
    $('dongu').addEventListener('click', function () {
      if (durum.donguOlcu) { durum.donguOlcu = null; durum.bekleyenBas = null; }
      else {
        var o = calici.liste[calici.etkin] ? calici.liste[calici.etkin].olcu : 0;
        durum.donguOlcu = { bas: o, son: o };
        durum.bekleyenBas = o;
      }
      donguUygula();
    });
    $('t-notalar').addEventListener('click', function (olay) {
      var hedef = olay.target;
      while (hedef && hedef !== this) {
        if (hedef.classList.contains('nota')) { calici.git(parseInt(hedef.getAttribute('data-i'), 10), true); return; }
        if (hedef.classList.contains('olcu-no')) { olcuSecildi(parseInt(hedef.parentNode.parentNode.getAttribute('data-olcu'), 10)); return; }
        hedef = hedef.parentNode;
      }
    });
    $('t-kita').addEventListener('click', function (olay) {
      var k = olay.target.getAttribute && olay.target.getAttribute('data-kita');
      if (k) kitaSec(parseInt(k, 10));
    });

    var pencere = $('ayarlar');
    var alanlar = { 'a-ses': 'ses', 'a-metronom': 'metronom', 'a-sayim': 'sayim', 'a-soz': 'soz', 'a-sap': 'sap' };
    $('ayar-ac').addEventListener('click', function () {
      Object.keys(alanlar).forEach(function (id) { $(id).checked = ayar[alanlar[id]]; });
      $('a-akort').value = String(ayar.akort);
      if (pencere.showModal) pencere.showModal(); else pencere.setAttribute('open', '');
    });
    $('ayar-kapat').addEventListener('click', function () {
      if (pencere.close) pencere.close(); else pencere.removeAttribute('open');
    });
    Object.keys(alanlar).forEach(function (id) {
      $(id).addEventListener('change', function () {
        ayar[alanlar[id]] = this.checked;
        ayarKaydet();
        ayarUygula();
        if (id === 'a-sap') { sapKur(); sapGoster(calici.etkin); }
      });
    });
    $('a-akort').addEventListener('change', function () {
      ayar.akort = parseInt(this.value, 10) || 0;
      ayarKaydet();
      ayarUygula();
    });

    document.addEventListener('keydown', function (olay) {
      if ($('turku').hidden || pencere.open) return;
      var ad = olay.target.tagName;
      if (ad === 'INPUT' || ad === 'SELECT' || ad === 'TEXTAREA') return;
      if (olay.key === ' ' && ad !== 'BUTTON' && ad !== 'A' && ad !== 'SUMMARY') {
        olay.preventDefault();
        if (calici.caliyor) calici.durdur(); else calici.cal();
      } else if (olay.key === 'ArrowRight') { olay.preventDefault(); calici.adim(1); }
      else if (olay.key === 'ArrowLeft') { olay.preventDefault(); calici.adim(-1); }
    });
    document.addEventListener('visibilitychange', function () { if (document.hidden) calici.durdur(); });
    var bekleyen = null;
    window.addEventListener('resize', function () {
      clearTimeout(bekleyen);
      bekleyen = setTimeout(function () {
        if ($('turku').hidden) return;
        var svg = $('sap');
        if (ayar.sap && svg.clientWidth !== sap.genislik) { sapKur(); sapGoster(calici.etkin); }
        if ($('t-notalar').clientWidth !== durum.genislik) {
          notalariCiz();
          donguUygula();
          sonEtkin = null;
          etkinGoster(calici.etkin, false);
        }
        altBosluk();
      }, 120);
    });
    window.addEventListener('hashchange', yonlendir);
  }

  TD.arayuz = { sureIsareti: sureIsareti, calici: calici };
  if (document.getElementById('turku-listesi')) {
    listeCiz();
    bagla();
    yonlendir();
  }
})();
