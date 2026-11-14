// Türkü Defteri: tel sesi üretimi ve çalıcı (zamanlama, döngü, metronom).
(function () {
  'use strict';
  var TD = window.TurkuDefteri = window.TurkuDefteri || {};
  var P = TD.perde;

  // ---- Tel sesi (Karplus-Strong) -------------------------------------------------
  // Gecikme hattı tam sayı uzunlukta olduğu için ses istenen frekansa tam oturmaz;
  // aradaki fark çalma hızıyla (hiz) kapatılır. Böylece koma perdeleri de doğru çıkar.
  var KARISIM = 0.2; // süzgecin ikinci örneğe verdiği ağırlık; küçük değer parlak ses

  function telUret(ornekHizi, frekans, sure) {
    var n = Math.max(2, Math.round(ornekHizi / frekans - KARISIM));
    var gercek = ornekHizi / (n + KARISIM);
    var hiz = frekans / gercek;
    var uzunluk = Math.ceil(ornekHizi * sure / hiz);
    var veri = new Float32Array(uzunluk);
    // Sönüm: pes seslerde yaklaşık 1,8 sn, tizlerde 1,1 sn
    var t60 = Math.max(1.1, 1.8 - (frekans - 150) / 900);
    var kazanc = Math.pow(10, -3 / (gercek * t60));
    // Mızrap vuruşu: tohumlu gürültü, hafif yumuşatma, eşiğe yakın vuruş taraması
    var tohum = 12345;
    var hat = new Float32Array(n + 1);
    var onceki = 0, i;
    for (i = 0; i <= n; i++) {
      tohum = (tohum * 1103515245 + 12345) & 0x7fffffff;
      var g = tohum / 0x3fffffff - 1;
      onceki = 0.55 * g + 0.45 * onceki;
      hat[i] = onceki;
    }
    var vurus = Math.max(1, Math.round(n * 0.13));
    var taranmis = new Float32Array(n + 1);
    for (i = 0; i <= n; i++) taranmis[i] = hat[i] - 0.85 * hat[(i - vurus + n + 1) % (n + 1)];
    for (i = 0; i < uzunluk; i++) {
      if (i <= n) veri[i] = taranmis[i];
      else veri[i] = kazanc * ((1 - KARISIM) * veri[i - n] + KARISIM * veri[i - n - 1]);
    }
    // Düzeyi eşitle, sonu yumuşat
    var tepe = 0;
    for (i = 0; i < uzunluk; i++) if (Math.abs(veri[i]) > tepe) tepe = Math.abs(veri[i]);
    var olcek = tepe ? 0.9 / tepe : 1;
    var kuyruk = Math.min(uzunluk, Math.round(ornekHizi * 0.03));
    for (i = 0; i < uzunluk; i++) {
      var s = veri[i] * olcek;
      if (i >= uzunluk - kuyruk) s *= (uzunluk - i) / kuyruk;
      veri[i] = s;
    }
    return { veri: veri, hiz: hiz };
  }

  // ---- Ses çıkışı ----------------------------------------------------------------
  function Ses() {
    this.ctx = null;
    this.cikis = null;
    this.telKazanc = null;
    this.onbellek = {};
    this.calanlar = [];
  }

  Ses.prototype.hazirla = function () {
    if (!this.ctx) {
      var Tur = window.AudioContext || window.webkitAudioContext;
      if (!Tur) return false;
      this.ctx = new Tur();
      this.cikis = this.ctx.createGain();
      this.cikis.gain.value = 0.8;
      this.cikis.connect(this.ctx.destination);
      this.telKazanc = this.ctx.createGain();
      this.telKazanc.connect(this.cikis);
    }
    if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
    return true;
  };

  Ses.prototype.simdi = function () { return this.ctx ? this.ctx.currentTime : 0; };

  Ses.prototype.tampon = function (frekans) {
    var anahtar = Math.round(1200 * Math.log(frekans) / Math.LN2);
    var kayit = this.onbellek[anahtar];
    if (!kayit) {
      var u = telUret(this.ctx.sampleRate, frekans, 2.4);
      var t = this.ctx.createBuffer(1, u.veri.length, this.ctx.sampleRate);
      if (t.copyToChannel) t.copyToChannel(u.veri, 0);
      else t.getChannelData(0).set(u.veri);
      kayit = this.onbellek[anahtar] = { tampon: t, hiz: u.hiz };
    }
    return kayit;
  };

  // Bir notayı t anında, sure saniye boyunca çalar. Çift tel etkisi için iki kaynak
  // birkaç sent ayrı çalınır; alt ve üst telde bir sekizli pes sargı tel de eklenir.
  Ses.prototype.vur = function (frekans, t, sure, siddet, bam) {
    var ctx = this.ctx, self = this;
    var k = this.tampon(frekans);
    var zarf = ctx.createGain();
    zarf.gain.setValueAtTime(siddet, t);
    zarf.gain.setValueAtTime(siddet, t + sure);
    zarf.gain.setTargetAtTime(0, t + sure, 0.05);
    zarf.connect(this.telKazanc);
    var kaynaklar = [];
    [[1.0013, 0.5], [0.9987, 0.5]].concat(bam ? [[0.5, 0.3]] : []).forEach(function (c) {
      var kaynak = ctx.createBufferSource();
      kaynak.buffer = k.tampon;
      kaynak.playbackRate.value = k.hiz * c[0];
      var g = ctx.createGain();
      g.gain.value = c[1];
      kaynak.connect(g);
      g.connect(zarf);
      kaynak.start(t);
      kaynak.stop(t + sure + 0.5);
      kaynaklar.push(kaynak);
    });
    var kayit = { zarf: zarf, kaynaklar: kaynaklar, son: t + sure + 0.5 };
    this.calanlar.push(kayit);
    kaynaklar[0].onended = function () {
      var i = self.calanlar.indexOf(kayit);
      if (i >= 0) self.calanlar.splice(i, 1);
    };
  };

  Ses.prototype.tik = function (t, vurgulu) {
    var ctx = this.ctx;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = vurgulu ? 1568 : 1046;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vurgulu ? 0.5 : 0.3, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g);
    g.connect(this.cikis);
    o.start(t);
    o.stop(t + 0.09);
  };

  Ses.prototype.sustur = function () {
    if (!this.ctx) return;
    var simdi = this.ctx.currentTime;
    this.calanlar.forEach(function (k) {
      try {
        k.zarf.gain.cancelScheduledValues(simdi);
        k.zarf.gain.setTargetAtTime(0, simdi, 0.015);
        k.kaynaklar.forEach(function (s) { s.stop(simdi + 0.12); });
      } catch (e) { /* zaten durmuş */ }
    });
    this.calanlar = [];
  };

  // ---- Çalıcı --------------------------------------------------------------------
  // Olaylar: nota(i) etkin nota değişti, durum(caliyor) çalma başladı ya da durdu.
  function Calici() {
    this.ses = new Ses();
    this.liste = [];
    this.turku = null;
    this.tempo = 80;       // dakikadaki dörtlük
    this.hiz = 1;          // 0.4 ile 1.3 arası çarpan
    this.kaydirma = 0;     // akort: yarım ses
    this.metronom = false;
    this.sayim = true;
    this.sesAcik = true;
    this.dongu = null;     // {bas, son}: nota sıra numaraları (ikisi de dahil)
    this.etkin = 0;
    this.caliyor = false;
    this.nota = function () {};
    this.durum = function () {};
    this._kuyruk = [];
    this._zamanlayici = null;
    this._cizim = null;
  }

  Calici.prototype.yukle = function (turku, kita) {
    this.durdur();
    this.turku = turku;
    this.tempo = turku.tempo;
    this.liste = P.sirala(turku, kita);
    this.etkin = 0;
    this.dongu = null;
  };

  Calici.prototype.birlikSuresi = function () { return 240 / (this.tempo * this.hiz); };

  // Ölçü içindeki vuruş yerleri (birlik nota cinsinden), ilki vurgulu.
  Calici.prototype.vuruslar = function () {
    var u = this.turku.usul, liste = [], t = 0, i;
    if (u.kalip) {
      for (i = 0; i < u.kalip.length; i++) { liste.push(t); t += u.kalip[i] / 8; }
    } else if (u.payda === 8 && u.pay % 3 === 0) {
      for (i = 0; i < u.pay / 3; i++) liste.push(i * 3 / 8);
    } else {
      for (i = 0; i < u.pay; i++) liste.push(i / u.payda);
    }
    return liste;
  };

  Calici.prototype._notaCal = function (n, t) {
    if (n.ad === 'Es' || n.bagli) return;
    // Bağlı notalar tek vuruşta uzar
    var sure = n.sure, j = n.i;
    while (this.liste[j].bag && this.liste[j + 1] && this.liste[j + 1].bagli) { j++; sure += this.liste[j].sure; }
    var sn = sure * this.birlikSuresi();
    var k = P.konum(n.ad);
    var bam = !k || k.tel !== 'orta';
    if (n.carpma && n.carpma.length) {
      var c = Math.min(0.07, sn * 0.3);
      this.ses.vur(P.frekans(n.carpma[0], this.kaydirma), t, c, 0.75, bam);
      this.ses.vur(P.frekans(n.ad, this.kaydirma), t + c, sn - c, 0.85, bam);
    } else {
      this.ses.vur(P.frekans(n.ad, this.kaydirma), t, sn, 0.9, bam);
    }
  };

  Calici.prototype._olcuTiklari = function (t) {
    var self = this, b = this.birlikSuresi();
    this.vuruslar().forEach(function (v, i) { self.ses.tik(t + v * b, i === 0); });
  };

  // sayimsiz: bir notaya atlanıp sürdürülürken ölçü sayımı yapılmaz.
  Calici.prototype.cal = function (sayimsiz) {
    if (this.caliyor || !this.liste.length) return;
    if (!this.ses.hazirla()) return;
    var self = this;
    this.ses.telKazanc.gain.value = this.sesAcik ? 1 : 0;
    if (this.etkin >= this.liste.length) this.etkin = 0;
    if (this.dongu && (this.etkin < this.dongu.bas || this.etkin > this.dongu.son)) this.etkin = this.dongu.bas;
    this.caliyor = true;
    this._sira = this.etkin;
    this._t = this.ses.simdi() + 0.12;
    this._bitis = null;
    this._kuyruk = [];
    if (this.sayim && !sayimsiz) {
      this._olcuTiklari(this._t);
      this._t += (this.turku.usul.pay / this.turku.usul.payda) * this.birlikSuresi();
    }
    // Ekran güncellemesi hem kare çiziminden hem bu sayaçtan tetiklenir; sekme arka
    // plandayken kare çizimi seyrekleşse de etkin nota geri kalmaz.
    this._zamanlayici = setInterval(function () { self._ilerlet(); self._guncelle(); }, 25);
    this._ilerlet();
    var ciz = function () {
      if (!self.caliyor) return;
      self._guncelle();
      if (self.caliyor) self._cizim = requestAnimationFrame(ciz);
    };
    this._cizim = requestAnimationFrame(ciz);
    this.durum(true);
  };

  // Zamanı gelen notaları etkin yapar; türkü bittiyse çalmayı durdurur.
  Calici.prototype._guncelle = function () {
    if (!this.caliyor) return;
    var simdi = this.ses.simdi();
    var degisti = false;
    while (this._kuyruk.length && this._kuyruk[0].t <= simdi) {
      this.etkin = this._kuyruk.shift().i;
      degisti = true;
    }
    if (degisti) this.nota(this.etkin);
    if (this._bitis !== null && simdi >= this._bitis) {
      this.durdur();
      this.etkin = this.dongu ? this.dongu.bas : 0;
      this.nota(this.etkin);
    }
  };

  Calici.prototype._ilerlet = function () {
    if (!this.caliyor || this._bitis !== null) return;
    var ufuk = this.ses.simdi() + 0.18;
    while (this._t < ufuk) {
      var son = this.dongu ? this.dongu.son : this.liste.length - 1;
      if (this._sira > son) {
        if (this.dongu) this._sira = this.dongu.bas;
        else { this._bitis = this._t; return; }
      }
      var n = this.liste[this._sira];
      if (this.metronom && n.sira === 0) this._olcuTiklari(this._t);
      this._notaCal(n, this._t);
      this._kuyruk.push({ i: n.i, t: this._t });
      this._t += n.sure * this.birlikSuresi();
      this._sira++;
    }
  };

  Calici.prototype.durdur = function () {
    if (!this.caliyor) return;
    this.caliyor = false;
    clearInterval(this._zamanlayici);
    cancelAnimationFrame(this._cizim);
    this._kuyruk = [];
    this.ses.sustur();
    this.durum(false);
  };

  // Çalmıyorken bir notaya gider ve sesini kısa çalar.
  Calici.prototype.git = function (i, sesli) {
    if (!this.liste.length) return;
    var suruyordu = this.caliyor;
    if (suruyordu) this.durdur();
    this.etkin = Math.max(0, Math.min(this.liste.length - 1, i));
    this.nota(this.etkin);
    var n = this.liste[this.etkin];
    if (!suruyordu && sesli && this.sesAcik && n.ad !== 'Es' && this.ses.hazirla()) {
      this.ses.telKazanc.gain.value = 1;
      var k = P.konum(n.ad);
      this.ses.sustur();
      this.ses.vur(P.frekans(n.ad, this.kaydirma), this.ses.simdi() + 0.02, 0.7, 0.9, !k || k.tel !== 'orta');
    }
    if (suruyordu) this.cal(true);
  };

  Calici.prototype.adim = function (yon) {
    var i = this.etkin + yon;
    // Öncekine bağlı notalar yeniden vurulmaz, atlanır
    while (i > 0 && i < this.liste.length - 1 && this.liste[i].bagli) i += yon;
    this.git(i, true);
  };

  TD.telUret = telUret;
  TD.Ses = Ses;
  TD.Calici = Calici;
})();
