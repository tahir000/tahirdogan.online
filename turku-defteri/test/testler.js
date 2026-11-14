// Türkü Defteri testleri. Tarayıcıda test.html ile, tarayıcısız araclar/test_calistir.js ile çalışır.
(function () {
  'use strict';
  var TD = window.TurkuDefteri;
  var P = TD.perde;
  var satirlar = [];
  var gecen = 0, kalan = 0;

  function dene(ad, kosul, ayrinti) {
    if (kosul) { gecen++; satirlar.push('ok    ' + ad); }
    else { kalan++; satirlar.push('HATA  ' + ad + (ayrinti ? '  → ' + ayrinti : '')); }
  }
  function yakin(a, b, pay) { return Math.abs(a - b) <= pay; }
  function sent(f1, f2) { return 1200 * Math.log(f1 / f2) / Math.LN2; }

  // ---- Perde tablosu ----
  dene('sapta 23 perde var', P.PERDELER.length === 23);
  dene('perdeler baş eşikten gövdeye doğru sıralı', P.PERDELER.every(function (a, i) { return i === 0 || a > P.PERDELER[i - 1]; }));
  var beklenen = {
    La4: ['alt', 0], Si4b: ['alt', 1], Si4b2: ['alt', 2], Si4: ['alt', 3], Do5: ['alt', 4], 'Do5#3': ['alt', 5], 'Do5#': ['alt', 6],
    Re5: ['alt', 7], Mi5b: ['alt', 8], Mi5b2: ['alt', 9], Mi5: ['alt', 10], Fa5: ['alt', 11], 'Fa5#3': ['alt', 12], 'Fa5#': ['alt', 13],
    Sol5: ['alt', 14], 'Sol5#3': ['alt', 15], 'Sol5#': ['alt', 16], La5: ['alt', 17], Si5b: ['alt', 18], Si5b2: ['alt', 19], Si5: ['alt', 20],
    Do6: ['alt', 21], 'Do6#': ['alt', 22], Re6: ['alt', 23],
    Sol4: ['ust', 0], Re4: ['orta', 0], Mi4: ['orta', 3], Fa4: ['orta', 4], 'Fa4#3': ['orta', 5], 'Fa4#': ['orta', 6]
  };
  Object.keys(beklenen).forEach(function (ad) {
    var k = P.konum(ad);
    dene(ad + ' → ' + beklenen[ad][0] + ' tel ' + beklenen[ad][1], !!k && k.tel === beklenen[ad][0] && k.perde === beklenen[ad][1], JSON.stringify(k));
  });
  dene('La5b aynı perdeyi Sol5# ile paylaşır', P.konum('La5b').perde === P.konum('Sol5#').perde);
  dene('sapta olmayan ses için konum yok (tiz do diyez 3)', P.konum('Do6#3') === null);
  dene('okunamayan ad için konum yok', P.konum('Xx4') === null && P.konum('La') === null);
  dene('La4 birden çok yerde çalınabilir (alt boş, orta 10, üst 3)', P.konumlar('La4').length === 3, JSON.stringify(P.konumlar('La4')));

  // ---- Frekans ----
  dene('boş alt tel 220 Hz', yakin(P.frekans('La4', 0), 220, 0.001));
  dene('boş orta tel re, yaklaşık 146,8 Hz', yakin(P.frekans('Re4', 0), 146.83, 0.05));
  dene('boş üst tel sol, yaklaşık 196 Hz', yakin(P.frekans('Sol4', 0), 196.0, 0.05));
  dene('tiz la 440 Hz', yakin(P.frekans('La5', 0), 440, 0.001));
  var b2 = sent(P.frekans('Si4b2', 0), 220);
  dene('si bemol 2, si bemol ile si arasında (yaklaşık 149 sent)', b2 > 140 && b2 < 160, b2.toFixed(1));
  var d3 = sent(P.frekans('Fa5#3', 0), 220);
  dene('fa diyez 3, fa ile fa diyez arasında', d3 > 840 && d3 < 860, d3.toFixed(1));
  dene('akort bir yarım ses yukarı alınınca frekans yarım ses artar', yakin(sent(P.frekans('La4', 1), 220), 100, 0.001));

  // ---- Görünüm ----
  dene('si bemol 2 yazımı', P.gorunum('Si4b2').harf === 'Si' && P.gorunum('Si4b2').isaret === '♭' && P.gorunum('Si4b2').koma === '2');
  dene('tiz ve pes işareti', P.gorunum('La5').yer === 'tiz' && P.gorunum('Sol4').yer === 'pes' && P.gorunum('Sol5').yer === '');
  dene('okunuş', P.okunus('Fa5#3') === 'fa diyez 3' && P.okunus('La5') === 'tiz la' && P.okunus('Es') === 'es');
  dene('süre adları', P.sureAdi([1, 8]) === 'sekizlik' && P.sureAdi([3, 8]) === 'noktalı dörtlük' && P.sureAdi([5, 8]) === '5/8');

  // ---- Tel sesi ----
  // Temel sesin frekansını iki pencere arasındaki faz farkından ölçer. Özilintiyle ölçmek
  // parlak seslerde tam sayı gecikmelere kaydığı için burada kullanılmadı.
  function olculenFrekans(frekans) {
    var sr = 44100;
    var u = TD.telUret(sr, frekans, 0.8);
    var v = u.veri, boy = 8192, atlama = 2048;
    var f0 = frekans / u.hiz; // tamponun kendi hızındaki beklenen frekans
    function faz(bas) {
      var re = 0, im = 0;
      for (var i = 0; i < boy; i++) {
        var pencere = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (boy - 1));
        var aci = 2 * Math.PI * f0 * (bas + i) / sr;
        re += v[bas + i] * pencere * Math.cos(aci);
        im -= v[bas + i] * pencere * Math.sin(aci);
      }
      return Math.atan2(im, re);
    }
    var fark = faz(3000 + atlama) - faz(3000);
    while (fark > Math.PI) fark -= 2 * Math.PI;
    while (fark < -Math.PI) fark += 2 * Math.PI;
    return (f0 + fark * sr / (2 * Math.PI * atlama)) * u.hiz;
  }
  [146.83, 220, 239.8, 329.63, 440, 587.33].forEach(function (f) {
    var o = olculenFrekans(f);
    dene('tel sesi ' + f + ' Hz için doğru perdede (3 sent içinde)', Math.abs(sent(o, f)) < 3, o.toFixed(2) + ' Hz');
  });
  var ornek = TD.telUret(44100, 220, 0.5);
  var tepe = 0;
  for (var z = 0; z < ornek.veri.length; z++) tepe = Math.max(tepe, Math.abs(ornek.veri[z]));
  dene('tel sesi taşmıyor ve sessiz değil', tepe > 0.5 && tepe <= 0.9001, String(tepe));
  dene('tel sesi sönerek bitiyor', Math.abs(ornek.veri[ornek.veri.length - 1]) < 0.01);

  // ---- Türkü verisi ----
  var dizin = TD.dizin || [];
  dene('dizinde en az 200 türkü var', dizin.length >= 200, String(dizin.length));
  dene('ilk denenecek beş türkü işaretli', dizin.filter(function (k) { return k.pilot; }).length === 5);
  var kimlikler = {};
  dizin.forEach(function (k) { kimlikler[k.id] = (kimlikler[k.id] || 0) + 1; });
  dene('türkü kimlikleri tekil', Object.keys(kimlikler).length === dizin.length);
  var sozsuz = [];
  dizin.forEach(function (kayit) {
    var t = TD.turkuler && TD.turkuler[kayit.id];
    dene(kayit.id + ': veri yüklü', !!t);
    if (!t) return;
    var toplamBoy = 0;
    t.olculer.forEach(function (o, i) { toplamBoy += P.olcuBoyu(t, i); });
    dene(kayit.id + ': dizindeki ölçü ve kıta sayısı veriyle aynı', kayit.olcu === t.olculer.length && kayit.kita === t.kita);
    var kotu = [], perdesiz = [], toplamNota = 0;
    for (var k = 1; k <= t.kita; k++) {
      var liste = P.sirala(t, k);
      var olcuToplam = {};
      liste.forEach(function (n) {
        olcuToplam[n.olcu] = (olcuToplam[n.olcu] || 0) + n.sure;
        if (n.ad !== 'Es' && !P.konum(n.ad)) perdesiz.push(n.ad + ' (ölçü ' + (n.olcu + 1) + ')');
        (n.carpma || []).forEach(function (c) { if (!P.konum(c)) perdesiz.push('çarpma ' + c); });
      });
      Object.keys(olcuToplam).forEach(function (o) {
        if (!yakin(olcuToplam[o], P.olcuBoyu(t, parseInt(o, 10)), 1e-9)) kotu.push('kıta ' + k + ' ölçü ' + (parseInt(o, 10) + 1));
      });
      if (k === 1) toplamNota = liste.length;
      var sonNota = liste[liste.length - 1];
      dene(kayit.id + ': ' + k + '. kıtanın toplam süresi ölçülerin toplamına eşit', yakin(sonNota.bas + sonNota.sure, toplamBoy, 1e-9));
    }
    dene(kayit.id + ': her ölçü usule tam oturuyor', kotu.length === 0, kotu.join(', '));
    dene(kayit.id + ': her notanın sapta perdesi var', perdesiz.length === 0, perdesiz.join(', '));
    dene(kayit.id + ': en az 20 nota var', toplamNota >= 20, String(toplamNota));
    if (!t.bicim && !P.sozMetni(t, 1).length) sozsuz.push(kayit.id);
    var vurusHatasi = [];
    t.olculer.forEach(function (o, i) {
      var v = P.vuruslar(t, i);
      if (!v.length || v[0] !== 0 || v[v.length - 1] >= P.olcuBoyu(t, i)) vurusHatasi.push(i + 1);
    });
    dene(kayit.id + ': vuruş başları ölçünün içinde', vurusHatasi.length === 0, vurusHatasi.join(', '));
    dene(kayit.id + ': kaynak ve taslak durumu yazılı', !!t.kaynak && (t.durum === 'taslak' || t.durum === 'onayli'));
    if (t.usul.kalip) dene(kayit.id + ': vuruş kalıbı usule eşit', t.usul.kalip.reduce(function (a, b) { return a + b; }, 0) / 8 === t.usul.pay / t.usul.payda);
    var harfHatasi = /[âîûÂÎÛ—]/.test(JSON.stringify([t.ad, t.yore, t.usul.ad, t.dizi]));
    dene(kayit.id + ': künyede şapkalı harf ve uzun çizgi yok', !harfHatasi);
  });

  dene('sözü olmayan türkü sayısı az (en çok 10)', sozsuz.length <= 10, sozsuz.join(', '));

  // ---- Usul ve vuruş ----
  function sahteUsul(pay, payda, kalip) { return { usul: { pay: pay, payda: payda, kalip: kalip }, olculer: [{ n: [] }, { n: [], u: [6, 4] }] }; }
  dene('vuruş: kalıbı olan usul (curcuna 3+2+2+3)', P.vuruslar(sahteUsul(10, 8, [3, 2, 2, 3]), 0).join() === [0, 3 / 8, 5 / 8, 7 / 8].join());
  dene('vuruş: kalıbı bilinmeyen 7/8 ikişerli, son grup üçlü', P.vuruslar(sahteUsul(7, 8), 0).join() === [0, 2 / 8, 4 / 8].join());
  dene('vuruş: 6/8 üçerli', P.vuruslar(sahteUsul(6, 8), 0).join() === [0, 3 / 8].join());
  dene('vuruş: 2/4 dörtlük dörtlük', P.vuruslar(sahteUsul(2, 4), 0).join() === [0, 1 / 4].join());
  dene('usulü değişen ölçü kendi usulünü kullanır', P.olcuBoyu(sahteUsul(2, 4), 1) === 1.5 && P.vuruslar(sahteUsul(2, 4), 1).length === 6);

  // ---- Sıralama ve bağ ----
  var sahte = { usul: { pay: 2, payda: 4 }, kita: 2, olculer: [
    { n: [{ a: 'La4', s: [1, 4], h: ['bir-', 'iki-'] }, { a: 'Do5', s: [1, 4], g: 1 }] },
    { n: [{ a: 'Do5', s: [1, 4] }, { a: 'Es', s: [1, 4] }], v: { '2': [{ a: 'Re5', s: [1, 2], h: 'son/' }] } }
  ] };
  var s1 = P.sirala(sahte, 1), s2 = P.sirala(sahte, 2);
  dene('sıralama: 1. kıta 4 nota, 2. kıta 3 nota (kıtaya özel ölçü)', s1.length === 4 && s2.length === 3);
  dene('sıralama: bağlı nota işaretli', s1[1].bag && s1[2].bagli && !s1[3].bagli);
  dene('sıralama: başlangıç zamanları', s1[2].bas === 0.5 && s1[3].bas === 0.75 && s1[3].olcuBas === 0.5 && s1[1].olcuBas === 0);
  dene('sıralama: kıta heceleri', s1[0].hece === 'bir-' && s2[0].hece === 'iki-' && s2[2].hece === 'son/');
  dene('söz metni heceleri birleştirir', P.sozMetni(sahte, 2).join('|') === 'ikison', P.sozMetni(sahte, 2).join('|'));

  var ozet = (kalan ? kalan + ' HATA, ' : '') + gecen + ' test geçti';
  document.title = ozet;
  var hedef = document.getElementById('sonuc');
  if (hedef) hedef.textContent = ozet + '\n\n' + satirlar.join('\n');
})();
