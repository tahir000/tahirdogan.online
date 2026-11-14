// Türkü Defteri: uzun sap bağlamanın perde tablosu ve nota hesapları.
// Arayüzden bağımsızdır; testler de bu dosyayı kullanır.
(function () {
  'use strict';
  var TD = window.TurkuDefteri = window.TurkuDefteri || {};

  // Sesler çeyrek ses ızgarasında tutulur (bir sekizli 24 adım). Çift adımlar yarım ses
  // perdeleri, tek adımlar koma perdeleridir. Sıfır noktası alt telin boş sesi, La4.
  var HARF = { Do: 0, Re: 2, Mi: 4, Fa: 5, Sol: 7, La: 9, Si: 11 };
  var DEGISIM = { '': 0, 'b': -2, 'b2': -1, '#': 2, '#3': 1 };
  var AD_KALIBI = /^(Do|Re|Mi|Fa|Sol|La|Si)(\d)(b2|b|#3|#)?$/;

  // Uzun sap, 23 perde. Değerler boş tele göre çeyrek ses adımıdır.
  // Yarım ses perdeleri: si bemol, si, do, do diyez, re, mi bemol, mi, fa, fa diyez, sol,
  // la bemol, la, si bemol, si, do, do diyez, re (MEB "Bağlama Ailesi Perde ve Genel
  // Ayarları" modülündeki sıra). Koma perdeleri iki yarım ses perdesinin ortasına bağlanır:
  // si bemol 2, do diyez 3, mi bemol 2, fa diyez 3, sol diyez 3 ve tizde si bemol 2.
  var PERDELER = [2, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24, 26, 27, 28, 30, 32, 34];

  // Bozuk düzen. Sıra çalanın gördüğü gibi: üst, orta, alt.
  var TELLER = [
    { kod: 'ust', ad: 'üst', bos: 'Sol4', adim: -4 },
    { kod: 'orta', ad: 'orta', bos: 'Re4', adim: -14 },
    { kod: 'alt', ad: 'alt', bos: 'La4', adim: 0 }
  ];
  var ALT_TEL_HZ = 220; // boş alt tel (La), MEB modülündeki düzen tablosu

  // Sap üzerindeki yer: baş eşikten uzaklığın tel boyuna oranı.
  function yerSent(sent) { return 1 - Math.pow(2, -sent / 1200); }
  function sentYer(yer) { return -1200 * Math.log(1 - yer) / Math.LN2; }

  // Bir perdenin boş tele göre sent değeri. Koma perdesi komşu iki perdenin
  // sap üzerinde tam ortasında durur, bu yüzden sesi 50 sentten biraz pestir.
  function perdeSent(adim) {
    if (adim % 2 === 0) return adim * 50;
    return sentYer((yerSent((adim - 1) * 50) + yerSent((adim + 1) * 50)) / 2);
  }

  function coz(ad) {
    var m = AD_KALIBI.exec(ad);
    if (!m) return null;
    var adim = ((parseInt(m[2], 10) - 4) * 12 + HARF[m[1]] - 9) * 2 + DEGISIM[m[3] || ''];
    return { harf: m[1], sekizli: parseInt(m[2], 10), degisim: m[3] || '', adim: adim };
  }

  // Bir notanın çalınabileceği bütün yerler: [{tel, perde}], perde 0 boş teldir.
  function konumlar(ad) {
    var n = coz(ad);
    if (!n) return [];
    var liste = [];
    TELLER.forEach(function (tel) {
      var fark = n.adim - tel.adim;
      if (fark === 0) liste.push({ tel: tel.kod, perde: 0 });
      else {
        var i = PERDELER.indexOf(fark);
        if (i >= 0) liste.push({ tel: tel.kod, perde: i + 1 });
      }
    });
    return liste;
  }

  // Varsayılan yer: La4 ve üstü alt telde; Sol4 boş üst telde; daha pes sesler orta telde.
  function konum(ad) {
    var n = coz(ad);
    var liste = konumlar(ad);
    if (!n || !liste.length) return null;
    function bul(kod) {
      for (var i = 0; i < liste.length; i++) if (liste[i].tel === kod) return liste[i];
      return null;
    }
    if (n.adim >= 0) return bul('alt') || bul('orta') || bul('ust');
    if (n.adim === -4) return bul('ust');
    return bul('orta') || bul('ust') || bul('alt');
  }

  function telBilgisi(kod) {
    for (var i = 0; i < TELLER.length; i++) if (TELLER[i].kod === kod) return TELLER[i];
    return null;
  }

  // Notanın frekansı. Perdesi varsa perdenin gerçek yerine göre, yoksa ızgaraya göre.
  // kaydirma: sazın akordu La'dan kaç yarım ses farklı (ör. -2 Sol akordu).
  function frekans(ad, kaydirma) {
    var n = coz(ad);
    if (!n) return 0;
    var k = konum(ad);
    var sent;
    if (k) sent = telBilgisi(k.tel).adim * 50 + (k.perde ? perdeSent(PERDELER[k.perde - 1]) : 0);
    else sent = n.adim * 50;
    return ALT_TEL_HZ * Math.pow(2, (sent + (kaydirma || 0) * 100) / 1200);
  }

  // Ekranda gösterilecek ad parçaları.
  function gorunum(ad) {
    var n = coz(ad);
    if (!n) return { harf: ad, isaret: '', koma: '', yer: '' };
    var isaret = n.degisim.charAt(0) === 'b' ? '♭' : (n.degisim.charAt(0) === '#' ? '♯' : '');
    var koma = n.degisim.length === 2 ? n.degisim.charAt(1) : '';
    var yer = n.adim < 0 ? 'pes' : (n.adim >= 24 ? 'tiz' : '');
    return { harf: n.harf, isaret: isaret, koma: koma, yer: yer };
  }

  // Okunuş: "si bemol 2", "tiz la" gibi.
  function okunus(ad) {
    var n = coz(ad);
    if (!n) return ad === 'Es' ? 'es' : ad;
    var s = n.harf.toLowerCase();
    if (n.degisim === 'b') s += ' bemol';
    if (n.degisim === 'b2') s += ' bemol 2';
    if (n.degisim === '#') s += ' diyez';
    if (n.degisim === '#3') s += ' diyez 3';
    if (n.adim < 0) s = 'pes ' + s;
    if (n.adim >= 24) s = 'tiz ' + s;
    return s;
  }

  var SURE_ADLARI = {
    '1/1': 'birlik', '1/2': 'ikilik', '1/4': 'dörtlük', '1/8': 'sekizlik', '1/16': 'onaltılık', '1/32': 'otuzikilik',
    '3/4': 'noktalı ikilik', '3/8': 'noktalı dörtlük', '3/16': 'noktalı sekizlik', '3/32': 'noktalı onaltılık'
  };
  function sureAdi(s) {
    var k = s[0] + '/' + s[1];
    return SURE_ADLARI[k] || k;
  }

  // Bir türkünün seçilen kıtaya göre düz nota sırası.
  // Her öge: {i, olcu, sira, ad, bas, sure, hece, carpma, bag, bagli}
  //   bas ve sure birlik nota cinsindendir. bagli: önceki notaya bağlı (yeniden vurulmaz).
  function sirala(turku, kita) {
    var liste = [];
    var bas = 0;
    var oncekiBag = false;
    turku.olculer.forEach(function (olcu, o) {
      var ozel = olcu.v && olcu.v[String(kita)];
      var notalar = ozel || olcu.n;
      notalar.forEach(function (n, j) {
        var sure = n.s[0] / n.s[1];
        var hece = '';
        if (typeof n.h === 'string') hece = n.h;
        else if (n.h) hece = n.h[kita - 1] || '';
        var onceki = liste[liste.length - 1];
        liste.push({
          i: liste.length, olcu: o, sira: j, ad: n.a, bas: bas, sure: sure, s: n.s, hece: hece,
          carpma: n.c || null, bag: !!n.g, bagli: oncekiBag && onceki && onceki.ad === n.a
        });
        oncekiBag = !!n.g;
        bas += sure;
      });
    });
    return liste;
  }

  // Hecelerden düz söz metni (dize dize).
  function sozMetni(turku, kita) {
    var metin = '';
    sirala(turku, kita).forEach(function (n) {
      if (!n.hece) return;
      var h = n.hece.replace(/_/g, ' ');
      if (h.charAt(h.length - 1) === '-') metin += h.slice(0, -1);
      else if (h.charAt(h.length - 1) === '/') metin += h.slice(0, -1) + '\n';
      else metin += h + ' ';
    });
    return metin.split('\n').map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
  }

  TD.perde = {
    PERDELER: PERDELER, TELLER: TELLER, ALT_TEL_HZ: ALT_TEL_HZ,
    coz: coz, konum: konum, konumlar: konumlar, frekans: frekans, perdeSent: perdeSent, yerSent: yerSent,
    gorunum: gorunum, okunus: okunus, sureAdi: sureAdi, telBilgisi: telBilgisi, sirala: sirala, sozMetni: sozMetni
  };
})();
