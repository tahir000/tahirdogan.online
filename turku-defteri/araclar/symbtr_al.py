#!/usr/bin/env python3
"""SymbTr veri setindeki bir türküyü Türkü Defteri kaynak biçimine çevirir.

Kullanım (turku-defteri klasöründen):
  python3 -I araclar/symbtr_al.py <symbtr.txt> kaynak/<kimlik>.txt --ad "Sarı Gelin" --yore Erzurum

SymbTr (github.com/MTG/SymbTr, CC BY-NC-SA 4.0) dosyasında her satır bir notadır.
Bu betik:
  1. Nota adlarını bağlamanın 17 perdeli düzenine uyarlar (koma bemolleri "b2",
     koma diyezleri "#3" perdesine gider).
  2. Notaları usule göre ölçülere böler.
  3. Aynı ezgi başka sözle yineleniyorsa ezgiyi bir kez yazar, sözleri kıta kıta toplar.

Çıktı elle düzeltilebilir bir metin dosyasıdır; biçimi derle.py dosyasının başında anlatılır.
Çıktı bir kez üretilir, sonra düzeltmeler o dosyada yapılır (bu betik yeniden çalıştırılırsa
elle yapılan düzeltmeler silinir).
"""
import argparse
import io
import re
import statistics
import sys
from fractions import Fraction

NOTA_RE = re.compile(r"^(Do|Re|Mi|Fa|Sol|La|Si)(\d)(?:([b#])(\d))?$")
USUL_SATIRI = "51"
CARPMA = "8"

# Usul adına göre vuruş kalıbı (sekizlik sayısıyla). Bilinmeyen usulde kalıp yazılmaz.
KALIPLAR = {
    ("10/8", "curcuna"): "3+2+2+3",
    ("10/8", "kcurcuna"): "3+2+2+3",
    ("8/8", "müsemmen"): "3+2+3",
    ("9/8", "oynak"): "2+3+2+2",
    ("9/8", "çiftesofyan"): "2+2+2+3",
    ("9/8", "aksak"): "2+2+2+3",
    ("9/8", "raksaksağı"): "2+2+2+3",
    ("9/8", "evfer"): "2+2+2+3",
    ("5/8", "türkaksağı"): "2+3",
    ("7/8", "devrihindi"): "3+2+2",
    ("7/8", "devrituran"): "2+2+3",
}


def ad_cevir(n53):
    """SymbTr adını (ör. Si4b2, Do5#4) bağlama perdesi adına çevirir."""
    if n53 == "Es":
        return "Es"
    m = NOTA_RE.match(n53)
    if not m:
        raise ValueError("tanınmayan nota: %r" % n53)
    ad, oktav, isaret, koma = m.groups()
    if not isaret:
        return ad + oktav
    k = int(koma)
    if isaret == "b" and k <= 3:
        return "%s%sb2" % (ad, oktav)
    if isaret == "b" and k <= 6:
        return "%s%sb" % (ad, oktav)
    if isaret == "#" and k <= 3:
        return "%s%s#3" % (ad, oktav)
    if isaret == "#" and k <= 6:
        return "%s%s#" % (ad, oktav)
    raise ValueError("bağlama perdesine eşlenemeyen nota: %r" % n53)


def sure_yaz(f):
    if f.numerator == 1:
        return str(f.denominator)
    if f.numerator == 3 and f.denominator >= 2 and f.denominator & (f.denominator - 1) == 0:
        return "%d." % (f.denominator // 2)
    return "%d/%d" % (f.numerator, f.denominator)


def soz_coz(ham):
    """Soz1 sütununu çözer. Döner: (tür, metin).
    tür: 'yok' (hece yok), 'saz' (çalgı bölümü notası), 'bolum' (bölüm adı), 'hece'."""
    if ham.strip() == "":
        return ("yok", "")
    if ham.strip() == ".":
        return ("saz", "")
    duz = ham.strip().strip("_")
    harfler = [c for c in duz if c.isalpha()]
    if len(harfler) >= 3 and all(c.isupper() for c in harfler):
        kucuk = duz.replace("_", " ").replace("I", "ı").replace("İ", "i").lower()
        return ("bolum", " ".join(k[:1].replace("i", "İ").replace("ı", "I").upper() + k[1:] for k in kucuk.split()))
    dize_sonu = len(ham) - len(ham.rstrip(" ")) >= 2
    kelime_sonu = ham.endswith(" ") or ham.rstrip(" ").endswith("_")
    metin = ham.rstrip(" ").rstrip("_").replace("_", " ").strip().replace(" ", "_")
    if not kelime_sonu:
        metin += "-"
    elif dize_sonu:
        metin += "/"
    return ("hece", metin)


def oku(yol):
    satirlar = [s.rstrip("\n").rstrip("\r").split("\t") for s in io.open(yol, encoding="utf-8")]
    baslik = satirlar[0]
    return [dict(zip(baslik, s)) for s in satirlar[1:] if len(s) == len(baslik)]


def olculere_bol(satirlar):
    """Satırları ölçülere böler. Her ölçü: {'usul': (pay, payda, ad), 'notalar': [...], 'bolum': ad}."""
    usul = None
    olculer = []
    simdiki = []
    dolu = Fraction(0)
    bekleyen_carpma = []
    bekleyen_bolum = None
    uyarilar = []
    dortlukler = []

    def kapat():
        nonlocal simdiki, dolu
        olculer.append({"usul": usul, "notalar": simdiki})
        simdiki = []
        dolu = Fraction(0)

    for s in satirlar:
        kod = s["Kod"]
        if kod == USUL_SATIRI:
            if simdiki:
                uyarilar.append("usul ölçü ortasında değişti (sıra %s)" % s["Sira"])
                kapat()
            usul = (int(s["Pay"]), int(s["Payda"]), s["Soz1"].strip())
            continue
        if kod in ("50", "53", "54", "55", "56"):
            continue
        pay, payda = int(s["Pay"]), int(s["Payda"])
        if kod == CARPMA or pay == 0 or payda == 0:
            bekleyen_carpma.append(ad_cevir(s["Nota53"]))
            continue
        if usul is None:
            raise ValueError("usul satırı yok")
        sure = Fraction(pay, payda)
        tur, metin = soz_coz(s["Soz1"])
        if tur == "bolum":
            bekleyen_bolum = metin
            tur, metin = "saz", ""
        ad = ad_cevir(s["Nota53"])
        try:
            ms = int(s["Ms"])
            if ms > 0 and ad != "Es":
                dortlukler.append(ms / (sure * 4))
        except ValueError:
            pass
        olcu_boyu = Fraction(usul[0], usul[1])
        kalan = sure
        ilk = True
        while kalan > 0:
            parca = min(kalan, olcu_boyu - dolu)
            nota = {"ad": ad, "sure": parca, "tur": tur if ilk else "yok", "hece": metin if ilk else "",
                    "carpma": bekleyen_carpma if ilk else [], "bag": False, "bolum": bekleyen_bolum if ilk else None}
            if ilk:
                bekleyen_carpma = []
                bekleyen_bolum = None
            simdiki.append(nota)
            dolu += parca
            kalan -= parca
            ilk = False
            if kalan > 0:
                nota["bag"] = ad != "Es"
                uyarilar.append("nota ölçü çizgisini aşıyor, bağlandı (sıra %s)" % s["Sira"])
            if dolu == olcu_boyu:
                kapat()
    if simdiki:
        eksik = Fraction(usul[0], usul[1]) - dolu
        uyarilar.append("son ölçü eksikti, susla tamamlandı")
        simdiki.append({"ad": "Es", "sure": eksik, "tur": "yok", "hece": "", "carpma": [], "bag": False, "bolum": None})
        kapat()
    tempo = round(60000 / statistics.median(dortlukler)) if dortlukler else 80
    return olculer, tempo, uyarilar


def imza(olcu):
    return tuple((n["ad"], n["sure"], tuple(n["carpma"]), n["bag"]) for n in olcu["notalar"]) + (olcu["usul"][:2],)


def katla(olculer, esik=0.15):
    """Türkü aynı ezgiyle birkaç kez dönüyorsa (kıtalar) birim boyunu döner, dönmüyorsa None.
    Birim boyu p ölçü sayısını tam bölmelidir. Kıtalar arasında birkaç ölçü farklı olabilir
    (hece sayısı yüzünden değişen ritim); bunların oranı esik değerini geçmemelidir."""
    n = len(olculer)
    imz = [imza(o) for o in olculer]
    for p in range(4, n // 2 + 1):
        if n % p:
            continue
        farkli = sum(1 for i in range(p, n) if imz[i] != imz[i % p])
        if farkli <= esik * (n - p):
            return p
    return None


def belirle_tur(notalar):
    """Bir ölçünün söz durumu: bütün notaları sazsa 'saz'."""
    return "saz" if all(n["tur"] in ("saz",) or n["ad"] == "Es" for n in notalar) else "soz"


def sapkasiz(metin):
    for a, b in (("â", "a"), ("î", "i"), ("û", "u"), ("Â", "A"), ("Î", "İ"), ("Û", "U")):
        metin = metin.replace(a, b)
    return metin


def usul_adi_duzelt(ad):
    return sapkasiz(ad).replace(" ", "_").replace("_", " ").strip()


def karar_bul(olculer):
    """Karar sesi: türkünün son notası (sekizli numarası olmadan)."""
    for olcu in reversed(olculer):
        for nota in reversed(olcu["notalar"]):
            if nota["ad"] != "Es":
                m = re.match(r"^(Do|Re|Mi|Fa|Sol|La|Si)\d(.*)$", nota["ad"])
                ek = {"": "", "b": " bemol", "b2": " bemol 2", "#": " diyez", "#3": " diyez 3"}[m.group(2)]
                return m.group(1) + ek
    return "La"


def nota_yaz(nota, heceler, hepsi_ayni=False):
    t = ""
    if nota["carpma"]:
        t += "(" + ",".join(nota["carpma"]) + ")"
    t += nota["ad"] + ":" + sure_yaz(nota["sure"])
    if nota["bag"]:
        t += "~"
    heceler = [h.replace("=", "").replace(";", "").replace("*", "") for h in heceler]
    while heceler and heceler[-1] == "":
        heceler.pop()
    if heceler:
        t += "=" + (heceler[0] + "*" if hepsi_ayni else ";".join(heceler))
    return t


def yaz(olculer, tempo, p, a, kaynak_adi):
    n = len(olculer)
    if p is None:
        p = n
    gecis = n // p
    imz = [imza(o) for o in olculer]
    cikti = []
    usul = olculer[0]["usul"]
    usul_metni = "%d/%d" % usul[:2]
    usul_adi = usul_adi_duzelt(usul[2])
    anahtar = re.sub(r"[^a-zçğıöşü]", "", re.sub(r"\(.*?\)", "", usul_adi).replace("İ", "i").replace("I", "ı").lower())
    kalip = KALIPLAR.get((usul_metni, anahtar), "")
    cikti.append("ad: %s" % a.ad)
    cikti.append("yore: %s" % (a.yore or ""))
    cikti.append("usul: %s" % usul_metni)
    cikti.append("usul-adi: %s" % usul_adi)
    if kalip:
        cikti.append("kalip: %s" % kalip)
    cikti.append("tempo: %d" % tempo)
    cikti.append("dizi: %s" % (a.dizi or ""))
    cikti.append("karar: %s" % (getattr(a, "karar", "") or karar_bul(olculer)))
    cikti.append("duzen: bozuk")
    cikti.append("zorluk: %s" % (a.zorluk or "orta"))
    cikti.append("durum: taslak")
    cikti.append("kaynak: SymbTr 2.4.3, %s" % kaynak_adi)
    if getattr(a, "aciklama", ""):
        cikti.append("not: %s" % a.aciklama)
    cikti.append("---")

    onceki_tur = None
    onceki_usul = usul[:2]
    for i in range(p):
        olcu = olculer[i]
        if olcu["usul"][:2] != onceki_usul:
            onceki_usul = olcu["usul"][:2]
            cikti.append("{usul %d/%d %s}" % (onceki_usul[0], onceki_usul[1], usul_adi_duzelt(olcu["usul"][2])))
        ayni = [g for g in range(gecis) if imz[i + g * p] == imz[i]]
        farkli = [g for g in range(gecis) if imz[i + g * p] != imz[i]]
        parcalar = []
        bolum = None
        turler = set()
        for j, nota in enumerate(olcu["notalar"]):
            if nota["bolum"] and j == 0:
                bolum = nota["bolum"]
            heceler = []
            for g in range(gecis):
                if g in ayni:
                    kaynak = olculer[i + g * p]["notalar"][j]
                    heceler.append(kaynak["hece"] if kaynak["tur"] == "hece" else "")
                    turler.add(kaynak["tur"])
                else:
                    heceler.append("")
            hepsi_ayni = gecis > 1 and not farkli and heceler[0] != "" and all(h == heceler[0] for h in heceler)
            parcalar.append(nota_yaz(nota, heceler, hepsi_ayni))
        tur = "soz" if "hece" in turler else ("saz" if "saz" in turler else onceki_tur)
        if bolum:
            cikti.append("[%s]" % bolum)
        elif tur != onceki_tur and tur == "soz":
            cikti.append("[Söz]")
        elif tur != onceki_tur and tur == "saz" and onceki_tur is not None:
            cikti.append("[Saz]")
        onceki_tur = tur
        cikti.append("%d | %s" % (i + 1, " ".join(parcalar)))
        for g in farkli:
            ozel = olculer[i + g * p]["notalar"]
            cikti.append("%d @%d | %s" % (i + 1, g + 1, " ".join(
                nota_yaz(x, [x["hece"] if x["tur"] == "hece" else ""]) for x in ozel)))
    return "\n".join(cikti) + "\n", gecis


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("girdi")
    ap.add_argument("cikti")
    ap.add_argument("--ad", required=True)
    ap.add_argument("--yore", default="")
    ap.add_argument("--dizi", default="")
    ap.add_argument("--zorluk", default="orta")
    ap.add_argument("--katlama", default="oto", help="oto, yok ya da birim boyu (ölçü sayısı)")
    a = ap.parse_args()
    satirlar = oku(a.girdi)
    olculer, tempo, uyarilar = olculere_bol(satirlar)
    if a.katlama == "yok":
        kat = None
    elif a.katlama == "oto":
        kat = katla(olculer)
    else:
        kat = int(a.katlama)
    kaynak_adi = a.girdi.replace("\\", "/").split("/")[-1].rsplit(".", 1)[0]
    metin, gecis = yaz(olculer, tempo, kat, a, kaynak_adi)
    io.open(a.cikti, "w", encoding="utf-8").write(metin)
    print("%s: %d ölçü okundu, katlama %s, %d geçiş, tempo %d" % (a.ad, len(olculer), kat, gecis, tempo))
    for u in sorted(set(uyarilar)):
        print("  uyarı:", u)


if __name__ == "__main__":
    main()
