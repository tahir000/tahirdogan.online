/*
 * Türkçe Soru Atölyesi: "Soru bankası" ve "Soru bankası hazırla" sekmelerinin arayüzü.
 * Ortak yardımcılar ortak.js dosyasındadır; banka mantığı banka-yonerge.js dosyasındadır.
 */
(function () {
  'use strict';

  const V = window.SoruVerisi, K = window.BankaAtolyesi, U = window.Arayuz;
  const $ = U.$, el = U.el, bosalt = U.bosalt;
  const GUC_ADI = { kolay: 'kolay', orta: 'orta', zor: 'zor' };

  function sinifListesi() {
    return Object.keys(V.siniflar).map(function (k) { return { deger: k, ad: k + '. sınıf' }; });
  }
  function kazanimMi(sinif) { return V.siniflar[sinif].program === '2019'; }

  /* ================= Hazır soru bankası ================= */

  const banka = { sinif: '5', konu: '', tur: '', cevap: false };

  function suzgec(baglamNo) { return { konu: banka.konu, tur: banka.tur, baglam: baglamNo || 0 }; }

  function bankaNotu() {
    return kazanimMi(banka.sinif)
      ? 'Her soru 2019 programındaki bir kazanıma bağlıdır. Fiilimsi, cümlenin ögeleri, cümle türü, çatı ve anlatım bozukluğu soruları da bir metne dayanır.'
      : 'Her soru programdaki bir okuma ya da yazma çıktısına bağlıdır. Programa göre dil yapıları (dil bilgisi) ayrı ölçülmediği için terim sorusu yoktur.';
  }

  function cizBlok(blok) {
    const baslik = blok.baslik ? el('h4', { metin: blok.baslik }) : null;
    if (blok.t === 'metin') {
      return el('div', { sinif: 'blok metin' }, [baslik].concat(blok.p.map(function (p) { return el('p', { metin: p }); })));
    }
    if (blok.t === 'kutu') {
      return el('div', { sinif: 'blok kutu' }, [baslik].concat(blok.satirlar.map(function (s) {
        return s ? el('p', { metin: s }) : el('p', { sinif: 'ara' });
      })));
    }
    if (blok.t === 'siir') {
      return el('div', { sinif: 'blok siir' }, [baslik].concat(blok.kitalar.map(function (kita) {
        const p = el('p');
        kita.forEach(function (dize, i) {
          if (i) p.appendChild(el('br'));
          p.appendChild(document.createTextNode(dize));
        });
        return p;
      })));
    }
    const satirlar = blok.satirlar;
    const tablo = el('table', { sinif: 'veri' }, [
      blok.baslik ? el('caption', { metin: blok.baslik }) : null,
      el('thead', null, [el('tr', null, satirlar[0].map(function (h) { return el('th', { scope: 'col', metin: h }); }))]),
      el('tbody', null, satirlar.slice(1).map(function (satir) {
        return el('tr', null, satir.map(function (h) { return el('td', { metin: h }); }));
      }))
    ]);
    return el('div', { sinif: 'blok tablo-kaydir' }, [tablo]);
  }

  function cizSoru(q) {
    const cikti = K.ciktiBul(banka.sinif, q.kod);
    const konu = K.konuBul(banka.sinif, q.kod);
    const ust = [K.TUR_ADI[q.tur], GUC_ADI[q.guc], konu ? konu.ad : '', q.kod + (cikti ? ' ' + cikti.ad : '')]
      .filter(function (p) { return p; }).join(' · ');
    const parcalar = [el('p', { sinif: 'soru-ust', metin: ust })];
    q.kok.forEach(function (k, i) {
      parcalar.push(el('p', { sinif: 'kok' }, (i === 0 ? [el('span', { sinif: 'no', metin: q.no + '. ' })] : []).concat(U.bicimli(k))));
    });
    if (q.tur === 'coktan') {
      parcalar.push(el('ol', { sinif: 'sik' }, q.secenekler.map(function (s, i) {
        return el('li', null, [el('span', { sinif: 'harf', metin: 'ABCD'[i] + ') ' })].concat(U.bicimli(s)));
      })));
    } else {
      parcalar.push(el('div', { sinif: 'yazma-alani', 'aria-hidden': 'true' }));
    }
    if (banka.cevap) {
      parcalar.push(el('div', { sinif: 'cevap' }, q.tur === 'coktan'
        ? [el('p', null, [el('strong', { metin: 'Cevap: ' + q.cevap })]), el('p', { metin: q.aciklama })]
        : [el('p', null, [el('strong', { metin: 'Örnek cevap: ' }), q.cevap]), el('p', null, [el('strong', { metin: 'Puanlama: ' }), q.aciklama])]));
    }
    return el('li', null, parcalar);
  }

  function cizBaglam(secilen) {
    const b = secilen.baglam;
    const dugme = el('button', { type: 'button', sinif: 'kucuk-dugme ekran', metin: 'Kopyala', 'aria-label': b.baslik + ' bağlamını kopyala' });
    dugme.addEventListener('click', function () {
      U.kopyala(K.metinOlarak(banka.sinif, suzgec(b.no), banka.cevap), function (tamam) {
        U.gecici(dugme, tamam ? 'Kopyalandı' : 'Kopyalanamadı');
      });
    });
    const ust = [b.no + '. bağlam', b.tur, b.tema ? 'Tema: ' + b.tema : ''].filter(function (p) { return p; }).join(' · ');
    return el('article', { sinif: 'baglam' }, [
      el('p', { sinif: 'baglam-ust', metin: ust }),
      el('div', { sinif: 'baglam-baslik' }, [el('h3', { metin: b.baslik }), dugme]),
      el('div', null, b.bloklar.map(cizBlok)),
      el('ol', { sinif: 'sorular' }, secilen.sorular.map(cizSoru))
    ]);
  }

  function cizBankaListesi() {
    const secilen = K.sec(banka.sinif, suzgec());
    const sayim = K.say(secilen);
    const tumu = K.say(K.sec(banka.sinif, {}));
    $('b-ozet').textContent = sayim.soru === 0
      ? 'Bu seçime uyan soru yok. Konuyu ya da soru türünü değiştirin.'
      : sayim.baglam + ' bağlam, ' + sayim.soru + ' soru gösteriliyor (' + sayim.coktan + ' çoktan seçmeli, ' + sayim.acik + ' açık uçlu)' +
        (sayim.soru < tumu.soru ? '. Sınıfın bankasında toplam ' + tumu.soru + ' soru var.' : '.');
    $('b-yazdir').disabled = $('b-kopyala').disabled = sayim.soru === 0;
    $('b-durum').textContent = '';
    const liste = $('b-liste');
    bosalt(liste);
    liste.className = banka.cevap ? 'cevapli' : 'cevapsiz';
    liste.appendChild(el('h2', { sinif: 'yalniz-baski', metin: banka.sinif + '. sınıf Türkçe soru bankası' + (banka.cevap ? ' (cevap anahtarlı)' : '') }));
    secilen.forEach(function (s) { liste.appendChild(cizBaglam(s)); });
  }

  function cizBanka() {
    U.secenekler($('b-siniflar'), 'b-sinif', sinifListesi(), banka.sinif, function (sinif) {
      banka.sinif = sinif;
      banka.konu = '';
      cizBanka();
    });
    $('b-not').textContent = bankaNotu();
    const konular = K.konular(banka.sinif).filter(function (k) {
      return K.sec(banka.sinif, { konu: k.id }).length > 0;
    });
    U.secim($('b-konu'), [{ deger: '', ad: 'Bütün konular' }].concat(konular.map(function (k) {
      return { deger: k.id, ad: k.ad + ' (' + K.say(K.sec(banka.sinif, { konu: k.id })).soru + ')' };
    })), banka.konu);
    U.secim($('b-tur'), [
      { deger: '', ad: 'Bütün sorular' }, { deger: 'coktan', ad: 'Çoktan seçmeli' }, { deger: 'acik', ad: 'Açık uçlu' }
    ], banka.tur);
    $('b-cevap').checked = banka.cevap;
    cizBankaListesi();
  }

  function kurBanka() {
    $('b-konu').addEventListener('change', function () { banka.konu = $('b-konu').value; cizBankaListesi(); });
    $('b-tur').addEventListener('change', function () { banka.tur = $('b-tur').value; cizBankaListesi(); });
    $('b-cevap').addEventListener('change', function () { banka.cevap = $('b-cevap').checked; cizBankaListesi(); });
    $('b-kopyala').addEventListener('click', function () {
      const sayim = K.say(K.sec(banka.sinif, suzgec()));
      U.kopyala(K.metinOlarak(banka.sinif, suzgec(), banka.cevap), function (tamam) {
        $('b-durum').textContent = tamam
          ? sayim.soru + ' soru kopyalandı' + (banka.cevap ? ' (cevap anahtarıyla)' : '') + '. Word\'e yapıştırabilirsiniz.'
          : 'Kopyalanamadı. Soruları fareyle seçerek kopyalayın.';
      });
    });
    $('b-yazdir').addEventListener('click', function () {
      document.body.classList.add('yazdir-banka');
      window.print();
    });
    window.addEventListener('afterprint', function () { document.body.classList.remove('yazdir-banka'); });
    cizBanka();
  }

  /* ================= Soru bankası hazırla ================= */

  const hazirla = {
    sinif: '5', konular: {}, soru: 20, tur: 'coktan', guc: 'karisik',
    tema: '', not: '', farkli: true, ekIstek: ''
  };

  function seciliKimlikler() {
    return Object.keys(hazirla.konular).filter(function (k) { return hazirla.konular[k]; });
  }

  function hazirlaSecimi() {
    return {
      sinif: hazirla.sinif, konular: seciliKimlikler(), soru: hazirla.soru, tur: hazirla.tur, guc: hazirla.guc,
      tema: hazirla.tema, not: hazirla.not, farkli: hazirla.farkli, ekIstek: hazirla.ekIstek
    };
  }

  function hazirlaNotu() {
    const s = V.siniflar[hazirla.sinif];
    return kazanimMi(hazirla.sinif)
      ? '8. sınıf 2019 programıyla okuyor: konular kazanımlara göre gruplandı. Fiilimsiler, cümlenin ögeleri, cümle türleri ve fiilde çatı ayrı konu olarak seçilebilir.'
      : hazirla.sinif + '. sınıfın çıktıları programın ' + s.program + ' sürümünden alındı. Programa göre dil yapıları (dil bilgisi) ayrı ölçülmez; ' +
        'bu yüzden konular okuma ve yazma çıktılarına göre gruplandı. Konu başlıkları bu sayfanın gruplamasıdır, kodlar ve adlar programdandır.';
  }

  function cizYonerge() {
    const secim = hazirlaSecimi();
    const eksik = K.eksikler(secim);
    const liste = $('h-eksik');
    bosalt(liste);
    eksik.forEach(function (m) { liste.appendChild(el('li', { metin: m })); });
    const kutu = $('h-yonerge');
    kutu.value = eksik.length ? '' : K.kur(secim);
    $('h-kopyala').disabled = eksik.length > 0;
    $('h-durum').textContent = eksik.length ? '' : kutu.value.length.toLocaleString('tr-TR') + ' karakter';
    const secili = K.konular(hazirla.sinif).filter(function (k) { return hazirla.konular[k.id]; });
    const cikti = secili.reduce(function (t, k) { return t + k.ciktilar.length; }, 0);
    $('h-secili').textContent = secili.length
      ? secili.length + ' konu seçildi (' + cikti + (kazanimMi(hazirla.sinif) ? ' kazanım)' : ' çıktı)')
      : 'Konu seçilmedi';
  }

  function cizKonular() {
    const kap = $('h-konular');
    bosalt(kap);
    const birim = kazanimMi(hazirla.sinif) ? 'kazanım' : 'çıktı';
    const alanlar = [];
    K.konular(hazirla.sinif).forEach(function (k) { if (alanlar.indexOf(k.alan) < 0) alanlar.push(k.alan); });
    alanlar.forEach(function (alan) {
      if (alan) kap.appendChild(el('h3', { sinif: 'alan-basligi', metin: alan }));
      const liste = el('ul', { sinif: 'secmeli' });
      K.konular(hazirla.sinif).filter(function (k) { return k.alan === alan; }).forEach(function (k) {
        const kutu = el('input', { type: 'checkbox', checked: !!hazirla.konular[k.id] });
        kutu.addEventListener('change', function () { hazirla.konular[k.id] = kutu.checked; cizYonerge(); });
        liste.appendChild(el('li', null, [
          el('label', null, [kutu, el('span', { metin: k.ad })]),
          el('details', { sinif: 'bilesen' }, [
            el('summary', { metin: k.ciktilar.length + ' ' + birim }),
            el('ul', null, k.ciktilar.map(function (c) { return el('li', { metin: c.kod + ' ' + c.ad }); }))
          ])
        ]));
      });
      kap.appendChild(liste);
    });
  }

  function cizHazirla() {
    U.secenekler($('h-siniflar'), 'h-sinif', sinifListesi(), hazirla.sinif, function (sinif) {
      hazirla.sinif = sinif;
      hazirla.konular = {};
      hazirla.tema = '';
      cizHazirla();
    });
    $('h-not').textContent = hazirlaNotu();
    cizKonular();
    const temalar = V.siniflar[hazirla.sinif].temalar;
    $('h-tema-alani').hidden = temalar.length === 0;
    U.secim($('h-tema'), [{ deger: '', ad: 'Tema belirtmeyeceğim' }].concat(temalar.map(function (t, i) {
      return { deger: t, ad: (i + 1) + '. tema: ' + t };
    })), hazirla.tema);
    const hazir = K.baglamlar(hazirla.sinif).length;
    $('h-farkli').disabled = hazir === 0;
    $('h-farkli-notu').textContent = hazir
      ? 'İşaretliyse yönerge, hazır bankadaki ' + hazir + ' bağlamın başlığını sayar ve yapay zekadan bunlardan farklı konular seçmesini ister.'
      : 'Bu sınıf için hazır banka yok.';
    cizYonerge();
  }

  function kurHazirla() {
    U.secenekler($('h-turler'), 'h-tur', [
      { deger: 'coktan', ad: 'Çoktan seçmeli' }, { deger: 'acik', ad: 'Açık uçlu' }, { deger: 'karisik', ad: 'İkisi birlikte' }
    ], hazirla.tur, function (d) { hazirla.tur = d; cizYonerge(); });
    U.secenekler($('h-gucler'), 'h-guc', [
      { deger: 'karisik', ad: 'Karışık' }, { deger: 'kolay', ad: 'Kolay' }, { deger: 'orta', ad: 'Orta' }, { deger: 'zor', ad: 'Zor' }
    ], hazirla.guc, function (d) { hazirla.guc = d; cizYonerge(); });

    function topluSec(deger) {
      K.konular(hazirla.sinif).forEach(function (k) { hazirla.konular[k.id] = deger; });
      cizKonular();
      cizYonerge();
    }
    $('h-hepsi').addEventListener('click', function () { topluSec(true); });
    $('h-temizle').addEventListener('click', function () { topluSec(false); });
    $('h-tema').addEventListener('change', function () { hazirla.tema = $('h-tema').value; cizYonerge(); });
    $('h-konu-notu').addEventListener('input', function () { hazirla.not = $('h-konu-notu').value; cizYonerge(); });
    $('h-ek').addEventListener('input', function () { hazirla.ekIstek = $('h-ek').value; cizYonerge(); });
    $('h-soru').addEventListener('input', function () { hazirla.soru = Number($('h-soru').value); cizYonerge(); });
    $('h-farkli').addEventListener('change', function () { hazirla.farkli = $('h-farkli').checked; cizYonerge(); });
    $('h-kopyala').addEventListener('click', function () {
      const metin = $('h-yonerge').value;
      if (!metin) return;
      U.kopyala(metin, function (tamam) {
        $('h-durum').textContent = tamam
          ? 'Kopyalandı. Şimdi yapay zeka sohbetine yapıştırın.'
          : 'Kopyalanamadı. Kutunun içine tıklayıp tümünü seçerek kopyalayın.';
      });
    });
    $('h-yonerge').addEventListener('focus', function () { $('h-yonerge').select(); });

    const kontrol = $('h-kontrol');
    K.KONTROL_LISTESI.forEach(function (m) {
      kontrol.appendChild(el('li', null, [el('label', null, [el('input', { type: 'checkbox' }), el('span', { metin: m })])]));
    });
    $('h-soru').value = String(hazirla.soru);
    $('h-farkli').checked = hazirla.farkli;
    cizHazirla();
  }

  kurBanka();
  kurHazirla();
  U.sekmeleriKur($('sekmeler'));
})();
