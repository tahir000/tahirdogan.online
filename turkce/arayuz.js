/*
 * Türkçe Soru Atölyesi: "Sınav hazırla" sekmesinin arayüzü.
 * Ortak yardımcılar (el, secenekler, kopyala) ortak.js dosyasındadır.
 */
(function () {
  'use strict';

  const V = window.SoruVerisi, A = window.SoruAtolyesi, U = window.Arayuz;
  const $ = U.$, el = U.el, bosalt = U.bosalt, secenekler = U.secenekler, secim = U.secim, kopyala = U.kopyala;

  const durum = {
    sinif: '7', sinav: '', senaryo: '', adetler: {}, tumu: false,
    tur: 'acik', sure: 40, puan: 100,
    tema: '', konu: '', metinKaynagi: 'ozgun', metin: '', ekIstek: ''
  };

  function sinifVerisi() { return V.siniflar[durum.sinif]; }
  function kazanimMi() { return sinifVerisi().program === '2019'; }

  /* Sınıf değişince: ilk sınav, ilk senaryo */
  function sinifSec(sinif) {
    durum.sinif = sinif;
    durum.tema = '';
    durum.tumu = false;
    sinavSec(A.sinavlar(sinif)[0] || '');
  }

  function sinavSec(sinav) {
    durum.sinav = sinav;
    const liste = A.senaryolar(durum.sinif, sinav);
    senaryoSec(liste[0] || A.OZEL, true);
  }

  function senaryoSec(senaryo, sifirla) {
    durum.senaryo = senaryo;
    if (senaryo !== A.OZEL) durum.adetler = A.senaryoAdetleri(durum.sinif, durum.sinav, senaryo);
    else if (sifirla) durum.adetler = {};
    durum.tumu = false;
    ciz();
  }

  function programNotu() {
    const s = sinifVerisi();
    if (s.program === '2019') {
      return '8. sınıf 2019 programıyla okuyor. Bu sınıfta öğrenme çıktısı yerine kazanımlar kullanılır; süreç bileşeni yoktur.';
    }
    return durum.sinif + '. sınıfın kodları ve adları programın ' + s.program + ' sürümüne göredir. ' +
      'Hangi sınıfın hangi sürümü kullandığı sayfanın sonunda açıklanıyor.';
  }

  function cizSinav() {
    secenekler($('siniflar'), 'sinif', Object.keys(V.siniflar).map(function (k) { return { deger: k, ad: k + '. sınıf' }; }), durum.sinif, sinifSec);
    $('program-notu').textContent = programNotu();
    secim($('sinav'), A.sinavlar(durum.sinif).map(function (a) { return { deger: a, ad: a }; }), durum.sinav);
    const senaryoListesi = A.senaryolar(durum.sinif, durum.sinav).map(function (a) {
      return { deger: a, ad: a + ' (' + A.toplam(A.senaryoAdetleri(durum.sinif, durum.sinav, a)) + ' soru)' };
    });
    senaryoListesi.push({ deger: A.OZEL, ad: A.OZEL });
    secim($('senaryo'), senaryoListesi, durum.senaryo);
    $('sinav-notu').textContent = (sinifVerisi().sinavNotlari || {})[durum.sinav]
      ? 'MEB tablosundaki not: ' + sinifVerisi().sinavNotlari[durum.sinav] + ' Bu sınav için senaryo yok; çalışma sınavı hazırlamak isterseniz çıktıları kendiniz seçebilirsiniz.'
      : '';
    $('cikti-basligi').textContent = kazanimMi() ? 'Kazanım' : 'Öğrenme çıktısı';
  }

  function cizTablo() {
    const govde = $('ciktilar');
    bosalt(govde);
    const s = sinifVerisi();
    const seciliYok = A.toplam(durum.adetler) === 0;
    const hepsi = durum.tumu || seciliYok;
    s.ciktilar.forEach(function (c) {
      const adet = Number(durum.adetler[c.kod]) || 0;
      if (!hepsi && adet === 0) return;
      const adHucre = el('td', { sinif: 'ad' }, [c.ad]);
      const b = V.bilesenler[c.kod];
      if (b) {
        adHucre.appendChild(el('details', { sinif: 'bilesen' }, [
          el('summary', { metin: 'Süreç bileşenleri' }),
          el('ul', null, Object.keys(b).map(function (h) { return el('li', { metin: h + ') ' + b[h] }); }))
        ]));
      }
      const girdi = el('input', {
        type: 'number', min: '0', max: '9', step: '1', value: String(adet), inputMode: 'numeric',
        'aria-label': c.kod + ' soru sayısı'
      });
      girdi.addEventListener('input', function () {
        let n = Math.floor(Number(girdi.value));
        if (!(n >= 0)) n = 0;
        if (n > 9) n = 9;
        if (n) durum.adetler[c.kod] = n; else delete durum.adetler[c.kod];
        satir.className = n ? '' : 'bos';
        cizToplam();
        cizYonerge();
      });
      girdi.addEventListener('blur', function () { girdi.value = String(Number(durum.adetler[c.kod]) || 0); });
      const satir = el('tr', { sinif: adet ? '' : 'bos' }, [
        el('td', { sinif: 'kod', metin: c.kod }), adHucre, el('td', { sinif: 'adet' }, [girdi])
      ]);
      govde.appendChild(satir);
    });
    const dugme = $('tumu');
    dugme.hidden = seciliYok;
    dugme.textContent = durum.tumu
      ? 'Yalnız seçilenleri göster'
      : (kazanimMi() ? 'Tüm kazanımları göster (' : 'Tüm çıktıları göster (') + s.ciktilar.length + ')';
    cizToplam();
  }

  function cizToplam() {
    const n = A.toplam(durum.adetler);
    let metin = 'Toplam ' + n + ' soru';
    if (durum.senaryo !== A.OZEL) {
      const tablodaki = A.senaryoAdetleri(durum.sinif, durum.sinav, durum.senaryo);
      metin += A.ayniMi(tablodaki, durum.adetler) ? ' (' + durum.senaryo + ' ile aynı)' : ' (' + durum.senaryo + ' değiştirildi)';
    }
    $('toplam').textContent = metin;
  }

  function cizBicim() {
    secenekler($('turler'), 'tur', [
      { deger: 'acik', ad: 'Açık uçlu' },
      { deger: 'coktan', ad: 'Çoktan seçmeli' },
      { deger: 'karisik', ad: 'Açık uçlu ve çoktan seçmeli ek sorular' }
    ], durum.tur, function (d) { durum.tur = d; cizYonerge(); });
  }

  function cizMetin() {
    const temalar = sinifVerisi().temalar;
    $('tema-alani').hidden = temalar.length === 0;
    const liste = [{ deger: '', ad: 'Tema belirtmeyeceğim' }].concat(temalar.map(function (t, i) {
      return { deger: t, ad: (i + 1) + '. tema: ' + t };
    }));
    secim($('tema'), liste, durum.tema);
    secenekler($('metin-kaynagi'), 'metin-kaynagi', [
      { deger: 'ozgun', ad: 'Yapay zeka özgün metin yazsın' },
      { deger: 'ogretmen', ad: 'Kendi metnimi vereceğim' }
    ], durum.metinKaynagi, function (d) {
      durum.metinKaynagi = d;
      $('metin-alani').hidden = d !== 'ogretmen';
      cizYonerge();
      if (d === 'ogretmen') $('metin').focus();
    });
    $('metin-alani').hidden = durum.metinKaynagi !== 'ogretmen';
  }

  function secimNesnesi() {
    return {
      sinif: durum.sinif, sinav: durum.sinav, senaryo: durum.senaryo, adetler: durum.adetler,
      tur: durum.tur, sure: durum.sure, puan: durum.puan, tema: durum.tema, konu: durum.konu,
      metinKaynagi: durum.metinKaynagi, metin: durum.metin, ekIstek: durum.ekIstek
    };
  }

  function cizYonerge() {
    const s = secimNesnesi();
    const eksik = A.eksikler(s);
    const liste = $('eksik');
    bosalt(liste);
    eksik.forEach(function (m) { liste.appendChild(el('li', { metin: m })); });
    const kutu = $('yonerge');
    kutu.value = eksik.length ? '' : A.kur(s);
    $('kopyala').disabled = eksik.length > 0;
    $('kopya-durumu').textContent = eksik.length ? '' : kutu.value.length.toLocaleString('tr-TR') + ' karakter';
  }

  function ciz() {
    cizSinav();
    cizTablo();
    cizMetin();
    cizYonerge();
  }

  function kur() {
    $('sinav').addEventListener('change', function () { sinavSec($('sinav').value); });
    $('senaryo').addEventListener('change', function () { senaryoSec($('senaryo').value, false); });
    $('tumu').addEventListener('click', function () { durum.tumu = !durum.tumu; cizTablo(); });
    $('tema').addEventListener('change', function () { durum.tema = $('tema').value; cizYonerge(); });
    [['konu', 'konu'], ['metin', 'metin'], ['ek', 'ekIstek']].forEach(function (c) {
      $(c[0]).addEventListener('input', function () { durum[c[1]] = $(c[0]).value; cizYonerge(); });
    });
    [['sure', 'sure'], ['puan', 'puan']].forEach(function (c) {
      $(c[0]).addEventListener('input', function () { durum[c[1]] = Number($(c[0]).value); cizYonerge(); });
    });

    $('kopyala').addEventListener('click', function () {
      const metin = $('yonerge').value;
      if (!metin) return;
      kopyala(metin, function (tamam) {
        $('kopya-durumu').textContent = tamam
          ? 'Kopyalandı. Şimdi yapay zeka sohbetine yapıştırın.'
          : 'Kopyalanamadı. Kutunun içine tıklayıp tümünü seçerek kopyalayın.';
      });
    });
    $('yonerge').addEventListener('focus', function () { $('yonerge').select(); });

    const kontrol = $('kontrol');
    A.KONTROL_LISTESI.forEach(function (m) {
      kontrol.appendChild(el('li', null, [el('label', null, [el('input', { type: 'checkbox' }), el('span', { metin: m })])]));
    });

    const istekler = $('istekler');
    A.EK_YONERGELER.forEach(function (i) {
      const dugme = el('button', { type: 'button', sinif: 'kucuk-dugme', metin: 'Kopyala' });
      dugme.addEventListener('click', function () {
        kopyala(i.metin, function (tamam) { U.gecici(dugme, tamam ? 'Kopyalandı' : 'Kopyalanamadı'); });
      });
      istekler.appendChild(el('li', null, [
        el('div', { sinif: 'istek-ust' }, [el('h3', { metin: i.baslik }), dugme]),
        el('p', { metin: i.metin })
      ]));
    });

    cizBicim();
    sinifSec(durum.sinif);
  }

  kur();
})();
