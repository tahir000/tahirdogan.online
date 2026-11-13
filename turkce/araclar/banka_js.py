#!/usr/bin/env python3
"""Hazır soru bankasının kaynak dosyalarından sitenin banka dosyasını (banka.js) üretir.

Kullanım (turkce klasöründen):
    python3 -I araclar/banka_js.py

Girdi : banka-kaynak/sinif-5.txt ... sinif-8.txt (elle yazılan sorular), veri.js (geçerli kodlar ve temalar)
Çıktı : banka.js

Kaynak dosyanın biçimi (her anahtar sözcük satır başında durur):

    BAĞLAM Başlık
    TÜR Bilgilendirici metin
    ÖZET bağlamın konusu           (tek satır; "Soru bankası hazırla" yönergesinde hazır bağlamlar sayılırken kullanılır)
    TEMA Oyun Dünyası              (isteğe bağlı; sınıfın temalarından biri)
    METİN [başlık]                 paragraflar; her satır bir paragraf
    ŞİİR [başlık]                  dizeler; boş satır kıtayı ayırır
    KUTU [başlık]                  duyuru, ileti gibi satır satır okunan metin
    TABLO [başlık]                 satırlar " | " ile ayrılır, ilk satır başlıktır
    SORU Ç T.O.5.6. kolay          Ç: çoktan seçmeli, A: açık uçlu; güçlük: kolay, orta, zor
    kök satırları
    A) ... B) ... C) ... D) ...    yalnız çoktan seçmelide, her biri kendi satırında
    CEVAP B                        açık uçluda örnek cevap
    NEDEN ...                      çoktan seçmelide doğru cevabın ve çeldiricilerin gerekçesi
    PUAN ...                       açık uçluda puanlama notu

Sözcüğü kalın göstermek için *yıldız* arasına alınır (olumsuz soru köklerinde).
Betik yazım ve yapı denetimi de yapar; hata varsa dosya yazılmaz.
"""
import json
import re
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK / "banka-kaynak"
SINIFLAR = ("5", "6", "7", "8")
GUCLER = ("kolay", "orta", "zor")
BLOKLAR = {"METİN": "metin", "ŞİİR": "siir", "KUTU": "kutu", "TABLO": "tablo"}
YASAK = re.compile(r"[âîûÂÎÛ–—‘’“”\t]")
SECENEK = re.compile(r"^([A-D])\) (.+)$")


def veri():
    metin = (KOK / "veri.js").read_text(encoding="utf-8")
    bas = metin.index("{", metin.index("window.SoruVerisi"))
    return json.loads(metin[bas:metin.rindex("}") + 1])


def sozcukler(s):
    return re.findall(r"[0-9A-Za-zÇĞİÖŞÜçğıöşü]+", s)


def coz(sinif, yol, hatalar):
    """Kaynak dosyayı bağlam listesine çevirir. Biçim hatalarını 'hatalar' listesine ekler."""
    baglamlar = []
    baglam = blok = soru = None
    alan = None  # soru içinde en son yazılan alan: kok, cevap

    def hata(no, ileti):
        hatalar.append(f"{yol.name}:{no}: {ileti}")

    for no, ham in enumerate(yol.read_text(encoding="utf-8").split("\n"), 1):
        satir = ham.rstrip()
        if YASAK.search(satir):
            hata(no, "yasak karakter (şapkalı harf, uzun çizgi, kıvrık tırnak ya da sekme): " + YASAK.search(satir).group(0))
        ilk = satir.split(" ", 1)[0] if satir else ""
        kalan = satir[len(ilk):].strip()
        if satir.startswith("#"):
            continue
        if ilk == "BAĞLAM":
            baglam = {"no": len(baglamlar) + 1, "baslik": kalan, "tur": "", "ozet": "", "tema": "", "bloklar": [], "sorular": []}
            baglamlar.append(baglam)
            blok = soru = None
        elif baglam is None:
            if satir:
                hata(no, "BAĞLAM satırından önce metin var")
        elif ilk == "TÜR" and soru is None:
            baglam["tur"] = kalan
        elif ilk == "TEMA" and soru is None:
            baglam["tema"] = kalan
        elif ilk == "ÖZET" and soru is None and blok is None:
            baglam["ozet"] = kalan
        elif ilk in BLOKLAR and soru is None:
            blok = {"t": BLOKLAR[ilk], "baslik": kalan, "satirlar": []}
            baglam["bloklar"].append(blok)
        elif ilk == "SORU":
            p = kalan.split()
            if len(p) != 3 or p[0] not in ("Ç", "A") or p[2] not in GUCLER:
                hata(no, "SORU satırı 'SORU Ç|A kod güçlük' biçiminde olmalı")
                p = ["A", "", "orta"]
            soru = {"tur": "coktan" if p[0] == "Ç" else "acik", "kod": p[1], "guc": p[2], "kok": [],
                    "secenekler": [], "cevap": "", "aciklama": "", "_satir": no}
            baglam["sorular"].append(soru)
            blok, alan = None, "kok"
        elif soru is not None:
            m = SECENEK.match(satir)
            if ilk == "CEVAP":
                soru["cevap"], alan = kalan, "cevap"
            elif ilk in ("NEDEN", "PUAN"):
                if (ilk == "NEDEN") != (soru["tur"] == "coktan"):
                    hata(no, "çoktan seçmelide NEDEN, açık uçluda PUAN kullanılır")
                soru["aciklama"], alan = kalan, "aciklama"
            elif m and alan == "kok":
                if "ABCD"[len(soru["secenekler"]):][:1] != m.group(1):
                    hata(no, "seçenekler A, B, C, D sırasıyla gelmeli")
                soru["secenekler"].append(m.group(2))
            elif satir:
                if alan == "kok" and not soru["secenekler"]:
                    soru["kok"].append(satir)
                else:
                    hata(no, "beklenmeyen satır (cevap ve açıklama tek satır olmalı)")
        elif blok is not None:
            blok["satirlar"].append(satir)
        elif satir:
            hata(no, "hangi bölüme ait olduğu belli olmayan satır")

    for b in baglamlar:
        for blok in b["bloklar"]:
            s = blok.pop("satirlar")
            while s and not s[-1]:
                s.pop()
            while s and not s[0]:
                s.pop(0)
            if blok["t"] == "metin":
                blok["p"] = [x for x in s if x]
            elif blok["t"] == "kutu":
                blok["satirlar"] = s
            elif blok["t"] == "siir":
                kitalar, kita = [], []
                for x in s:
                    if x:
                        kita.append(x)
                    elif kita:
                        kitalar.append(kita)
                        kita = []
                if kita:
                    kitalar.append(kita)
                blok["kitalar"] = kitalar
            else:
                satirlar = [[h.strip() for h in x.split("|")] for x in s if x]
                if len(satirlar) < 2 or len({len(x) for x in satirlar}) != 1:
                    hatalar.append(f"{yol.name}: '{b['baslik']}' tablosunda satırların sütun sayısı tutmuyor")
                blok["satirlar"] = satirlar
            if not blok["baslik"]:
                del blok["baslik"]
    return baglamlar


def blok_metni(b):
    parca = []
    for blok in b["bloklar"]:
        parca.append(blok.get("baslik", ""))
        if blok["t"] == "metin":
            parca += blok["p"]
        elif blok["t"] == "kutu":
            parca += blok["satirlar"]
        elif blok["t"] == "siir":
            parca += [d for k in blok["kitalar"] for d in k]
        else:
            parca += [" ".join(s) for s in blok["satirlar"]]
    return " ".join(parca)


def denetle(sinif, baglamlar, v, hatalar, uyarilar):
    s = v["siniflar"][sinif]
    kodlar = {c["kod"] for c in s["yil"]}
    no = 0
    harfler = {h: 0 for h in "ABCD"}
    kokler = set()
    for b in baglamlar:
        yer = f"{sinif}. sınıf, {b['no']}. bağlam ({b['baslik']})"
        if not b["baslik"] or not b["tur"] or not b["ozet"]:
            hatalar.append(f"{yer}: başlık, tür ya da özet eksik")
        if b["ozet"].endswith("."):
            hatalar.append(f"{yer}: özet nokta ile bitmemeli (yönergede listeye girer)")
        if b["tema"]:
            # Programdaki tema adlarında kıvrık kesme işareti var; kaynakta düz yazılır, adı programdaki biçimiyle saklarız
            eslesen = [t for t in s["temalar"] if t.replace("\u2019", "'") == b["tema"]]
            if eslesen:
                b["tema"] = eslesen[0]
            else:
                hatalar.append(f"{yer}: tema sınıfın temalarında yok: {b['tema']}")
        if not b["bloklar"]:
            hatalar.append(f"{yer}: metin, şiir, kutu ya da tablo yok")
        if len(b["sorular"]) != 5:
            hatalar.append(f"{yer}: 5 soru olmalı, {len(b['sorular'])} var")
        govde = blok_metni(b)
        for q in b["sorular"]:
            no += 1
            q["no"] = no
            satir = q.pop("_satir")
            y = f"{yer}, {no}. soru (satır {satir})"
            kok = " ".join(q["kok"])
            if q["kod"] not in kodlar:
                hatalar.append(f"{y}: kod bu sınıfın çıktı listesinde yok: {q['kod']}")
            if not kok:
                hatalar.append(f"{y}: soru kökü boş")
            if kok in kokler:
                hatalar.append(f"{y}: aynı soru kökü ikinci kez kullanılmış")
            kokler.add(kok)
            if not q["cevap"] or not q["aciklama"]:
                hatalar.append(f"{y}: cevap ya da açıklama eksik")
            tum = " ".join([kok, q["cevap"], q["aciklama"]] + q["secenekler"])
            if re.search(r"(^|[.!?:] )Ancak\b", tum) or re.search(r"(^|[.!?:] )Ancak\b", govde):
                hatalar.append(f"{y}: 'Ancak' ile başlayan cümle var")
            if re.search(r", ama\b|\bama,", tum + " " + govde):
                hatalar.append(f"{y}: 'ama' virgülle yazılmış")
            if tum.count("*") % 2:
                hatalar.append(f"{y}: kalın işareti (*) kapanmamış")
            if q["tur"] == "coktan":
                if len(q["secenekler"]) != 4:
                    hatalar.append(f"{y}: dört seçenek olmalı")
                    continue
                if q["cevap"] not in "ABCD" or len(q["cevap"]) != 1:
                    hatalar.append(f"{y}: CEVAP A, B, C ya da D olmalı")
                    continue
                harfler[q["cevap"]] += 1
                if len(set(q["secenekler"])) != 4:
                    hatalar.append(f"{y}: aynı seçenek iki kez yazılmış")
                boy = [len(x) for x in q["secenekler"]]
                dogru = boy["ABCD".index(q["cevap"])]
                oteki = [x for i, x in enumerate(boy) if i != "ABCD".index(q["cevap"])]
                if dogru > 1.35 * max(oteki) and dogru - max(oteki) > 12:
                    uyarilar.append(f"{y}: doğru seçenek ötekilerden belirgin uzun ({dogru} / {max(oteki)})")
                if re.search(r"\b(hepsi|hiçbiri)\b", " ".join(q["secenekler"]).lower()):
                    hatalar.append(f"{y}: 'hepsi' ya da 'hiçbiri' seçeneği kullanılmış")
                if b["bloklar"] and b["bloklar"][0]["t"] != "siir":
                    for sec in q["secenekler"]:
                        if len(sozcukler(sec)) >= 6 and sec.rstrip(".") in govde:
                            uyarilar.append(f"{y}: seçenek metinden aynen alınmış: {sec[:50]}")
                olumsuz = re.search(r"\b(değildir|yoktur|olamaz|ulaşılamaz|söylenemez|çıkarılamaz|getirilemez|yer almaz|"
                                    r"beklenemez|verilmemiştir|uygun düşmez|değinilmemiştir|bulunmaz|kullanılmamıştır|"
                                    r"gösterilemez|sayılamaz|yanlıştır|aykırıdır|örnek olamaz)\b", q["kok"][-1])
                if olumsuz and "*" not in q["kok"][-1]:
                    uyarilar.append(f"{y}: olumsuz kök kalın yazılmamış ({olumsuz.group(0)})")
            else:
                if q["secenekler"]:
                    hatalar.append(f"{y}: açık uçlu soruda seçenek var")
                del q["secenekler"]
    coktan = sum(harfler.values())
    if coktan and max(harfler.values()) - min(harfler.values()) > 2:
        hatalar.append(f"{sinif}. sınıf: doğru cevap harfleri dengesiz: {harfler}")
    return no, coktan, harfler


def main(hedef):
    v = veri()
    hatalar, uyarilar = [], []
    siniflar = {}
    for sinif in SINIFLAR:
        yol = KAYNAK / f"sinif-{sinif}.txt"
        if not yol.exists():
            print(f"  {sinif}. sınıf: kaynak dosya yok, atlandı")
            continue
        baglamlar = coz(sinif, yol, hatalar)
        toplam, coktan, harfler = denetle(sinif, baglamlar, v, hatalar, uyarilar)
        siniflar[sinif] = {"baglamlar": baglamlar}
        print(f"  {sinif}. sınıf: {len(baglamlar)} bağlam, {toplam} soru ({coktan} çoktan seçmeli, {toplam - coktan} açık uçlu), "
              f"harfler {harfler}, kodlar {len({q['kod'] for b in baglamlar for q in b['sorular']})}")
    for u in uyarilar:
        print("  UYARI " + u)
    if hatalar:
        for h in hatalar:
            print("  HATA  " + h)
        print(f"{len(hatalar)} hata var; banka.js yazılmadı")
        return 1
    banka = {"tarih": "2026-11-13", "siniflar": siniflar}
    metin = (
        "/*\n"
        " * Türkçe Soru Atölyesi: hazır soru bankası. Bu dosya betikle üretilir, elle düzenlenmez\n"
        " * (araclar/banka_js.py). Sorular banka-kaynak klasöründeki dosyalarda yazılır.\n"
        " */\n"
        "window.SoruBankasi = " + json.dumps(banka, ensure_ascii=False, separators=(",", ":")) + ";\n"
    )
    Path(hedef).write_text(metin, encoding="utf-8")
    print(f"yazıldı: {hedef}  {len(metin.encode('utf-8'))} bayt")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else str(KOK / "banka.js")))
