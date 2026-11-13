/*
 * Türkçe Soru Atölyesi: soru bankası
 * Konu gruplarını, hazır bankanın süzülmesini ve düz metne çevrilmesini,
 * bir de "Soru bankası hazırla" sekmesinin yönergesini kurar. Sayfaya dokunmaz.
 */
(function () {
  'use strict';

  const V = window.SoruVerisi;
  const B = window.SoruBankasi || { siniflar: {} };

  /*
   * Konu başlıkları bu sayfanın gruplamasıdır; kodlar ve adlar programdandır.
   * 5, 6 ve 7. sınıfta çıktının adı kalıba uyan ilk konuya girer (adlar sınıflar arasında koşuttur).
   */
  const MAARIF_KONULARI = [
    { id: 'o-surec', alan: 'Okuma', ad: 'Okuma süreci ve stratejiler', kalip: /materyal seçimini|kıcı oku|strateji|içeriğine yönelik tahminde|Okuma sürecin/ },
    { id: 'o-soz', alan: 'Okuma', ad: 'Söz varlığı', kalip: /söz varlığ/ },
    { id: 'o-yuzey', alan: 'Okuma', ad: 'Yüzey anlam', kalip: /yüzey anlam/ },
    { id: 'o-gorsel', alan: 'Okuma', ad: 'Görsel ve çoklu ortam', kalip: /Görselle|oklu ortam/ },
    { id: 'o-cikarim', alan: 'Okuma', ad: 'Çıkarım (derin anlam)', kalip: /derin anlam/ },
    { id: 'o-karsilastirma', alan: 'Okuma', ad: 'Karşılaştırma ve sınıflandırma', kalip: /karşılaştır|sınıflandır/ },
    { id: 'o-yapi', alan: 'Okuma', ad: 'Metin yapısı, bölümler ve anahtar kelimeler', kalip: /hik.ye unsurları|metin yapıları|anahtar kelime|bölümlerini/ },
    { id: 'o-siir', alan: 'Okuma', ad: 'Şiir ve söz sanatları', kalip: /iirin biçim|söz sanatları/ },
    { id: 'o-dusunce', alan: 'Okuma', ad: 'Düşünceyi geliştirme yolları ve ikna', kalip: /düşünceyi geliştirme|ikna etme/ },
    { id: 'o-yorum', alan: 'Okuma', ad: 'Yorum, özet ve değerlendirme', kalip: /yorumla|özetle|değerlendir|eleştir|çözüm üret/ },
    { id: 'y-surec', alan: 'Yazma', ad: 'Yazma süreci ve planlama', kalip: /Yazma sürecin|strateji|ön bilgilerinden|tahminlerinden/ },
    { id: 'y-icerik', alan: 'Yazma', ad: 'Yazıda içerik ve yapı', kalip: /içerik ve yapıya|çoklu ortam|üşünceyi geliştirme/ },
    { id: 'y-tur', alan: 'Yazma', ad: 'Yazma amaçları (yaratıcı yazı, karşılaştırma, yorum, özet, tartışma)',
      kalip: /aratıcı|karşılaştırma|sınıflandırma|orumunu|özetleyebilme|eğerlendirmesini|tartışabilme|leştirisini|roblem|tepki/ },
    { id: 'y-soz', alan: 'Yazma', ad: 'Yazıda söz varlığı ve anlatım', kalip: /söz varlığ|açık ve örtük|bağlantı ifadeleri/ },
    { id: 'y-yazim', alan: 'Yazma', ad: 'Yazım ve noktalama', kalip: /azım/ }
  ];

  /* 8. sınıf (2019 programı): kazanımlar numaralarıyla sayılır. "3." okuma, "4." yazma kazanımlarıdır. */
  const SEKIZ_KONULARI = [
    { id: '8-okuma-sureci', ad: 'Okuma süreci ve stratejiler', kodlar: ['3.1', '3.2', '3.3', '3.4', '3.12', '3.15'] },
    { id: '8-soz', ad: 'Söz varlığı (sözcük, deyim, atasözü)', kodlar: ['3.5', '3.6'] },
    { id: '8-sanat', ad: 'Söz sanatları', kodlar: ['3.7'] },
    { id: '8-bozukluk', ad: 'Anlatım bozuklukları', kodlar: ['3.8'] },
    { id: '8-fiilimsi', ad: 'Fiilimsiler', kodlar: ['3.9'] },
    { id: '8-baglanti', ad: 'Geçiş ve bağlantı ifadeleri', kodlar: ['3.10', '4.15'] },
    { id: '8-anlatim', ad: 'Anlatım biçimleri ve düşünceyi geliştirme yolları', kodlar: ['3.11', '3.34', '4.9'] },
    { id: '8-paragraf', ad: 'Konu, ana fikir, yardımcı fikir, başlık', kodlar: ['3.16', '3.17', '3.18', '3.19', '4.13'] },
    { id: '8-anlama', ad: 'Metni anlama, yorum ve çıkarım', kodlar: ['3.14', '3.21', '3.22', '3.25', '3.28'] },
    { id: '8-tur', ad: 'Metin türleri ve öykü unsurları', kodlar: ['3.20', '3.24', '3.26'] },
    { id: '8-karsilastirma', ad: 'Metinler arası karşılaştırma', kodlar: ['3.23', '3.33'] },
    { id: '8-gorsel', ad: 'Görsel, grafik ve tablo', kodlar: ['3.27', '3.32', '4.5'] },
    { id: '8-medya', ad: 'Medya ve bilgi kaynakları', kodlar: ['3.29', '3.30', '3.31'] },
    { id: '8-ozet', ad: 'Özetleme, iş ve işlem basamakları', kodlar: ['3.13', '3.35', '4.6'] },
    { id: '8-oge', ad: 'Cümlenin ögeleri', kodlar: ['4.18'] },
    { id: '8-cumle', ad: 'Cümle türleri', kodlar: ['4.19'] },
    { id: '8-cati', ad: 'Fiilde çatı', kodlar: ['4.20'] },
    { id: '8-yazma', ad: 'Yazma (metin yazma, düzenleme, söz varlığı)',
      kodlar: ['4.1', '4.2', '4.3', '4.4', '4.7', '4.8', '4.10', '4.12', '4.14', '4.16', '4.17'] }
  ];

  const TURLER = { coktan: 'Çoktan seçmeli', acik: 'Açık uçlu', karisik: 'Çoktan seçmeli ve açık uçlu birlikte' };
  const TUR_ADI = { coktan: 'Çoktan seçmeli', acik: 'Açık uçlu' };
  const GUCLER = {
    karisik: 'Kolay, orta ve zor sorular birlikte',
    kolay: 'Kolay sorular ağırlıkta',
    orta: 'Orta güçlükte sorular ağırlıkta',
    zor: 'Zor sorular ağırlıkta'
  };
  const UZUNLUK = { '5': '120-180', '6': '150-220', '7': '180-250', '8': '200-280' };
  const EN_AZ = 5, EN_COK = 60, PARCA = 20, BILESEN_SINIRI = 12;

  function sinifVerisi(sinif) {
    const s = V.siniflar[String(sinif)];
    if (!s) throw new Error('Bu sınıf için veri yok: ' + sinif);
    return s;
  }

  function temiz(metin) {
    return String(metin || '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  }

  /* Sınıfın konuları: her biri kendi çıktılarıyla. Çıktısı olmayan konu listeye girmez. */
  const konuBellegi = {};
  function konular(sinif) {
    sinif = String(sinif);
    if (konuBellegi[sinif]) return konuBellegi[sinif];
    const s = sinifVerisi(sinif);
    let liste;
    if (s.program === '2019') {
      liste = SEKIZ_KONULARI.map(function (k) {
        const kodlar = k.kodlar.map(function (n) { return 'T.' + sinif + '.' + n + '.'; });
        const ciktilar = s.yil.filter(function (c) { return kodlar.indexOf(c.kod) >= 0; });
        return { id: k.id, ad: k.ad, alan: '', ciktilar: ciktilar };
      });
    } else {
      liste = MAARIF_KONULARI.map(function (k) { return { id: k.id, ad: k.ad, alan: k.alan, ciktilar: [] }; });
      s.yil.forEach(function (c) {
        for (let i = 0; i < MAARIF_KONULARI.length; i++) {
          if (MAARIF_KONULARI[i].alan === c.alan && MAARIF_KONULARI[i].kalip.test(c.ad)) { liste[i].ciktilar.push(c); return; }
        }
      });
    }
    konuBellegi[sinif] = liste.filter(function (k) { return k.ciktilar.length > 0; });
    return konuBellegi[sinif];
  }

  function konuBul(sinif, kod) {
    const liste = konular(sinif);
    for (let i = 0; i < liste.length; i++) {
      if (liste[i].ciktilar.some(function (c) { return c.kod === kod; })) return liste[i];
    }
    return null;
  }

  function ciktiBul(sinif, kod) {
    const bulunan = sinifVerisi(sinif).yil.filter(function (c) { return c.kod === kod; });
    return bulunan[0] || null;
  }

  /* ---------- Hazır banka ---------- */

  function baglamlar(sinif) {
    return ((B.siniflar[String(sinif)] || {}).baglamlar) || [];
  }

  /* Süzgeç: { konu: konu kimliği ya da '', tur: 'coktan' | 'acik' | '', baglam: bağlam no ya da 0 } */
  function sec(sinif, suzgec) {
    suzgec = suzgec || {};
    const sonuc = [];
    baglamlar(sinif).forEach(function (b) {
      if (suzgec.baglam && b.no !== suzgec.baglam) return;
      const sorular = b.sorular.filter(function (q) {
        if (suzgec.tur && q.tur !== suzgec.tur) return false;
        if (suzgec.konu) {
          const k = konuBul(sinif, q.kod);
          if (!k || k.id !== suzgec.konu) return false;
        }
        return true;
      });
      if (sorular.length) sonuc.push({ baglam: b, sorular: sorular });
    });
    return sonuc;
  }

  function say(secilen) {
    let coktan = 0, acik = 0;
    secilen.forEach(function (s) { s.sorular.forEach(function (q) { if (q.tur === 'coktan') coktan++; else acik++; }); });
    return { baglam: secilen.length, soru: coktan + acik, coktan: coktan, acik: acik };
  }

  function duz(metin) { return String(metin).replace(/\*([^*]+)\*/g, '$1'); }

  function blokMetni(blok) {
    const y = [];
    if (blok.baslik) y.push(blok.baslik);
    if (blok.t === 'metin') blok.p.forEach(function (p) { y.push(p); });
    else if (blok.t === 'kutu') blok.satirlar.forEach(function (s) { y.push(s); });
    else if (blok.t === 'siir') blok.kitalar.forEach(function (k, i) { if (i) y.push(''); k.forEach(function (d) { y.push(d); }); });
    else blok.satirlar.forEach(function (s) { y.push(s.join('\t')); });
    return y.join('\n');
  }

  /* Seçilen soruları Word'e yapıştırılabilecek düz metne çevirir. Tablo hücreleri sekmeyle ayrılır. */
  function metinOlarak(sinif, suzgec, cevapli) {
    const secilen = sec(sinif, suzgec);
    const y = [sinif + '. SINIF TÜRKÇE SORU BANKASI', ''];
    secilen.forEach(function (s) {
      const b = s.baglam;
      const nolar = s.sorular.map(function (q) { return q.no; });
      y.push(b.no + '. BAĞLAM: ' + b.baslik + ' (' + b.tur + ')');
      y.push(nolar.length > 1
        ? nolar[0] + '-' + nolar[nolar.length - 1] + '. soruları aşağıdaki bağlama göre cevaplayınız.'
        : nolar[0] + '. soruyu aşağıdaki bağlama göre cevaplayınız.');
      y.push('');
      b.bloklar.forEach(function (blok) { y.push(blokMetni(blok)); y.push(''); });
      s.sorular.forEach(function (q) {
        q.kok.forEach(function (k, i) { y.push((i === 0 ? q.no + '. ' : '') + duz(k)); });
        if (q.tur === 'coktan') q.secenekler.forEach(function (sec, i) { y.push('ABCD'[i] + ') ' + duz(sec)); });
        y.push('');
      });
    });
    if (cevapli) {
      y.push('CEVAP ANAHTARI');
      secilen.forEach(function (s) {
        s.sorular.forEach(function (q) {
          y.push(q.tur === 'coktan'
            ? q.no + '. ' + q.cevap + ' (' + q.kod + ') ' + duz(q.aciklama)
            : q.no + '. (' + q.kod + ') ' + duz(q.cevap) + ' Puanlama: ' + duz(q.aciklama));
        });
      });
    }
    return y.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /* ---------- "Soru bankası hazırla" yönergesi ---------- */

  function seciliKonular(secim) {
    const istenen = secim.konular || [];
    return konular(secim.sinif).filter(function (k) { return istenen.indexOf(k.id) >= 0; });
  }

  function eksikler(secim) {
    if (!secim || !V.siniflar[String(secim.sinif)]) return ['Sınıf seçilmedi.'];
    const liste = [];
    if (seciliKonular(secim).length === 0) liste.push('Hiç konu seçilmedi: en az bir konuyu işaretleyin.');
    const n = Number(secim.soru);
    if (!(n >= EN_AZ && n <= EN_COK && Math.floor(n) === n)) {
      liste.push('Soru sayısı ' + EN_AZ + ' ile ' + EN_COK + ' arasında bir tam sayı olmalı.');
    }
    return liste;
  }

  function kur(secim) {
    const sorunlar = eksikler(secim);
    if (sorunlar.length) throw new Error(sorunlar[0]);

    const sinif = String(secim.sinif);
    const s = sinifVerisi(sinif);
    const kazanim = s.program === '2019';
    const birim = kazanim ? 'kazanım' : 'öğrenme çıktısı';
    const tur = TURLER[secim.tur] ? secim.tur : 'coktan';
    const guc = GUCLER[secim.guc] ? secim.guc : 'karisik';
    const soru = Number(secim.soru);
    const secili = seciliKonular(secim);
    const ciktilar = [];
    secili.forEach(function (k) { k.ciktilar.forEach(function (c) { ciktilar.push(c); }); });
    const yazmaVar = ciktilar.some(function (c) { return c.alan === 'Yazma'; });
    const yazimVar = ciktilar.some(function (c) { return /yazım|noktalama/i.test(c.ad); }) || secili.some(function (k) { return k.id === '8-yazma'; });
    const bilesenli = !kazanim && ciktilar.length <= BILESEN_SINIRI && ciktilar.some(function (c) { return V.bilesenler[c.kod]; });
    const tema = temiz(secim.tema), not = temiz(secim.not), ek = temiz(secim.ekIstek);
    const baglamSayisi = Math.max(1, Math.round(soru / 4));
    const hazir = secim.farkli ? baglamlar(sinif) : [];

    const y = [];
    y.push('Türkiye Yüzyılı Maarif Modeli\'ndeki anlayışa uygun, bağlam temelli bir ortaokul Türkçe soru bankası hazırlamanı istiyorum. ' +
      'Deneyimli bir Türkçe öğretmeni ve ölçme değerlendirme uzmanı gibi çalış. Aşağıdaki bilgilerin dışına çıkma. ' +
      'Emin olmadığın bir bilgi varsa uydurma; cevabının sonundaki "Öğretmene notlar" bölümünde belirt.');
    y.push('');
    y.push('BANKA BİLGİLERİ');
    y.push('- Sınıf: ' + sinif + '. sınıf');
    y.push('- Soru sayısı: ' + soru);
    y.push('- Soru türü: ' + TURLER[tur]);
    y.push('- Güçlük: ' + GUCLER[guc]);
    y.push('- Konu sayısı: ' + secili.length);
    if (tema) y.push('- Tema: ' + tema);
    if (not) y.push('- Öğretmenin konu notu: ' + not);
    y.push('- Öğretim programı: ' + s.programAdi);
    y.push('');

    y.push(kazanim ? 'KONULAR VE KAZANIMLAR' : 'KONULAR VE ÖĞRENME ÇIKTILARI');
    y.push('Sorular yalnız aşağıdaki ' + (kazanim ? 'kazanımları' : 'öğrenme çıktılarını') + ' ölçsün. Kodlar ve adlar öğretim programından alındı; ' +
      'kodu ve adı değiştirme, listede olmayan bir ' + birim + ' ekleme. Konu başlıkları yalnız gruplama içindir.');
    y.push('Soruları konulara dengeli dağıt.' + (soru >= secili.length
      ? ' Her konudan en az bir soru olsun.'
      : ' Soru sayısı konu sayısından az olduğu için hangi konulardan soru yazdığını notlarda belirt.') +
      (ciktilar.length > soru ? ' Her ' + (kazanim ? 'kazanımdan' : 'çıktıdan') + ' soru yazman gerekmez; konuyu en iyi ölçenleri seç.' : ''));
    if (kazanim) {
      y.push('8. sınıf 2019 programıyla okuyor; kazanımların süreç bileşeni yok. Dil bilgisi kazanımlarında da soruyu bir metne, ' +
        'cümle grubuna ya da yazma durumuna dayandır; terimi tanımlatmak yerine kullanımını ve anlama katkısını sor.');
    } else {
      y.push('Programa göre dil yapıları (dil bilgisi) ayrı bir çıktı olarak ölçülmez. Terim ezberi isteyen soru yazma ' +
        '("Bu sözcüğün türü nedir?" gibi). Dil yapıları yalnız anlama ve anlatıma katkısıyla, aşağıdaki çıktılardan birine bağlı olarak soruya girebilir.');
      y.push(bilesenli
        ? 'Süreç bileşeni verilen çıktılarda soru o bileşenlerden birini ya da birkaçını ölçsün; hangisini ölçtüğünü eşleştirme tablosunda harfiyle yaz.'
        : 'Süreç bileşenleri bu yönergeye eklenmedi; soruyu çıktının adına göre yaz, bileşen harfi uydurma.');
    }
    y.push('');
    secili.forEach(function (k, i) {
      y.push('Konu ' + (i + 1) + ': ' + k.ad);
      k.ciktilar.forEach(function (c) {
        y.push('- ' + c.kod + ' ' + c.ad);
        const b = bilesenli ? V.bilesenler[c.kod] : null;
        if (b) Object.keys(b).forEach(function (h) { y.push('    ' + h + ') ' + b[h]); });
        if (bilesenli && V.notlar[c.kod]) y.push('    Not: ' + V.notlar[c.kod]);
      });
    });
    y.push('');

    y.push('BAĞLAM (METİN VE GÖRSEL)');
    y.push('- Metinleri sen yaz; metinler özgün olsun. Gerçek bir yazara, kitaba ya da kişiye ait gibi gösterme, alıntı uydurma. ' +
      'Ders kitaplarındaki ya da bilinen eserlerdeki metinleri yeniden yazma.');
    y.push('- Her bağlama 3 ile 5 soru bağla. Bu banka için yaklaşık ' + baglamSayisi + ' bağlam gerekir.');
    y.push('- Bağlam türlerini çeşitlendir: bilgilendirici metin, öyküleyici metin, şiir, tablo ya da çizelge, duyuru ya da afiş, ' +
      'mesajlaşma ya da e-posta, öğrenci taslağı. Aynı tür art arda gelmesin; türü ölçülecek ' + (kazanim ? 'kazanıma' : 'çıktıya') + ' göre seç.');
    y.push('- Öyküleyici ve bilgilendirici ana metinler en az ' + UZUNLUK[sinif].split('-')[0] + ', en çok ' + UZUNLUK[sinif].split('-')[1] +
      ' sözcük olsun (sözcükleri say); duyuru, tablo ve şiir gibi bağlamlar daha kısa olabilir.');
    y.push('- Şiir yazarsan ölçü ya da uyak uğruna sözcük uydurma, sözcüğün biçimini bozma ("ışıldadı" yerine "ışıldı" gibi). ' +
      'Uyak tutmuyorsa sözcüğü değil dizeyi değiştir.');
    if (tema || not) {
      y.push('- Metinlerin konusu ' + (tema ? '"' + tema + '" temasıyla' : 'öğretmenin konu notuyla') + ' ilişkili olsun' +
        (tema && not ? '; öğretmenin konu notunu da gözet.' : '.'));
    }
    y.push('- Dil, söz varlığı ve cümle uzunluğu ' + sinif + '. sınıf düzeyine uygun olsun.');
    y.push('- Öğrencinin gerçekten karşılaşabileceği, herkesin bildiği ortamları seç (okul, ev, mahalle, park, doğa, alışveriş). ' +
      'Kültür, cinsiyet, bölge, din ve ideoloji bakımından tarafsız ol; hiçbir kişi ya da grup hakkında olumsuz çağrışım olmasın.');
    y.push('- En az ' + (baglamSayisi >= 4 ? 'iki bağlamda' : 'bir bağlamda') + ' yazıyla kurulabilen bir görsel öge olsun (tablo, çizelge, duyuru, liste). ' +
      'Görsel öge metni tekrar etmesin ve en az bir sorunun çözümü için gerekli olsun. Çizim ya da fotoğraf gerektiren görsel kullanma.');
    y.push('- Bilgilendirici metinde doğruluğundan emin olmadığın tarih, sayı ve isim kullanma. Kullandıysan notlarda "kontrol edilmeli" diye belirt.');
    y.push('- Gerçek öğrenci, öğretmen ya da okul adı kullanma; kurgu adlar kullanabilirsin.');
    if (hazir.length) {
      y.push('- Aşağıdaki bağlamlar öğretmenin elindeki hazır soru bankasında var; her birinin konusu yanında yazıyor. ' +
        'Bunlardan farklı konular ve farklı kurgular seç; aynı başlığı, aynı olayı, aynı ana düşünceyi, aynı kişileri ya da aynı tabloyu kullanma:');
      hazir.forEach(function (b, i) {
        y.push('    ' + (i + 1) + ') ' + b.baslik + ' (' + b.tur.toLocaleLowerCase('tr') + ')' + (b.ozet ? ': ' + b.ozet : ''));
      });
    }
    y.push('');

    y.push('SORU YAZIM KURALLARI');
    const kurallar = [];
    kurallar.push('Her soru tek bir ' + (kazanim ? 'kazanımı' : 'öğrenme çıktısını') + ' ölçsün.');
    kurallar.push('Bağlam süs olmasın: metin ve görsel kapatıldığında cevaplanabilen ' + (yazmaVar ? 'okuma sorusunu' : 'soruyu') + ' ya da bağlamını yeniden kur.' +
      (yazmaVar ? ' Yazma sorularında bağlam, yazma durumunu ve malzemesini verir (duyuru, taslak, söz havuzu gibi); yazma görevi bu duruma dayansın.' : ''));
    kurallar.push('Çıkarım isteyen sorularda cevap metinde hazır durmasın. Yüzey anlam sorularında cevap metinde ya da görselde açıkça yer alsın.');
    kurallar.push('Sorular birbirinden bağımsız çözülsün. Bir sorunun kökü, seçenekleri ya da bağlamı başka bir sorunun cevabını vermesin.');
    if (yazimVar) {
      kurallar.push('Yazım ve noktalama sorusunda sınanan kuralın doğru yazılmış örneği aynı bağlamın başka bir yerinde hazır durmasın.');
    }
    kurallar.push('Soru kökü kısa ve açık olsun; kökte konu anlatma, bilgi bağlamda dursun.');
    kurallar.push('Çift olumsuz kullanma. Kökte tek bir olumsuzluk varsa olumsuzluk bildiren sözcüğü kalın yaz.');
    kurallar.push('"Sizce", "size göre" gibi öznel ifadeler kullanma; "Metne göre", "Tabloya göre" gibi bağlama gönderme yap.');
    kurallar.push('Yazım, noktalama ve anlatım Türk Dil Kurumunun kurallarına uygun olsun. Bankada yazım yanlışı bulunmasın ' +
      '(öğrencinin düzeltmesi için bilerek konan yanlışlar dışında). Sık yapılan iki yanlışa dikkat et: belirli bir tarih bildirmeyen gün ve ay adları ' +
      'küçük harfle başlar ("salı günü", "eylülde"); konuşmaları ya tırnak içinde ya da konuşma çizgisiyle ver, ikisini karıştırma.');
    if (tur !== 'acik') {
      kurallar.push('Çoktan seçmeli sorularda dört seçenek (A, B, C, D) ve tek doğru cevap olsun. "Hepsi", "Hiçbiri", "A ve B" gibi seçenekler kullanma.');
      kurallar.push('Çeldiriciler rastgele yanlışlar olmasın; konuyu eksik ya da yanlış öğrenmiş öğrencinin düşeceği yanılgılara dayansın.');
      kurallar.push('Seçenekler uzunluk, dil yapısı ve ayrıntı bakımından benzer olsun; doğru cevap ötekilerden uzun ya da ayrıntılı olmasın.');
      kurallar.push('Metindeki bir cümleyi ya da söz öbeğini seçeneğe aynen taşıma; anlamca özdeşini başka sözcüklerle yaz.');
      kurallar.push('Doğru cevapların harfleri dengeli dağılsın; aynı harf art arda üç kez gelmesin.');
    }
    if (tur !== 'coktan') {
      kurallar.push('Açık uçlu soru, öğrenciden ne kadar yazması beklendiğini söylesin (kaç örnek, kaç cümle, kaç sözcük).');
      if (yazmaVar) kurallar.push('Yazma sorularında öğrenciye bir yazma amacı ve durumu ver.');
    }
    if (tur === 'karisik') {
      kurallar.push('Soruların yaklaşık yarısı çoktan seçmeli, yarısı açık uçlu olsun; bağlamların çoğunda iki türden de soru bulunsun.');
    }
    if (tur === 'coktan' && yazmaVar) {
      kurallar.push('Yazma alanındaki ' + (kazanim ? 'kazanımları' : 'çıktıları') + ' çoktan seçmeli soruyla ölçerken öğrenciye bir yazma durumu ya da taslak ver ' +
        've en uygun seçimi sor (örneğin taslaktaki yanlışı bulma, boşluğa uygun ifadeyi seçme, amaca uygun cümleyi belirleme).');
    }
    kurallar.push({
      karisik: 'Soruların yaklaşık üçte biri kolay, yarısı orta, kalanı zor olsun.',
      kolay: 'Soruların çoğu kolay, birkaçı orta güçlükte olsun; zor soru yazma.',
      orta: 'Soruların çoğu orta güçlükte olsun; birkaç kolay ve birkaç zor soru ekle.',
      zor: 'Soruların çoğu zor, birkaçı orta güçlükte olsun; kolay soru yazma.'
    }[guc] + ' Kolay soru tek bir bilgiyi bulmayı, orta soru iki bilgiyi ilişkilendirmeyi, zor soru metnin bütününden ya da metinle görselin ' +
      'birlikte kullanılmasından sonuç çıkarmayı gerektirsin. Güçlüğü metni uzatarak ya da dili ağırlaştırarak değil, istenen düşünme işiyle ayarla.');
    kurallar.forEach(function (k, i) { y.push((i + 1) + '. ' + k); });
    y.push('');

    y.push('CEVAP ANAHTARI');
    if (tur !== 'acik') y.push('- Her çoktan seçmeli soru için doğru cevabı ve her çeldiricinin gerekçesini (hangi yanılgıya dayandığını) yaz.');
    if (tur !== 'coktan') {
      y.push('- Her açık uçlu soru için tam puan alan örnek cevabı, kısmi puan alan cevapları ve puan almayan yaygın yanlışları yaz. ' +
        'Birden fazla doğru cevabı olabilen sorularda "metinden kanıtla desteklenen başka cevaplar da kabul edilir" notunu ekle.');
    }
    y.push('- Gerekçelerde yalnız bağlamda gerçekten geçen sözlere gönderme yap. Bağlamı sonradan değiştirdiysen cevap anahtarını da baştan denetle.');
    y.push('');

    y.push('SON KONTROL');
    y.push('Cevabını vermeden önce her soruyu aşağıdaki sorularla denetle; geçemeyen soruyu yeniden yaz.');
    const kontrol = [
      'Metin ve görsel kapatılınca ' + (yazmaVar ? 'okuma sorusu' : 'soru') + ' cevaplanabiliyor mu? (Cevaplanabiliyorsa geçmez.)',
      'Soru, eşleştirildiği ' + (kazanim ? 'kazanımı' : 'çıktıyı') + ' mı ölçüyor, başka bir beceriye mi kayıyor?',
      'Tek doğru cevap ya da açık bir kabul listesi var mı?',
      'Başka bir sorunun kökü, seçenekleri ya da bağlamı bu sorunun cevabını veriyor mu?',
      'Dil ' + sinif + '. sınıf düzeyine uygun mu; yazım ve noktalama temiz mi?',
      'Soru sayısı tam ' + soru + ' mi; sorular konulara dengeli dağılmış mı?',
      'Ana metinlerin sözcük sayısı istenen aralıkta mı? Cevap anahtarında andığın her söz bağlamda gerçekten geçiyor mu?'
    ];
    if (tur !== 'acik') kontrol.push('Seçenek uzunlukları dengeli mi; doğru cevap metinden aynen alınmış mı; doğru cevap harfleri dengeli mi?');
    if (hazir.length) kontrol.push('Bağlamlardan biri hazır soru bankasındaki bağlamlara benziyor mu? (Benziyorsa değiştir.)');
    kontrol.forEach(function (k, i) { y.push((i + 1) + '. ' + k); });
    y.push('');

    y.push('CEVABININ BİÇİMİ');
    y.push('Cevabını aşağıdaki bölümlerle, bu sırayla ve bu başlıklarla ver. Giriş ya da kapanış cümlesi ekleme. ' +
      'Metin Word\'e yapıştırılacak: tabloları tablo olarak ver, başlıkları kalın yaz, süsleme kullanma.');
    y.push('A. SORU BANKASI: bağlamlar ve sorular. Her bağlamın üstüne hangi soruların ona göre cevaplanacağını yaz ' +
      '("1-4. soruları aşağıdaki metne göre cevaplayınız."). Soruları baştan sona tek sıra numarala. Bu bölümde ' +
      (kazanim ? 'kazanım' : 'çıktı') + ' kodu, cevap ya da ipucu bulunmasın.' +
      (tur !== 'coktan' ? ' Açık uçlu soruların altına cevap için yeterli sayıda boş satır bırak.' : ''));
    y.push('B. EŞLEŞTİRME TABLOSU: soru no, konu, ' + (kazanim ? 'kazanım kodu' : 'çıktı kodu') + ' (listedeki yazımıyla)' +
      (bilesenli ? ', ölçülen süreç bileşeninin harfi (verildiyse)' : '') + ', soru türü, güçlük düzeyi.');
    y.push('C. CEVAP ANAHTARI');
    y.push('D. ÖĞRETMENE NOTLAR: kontrol edilmesi gereken bilgiler, emin olmadığın noktalar, sınıfa göre değiştirilebilecek yerler. Yoksa "Yok" yaz.');
    if (soru > PARCA) {
      y.push('Banka uzun olduğu için parça parça ver: Her seferinde en çok ' + PARCA + ' soruluk bir bölümü dört başlığıyla birlikte yaz, ' +
        'sonra dur ve benden "devam" yazmamı bekle. Soru numaraları bölümler arasında kaldığı yerden sürsün.');
    }

    if (ek) {
      y.push('');
      y.push('ÖĞRETMENİN EK İSTEĞİ');
      y.push(ek);
    }
    return y.join('\n');
  }

  /* Öğretmenin gelen soru bankasını denetlerken bakacağı liste */
  const KONTROL_LISTESI = [
    'Metni ve tabloyu kapatıp soruları okuyun: bağlama bakmadan cevaplanabilen soru var mı?',
    'Çoktan seçmeli soruları cevap anahtarına bakmadan çözün: tek doğru cevap var mı, anahtar doğru mu? Anahtardaki gerekçeler metinde gerçekten geçen sözlere mi dayanıyor?',
    'Her soru eşleştirildiği çıktıyı mı ölçüyor? Sorular seçtiğiniz konulara dengeli dağılmış mı?',
    'Doğru seçenek ötekilerden uzun ya da ayrıntılı mı? Doğru cevap harfleri dengeli mi?',
    'Bir soru başka bir sorunun cevabını ele veriyor mu?',
    'Metindeki tarih, sayı ve isimler doğru mu? Yapay zeka emin olmadığı bilgiyi de kendinden emin yazabilir.',
    'Yazım, noktalama ve anlatım temiz mi? Gün ve ay adlarının büyük harfine, konuşma çizgilerine, şiirlerde uyak uğruna bozulmuş sözcüklere özellikle bakın.',
    'Bağlamlar hazır soru bankasındakilerden ve daha önce kullandıklarınızdan gerçekten farklı mı?',
    'Güçlük sınıfınıza uygun mu? Değilse aynı sohbette hangi soruların kolaylaştırılacağını ya da zorlaştırılacağını yazın.'
  ];

  window.BankaAtolyesi = {
    TURLER: TURLER,
    TUR_ADI: TUR_ADI,
    GUCLER: GUCLER,
    EN_AZ: EN_AZ,
    EN_COK: EN_COK,
    konular: konular,
    konuBul: konuBul,
    ciktiBul: ciktiBul,
    baglamlar: baglamlar,
    sec: sec,
    say: say,
    metinOlarak: metinOlarak,
    eksikler: eksikler,
    kur: kur,
    KONTROL_LISTESI: KONTROL_LISTESI
  };
})();
