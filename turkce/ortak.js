/*
 * Türkçe Soru Atölyesi: sekmelerin ortak kullandığı sayfa yardımcıları.
 * Kullanıcının yazdığı her metin sayfaya yalnız textContent ya da value ile yazılır.
 * Sayfa hiçbir istek yapmaz ve tarayıcıda hiçbir şey saklamaz.
 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function el(etiket, ozellik, cocuklar) {
    const e = document.createElement(etiket);
    Object.keys(ozellik || {}).forEach(function (k) {
      const v = ozellik[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'sinif') e.className = v;
      else if (k === 'metin') e.textContent = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    (cocuklar || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function bosalt(e) { while (e.firstChild) e.removeChild(e.firstChild); }

  /* Yuvarlak seçenek düğmeleri (radio) */
  function secenekler(kap, ad, liste, secili, degisince) {
    const odakIcinde = kap.contains(document.activeElement);
    bosalt(kap);
    liste.forEach(function (o) {
      const girdi = el('input', { type: 'radio', name: ad, value: o.deger, checked: o.deger === secili });
      girdi.addEventListener('change', function () { if (girdi.checked) degisince(o.deger); });
      kap.appendChild(el('label', { sinif: 'secenek' }, [girdi, el('span', { metin: o.ad })]));
      /* Klavyeyle gezerken liste yeniden çizilince odak kaybolmasın */
      if (odakIcinde && o.deger === secili) girdi.focus();
    });
  }

  function secim(kutu, liste, secili) {
    bosalt(kutu);
    liste.forEach(function (o) {
      kutu.appendChild(el('option', { value: o.deger, metin: o.ad, selected: o.deger === secili }));
    });
    kutu.value = secili;
  }

  /* *yıldız* arasındaki sözü kalın gösterir; geri kalan düz metindir */
  function bicimli(metin) {
    return String(metin).split(/(\*[^*]+\*)/).filter(function (p) { return p !== ''; }).map(function (p) {
      return /^\*[^*]+\*$/.test(p) ? el('strong', { metin: p.slice(1, -1) }) : document.createTextNode(p);
    });
  }

  /* Panoya kopyalama: önce yeni yöntem, olmazsa seçip kopyalama */
  function kopyala(metin, bildir) {
    function eskiYontem() {
      const gecici = el('textarea', { value: metin, readOnly: true });
      gecici.style.position = 'fixed';
      gecici.style.opacity = '0';
      document.body.appendChild(gecici);
      gecici.select();
      let tamam = false;
      try { tamam = document.execCommand('copy'); } catch (e) { tamam = false; }
      document.body.removeChild(gecici);
      bildir(tamam);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin).then(function () { bildir(true); }, eskiYontem);
    } else {
      eskiYontem();
    }
  }

  /* Düğmenin yazısını kısa süreliğine değiştirir ("Kopyalandı") */
  function gecici(dugme, yazi) {
    const asil = dugme.dataset.asil || dugme.textContent;
    dugme.dataset.asil = asil;
    dugme.textContent = yazi;
    setTimeout(function () { dugme.textContent = asil; }, 2000);
  }

  /*
   * Sekmeler: düğmeler role="tab", bölümler role="tabpanel". Seçili sekme adres çubuğundaki
   * "#..." bölümüne yazılır; böylece bağlantı doğrudan o sekmeyi açar.
   */
  function sekmeleriKur(kap) {
    const dugmeler = Array.prototype.slice.call(kap.querySelectorAll('[role="tab"]'));
    function ac(dugme, odakla, adresiYaz) {
      dugmeler.forEach(function (d) {
        const secili = d === dugme;
        d.setAttribute('aria-selected', secili ? 'true' : 'false');
        d.tabIndex = secili ? 0 : -1;
        $(d.getAttribute('aria-controls')).hidden = !secili;
      });
      if (odakla) dugme.focus();
      if (adresiYaz && window.history && history.replaceState) {
        try { history.replaceState(null, '', '#' + dugme.dataset.adres); } catch (e) { /* dosyadan açıldıysa önemsiz */ }
      }
    }
    function adrestenBul() {
      const ad = (window.location.hash || '').slice(1);
      return dugmeler.filter(function (d) { return d.dataset.adres === ad; })[0] || null;
    }
    dugmeler.forEach(function (d, i) {
      d.addEventListener('click', function () { ac(d, false, true); });
      d.addEventListener('keydown', function (olay) {
        let hedef = -1;
        if (olay.key === 'ArrowRight') hedef = (i + 1) % dugmeler.length;
        else if (olay.key === 'ArrowLeft') hedef = (i - 1 + dugmeler.length) % dugmeler.length;
        else if (olay.key === 'Home') hedef = 0;
        else if (olay.key === 'End') hedef = dugmeler.length - 1;
        if (hedef < 0) return;
        olay.preventDefault();
        ac(dugmeler[hedef], true, true);
      });
    });
    window.addEventListener('hashchange', function () { const d = adrestenBul(); if (d) ac(d, false, false); });
    ac(adrestenBul() || dugmeler[0], false, false);
  }

  window.Arayuz = {
    $: $, el: el, bosalt: bosalt, secenekler: secenekler, secim: secim,
    bicimli: bicimli, kopyala: kopyala, gecici: gecici, sekmeleriKur: sekmeleriKur
  };
})();
