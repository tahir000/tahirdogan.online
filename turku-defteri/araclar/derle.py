#!/usr/bin/env python3
"""kaynak/ klasöründeki türkü dosyalarını sitenin okuduğu veri/ dosyalarına çevirir.

Kullanım (turku-defteri klasöründen):
  python3 -I araclar/derle.py

KAYNAK DOSYA BİÇİMİ (kaynak/<kimlik>.txt)

Üstte "anahtar: değer" satırları, sonra "---", sonra her satırda bir ölçü.

  ad: Sarı Gelin            türkünün adı
  yore: Erzurum
  usul: 10/8                ölçü sayısı
  usul-adi: Curcuna
  kalip: 3+2+2+3            vuruş kalıbı, sekizlik sayısıyla (isteğe bağlı)
  tempo: 81                 dakikadaki dörtlük sayısı
  dizi: Hüseyni
  karar: La
  duzen: bozuk
  zorluk: kolay | orta | zor
  durum: taslak | onayli    bir çalan denetleyince "onayli" yapılır
  kaynak: notanın alındığı yer
  not: sayfada gösterilecek kısa açıklama (isteğe bağlı)

Ölçü satırı:   3 | Mi5:4=Ney- Mi5:8=nim (Fa5)Mi5:8.=am- Re5:16 Es:8
  Baştaki sayı ölçü numarasıdır. Notalar boşlukla ayrılır.

Nota:  [(çarpma)]AD:SÜRE[~][=HECE]
  AD      Do Re Mi Fa Sol La Si + sekizli numarası (La4 alt telin boş sesi, La5 onun sekizlisi).
          Değişim: b (bemol), b2 (koma bemol, ör. Si4b2), # (diyez), #3 (koma diyez, ör. Fa5#3).
          Es sustur.
  SÜRE    1 birlik, 2 ikilik, 4 dörtlük, 8 sekizlik, 16 onaltılık, 32 otuzikilik;
          sonda nokta noktalı nota (4. noktalı dörtlük); "5/8" gibi kesir de yazılabilir.
  ~       sonraki notaya bağlı (aynı ses uzar).
  (Fa5)   notadan önce çalınan çarpma. Birden çoksa virgülle: (Fa5,Mi5).
  =HECE   notanın altındaki hece. Sonda "-" kelime sürüyor, "/" dize bitti demektir.
          Hecedeki boşluk "_" ile yazılır.
          Kıtalar ";" ile ayrılır: =Er-;Pa-   (1. kıta "Er", 2. kıta "Pa").
          Sonda "*" bütün kıtalarda aynı hece demektir: =a-*

Kıtaya özel ölçü:   17 @2 | Es:4 Re5:8=Ça- ...
  17. ölçü 2. kıtada böyle çalınır (hece sayısı yüzünden ritim değişiyorsa).

Bölüm başlığı:   [Aranağme]   [Söz]   [Saz]
  Kendinden sonraki ölçüden başlayan bölümün adı.

Usul değişimi:   {usul 6/4 Senginsemai}
  Kendinden sonraki ölçülerden başlayarak usul değişir (türkü içinde ölçü sayısı değişiyorsa).

Üst bilgide ayrıca:
  secki: pilot              listede "ilk denenecekler" arasında gösterilir
  bicim: Zeybek             türkü dışındaki biçimler (zeybek, oyun havası, nefes...) listede yazılır
  ceviri: toplu | elle      toplu çeviriden geldiyse "toplu"; elle düzeltilince "elle" yapılır

"#" ile başlayan satır açıklamadır, derlemeye girmez.
"""
import hashlib
import io
import json
import os
import re
import sys
from fractions import Fraction

NOTA = re.compile(
    r"^(?:\(([^)]+)\))?"
    r"(Es|(?:Do|Re|Mi|Fa|Sol|La|Si)\d(?:b2|b|#3|#)?)"
    r":(\d+/\d+|\d+\.?)(~)?(?:=(.*))?$")
AD = re.compile(r"^(?:Do|Re|Mi|Fa|Sol|La|Si)\d(?:b2|b|#3|#)?$")
ZORUNLU = ["ad", "usul", "tempo", "durum", "kaynak"]


class Hata(Exception):
    pass


def sure_coz(s):
    if "/" in s:
        a, b = s.split("/")
        return Fraction(int(a), int(b))
    if s.endswith("."):
        return Fraction(3, 2 * int(s[:-1]))
    return Fraction(1, int(s))


def nota_coz(t, yer):
    m = NOTA.match(t)
    if not m:
        raise Hata("%s: nota okunamadı: %r" % (yer, t))
    carpma, ad, sure, bag, hece = m.groups()
    f = sure_coz(sure)
    if f <= 0:
        raise Hata("%s: süre sıfır: %r" % (yer, t))
    n = {"a": ad, "s": [f.numerator, f.denominator]}
    if carpma:
        liste = carpma.split(",")
        for c in liste:
            if not AD.match(c):
                raise Hata("%s: çarpma okunamadı: %r" % (yer, t))
        n["c"] = liste
    if bag:
        n["g"] = 1
    return n, f, hece


def hece_ac(hece, kita):
    """=a;b ya da =a* yazımını kıta sayısı kadar hecelik listeye açar."""
    if hece is None or hece == "":
        return None
    if hece.endswith("*") and ";" not in hece:
        return [hece[:-1]] * kita
    liste = hece.split(";")
    if len(liste) > kita:
        raise Hata("hece sayısı kıta sayısını aşıyor: %r" % hece)
    liste += [""] * (kita - len(liste))
    return liste if any(liste) else None


def dosya_coz(yol, kimlik):
    metin = io.open(yol, encoding="utf-8").read()
    if "\n---\n" not in metin:
        raise Hata("%s: '---' satırı yok" % kimlik)
    ust, govde = metin.split("\n---\n", 1)
    bilgi = {}
    for satir in ust.splitlines():
        if not satir.strip() or satir.startswith("#"):
            continue
        if ":" not in satir:
            raise Hata("%s: üst bilgi satırı okunamadı: %r" % (kimlik, satir))
        k, v = satir.split(":", 1)
        bilgi[k.strip()] = v.strip()
    for z in ZORUNLU:
        if not bilgi.get(z):
            raise Hata("%s: '%s' eksik" % (kimlik, z))
    pay, payda = [int(x) for x in bilgi["usul"].split("/")]
    olcu_boyu = Fraction(pay, payda)

    # Önce kıta sayısını bul
    kita = 1
    for satir in govde.splitlines():
        m = re.match(r"^\d+ @(\d+) \|", satir)
        if m:
            kita = max(kita, int(m.group(1)))
        for h in re.findall(r"=(\S+)", satir):
            kita = max(kita, h.count(";") + 1)

    olculer = []
    bekleyen_bolum = None
    simdiki_usul = (pay, payda)
    degisken = False
    for no, satir in enumerate(govde.splitlines(), 1):
        satir = satir.strip()
        if not satir or satir.startswith("#"):
            continue
        m = re.match(r"^\[(.+)\]$", satir)
        if m:
            bekleyen_bolum = m.group(1)
            continue
        m = re.match(r"^\{usul (\d+)/(\d+)(?: .*)?\}$", satir)
        if m:
            simdiki_usul = (int(m.group(1)), int(m.group(2)))
            continue
        m = re.match(r"^(\d+)(?: @(\d+))? \| (.+)$", satir)
        if not m:
            raise Hata("%s satır %d: ölçü satırı okunamadı: %r" % (kimlik, no, satir[:60]))
        sira, ozel, icerik = int(m.group(1)), m.group(2), m.group(3)
        yer = "%s ölçü %d" % (kimlik, sira)
        notalar = []
        toplam = Fraction(0)
        for t in icerik.split():
            n, f, hece = nota_coz(t, yer)
            toplam += f
            if ozel:
                if hece:
                    n["h"] = hece
            else:
                h = hece_ac(hece, kita)
                if h:
                    n["h"] = h
            notalar.append(n)
        if toplam != Fraction(*simdiki_usul):
            raise Hata("%s: süre toplamı %s, usul %d/%d" % ((yer + (" @" + ozel if ozel else ""), toplam) + simdiki_usul))
        if ozel:
            if sira != len(olculer):
                raise Hata("%s: kıtaya özel ölçü kendi ölçüsünden hemen sonra gelmeli" % yer)
            olculer[-1].setdefault("v", {})[ozel] = notalar
        else:
            if sira != len(olculer) + 1:
                raise Hata("%s: ölçü numarası sırayı bozuyor (beklenen %d)" % (yer, len(olculer) + 1))
            olcu = {"n": notalar}
            if simdiki_usul != (pay, payda):
                olcu["u"] = list(simdiki_usul)
                degisken = True
            if bekleyen_bolum:
                olcu["b"] = bekleyen_bolum
                bekleyen_bolum = None
            olculer.append(olcu)
    if not olculer:
        raise Hata("%s: ölçü yok" % kimlik)

    usul = {"pay": pay, "payda": payda, "ad": bilgi.get("usul-adi", "")}
    if bilgi.get("kalip"):
        kalip = [int(x) for x in bilgi["kalip"].split("+")]
        if Fraction(sum(kalip), 8) != olcu_boyu:
            raise Hata("%s: kalıp toplamı usule uymuyor" % kimlik)
        usul["kalip"] = kalip
    if bilgi["durum"] not in ("taslak", "onayli"):
        raise Hata("%s: durum taslak ya da onayli olmalı" % kimlik)
    return {
        "id": kimlik, "ad": bilgi["ad"], "yore": bilgi.get("yore", ""), "usul": usul,
        "tempo": int(bilgi["tempo"]), "dizi": bilgi.get("dizi", ""), "karar": bilgi.get("karar", "La"),
        "duzen": bilgi.get("duzen", "bozuk"), "zorluk": bilgi.get("zorluk", "orta"),
        "durum": bilgi["durum"], "kaynak": bilgi["kaynak"], "aciklama": bilgi.get("not", ""),
        "kita": kita, "degisken": degisken, "pilot": bilgi.get("secki", "") == "pilot", "bicim": bilgi.get("bicim", ""),
        "olculer": olculer,
    }


def js(nesne):
    return json.dumps(nesne, ensure_ascii=False, separators=(",", ":"))


def surum_yaz(kok):
    """index.html içindeki betik adreslerine içerik özetinden bir sürüm ekler (arayuz.js?v=...).
    Böylece tarayıcı yeni sayfayla eski betiği birlikte kullanamaz. Betiklerden biri
    değiştiyse yayından önce bu dosya yeniden çalıştırılmalıdır."""
    ozet = hashlib.sha256()
    for ad in ("veri/dizin.js", "perde.js", "ses.js", "arayuz.js"):
        ozet.update(open(os.path.join(kok, ad), "rb").read())
    surum = ozet.hexdigest()[:8]
    yol = os.path.join(kok, "index.html")
    eski = io.open(yol, encoding="utf-8").read()
    yeni, adet = re.subn(r'(<script src="(?:veri/dizin|perde|ses|arayuz)\.js)(?:\?v=[0-9a-f]+)?"', r'\1?v=%s"' % surum, eski)
    if adet != 4:
        raise Hata("index.html içinde dört betik etiketi bulunamadı (%d bulundu)" % adet)
    if yeni != eski:
        io.open(yol, "w", encoding="utf-8").write(yeni)
    return surum


def main():
    kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kaynak = os.path.join(kok, "kaynak")
    veri = os.path.join(kok, "veri")
    os.makedirs(veri, exist_ok=True)
    dizin = []
    hatalar = []
    veri_ozeti = hashlib.sha256()
    for ad in sorted(os.listdir(kaynak)):
        if not ad.endswith(".txt"):
            continue
        kimlik = ad[:-4]
        if not re.match(r"^[a-z0-9-]+$", kimlik):
            hatalar.append("%s: dosya adı küçük harf, rakam ve tire olmalı" % ad)
            continue
        try:
            t = dosya_coz(os.path.join(kaynak, ad), kimlik)
        except Hata as h:
            hatalar.append(str(h))
            continue
        veri_ozeti.update(js(t).encode("utf-8"))
        io.open(os.path.join(veri, kimlik + ".js"), "w", encoding="utf-8").write(
            "// Bu dosya araclar/derle.py ile kaynak/%s.txt dosyasından üretilir; elle düzenlenmez.\n"
            "window.TurkuDefteri=window.TurkuDefteri||{};TurkuDefteri.turkuler=TurkuDefteri.turkuler||{};\n"
            "TurkuDefteri.turkuler[%s]=%s;\n"
            "if(TurkuDefteri.yuklendi)TurkuDefteri.yuklendi(%s);\n" % (kimlik, js(kimlik), js(t), js(kimlik)))
        dizin.append({
            "id": kimlik, "ad": t["ad"], "yore": t["yore"], "usul": "%d/%d" % (t["usul"]["pay"], t["usul"]["payda"]),
            "usulAdi": t["usul"]["ad"], "dizi": t["dizi"], "zorluk": t["zorluk"], "durum": t["durum"],
            "olcu": len(t["olculer"]), "kita": t["kita"],
        })
        if t["pilot"]:
            dizin[-1]["pilot"] = 1
        if t["bicim"]:
            dizin[-1]["bicim"] = t["bicim"]
    if hatalar:
        print("DERLENEMEDİ:")
        for h in hatalar:
            print("  " + h)
        sys.exit(1)
    dizin.sort(key=lambda d: d["ad"].replace("Ç", "C~").replace("İ", "I~").replace("Ö", "O~").replace("Ş", "S~").replace("Ü", "U~"))
    io.open(os.path.join(veri, "dizin.js"), "w", encoding="utf-8").write(
        "// Bu dosya araclar/derle.py ile üretilir; elle düzenlenmez.\n"
        "window.TurkuDefteri=window.TurkuDefteri||{};\nTurkuDefteri.veriSurumu=%s;\nTurkuDefteri.dizin=%s;\n"
        % (js(veri_ozeti.hexdigest()[:8]), js(dizin)))
    surum = surum_yaz(kok)
    print("%d türkü derlendi (sürüm %s): %s" % (len(dizin), surum, ", ".join(d["id"] for d in dizin)))


if __name__ == "__main__":
    main()
