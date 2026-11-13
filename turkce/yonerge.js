/*
 * Türkçe Soru Atölyesi: yönerge kurucu
 * Seçimlerden, bir yapay zeka sohbetine yapıştırılacak yönerge metnini üretir.
 * Sayfaya dokunmaz; arayüz ve testler bu dosyadaki işlevleri kullanır.
 */
(function () {
  'use strict';

  const V = window.SoruVerisi;

  const TURLER = {
    acik: 'Açık uçlu',
    coktan: 'Çoktan seçmeli',
    karisik: 'Açık uçlu, yanında çoktan seçmeli ek sorular'
  };

  /* Ana metnin sözcük sayısı için başlangıç aralıkları (programda yazmaz, deneyerek ayarlanır) */
  const UZUNLUK = { '5': '120-180', '6': '150-220', '7': '180-250', '8': '200-280' };

  const OZEL = 'Kendim seçeceğim';

  function sinifVerisi(sinif) {
    const s = V.siniflar[String(sinif)];
    if (!s) throw new Error('Bu sınıf için veri yok: ' + sinif);
    return s;
  }

  /* Sınav adları: tablosu olanlar ve yalnız notu olanlar (ör. ülke geneli sınav) */
  function sinavlar(sinif) {
    const s = sinifVerisi(sinif);
    const adlar = Object.keys(s.sinavlar);
    Object.keys(s.sinavNotlari || {}).forEach(function (a) { if (adlar.indexOf(a) < 0) adlar.push(a); });
    return adlar.sort(function (a, b) { return a.localeCompare(b, 'tr'); });
  }

  function senaryolar(sinif, sinav) {
    return Object.keys(sinifVerisi(sinif).sinavlar[sinav] || {});
  }

  function senaryoAdetleri(sinif, sinav, senaryo) {
    const kaynak = (sinifVerisi(sinif).sinavlar[sinav] || {})[senaryo] || {};
    const kopya = {};
    Object.keys(kaynak).forEach(function (k) { kopya[k] = kaynak[k]; });
    return kopya;
  }

  function toplam(adetler) {
    return Object.keys(adetler || {}).reduce(function (t, k) { return t + (Number(adetler[k]) || 0); }, 0);
  }

  function ayniMi(a, b) {
    const ka = Object.keys(a).filter(function (k) { return a[k] > 0; }).sort();
    const kb = Object.keys(b).filter(function (k) { return b[k] > 0; }).sort();
    return ka.length === kb.length && ka.every(function (k, i) { return k === kb[i] && a[k] === b[k]; });
  }

  /* Seçili çıktılar, tablodaki sırayla */
  function seciliCiktilar(sinif, adetler) {
    return sinifVerisi(sinif).ciktilar
      .filter(function (c) { return Number(adetler[c.kod]) > 0; })
      .map(function (c) {
        return {
          kod: c.kod, ad: c.ad, alan: c.alan, adet: Number(adetler[c.kod]),
          bilesenler: V.bilesenler[c.kod] || null, not: V.notlar[c.kod] || null
        };
      });
  }

  function baglamSayisi(soru) {
    if (soru <= 3) return 'bir';
    if (soru <= 5) return 'bir ya da iki';
    if (soru <= 8) return 'iki ya da üç';
    return 'üç ya da dört';
  }

  function temiz(metin) {
    return String(metin || '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  }

  /* Eksik ya da tutarsız seçimler: boş dizi dönerse yönerge kurulabilir */
  function eksikler(secim) {
    const liste = [];
    if (!secim || !V.siniflar[String(secim.sinif)]) return ['Sınıf seçilmedi.'];
    const n = toplam(secim.adetler);
    if (n === 0) liste.push('Hiç soru yok: bir senaryo seçin ya da çıktıların yanına soru sayısı yazın.');
    if (n > 30) liste.push('Soru sayısı çok yüksek (' + n + '). Bir sınav için en fazla 30 soru yazılabilir.');
    if (secim.metinKaynagi === 'ogretmen' && temiz(secim.metin).length < 80) {
      liste.push('Kendi metninizi kullanmayı seçtiniz ama metin kutusu boş ya da çok kısa.');
    }
    if (!(Number(secim.sure) >= 5 && Number(secim.sure) <= 240)) liste.push('Süre 5 ile 240 dakika arasında olmalı.');
    if (!(Number(secim.puan) >= 1 && Number(secim.puan) <= 1000)) liste.push('Toplam puan 1 ile 1000 arasında olmalı.');
    return liste;
  }

  function kur(secim) {
    const sorunlar = eksikler(secim);
    if (sorunlar.length) throw new Error(sorunlar[0]);

    const sinif = String(secim.sinif);
    const s = sinifVerisi(sinif);
    const tur = TURLER[secim.tur] ? secim.tur : 'acik';
    const ciktilar = seciliCiktilar(sinif, secim.adetler);
    const soru = toplam(secim.adetler);
    const sure = Number(secim.sure), puan = Number(secim.puan);
    const kazanim = s.program === '2019';
    const birim = kazanim ? 'kazanım' : 'öğrenme çıktısı';
    const tema = temiz(secim.tema), konu = temiz(secim.konu), ek = temiz(secim.ekIstek);
    const ogretmenMetni = secim.metinKaynagi === 'ogretmen' ? temiz(secim.metin) : '';
    const bilesenli = ciktilar.filter(function (c) { return c.bilesenler; }).length;
    const yazmaVar = ciktilar.some(function (c) { return c.alan === 'Yazma'; });
    const yazimVar = ciktilar.some(function (c) { return /yazım|noktalama/i.test(c.ad); });

    let sinavSatiri = secim.sinav ? secim.sinav : 'Sınav adı verilmedi';
    const tablodaki = secim.sinav && secim.senaryo && secim.senaryo !== OZEL
      ? senaryoAdetleri(sinif, secim.sinav, secim.senaryo) : null;
    if (tablodaki && ayniMi(tablodaki, secim.adetler)) {
      sinavSatiri += ' (MEB konu soru dağılım tablosu, ' + secim.senaryo + ')';
    } else {
      sinavSatiri += ' (' + (kazanim ? 'kazanımları' : 'çıktıları') + ' ve soru sayılarını öğretmen belirledi)';
    }

    const y = [];
    y.push('Türkiye Yüzyılı Maarif Modeli\'ndeki anlayışa uygun, bağlam temelli bir ortaokul Türkçe sınavı hazırlamanı istiyorum. ' +
      'Deneyimli bir Türkçe öğretmeni ve ölçme değerlendirme uzmanı gibi çalış. Aşağıdaki bilgilerin dışına çıkma. ' +
      'Emin olmadığın bir bilgi varsa uydurma; cevabının sonundaki "Öğretmene notlar" bölümünde belirt.');
    y.push('');
    y.push('SINAV BİLGİLERİ');
    y.push('- Sınıf: ' + sinif + '. sınıf');
    y.push('- Sınav: ' + sinavSatiri);
    y.push('- Soru türü: ' + TURLER[tur]);
    y.push('- Soru sayısı: ' + soru + (tur === 'karisik' ? ' açık uçlu soru (çoktan seçmeli ek sorular bu sayının dışında)' : ''));
    y.push('- Süre: ' + sure + ' dakika');
    y.push('- Toplam puan: ' + puan);
    if (tema) y.push('- Tema: ' + tema);
    if (konu) y.push('- Konu çerçevesi: ' + konu);
    y.push('- Öğretim programı: ' + s.programAdi);
    y.push('');

    y.push(kazanim ? 'ÖLÇÜLECEK KAZANIMLAR' : 'ÖLÇÜLECEK ÖĞRENME ÇIKTILARI');
    y.push('Kodlar ve adlar MEB\'in tablosundan alındı. Kodu ve adı değiştirme, listede olmayan bir ' + birim + ' ekleme. ' +
      'Ayraç içindeki sayı, o ' + (kazanim ? 'kazanımdan' : 'çıktıdan') + ' yazılacak soru sayısıdır.');
    if (kazanim) {
      y.push('8. sınıf 2019 programıyla okuyor; kazanımların süreç bileşeni yok. Sorular yine bağlam temelli olacak.');
    }
    y.push('');
    ciktilar.forEach(function (c, i) {
      y.push((i + 1) + ') ' + c.kod + ' ' + c.ad + ' (' + c.adet + ' soru)');
      if (c.bilesenler) {
        y.push('   Süreç bileşenleri:');
        Object.keys(c.bilesenler).forEach(function (h) { y.push('   ' + h + ') ' + c.bilesenler[h]); });
      } else if (!kazanim) {
        y.push('   Süreç bileşeni bu yönergede verilmedi; soruyu çıktının adına göre yaz, bileşen harfi uydurma.');
      }
      if (c.not) y.push('   Not: ' + c.not);
    });
    y.push('');

    y.push('BAĞLAM (METİN VE GÖRSEL)');
    if (ogretmenMetni) {
      y.push('- Bağlam olarak aşağıda "ÖĞRETMENİN METNİ" başlığı altında verilen metni kullan. Metni değiştirme, kısaltma, yeniden yazma. ' +
        'Metinde açık bir yazım yanlışı görürsen düzeltme, "Öğretmene notlar" bölümünde belirt.');
      y.push('- Bu metin bir ' + (kazanim ? 'kazanımı' : 'çıktıyı') + ' ölçmeye elverişli değilse (örneğin yazım ve noktalama ya da yazma soruları için) ' +
        'o soru için kısa ve özgün bir ek bağlam yaz. Hangi bağlamı senin yazdığını notlarda belirt.');
    } else {
      y.push('- Metinleri sen yaz; metinler özgün olsun. Gerçek bir yazara, kitaba ya da kişiye ait gibi gösterme, alıntı uydurma. ' +
        'Ders kitaplarındaki ya da bilinen eserlerdeki metinleri yeniden yazma.');
      y.push('- Bir bağlam birden fazla soruyu taşısın. Bu sınav için ' + baglamSayisi(soru) + ' bağlam yeter.');
      y.push('- Metin türünü ' + (kazanim ? 'kazanıma' : 'çıktıya') + ' göre seç: çıkarım ve kahramanla ilgili sorular için öyküleyici, ' +
        'metin yapısı ve anahtar kelime soruları için bilgilendirici metin.');
      y.push('- Ana metin yaklaşık ' + UZUNLUK[sinif] + ' sözcük olsun; ek bağlamlar daha kısa olabilir.');
      if (tema || konu) {
        y.push('- Metinlerin konusu ' + (tema ? '"' + tema + '" temasıyla' : 'verilen konu çerçevesiyle') + ' ilişkili olsun' +
          (tema && konu ? '; konu çerçevesi: ' + konu + '.' : '.'));
      }
    }
    y.push('- Dil, söz varlığı ve cümle uzunluğu ' + sinif + '. sınıf düzeyine uygun olsun.');
    y.push('- Öğrencinin gerçekten karşılaşabileceği, herkesin bildiği ortamları seç (okul, ev, mahalle, park, doğa, alışveriş). ' +
      'Yalnız belirli bir çevrenin bildiği konuları kullanma.');
    y.push('- Kültür, cinsiyet, bölge, din ve ideoloji bakımından tarafsız ol; hiçbir kişi ya da grup hakkında olumsuz çağrışım olmasın.');
    y.push('- Çözüm için gerekmeyen ayrıntı yazma; her fazla cümle okuma yüküdür.');
    y.push('- En az bir bağlamda metne eşlik eden bir görsel öge olsun: tablo, duyuru, çizelge, liste ya da afiş metni gibi yazıyla kurulabilen bir öge. ' +
      'Görsel öge metni tekrar etmesin, metinde olmayan yeni bir bilgi versin ve en az bir sorunun çözümü için gerekli olsun. ' +
      'Çizim ya da fotoğraf gerektiren görsel kullanma.');
    y.push('- Bilgilendirici metinde doğruluğundan emin olmadığın tarih, sayı ve isim kullanma. Kullandıysan notlarda "kontrol edilmeli" diye belirt.');
    y.push('- Gerçek öğrenci, öğretmen ya da okul adı kullanma; kurgu adlar kullanabilirsin.');
    y.push('');

    y.push('SORU YAZIM KURALLARI');
    const kurallar = [];
    kurallar.push('Her soru tek bir ' + (kazanim ? 'kazanımı' : 'öğrenme çıktısını') + ' ölçsün.' +
      (bilesenli ? ' Süreç bileşeni verilen çıktılarda soru o bileşenlerden birini ya da birkaçını ölçsün; hangisini ölçtüğünü eşleştirme tablosunda harfiyle yaz.' : ''));
    kurallar.push('Bağlam süs olmasın: metin ve görsel kapatıldığında cevaplanabilen ' + (yazmaVar ? 'okuma sorusunu' : 'soruyu') + ' ya da bağlamını yeniden kur.' +
      (yazmaVar ? ' Yazma sorularında bağlam, yazma durumunu ve malzemesini verir (duyuru, taslak, söz havuzu gibi); yazma görevi bu duruma dayansın.' : ''));
    kurallar.push('Çıkarım isteyen sorularda cevap metinde hazır durmasın. Yüzey anlam sorularında cevap metinde ya da görselde açıkça yer alsın.');
    kurallar.push('Sorular birbirinden bağımsız çözülsün. Bir sorunun kökü, bağlamı ya da cevap alanı başka bir sorunun cevabını vermesin; ' +
      '"önceki soruda bulduğunuz" gibi zincirler kurma.');
    if (yazimVar) {
      kurallar.push('Yazım ve noktalama sorusunda sınanan kuralın doğru yazılmış örneği sınavın başka bir yerinde hazır durmasın. ' +
        'Örneğin ikilemelerin yazımı soruluyorsa söz havuzuna, tabloya ya da öteki soruların köküne ikileme koyma.');
    }
    kurallar.push('Soru kökü kısa ve açık olsun; kökte konu anlatma, bilgi bağlamda dursun.');
    kurallar.push('Çift olumsuz kullanma. Kökte tek bir olumsuzluk varsa olumsuzluk bildiren sözcüğü kalın yaz.');
    kurallar.push('"Sizce", "size göre" gibi öznel ifadeler kullanma; "Metne göre", "Tabloya göre" gibi bağlama gönderme yap.');
    kurallar.push('Yazım, noktalama ve anlatım Türk Dil Kurumunun kurallarına uygun olsun. Sınavda yazım yanlışı bulunmasın ' +
      '(öğrencinin düzeltmesi için bilerek konan yanlışlar dışında). Sık yapılan iki yanlışa dikkat et: belirli bir tarih bildirmeyen gün ve ay adları ' +
      'küçük harfle başlar ("salı günü", "eylülde"); konuşmaları ya tırnak içinde ya da konuşma çizgisiyle ver, ikisini karıştırma.');
    kurallar.push('Sınavın tamamı ' + sure + ' dakikada bitirilebilsin: toplam okuma yükünü ve yazma sorularında istenen uzunluğu buna göre ayarla.');
    if (tur !== 'coktan') {
      kurallar.push('Her açık uçlu sorunun puanını sorunun sonunda ayraç içinde yaz. Puanları sorunun gerektirdiği işe göre sen dağıt; toplam tam ' + puan + ' etsin.');
      kurallar.push('Açık uçlu soru, öğrenciden ne kadar yazması beklendiğini söylesin (kaç örnek, kaç cümle, kaç sözcük).');
      if (yazmaVar) kurallar.push('Yazma sorularında öğrenciye bir yazma amacı ve durumu ver.');
    }
    if (tur !== 'acik') {
      kurallar.push('Çoktan seçmeli sorularda dört seçenek (A, B, C, D) ve tek doğru cevap olsun. "Hepsi", "Hiçbiri", "A ve B" gibi seçenekler kullanma.');
      kurallar.push('Çeldiriciler rastgele yanlışlar olmasın; konuyu eksik ya da yanlış öğrenmiş öğrencinin düşeceği yanılgılara dayansın.');
      kurallar.push('Seçenekler uzunluk, dil yapısı ve ayrıntı bakımından benzer olsun; doğru cevap ötekilerden uzun ya da ayrıntılı olmasın.');
      kurallar.push('Metindeki bir cümleyi ya da söz öbeğini seçeneğe aynen taşıma; anlamca özdeşini başka sözcüklerle yaz.');
      kurallar.push('Doğru cevapların harfleri dengeli dağılsın.');
    }
    if (tur === 'coktan' && ciktilar.some(function (c) { return c.alan === 'Yazma'; })) {
      kurallar.push('Yazma alanındaki ' + (kazanim ? 'kazanımları' : 'çıktıları') + ' çoktan seçmeli soruyla ölçerken öğrenciye bir yazma durumu ya da taslak ver ' +
        've en uygun seçimi sor (örneğin taslaktaki yanlışı bulma, boşluğa uygun ifadeyi seçme, amaca uygun paragraf türünü belirleme).');
    }
    if (tur === 'coktan') {
      kurallar.push('Puanları sorulara dengeli dağıt; toplam tam ' + puan + ' etsin. Her bağlamın üstüne hangi soruların ona göre cevaplanacağını yaz ' +
        '("1-3. soruları aşağıdaki metne göre cevaplayınız.").');
    }
    if (tur === 'karisik') {
      kurallar.push('Açık uçlu sorulara ek olarak aynı bağlamlardan, okuma alanındaki her ' + (kazanim ? 'kazanım' : 'çıktı') +
        ' için birer çoktan seçmeli soru yaz. Bu ek sorular puanlamaya girmez; yedek ya da telafi için kullanılacak.');
    }
    kurallar.forEach(function (k, i) { y.push((i + 1) + '. ' + k); });
    y.push('');

    y.push('CEVAP VE PUANLAMA ANAHTARI');
    if (tur !== 'coktan') {
      y.push('- Her açık uçlu soru için şunları yaz: tam puan alan örnek cevap, kısmi puan alan cevaplar ve puanları, puan almayan yaygın yanlışlar.');
      y.push('- Birden fazla doğru cevabı olabilen sorularda kabul edilen cevapları listele ve "metinden kanıtla desteklenen başka cevaplar da kabul edilir" notunu ekle.');
      if (yazmaVar) {
        y.push('- Yazma sorularında dereceli puanlama anahtarı kullan (ölçütler ve düzeyler tablosu). Ölçütleri ' +
          (kazanim ? 'kazanımdan' : 'çıktıdan ve süreç bileşenlerinden') + ' türet.');
      }
    }
    if (tur !== 'acik') {
      y.push('- Her çoktan seçmeli soru için doğru cevabı ve her çeldiricinin gerekçesini (hangi yanılgıya dayandığını) yaz.');
    }
    y.push('');

    y.push('SON KONTROL');
    y.push('Cevabını vermeden önce her soruyu aşağıdaki sorularla denetle; geçemeyen soruyu yeniden yaz.');
    const kontrol = [
      'Metin ve görsel kapatılınca ' + (yazmaVar ? 'okuma sorusu' : 'soru') + ' cevaplanabiliyor mu? (Cevaplanabiliyorsa geçmez.)' +
        (yazmaVar ? ' Yazma sorusu bağlamdaki duruma dayanıyor mu?' : ''),
      'Görsel öge kapatılınca en az bir sorunun cevabı değişiyor mu? (Değişmiyorsa görsel süs kalmıştır.)',
      'Soru, eşleştirildiği ' + (kazanim ? 'kazanımı mı' : 'çıktıyı ve süreç bileşenini mi') + ' ölçüyor, başka bir beceriye mi kayıyor?',
      'Tek doğru cevap ya da açık bir kabul listesi var mı?',
      'Başka bir sorunun kökü, bağlamı ya da cevap alanı bu sorunun cevabını veriyor mu?' +
        (yazimVar ? ' Yazım sorusunda sınanan kuralın doğru örneği başka bir yerde görünüyor mu?' : ''),
      'Dil ' + sinif + '. sınıf düzeyine uygun mu; yazım ve noktalama temiz mi?',
      'Soru sayısı, ' + (kazanim ? 'kazanımlara' : 'çıktılara') + ' dağılım ve puan toplamı yukarıdaki bilgilerle birebir tutuyor mu? Sınav ' + sure + ' dakikada biter mi?'
    ];
    if (tur !== 'acik') kontrol.push('Çoktan seçmeli sorularda seçenek uzunlukları dengeli mi; doğru cevap metinden aynen alınmış mı?');
    kontrol.forEach(function (k, i) { y.push((i + 1) + '. ' + k); });
    y.push('');

    y.push('CEVABININ BİÇİMİ');
    y.push('Cevabını aşağıdaki bölümlerle, bu sırayla ve bu başlıklarla ver. Giriş ya da kapanış cümlesi ekleme. ' +
      'Metin Word\'e yapıştırılacak: tabloları tablo olarak ver, başlıkları kalın yaz, süsleme kullanma.');
    const bolumler = [];
    bolumler.push((tur === 'coktan' ? 'ÖĞRENCİ TESTİ' : 'ÖĞRENCİ SINAVI') + ': en üstte okul adı için boşluk, ders ve sınav adı, ad soyad, sınıf ve numara alanları, süre. ' +
      'Sonra bağlamlar ve sorular. Bu bölümde ' + (kazanim ? 'kazanım' : 'çıktı') + ' kodu, cevap ya da ipucu bulunmasın.' +
      (tur !== 'coktan' ? ' Açık uçlu soruların altına cevap için yeterli sayıda boş satır bırak.' : ''));
    if (tur === 'karisik') {
      bolumler.push('ÇOKTAN SEÇMELİ EK SORULAR: aynı bağlamlara göre cevaplanacak sorular.');
    }
    bolumler.push('SORU VE ' + (kazanim ? 'KAZANIM' : 'ÇIKTI') + ' EŞLEŞTİRME TABLOSU: soru no, ' + (kazanim ? 'kazanım kodu' : 'çıktı kodu') +
      (bilesenli ? ', ölçülen süreç bileşeninin harfi (verildiyse)' : '') + ', puan.');
    bolumler.push('CEVAP VE PUANLAMA ANAHTARI');
    bolumler.push('KALİTE KONTROL NOTLARI: son kontrolün sonucu. Geçen, kısmen geçen ve öğretmenin kararına bıraktığın noktaları ayrı ayrı ve dürüstçe yaz.');
    bolumler.push('ÖĞRETMENE NOTLAR: kontrol edilmesi gereken bilgiler, emin olmadığın noktalar, sınıfa göre değiştirilebilecek yerler. Yoksa "Yok" yaz.');
    const harfler = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    bolumler.forEach(function (b, i) { y.push(harfler[i] + '. ' + b); });

    if (ek) {
      y.push('');
      y.push('ÖĞRETMENİN EK İSTEĞİ');
      y.push(ek);
    }
    if (ogretmenMetni) {
      y.push('');
      y.push('ÖĞRETMENİN METNİ');
      y.push('<<<');
      y.push(ogretmenMetni);
      y.push('>>>');
    }
    return y.join('\n');
  }

  /* Sınav geldikten sonra aynı sohbete yazılabilecek hazır istekler */
  const EK_YONERGELER = [
    {
      baslik: 'Bağlamsız çözülen soruyu düzelt',
      metin: '[soru no]. soru metne ve görsele bakmadan da cevaplanabiliyor. Soruyu ya da bağlamını, cevap yalnız bağlam kullanılarak ' +
        'bulunacak biçimde yeniden yaz. Eşleştirme tablosunu ve puanlama anahtarını da güncelle; öteki sorulara dokunma.'
    },
    {
      baslik: 'Tek soruyu değiştir',
      metin: '[soru no]. soruyu, aynı çıktıyı ve aynı puanı koruyarak başka bir soruyla değiştir. Öteki sorulara dokunma; ' +
        'eşleştirme tablosunu ve puanlama anahtarını güncelle.'
    },
    {
      baslik: 'B grubunu hazırla',
      metin: 'Aynı çıktıları, aynı soru sayısını ve aynı puan dağılımını koruyarak sınavın B grubunu hazırla. Bağlamlar ve sorular farklı, ' +
        'güçlük düzeyi A grubuyla eş değer olsun. Aynı bölümleri aynı sırayla ver.'
    },
    {
      baslik: 'Güçlüğü bir kademe düşür',
      metin: 'Sınavın güçlük düzeyini bir kademe düşür: metni kısalt, cümleleri sadeleştir, sorularda beklenen cevabı netleştir. ' +
        'Çıktılar, soru sayısı ve puanlar aynı kalsın. Değiştirdiğin yerleri en sonda kısaca listele.'
    },
    {
      baslik: 'Güçlüğü bir kademe yükselt',
      metin: 'Sınavın güçlük düzeyini bir kademe yükselt: çıkarım gerektiren soruları güçlendir, cevabı metinde hazır duran soruları yeniden kur. ' +
        'Çıktılar, soru sayısı ve puanlar aynı kalsın. Değiştirdiğin yerleri en sonda kısaca listele.'
    },
    {
      baslik: 'Çoktan seçmeli sorular ekle',
      metin: 'Aynı bağlamlardan, okuma alanındaki her çıktı için birer çoktan seçmeli soru ekle: dört seçenek, tek doğru cevap, ' +
        'her çeldiricinin gerekçesi. Seçenekler uzunlukça dengeli olsun; metindeki cümleyi seçeneğe aynen taşıma.'
    },
    {
      baslik: 'Yalnız öğrenci bölümünü ver',
      metin: 'Yalnız öğrencinin göreceği bölümü, Word\'e yapıştırmaya uygun biçimde yeniden ver: tablolar tablo olarak, ' +
        'açık uçlu soruların altında cevap için boş satırlar. Kod, cevap ya da not ekleme.'
    }
  ];

  /* Öğretmenin gelen sınavı denetlerken bakacağı liste */
  const KONTROL_LISTESI = [
    'Metni ve tabloyu kapatıp soruları okuyun: bağlama bakmadan cevaplanabilen soru var mı?',
    'Tablo, duyuru ya da çizelge gerçekten gerekli mi, yoksa metindeki bilgiyi mi tekrar ediyor?',
    'Her soru eşleştirildiği çıktıyı mı ölçüyor? Çıkarım sorusunun cevabı metinde açıkça yazıyorsa soru yüzey anlama kaymıştır.',
    'Bir soru başka bir sorunun cevabını ele veriyor mu? Söz havuzundaki ya da tablodaki bir örnek, yazım sorusunun cevabını gösteriyor olabilir.',
    'Kodlar, soru sayıları ve puan toplamı seçtiğiniz senaryoyla tutuyor mu? Sınav verdiğiniz sürede biter mi?',
    'Metindeki tarih, sayı ve isimler doğru mu? Yapay zeka emin olmadığı bilgiyi de kendinden emin yazabilir.',
    'Yazım, noktalama ve anlatım temiz mi? Gün ve ay adlarının büyük harfine, konuşma çizgilerine özellikle bakın.',
    'Bilinmeyen sözcük sorusundaki sözcüğü sınıfınız zaten biliyor olabilir mi?',
    'Puanlama anahtarı, sınıfınızdan gelebilecek farklı doğru cevapları karşılıyor mu?'
  ];

  window.SoruAtolyesi = {
    TURLER: TURLER,
    OZEL: OZEL,
    sinavlar: sinavlar,
    senaryolar: senaryolar,
    senaryoAdetleri: senaryoAdetleri,
    seciliCiktilar: seciliCiktilar,
    toplam: toplam,
    ayniMi: ayniMi,
    eksikler: eksikler,
    kur: kur,
    EK_YONERGELER: EK_YONERGELER,
    KONTROL_LISTESI: KONTROL_LISTESI
  };
})();
