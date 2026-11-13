/*
 * Türkçe Soru Atölyesi testleri. test.html açılınca çalışır; sonuç sayfaya ve sekme
 * başlığına yazılır ("TEST 65/65"). Veriyi ve yönerge kurucuyu denetler, sayfaya dokunmaz.
 */
(function () {
  'use strict';
  const V = window.SoruVerisi, A = window.SoruAtolyesi;
  const cikti = [];
  let gecen = 0, kalan = 0;
  function eq(gelen, beklenen, ad) {
    const a = JSON.stringify(gelen), b = JSON.stringify(beklenen);
    if (a === b) { gecen++; cikti.push('ok    ' + ad); }
    else { kalan++; cikti.push('HATA  ' + ad + '\n        beklenen: ' + b + '\n        gelen:    ' + a); }
  }
  function ok(kosul, ad) { eq(!!kosul, true, ad); }
  function hata(fn) { try { fn(); return ''; } catch (e) { return e.message; } }
  function say(metin, parca) { return metin.split(parca).length - 1; }

  const S1 = '1. Dönem 1. Ortak Yazılı Sınav', S2 = '1. Dönem 2. Ortak Yazılı Sınav';
  function secim(ek) {
    const s = {
      sinif: '7', sinav: S1, senaryo: 'Senaryo 1', adetler: A.senaryoAdetleri('7', S1, 'Senaryo 1'),
      tur: 'acik', sure: 40, puan: 100, tema: '', konu: '', metinKaynagi: 'ozgun', metin: '', ekIstek: ''
    };
    Object.keys(ek || {}).forEach(function (k) { s[k] = ek[k]; });
    return s;
  }
  const UZUN = 'Okulun bahçesindeki çınar, bu sonbahar yapraklarını her zamankinden erken döktü. Nöbetçi öğrenciler sabah bahçeyi süpürürken ' +
    'yaprakları üç ayrı çuvala doldurdu ve çuvalları kompost alanına taşıdı.';

  try {
    /* 1) Veri */
    eq(Object.keys(V.siniflar), ['5', '6', '7', '8'], 'dört sınıf var');
    eq(['5', '6', '7', '8'].map(function (s) { return V.siniflar[s].program; }), ['2026', '2024', '2024', '2019'], 'sınıfların program sürümleri');
    eq(['5', '6', '7', '8'].map(function (s) { return V.siniflar[s].ciktilar.length; }), [27, 32, 17, 54], 'tablodaki çıktı sayıları');
    eq(['5', '6', '7', '8'].map(function (s) {
      return Object.keys(V.siniflar[s].sinavlar).reduce(function (t, k) { return t + Object.keys(V.siniflar[s].sinavlar[k]).length; }, 0);
    }), [13, 13, 6, 14], 'senaryo sayıları');
    let kodsuz = 0, bos = 0, senaryoSayisi = 0;
    Object.keys(V.siniflar).forEach(function (s) {
      const kodlar = V.siniflar[s].ciktilar.map(function (c) { return c.kod; });
      Object.keys(V.siniflar[s].sinavlar).forEach(function (sinav) {
        Object.keys(V.siniflar[s].sinavlar[sinav]).forEach(function (sen) {
          const a = V.siniflar[s].sinavlar[sinav][sen];
          senaryoSayisi++;
          if (A.toplam(a) < 4) bos++;
          Object.keys(a).forEach(function (k) { if (kodlar.indexOf(k) < 0 || !(a[k] >= 1)) kodsuz++; });
        });
      });
    });
    eq([senaryoSayisi, kodsuz, bos], [46, 0, 0], 'her senaryonun kodları tabloda var, soru sayıları dolu');
    eq(A.senaryoAdetleri('7', S1, 'Senaryo 1'),
      { 'T.O.7.4.': 1, 'T.O.7.5.': 1, 'T.O.7.8.': 1, 'T.O.7.21.': 1, 'T.Y.7.3.': 1, 'T.Y.7.18.': 1, 'T.Y.7.21.': 1 },
      '7. sınıf 1. yazılı Senaryo 1 MEB tablosuyla aynı');
    eq(A.toplam(A.senaryoAdetleri('5', S2, 'Senaryo 7')), 9, '5. sınıf 2. yazılı Senaryo 7 dokuz soru');
    eq(V.siniflar['7'].temalar, ['Hayat Boyu Gelişim', 'Bir Hilal Uğruna', 'İletişim ve Sosyal İlişkiler', 'Türk Sanatı', 'Okuma Kültürü', 'Hak ve Sorumluluklar'], '7. sınıf temaları');
    eq([V.siniflar['5'].temalar.length, V.siniflar['6'].temalar.length, V.siniflar['8'].temalar.length], [6, 6, 0], 'tema sayıları');
    eq(V.siniflar['5'].temalar[1], 'Atatürk’ü Tanımak', 'kesme işaretinden sonraki harf küçük kalır');

    /* 2) Süreç bileşenleri */
    const tumKodlar = {};
    Object.keys(V.siniflar).forEach(function (s) { V.siniflar[s].ciktilar.forEach(function (c) { tumKodlar[c.kod] = s; }); });
    const sira = ['a', 'b', 'c', 'ç', 'd', 'e'];
    let bozuk = 0, sekizde = 0;
    Object.keys(V.bilesenler).forEach(function (k) {
      const harfler = Object.keys(V.bilesenler[k]);
      if (!tumKodlar[k] || harfler.length < 2) bozuk++;
      if (tumKodlar[k] === '8') sekizde++;
      harfler.forEach(function (h, i) { if (h !== sira[i] || !/\.$/.test(V.bilesenler[k][h]) || /T\.[DOKY]\.\d/.test(V.bilesenler[k][h])) bozuk++; });
    });
    eq([Object.keys(V.bilesenler).length, bozuk, sekizde], [71, 0, 0], '71 çıktının süreç bileşenleri düzgün, 8. sınıfta yok');
    eq(V.bilesenler['T.O.7.5.'], {
      a: 'Metin ve varsa ona eşlik eden görsellerden hareketle bağlama/konuya dair ipuçlarını bulup ön bilgileriyle bağlantı kurar.',
      b: 'Metinde doğrudan verilen bilgileri (tanımı verilen kavram, düşünce, yönerge, iletilmek istenen mesaj, açıkça ifade edilen ana fikir vb.) belirler.',
      c: 'Gerektiğinde iletilen mesajın gerektirdiği tepkiyi verir.'
    }, 'T.O.7.5 süreç bileşenleri (2024 programı)');
    eq(V.bilesenler['T.O.5.6.'].a, 'Metin ve varsa ona eşlik eden görsellerden hareketle bağlama dair ipuçlarını bulur.', 'T.O.5.6 2026 programındaki haliyle');
    ok(V.bilesenler['T.O.6.16.'].b.indexOf('metinle') > 0, 'aynı adlı dinleme çıktısıyla karışmadı (T.O.6.16)');
    eq(Object.keys(V.notlar).filter(function (k) { return !tumKodlar[k]; }), [], 'notların hepsi tablodaki bir koda ait');

    /* 3) Sınav ve senaryo listeleri */
    eq(A.sinavlar('7'), [S1, S2], '7. sınıfta ülke geneli sınav da listelenir');
    eq(A.senaryolar('7', S2), [], 'ülke geneli sınavın senaryosu yok');
    eq(A.senaryolar('8', S1).length, 7, '8. sınıf 1. yazılıda yedi senaryo');
    eq(A.toplam({ a: 2, b: '3', c: 0 }), 5, 'toplam');
    eq([A.ayniMi({ a: 1, b: 2 }, { b: 2, a: 1, c: 0 }), A.ayniMi({ a: 1 }, { a: 2 }), A.ayniMi({ a: 1 }, { a: 1, b: 1 })], [true, false, false], 'ayniMi');

    /* 4) Yönerge: açık uçlu, senaryo */
    const y = A.kur(secim());
    ok(y.indexOf('- Sınıf: 7. sınıf') > 0 && y.indexOf('- Soru sayısı: 7\n') > 0 && y.indexOf('- Süre: 40 dakika') > 0 && y.indexOf('- Toplam puan: 100') > 0, 'sınav bilgileri yazılır');
    ok(y.indexOf(S1 + ' (MEB konu soru dağılım tablosu, Senaryo 1)') > 0, 'senaryo adı yazılır');
    eq(A.seciliCiktilar('7', secim().adetler).map(function (c) { return say(y, c.kod + ' ' + c.ad + ' (1 soru)'); }), [1, 1, 1, 1, 1, 1, 1], 'yedi çıktı kodu, adı ve soru sayısıyla birer kez geçer');
    ok(y.indexOf('   a) Metnin bağlamından söz varlığı unsurlarının anlamıyla ilgili ipuçlarını belirleyip ön bilgileriyle ilişkilendirir.') > 0, 'süreç bileşenleri yazılır');
    ok(y.indexOf('   Not: Yazılıda a ve b ölçülür') > 0, 'çıktı notu yazılır');
    ok(y.indexOf('2024 sürümü') > 0, 'program sürümü yazılır');
    ok(y.indexOf('Metinleri sen yaz') > 0 && y.indexOf('iki ya da üç bağlam') > 0 && y.indexOf('180-250 sözcük') > 0, 'özgün metin kuralları');
    ok(y.indexOf('dereceli puanlama anahtarı') > 0 && y.indexOf('Puanları sorunun gerektirdiği işe göre sen dağıt; toplam tam 100 etsin') > 0, 'açık uçlu puanlama kuralları');
    const yOkuma = A.kur(secim({ senaryo: A.OZEL, adetler: { 'T.O.7.5.': 2, 'T.O.7.8.': 1 } }));
    ok(y.indexOf('ikilemelerin yazımı soruluyorsa söz havuzuna') > 0 && y.indexOf('Yazım sorusunda sınanan kuralın doğru örneği') > 0 && yOkuma.indexOf('ikilemelerin yazımı') < 0 && yOkuma.indexOf('Yazım sorusunda sınanan') < 0, 'yazım çıktısı varsa ipucu kuralı eklenir, yoksa eklenmez');
    ok(y.indexOf('yazma görevi bu duruma dayansın') > 0 && y.indexOf('Yazma sorusu bağlamdaki duruma dayanıyor mu?') > 0 && yOkuma.indexOf('Yazma soru') < 0 && yOkuma.indexOf('cevaplanabilen soruyu ya da bağlamını') > 0, 'yazma çıktısı varsa bağlamın işi açıklanır');
    ok(y.indexOf('Sınavın tamamı 40 dakikada bitirilebilsin') > 0 && A.kur(secim({ sure: 80 })).indexOf('Sınav 80 dakikada biter mi?') > 0, 'süre kuralı seçilen süreyle yazılır');
    ok(y.indexOf('gün ve ay adları küçük harfle başlar ("salı günü", "eylülde")') > 0, 'sık yapılan yazım yanlışları anılır');
    ok(y.indexOf('dört seçenek') < 0 && y.indexOf('çeldirici') < 0, 'açık uçluda çoktan seçmeli kuralı yok');
    eq(['A. ÖĞRENCİ SINAVI', 'B. SORU VE ÇIKTI EŞLEŞTİRME TABLOSU', 'C. CEVAP VE PUANLAMA ANAHTARI', 'D. KALİTE KONTROL NOTLARI', 'E. ÖĞRETMENE NOTLAR'].map(function (b) { return say(y, '\n' + b); }), [1, 1, 1, 1, 1], 'beş bölüm sırayla istenir');
    ok(y.indexOf('\nF. ') < 0 && y.indexOf('Tema:') < 0 && y.indexOf('ÖĞRETMENİN') < 0, 'verilmeyen alanlar yazılmaz');

    /* 5) Yönerge: türler */
    const yc = A.kur(secim({ tur: 'coktan' }));
    ok(yc.indexOf('- Soru türü: Çoktan seçmeli') > 0 && yc.indexOf('dört seçenek (A, B, C, D)') > 0 && yc.indexOf('A. ÖĞRENCİ TESTİ') > 0, 'çoktan seçmeli kuralları');
    ok(yc.indexOf('dereceli puanlama anahtarı kullan') < 0 && yc.indexOf('boş satır') < 0, 'çoktan seçmelide açık uçlu kuralı yok');
    ok(yc.indexOf('Yazma alanındaki') > 0 && A.kur(secim({ tur: 'coktan', senaryo: A.OZEL, adetler: { 'T.O.7.5.': 2 } })).indexOf('Yazma alanındaki') < 0, 'çoktan seçmelide yazma çıktısı varsa ek kural');
    const yk = A.kur(secim({ tur: 'karisik' }));
    ok(yk.indexOf('B. ÇOKTAN SEÇMELİ EK SORULAR') > 0 && yk.indexOf('\nF. ÖĞRETMENE NOTLAR') > 0 && yk.indexOf('dereceli puanlama') > 0 && yk.indexOf('dört seçenek') > 0, 'ikisi birlikte: altı bölüm, iki kural takımı');
    ok(yk.indexOf('- Soru sayısı: 7 açık uçlu soru') > 0, 'ikisi birlikte: soru sayısı açık uçluyu sayar');

    /* 6) Yönerge: tema, konu, ek istek, öğretmenin metni */
    const yt = A.kur(secim({ tema: 'Hayat Boyu Gelişim', konu: '  zaman yönetimi ', ekIstek: 'Yazma sorusu en sonda olsun.' }));
    ok(yt.indexOf('- Tema: Hayat Boyu Gelişim\n') > 0 && yt.indexOf('- Konu çerçevesi: zaman yönetimi\n') > 0, 'tema ve konu satırları');
    ok(yt.indexOf('"Hayat Boyu Gelişim" temasıyla ilişkili olsun; konu çerçevesi: zaman yönetimi.') > 0, 'tema bağlam kuralına girer');
    ok(/\nÖĞRETMENİN EK İSTEĞİ\nYazma sorusu en sonda olsun\.$/.test(yt), 'ek istek sona eklenir');
    const ym = A.kur(secim({ metinKaynagi: 'ogretmen', metin: UZUN + '\r\n<b>ikinci paragraf</b>' }));
    ok(ym.indexOf('\nÖĞRETMENİN METNİ\n<<<\n' + UZUN + '\n<b>ikinci paragraf</b>\n>>>') > 0, 'öğretmenin metni olduğu gibi eklenir');
    ok(ym.indexOf('Metinleri sen yaz') < 0 && ym.indexOf('Metni değiştirme, kısaltma, yeniden yazma') > 0, 'öğretmen metninde özgün metin kuralı yok');
    ok(A.kur(secim({ metinKaynagi: 'ozgun', metin: UZUN })).indexOf('ÖĞRETMENİN METNİ') < 0, 'özgün seçiliyken kutudaki metin eklenmez');

    /* 7) Yönerge: değiştirilmiş ve özel seçim */
    const degisik = secim(); degisik.adetler['T.O.7.7.'] = 2;
    const yd = A.kur(degisik);
    ok(yd.indexOf('çıktıları ve soru sayılarını öğretmen belirledi') > 0 && yd.indexOf('Senaryo 1') < 0, 'senaryo değişince senaryo adı yazılmaz');
    ok(yd.indexOf('- Soru sayısı: 9\n') > 0 && yd.indexOf('T.O.7.7. Metnin derin anlamını belirlemeye yönelik basit çıkarımlar yapabilme (2 soru)') > 0, 'eklenen çıktı ve yeni toplam');
    ok(yd.indexOf('5) T.O.7.21.') > yd.indexOf('3) T.O.7.7.') && yd.indexOf('3) T.O.7.7.') > 0, 'çıktılar tablodaki sırayla numaralanır');
    const yo = A.kur(secim({ sinav: S2, senaryo: A.OZEL, adetler: { 'T.O.7.5.': 3 } }));
    ok(yo.indexOf(S2 + ' (çıktıları ve soru sayılarını öğretmen belirledi)') > 0 && yo.indexOf('bir bağlam yeter') > 0, 'kendi seçimiyle yönerge');

    /* 8) Yönerge: 5 ve 8. sınıf */
    const y5 = A.kur(secim({ sinif: '5', senaryo: 'Senaryo 1', adetler: A.senaryoAdetleri('5', S1, 'Senaryo 1') }));
    ok(y5.indexOf('2026 sürümü') > 0 && y5.indexOf('120-180 sözcük') > 0 && y5.indexOf('5. sınıf düzeyine') > 0, '5. sınıf bilgileri');
    const y516 = A.kur(secim({ sinif: '5', senaryo: A.OZEL, adetler: { 'T.Y.5.16.': 1, 'T.O.5.6.': 1 } }));
    ok(y516.indexOf('Süreç bileşeni bu yönergede verilmedi') > 0 && y516.indexOf('Not: Programdaki açıklama: Noktalama işaretlerini') > 0, 'bileşeni olmayan çıktıda açıklama ve uyarı');
    const y8 = A.kur(secim({ sinif: '8', senaryo: 'Senaryo 3', adetler: A.senaryoAdetleri('8', S1, 'Senaryo 3') }));
    ok(y8.indexOf('ÖLÇÜLECEK KAZANIMLAR') > 0 && y8.indexOf('SORU VE KAZANIM EŞLEŞTİRME TABLOSU') > 0 && y8.indexOf('2019') > 0, '8. sınıfta kazanım dili');
    ok(y8.indexOf('Süreç bileşenleri:') < 0 && y8.indexOf('Süreç bileşeni bu yönergede') < 0 && y8.indexOf('süreç bileşeninin harfi') < 0 && y8.indexOf('öğrenme çıktısı') < 0, '8. sınıfta süreç bileşeni istenmez');

    /* 9) Eksik seçimler */
    eq(A.eksikler(secim({ adetler: {} })).length, 1, 'soru yoksa uyarı');
    ok(/Hiç soru yok/.test(hata(function () { A.kur(secim({ adetler: {} })); })), 'soru yokken yönerge kurulmaz');
    eq(A.eksikler(secim({ metinKaynagi: 'ogretmen', metin: 'kısa' })).length, 1, 'kendi metni boşsa uyarı');
    eq(A.eksikler(secim({ sure: 0, puan: NaN })).length, 2, 'süre ve puan denetlenir');
    eq(A.eksikler(secim({ adetler: { 'T.O.7.4.': 9, 'T.O.7.5.': 9, 'T.O.7.7.': 9, 'T.O.7.8.': 9 } })).length, 1, 'otuzdan fazla soru uyarısı');
    eq(A.eksikler(secim()), [], 'tam seçimde uyarı yok');
    eq(A.eksikler({ sinif: '9' }), ['Sınıf seçilmedi.'], 'olmayan sınıf');

    /* 10) Bütün senaryolar ve türler */
    let kurulan = 0, sorunlu = [];
    Object.keys(V.siniflar).forEach(function (s) {
      Object.keys(V.siniflar[s].sinavlar).forEach(function (sinav) {
        Object.keys(V.siniflar[s].sinavlar[sinav]).forEach(function (sen) {
          ['acik', 'coktan', 'karisik'].forEach(function (tur) {
            const a = A.senaryoAdetleri(s, sinav, sen);
            const m = A.kur(secim({ sinif: s, sinav: sinav, senaryo: sen, adetler: a, tur: tur }));
            kurulan++;
            const tamam = m.indexOf('- Soru sayısı: ' + A.toplam(a)) > 0 && m.indexOf(sen + ')') > 0 &&
              Object.keys(a).every(function (k) { return m.indexOf(') ' + k + ' ') > 0 && m.indexOf('(' + a[k] + ' soru)') > 0; }) &&
              !/undefined|NaN|\[object|null/.test(m) && m.length < 16000 && !/[–—]/.test(m);
            if (!tamam) sorunlu.push(s + ' ' + sinav + ' ' + sen + ' ' + tur);
          });
        });
      });
    });
    eq([kurulan, sorunlu], [138, []], '46 senaryo üç türde sorunsuz kurulur');

    /* 11) Yazım: sayfanın kendi cümlelerinde şapkalı harf ve uzun çizgi yok (MEB metinleri dışında) */
    let cumleler = [y, yc, yk, ym, y8].join('\n');
    const mebMetinleri = [];
    Object.keys(V.siniflar).forEach(function (s) { V.siniflar[s].ciktilar.forEach(function (c) { mebMetinleri.push(c.ad); }); });
    Object.keys(V.bilesenler).forEach(function (k) { Object.keys(V.bilesenler[k]).forEach(function (h) { mebMetinleri.push(V.bilesenler[k][h]); }); });
    mebMetinleri.sort(function (a, b) { return b.length - a.length; }).forEach(function (m) { cumleler = cumleler.split(m).join(''); });
    cumleler += A.KONTROL_LISTESI.join('\n') + A.EK_YONERGELER.map(function (i) { return i.baslik + i.metin; }).join('\n');
    eq((cumleler.match(/[âîûÂÎÛ–—]/g) || []), [], 'şapkalı harf ve uzun çizgi yok');
    ok(!/, ama | ama, |\. Ancak /.test(cumleler), '"ama" virgülsüz, cümle "ancak" ile başlamıyor');
    eq([A.KONTROL_LISTESI.length, A.EK_YONERGELER.length], [9, 7], 'kontrol listesi ve hazır istekler');
  } catch (e) {
    kalan++;
    cikti.push('HATA  testler yarıda kesildi: ' + e.message + '\n' + (e.stack || ''));
  }

  const ozet = 'TEST ' + gecen + '/' + (gecen + kalan);
  document.title = ozet;
  document.getElementById('sonuc').textContent = ozet + (kalan ? '  (' + kalan + ' hata)' : '  hepsi geçti') + '\n\n' + cikti.join('\n');
})();
