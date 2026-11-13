/*
 * Türkçe Soru Atölyesi testleri. test.html açılınca çalışır; sonuç sayfaya ve sekme
 * başlığına yazılır ("TEST 116/116"). Veriyi, yönerge kurucuları ve hazır soru bankasını denetler, sayfaya dokunmaz.
 */
(function () {
  'use strict';
  const V = window.SoruVerisi, A = window.SoruAtolyesi, K = window.BankaAtolyesi, B = window.SoruBankasi;
  const SINIFLAR = ['5', '6', '7', '8'];
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
    Object.keys(V.siniflar).forEach(function (s) { V.siniflar[s].yil.forEach(function (c) { tumKodlar[c.kod] = s; }); });
    const sira = ['a', 'b', 'c', 'ç', 'd', 'e'];
    let bozuk = 0, sekizde = 0;
    Object.keys(V.bilesenler).forEach(function (k) {
      const harfler = Object.keys(V.bilesenler[k]);
      if (!tumKodlar[k] || harfler.length < 2) bozuk++;
      if (tumKodlar[k] === '8') sekizde++;
      harfler.forEach(function (h, i) { if (h !== sira[i] || !/\.$/.test(V.bilesenler[k][h]) || /T\.[DOKY]\.\d/.test(V.bilesenler[k][h])) bozuk++; });
    });
    eq([Object.keys(V.bilesenler).length, bozuk, sekizde], [131, 0, 0], '131 çıktının süreç bileşenleri düzgün, 8. sınıfta yok');
    eq(V.bilesenler['T.O.7.5.'], {
      a: 'Metin ve varsa ona eşlik eden görsellerden hareketle bağlama/konuya dair ipuçlarını bulup ön bilgileriyle bağlantı kurar.',
      b: 'Metinde doğrudan verilen bilgileri (tanımı verilen kavram, düşünce, yönerge, iletilmek istenen mesaj, açıkça ifade edilen ana fikir vb.) belirler.',
      c: 'Gerektiğinde iletilen mesajın gerektirdiği tepkiyi verir.'
    }, 'T.O.7.5 süreç bileşenleri (2024 programı)');
    eq(V.bilesenler['T.O.5.6.'].a, 'Metin ve varsa ona eşlik eden görsellerden hareketle bağlama dair ipuçlarını bulur.', 'T.O.5.6 2026 programındaki haliyle');
    ok(V.bilesenler['T.O.6.16.'].b.indexOf('metinle') > 0, 'aynı adlı dinleme çıktısıyla karışmadı (T.O.6.16)');
    eq(Object.keys(V.notlar).filter(function (k) { return !tumKodlar[k]; }), [], 'notların hepsi listedeki bir koda ait');

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

    /* 11) Yıllık çıktı listesi ve konular */
    eq(SINIFLAR.map(function (s) { return V.siniflar[s].yil.length; }), [39, 49, 50, 54], 'yıllık okuma ve yazma çıktıları');
    let listede = 0, alansiz = 0;
    SINIFLAR.forEach(function (s) {
      const yil = V.siniflar[s].yil.map(function (c) { return c.kod; });
      V.siniflar[s].ciktilar.forEach(function (c) { if (yil.indexOf(c.kod) < 0) listede++; });
      V.siniflar[s].yil.forEach(function (c) { if (c.alan !== 'Okuma' && c.alan !== 'Yazma') alansiz++; });
    });
    eq([listede, alansiz], [0, 0], 'tablodaki her çıktı yıllık listede; yıllık listede yalnız okuma ve yazma var');
    eq(V.siniflar['7'].yil.filter(function (c) { return c.kod === 'T.O.7.20.'; })[0],
      { kod: 'T.O.7.20.', ad: 'Metinde kullanılan ikna etme tekniklerini belirlemeye yönelik çözümleme yapabilme', alan: 'Okuma', temalar: [2] },
      'tabloda olmayan çıktı programdan gelir (T.O.7.20)');
    eq(SINIFLAR.map(function (s) { return K.konular(s).length; }), [15, 15, 15, 18], 'konu sayıları');
    const yersiz = [], ciftli = [];
    SINIFLAR.forEach(function (s) {
      const sayac = {};
      K.konular(s).forEach(function (k) { k.ciktilar.forEach(function (c) { sayac[c.kod] = (sayac[c.kod] || 0) + 1; }); });
      V.siniflar[s].yil.forEach(function (c) { if (!sayac[c.kod]) yersiz.push(c.kod); else if (sayac[c.kod] > 1) ciftli.push(c.kod); });
    });
    eq([yersiz, ciftli], [[], []], 'her çıktı tam bir konuda');
    eq(['T.O.5.22.', 'T.O.5.21.', 'T.O.6.25.', 'T.O.7.20.', 'T.Y.7.17.', 'T.Y.6.9.', 'T.Y.5.16.'].map(function (k) { return K.konuBul(k.charAt(4), k).id; }),
      ['o-surec', 'o-yorum', 'o-yorum', 'o-dusunce', 'y-icerik', 'y-tur', 'y-yazim'], 'çıktılar doğru konuya düşer');
    eq([K.konuBul('8', 'T.8.4.20.').ad, K.konuBul('8', 'T.8.3.9.').ad, K.konuBul('8', 'T.8.9.9.')], ['Fiilde çatı', 'Fiilimsiler', null], '8. sınıf konuları');
    eq(K.konular('6').map(function (k) { return k.alan; }).join(' ').replace(/Okuma/g, 'O').replace(/Yazma/g, 'Y'), 'O O O O O O O O O O Y Y Y Y Y', 'önce okuma, sonra yazma konuları');

    /* 12) Hazır soru bankası */
    eq(SINIFLAR.map(function (s) { const n = K.say(K.sec(s, {})); return [n.baglam, n.soru, n.coktan, n.acik]; }),
      [[8, 40, 24, 16], [8, 40, 24, 16], [8, 40, 24, 16], [8, 40, 32, 8]], 'her sınıfta 8 bağlam ve 40 soru');
    const bankaSorunu = [], konusuz = [], harfSorunu = [];
    SINIFLAR.forEach(function (s) {
      const yil = V.siniflar[s].yil.map(function (c) { return c.kod; });
      const harf = { A: 0, B: 0, C: 0, D: 0 };
      let sira = 0;
      K.baglamlar(s).forEach(function (b, i) {
        if (b.no !== i + 1 || !b.baslik || !b.tur || !b.bloklar.length || b.sorular.length !== 5) bankaSorunu.push(s + ' bağlam ' + b.no);
        if (b.tema && V.siniflar[s].temalar.indexOf(b.tema) < 0) bankaSorunu.push(s + ' tema ' + b.tema);
        b.sorular.forEach(function (q) {
          sira++;
          const tamam = q.no === sira && yil.indexOf(q.kod) >= 0 && q.kok.length > 0 && q.cevap && q.aciklama &&
            ['kolay', 'orta', 'zor'].indexOf(q.guc) >= 0 &&
            (q.tur === 'coktan' ? q.secenekler.length === 4 && 'ABCD'.indexOf(q.cevap) >= 0 && q.cevap.length === 1 : q.tur === 'acik' && !q.secenekler);
          if (!tamam) bankaSorunu.push(s + ' soru ' + q.no);
          if (q.tur === 'coktan') harf[q.cevap]++;
        });
      });
      const sayilar = Object.keys(harf).map(function (h) { return harf[h]; });
      if (Math.max.apply(null, sayilar) - Math.min.apply(null, sayilar) > 2) harfSorunu.push(s);
      K.konular(s).forEach(function (k) { if (K.say(K.sec(s, { konu: k.id })).soru === 0) konusuz.push(s + ' ' + k.id); });
    });
    eq([bankaSorunu, harfSorunu, konusuz], [[], [], []], 'sorular eksiksiz, kodlar listede, harfler dengeli, her konudan soru var');
    eq([K.say(K.sec('5', { tur: 'acik' })).soru, K.say(K.sec('5', { tur: 'coktan' })).soru, K.say(K.sec('5', { baglam: 3 })).soru], [16, 24, 5], 'türe ve bağlama göre süzme');
    eq(K.sec('8', { konu: '8-cati' }).map(function (x) { return x.sorular.map(function (q) { return q.kod; }); }), [['T.8.4.20.']], 'konuya göre süzme');
    eq(K.say(K.sec('7', { konu: 'yok' })).soru, 0, 'olmayan konuda soru çıkmaz');
    const m5 = K.metinOlarak('5', {}, false), m5c = K.metinOlarak('5', {}, true);
    ok(m5.indexOf('5. SINIF TÜRKÇE SORU BANKASI\n') === 0 && m5.indexOf('1. BAĞLAM: Sokağın Oyunları (Bilgilendirici metin ve tablo)') > 0 &&
      m5.indexOf('1-5. soruları aşağıdaki bağlama göre cevaplayınız.') > 0 && m5.indexOf('\n40. ') > 0, 'düz metin: başlık, bağlam ve sorular');
    eq([say(m5, '\nA) '), say(m5, '\nD) '), say(m5, 'CEVAP ANAHTARI'), say(m5, 'T.O.5.'), say(m5c, 'CEVAP ANAHTARI')], [24, 24, 0, 0, 1], 'düz metin: seçenekler tam, cevapsız çıktıda kod ve anahtar yok');
    ok(m5.indexOf('Seksek\t2 ve üzeri\tTebeşir, küçük bir taş\tDüz zemin') > 0, 'düz metin: tablo hücreleri sekmeyle ayrılır');
    ok(m5c.indexOf('\n1. B (T.O.5.6.) ') > 0 && m5c.indexOf('\n4. (T.O.5.15.) Örnek: ') > 0 && m5c.indexOf(' Puanlama: ') > 0, 'düz metin: cevap anahtarı satırları');
    const m73 = K.metinOlarak('7', { baglam: 3, tur: 'coktan' }, false);
    ok(m73.indexOf('Söz var, yaz yağmuru gibi serinler,') > 0 && m73.indexOf('Öğrenmenin Düzlüğü') < 0 && m73.indexOf('11-13. soruları') > 0 && m73.indexOf('\n14. ') < 0, 'düz metin: tek bağlam ve tür süzgeci');
    ok(K.metinOlarak('7', { baglam: 7 }, false).indexOf('güvenilir olmadığını gösteren') > 0 && m5.indexOf('*') < 0 && m5c.indexOf('*') < 0, 'düz metinde kalın işareti kalmaz');
    let bankaMetni = JSON.stringify(SINIFLAR.map(function (s) {
      return K.baglamlar(s).map(function (b) { return [b.baslik, b.tur, b.bloklar, b.sorular.map(function (q) { return [q.kok, q.secenekler, q.cevap, q.aciklama]; })]; });
    }));
    eq((bankaMetni.match(/[âîûÂÎÛ–—’“”]/g) || []), [], 'bankada şapkalı harf, uzun çizgi ve kıvrık tırnak yok');
    ok(!/, ama | ama, |[.!?:] Ancak /.test(bankaMetni), 'bankada "ama" virgülsüz, cümle "ancak" ile başlamıyor');
    eq(B.tarih, '2026-11-13', 'bankanın tarihi');

    /* 13) Soru bankası yönergesi */
    function bsecim(ek) {
      const s = { sinif: '7', konular: ['o-soz', 'o-cikarim'], soru: 20, tur: 'coktan', guc: 'karisik', tema: '', not: '', farkli: true, ekIstek: '' };
      Object.keys(ek || {}).forEach(function (k) { s[k] = ek[k]; });
      return s;
    }
    const yb = K.kur(bsecim());
    ok(yb.indexOf('- Sınıf: 7. sınıf\n- Soru sayısı: 20\n- Soru türü: Çoktan seçmeli\n- Güçlük: Kolay, orta ve zor sorular birlikte\n- Konu sayısı: 2\n') > 0 && yb.indexOf('2024 sürümü') > 0, 'banka bilgileri yazılır');
    ok(yb.indexOf('\nKonu 1: Söz varlığı\n- T.O.7.4. ') > 0 && yb.indexOf('\n- T.O.7.21. ') > 0 && yb.indexOf('\nKonu 2: Çıkarım (derin anlam)\n- T.O.7.7. ') > 0 && yb.indexOf('\n- T.O.7.8. ') > 0, 'seçilen konular çıktılarıyla yazılır');
    eq([say(yb, '\n- T.'), say(yb, 'T.O.7.5.'), say(yb, '\nKonu ')], [4, 0, 2], 'seçilmeyen konunun çıktısı yazılmaz');
    ok(yb.indexOf('    a) Metnin bağlamından söz varlığı unsurlarının anlamıyla ilgili ipuçlarını belirleyip ön bilgileriyle ilişkilendirir.') > 0 && yb.indexOf('ölçülen süreç bileşeninin harfi') > 0, 'az çıktıda süreç bileşenleri eklenir');
    ok(yb.indexOf('yaklaşık 5 bağlam gerekir') > 0 && yb.indexOf('en az 180, en çok 250 sözcük olsun (sözcükleri say)') > 0 && yb.indexOf('Her konudan en az bir soru olsun.') > 0, 'bağlam sayısı ve metin uzunluğu');
    ok(yb.indexOf('dil yapıları (dil bilgisi) ayrı bir çıktı olarak ölçülmez') > 0, '5 ila 7. sınıfta dil yapıları uyarısı');
    eq(K.baglamlar('7').map(function (b, i) { return say(yb, '    ' + (i + 1) + ') ' + b.baslik + ' ('); }), [1, 1, 1, 1, 1, 1, 1, 1], 'hazır bankadaki sekiz bağlam sayılır');
    ok(yb.indexOf('    1) Öğrenmenin Düzlüğü (bilgilendirici metin): yeni bir beceri öğrenirken') > 0 && yb.indexOf('aynı ana düşünceyi') > 0, 'hazır bağlamlar konularıyla sayılır');
    eq(SINIFLAR.map(function (s) { return K.baglamlar(s).filter(function (b) { return !b.ozet || /\.$/.test(b.ozet); }).length; }), [0, 0, 0, 0], 'her hazır bağlamın özeti var');
    ok(yb.indexOf('uyak uğruna sözcük uydurma') > 0 && yb.indexOf('yalnız bağlamda gerçekten geçen sözlere gönderme yap') > 0 && yb.indexOf('Ana metinlerin sözcük sayısı istenen aralıkta mı?') > 0, 'denemeden çıkan kurallar: şiirde sözcük, anahtarın bağlama dayanması, sözcük sayısı');
    const ybf = K.kur(bsecim({ farkli: false }));
    ok(ybf.indexOf('hazır soru bankasında') < 0 && ybf.indexOf('Öğrenmenin Düzlüğü') < 0 && yb.indexOf('hazır soru bankasındaki bağlamlara benziyor mu?') > 0, 'farklılık istenmezse bağlam listesi eklenmez');
    ok(yb.indexOf('"devam"') < 0 && K.kur(bsecim({ soru: 21 })).indexOf('en çok 20 soruluk bir bölümü') > 0, 'uzun banka bölüm bölüm istenir');
    ok(yb.indexOf('dört seçenek (A, B, C, D)') > 0 && yb.indexOf('Açık uçlu soru, öğrenciden') < 0 && yb.indexOf('boş satır') < 0, 'çoktan seçmeli kuralları');
    const yba = K.kur(bsecim({ tur: 'acik' })), ybk = K.kur(bsecim({ tur: 'karisik' }));
    ok(yba.indexOf('dört seçenek') < 0 && yba.indexOf('çeldirici') < 0 && yba.indexOf('Açık uçlu soru, öğrenciden') > 0 && yba.indexOf('boş satır') > 0, 'açık uçlu kuralları');
    ok(ybk.indexOf('dört seçenek') > 0 && ybk.indexOf('Açık uçlu soru, öğrenciden') > 0 && ybk.indexOf('yarısı çoktan seçmeli, yarısı açık uçlu') > 0, 'iki tür birlikte');
    eq(['kolay', 'orta', 'zor'].map(function (g) { return K.kur(bsecim({ guc: g })).indexOf('- Güçlük: ' + K.GUCLER[g] + '\n') > 0; }), [true, true, true], 'güçlük seçimi yazılır');
    ok(K.kur(bsecim({ guc: 'zor' })).indexOf('kolay soru yazma') > 0 && yb.indexOf('üçte biri kolay, yarısı orta, kalanı zor') > 0, 'güçlük kuralı seçime göre değişir');
    const ybt = K.kur(bsecim({ tema: 'Okuma Kültürü', not: ' kitap kulüpleri ', ekIstek: 'Şiir kullanma.' }));
    ok(ybt.indexOf('- Tema: Okuma Kültürü\n- Öğretmenin konu notu: kitap kulüpleri\n') > 0 && ybt.indexOf('"Okuma Kültürü" temasıyla ilişkili olsun; öğretmenin konu notunu da gözet.') > 0 && /\nÖĞRETMENİN EK İSTEĞİ\nŞiir kullanma\.$/.test(ybt), 'tema, konu notu ve ek istek');
    ok(yb.indexOf('Tema:') < 0 && yb.indexOf('ÖĞRETMENİN') < 0 && yb.indexOf('Yazma soru') < 0 && yb.indexOf('Yazım ve noktalama sorusunda') < 0, 'verilmeyen alanlar ve ilgisiz kurallar yazılmaz');
    const yby = K.kur(bsecim({ konular: ['y-yazim', 'y-tur'], tur: 'karisik' }));
    ok(yby.indexOf('Yazım ve noktalama sorusunda sınanan kuralın') > 0 && yby.indexOf('yazma görevi bu duruma dayansın') > 0 && yby.indexOf('Yazma sorularında öğrenciye bir yazma amacı') > 0, 'yazma ve yazım konularında ek kurallar');
    const ybh = K.kur(bsecim({ konular: K.konular('7').map(function (k) { return k.id; }), soru: 10 }));
    ok(ybh.indexOf('Süreç bileşenleri bu yönergeye eklenmedi') > 0 && ybh.indexOf('\n    a) ') < 0 && say(ybh, '\n- T.') === 50, 'çok çıktıda bileşenler eklenmez, bütün çıktılar sayılır');
    ok(ybh.indexOf('Soru sayısı konu sayısından az olduğu için') > 0 && ybh.indexOf('Her çıktıdan soru yazman gerekmez') > 0 && ybh.indexOf('yaklaşık 3 bağlam') > 0 && ybh.indexOf('En az bir bağlamda') > 0, 'soru sayısı konulardan azsa uyarı');
    const yb8 = K.kur(bsecim({ sinif: '8', konular: ['8-fiilimsi', '8-cati'] }));
    ok(yb8.indexOf('KONULAR VE KAZANIMLAR') > 0 && yb8.indexOf('\nKonu 1: Fiilimsiler\n- T.8.3.9. ') > 0 && yb8.indexOf('\nKonu 2: Fiilde çatı\n- T.8.4.20. ') > 0 && yb8.indexOf('terimi tanımlatmak yerine') > 0, '8. sınıfta kazanım dili');
    ok(yb8.indexOf('Süreç bileşen') < 0 && yb8.indexOf('süreç bileşeninin harfi') < 0 && yb8.indexOf('öğrenme çıktı') < 0 && yb8.indexOf('dil yapıları (dil bilgisi) ayrı') < 0 && yb8.indexOf('kazanım kodu (listedeki yazımıyla), soru türü') > 0, '8. sınıfta süreç bileşeni ve çıktı sözü yok');
    eq([K.eksikler(bsecim({ konular: [] })).length, K.eksikler(bsecim({ soru: 4 })).length, K.eksikler(bsecim({ soru: 61 })).length,
      K.eksikler(bsecim({ soru: 20.5 })).length, K.eksikler(bsecim({ soru: NaN })).length, K.eksikler(bsecim({ konular: ['yok'] })).length],
    [1, 1, 1, 1, 1, 1], 'eksik seçimler: konu yok, soru sayısı sınır dışı');
    eq([K.eksikler(bsecim()), K.eksikler(bsecim({ soru: 5 })), K.eksikler(bsecim({ soru: 60 })), K.eksikler({ sinif: '9' })], [[], [], [], ['Sınıf seçilmedi.']], 'geçerli seçimde uyarı yok');
    ok(/Hiç konu seçilmedi/.test(hata(function () { K.kur(bsecim({ konular: [] })); })), 'konu yokken banka yönergesi kurulmaz');
    let bkurulan = 0;
    const bsorunlu = [];
    SINIFLAR.forEach(function (s) {
      K.konular(s).forEach(function (k) {
        ['coktan', 'acik', 'karisik'].forEach(function (tur) {
          const m = K.kur(bsecim({ sinif: s, konular: [k.id], tur: tur, soru: 12 }));
          bkurulan++;
          const tamam = m.indexOf('\nKonu 1: ' + k.ad + '\n') > 0 && say(m, '\n- T.') === k.ciktilar.length && say(m, '\nKonu ') === 1 &&
            !/undefined|NaN|\[object|null/.test(m) && m.length < 16000 && !/[–—]/.test(m);
          if (!tamam) bsorunlu.push(s + ' ' + k.id + ' ' + tur);
        });
      });
    });
    eq([bkurulan, bsorunlu], [189, []], '63 konu üç türde sorunsuz kurulur');

    /* 14) Yazım: sayfanın kendi cümlelerinde şapkalı harf ve uzun çizgi yok (MEB metinleri dışında) */
    let cumleler = [y, yc, yk, ym, y8, yb, yba, ybk, ybt, yby, ybh, yb8].join('\n');
    const mebMetinleri = [];
    Object.keys(V.siniflar).forEach(function (s) {
      V.siniflar[s].ciktilar.concat(V.siniflar[s].yil).forEach(function (c) { mebMetinleri.push(c.ad); });
    });
    Object.keys(V.bilesenler).forEach(function (k) { Object.keys(V.bilesenler[k]).forEach(function (h) { mebMetinleri.push(V.bilesenler[k][h]); }); });
    mebMetinleri.sort(function (a, b) { return b.length - a.length; }).forEach(function (m) { cumleler = cumleler.split(m).join(''); });
    cumleler += A.KONTROL_LISTESI.join('\n') + A.EK_YONERGELER.map(function (i) { return i.baslik + i.metin; }).join('\n') + K.KONTROL_LISTESI.join('\n') +
      SINIFLAR.map(function (s) { return K.konular(s).map(function (k) { return k.ad; }).join('\n'); }).join('\n');
    eq((cumleler.match(/[âîûÂÎÛ–—]/g) || []), [], 'şapkalı harf ve uzun çizgi yok');
    ok(!/, ama | ama, |\. Ancak /.test(cumleler), '"ama" virgülsüz, cümle "ancak" ile başlamıyor');
    eq([A.KONTROL_LISTESI.length, A.EK_YONERGELER.length, K.KONTROL_LISTESI.length], [9, 7, 9], 'kontrol listeleri ve hazır istekler');
    ok(y.indexOf('süreç bileşenini mi ölçüyor') > 0 && y8.indexOf('kazanımı mı ölçüyor') > 0 && yb.indexOf('çıktıyı mı ölçüyor') > 0 && yb8.indexOf('kazanımı mı ölçüyor') > 0 &&
      !/[ıaou] mi ölçüyor|[eiöü] mı ölçüyor/.test([y, y8, yb, yb8].join('\n')), 'soru eki önceki sözcüğe uyar');
  } catch (e) {
    kalan++;
    cikti.push('HATA  testler yarıda kesildi: ' + e.message + '\n' + (e.stack || ''));
  }

  const ozet = 'TEST ' + gecen + '/' + (gecen + kalan);
  document.title = ozet;
  document.getElementById('sonuc').textContent = ozet + (kalan ? '  (' + kalan + ' hata)' : '  hepsi geçti') + '\n\n' + cikti.join('\n');
})();
