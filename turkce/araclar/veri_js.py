#!/usr/bin/env python3
"""Bilgi paketindeki JSON dosyalarından sitenin veri dosyasını (veri.js) üretir.

Kullanım (deponun kökünden):
    python3 -I araclar/veri_js.py

Girdi : bilgi-paketi/senaryolar.json, temalar-5-program2026.json, temalar-6-7-program2024.json,
        surec-bilesenleri.json (betikle çıkarılan), surec-bilesenleri-7.json (elle yazılan notlar)
"""
import json
import sys
import unicodedata
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
PAKET = KOK / "bilgi-paketi"

PROGRAM = {
    "5": {"surum": "2026", "ad": "Türkçe Dersi Öğretim Programı (Türkiye Yüzyılı Maarif Modeli), 2026 sürümü"},
    "6": {"surum": "2024", "ad": "Türkçe Dersi Öğretim Programı (Türkiye Yüzyılı Maarif Modeli), 2024 sürümü"},
    "7": {"surum": "2024", "ad": "Türkçe Dersi Öğretim Programı (Türkiye Yüzyılı Maarif Modeli), 2024 sürümü"},
    "8": {"surum": "2019", "ad": "Türkçe Dersi Öğretim Programı (2019)"},
}

# Programda harfli süreç bileşeni olmayan, tek cümleyle açıklanan çıktılar (2026 sürümü, tablo)
ACIKLAMA = {
    "T.Y.5.15.": "Programdaki açıklama: Öğrenci, bağlantı ifadelerini (ekleme ifade etme, sınırlandırma ifade etme, "
                 "sonuca geldiğini ifade etme vb.) işlevlerine uygun biçimde kullanarak tutarlı içerikler oluşturur.",
    "T.Y.5.16.": "Programdaki açıklama: Noktalama işaretlerini kurallarına uygun kullanır. Yazım kurallarını uygular.",
}

KUCUK = str.maketrans({"I": "ı", "İ": "i"})
BUYUK = str.maketrans({"i": "İ", "ı": "I"})


def baslik(s):
    """BÜYÜK HARFLİ tema adını Türkçe kurallarla 'Baş Harfleri Büyük' biçimine çevirir."""
    sozcukler = []
    for i, w in enumerate(s.translate(KUCUK).lower().split()):
        if w == "ve" and i > 0:
            sozcukler.append(w)
        else:
            sozcukler.append(w[:1].translate(BUYUK).upper() + w[1:])
    return " ".join(sozcukler)


def sira(kod):
    """T.O.5.12. gibi bir kodu alan harfine ve sayısına göre sıralar (okuma önce, yazma sonra)."""
    p = kod.strip(".").split(".")
    return (p[-3] if len(p) == 4 and p[1] in "OY" else "", [int(x) for x in p if x.isdigit()])


def yillik(tablo, temalar):
    """Yıl boyunca işlenen okuma ve yazma çıktıları: tablodakiler ve programın temalarındakiler.

    Tabloda geçen çıktının adı tablodan, geçmeyenin adı programdan alınır. "temalar" çıktının işlendiği
    temaların sıra numaralarıdır (8. sınıfta tema verisi yoktur, liste boş kalır).
    """
    liste = {c["kod"]: {"kod": c["kod"], "ad": c["ad"], "alan": baslik(c["alan"]), "temalar": []} for c in tablo}
    for t in temalar:
        for c in t["ciktilar"]:
            if c["alan"] not in ("Okuma", "Yazma"):
                continue
            kayit = liste.setdefault(c["kod"], {"kod": c["kod"], "ad": c["ad"], "alan": c["alan"], "temalar": []})
            if t["tema_no"] not in kayit["temalar"]:
                kayit["temalar"].append(t["tema_no"])
    return sorted(liste.values(), key=lambda c: sira(c["kod"]))


def oku(ad):
    """JSON dosyasını okur. Harfler tek biçime (NFC) çevrilir: Excel'den gelen bazı adlarda "ü" iki ayrı işaretle yazılı."""
    return json.loads(unicodedata.normalize("NFC", (PAKET / ad).read_text(encoding="utf-8")))


def main(hedef):
    senaryo = oku("senaryolar.json")
    temalar = {}
    for dosya in ("temalar-5-program2026.json", "temalar-6-7-program2024.json"):
        temalar.update(oku(dosya))
    surec = oku("surec-bilesenleri.json")
    elle = oku("surec-bilesenleri-7.json")

    siniflar = {}
    for sinif in ("5", "6", "7", "8"):
        s = senaryo[sinif]
        kodlar = {c["kod"] for c in s["ciktilar"]}
        sinavlar = {}
        for sinav, senaryolar in s["senaryolar"].items():
            sinavlar[sinav] = {}
            for ad, adetler in senaryolar.items():
                temiz = {k: v for k, v in adetler.items() if k != "_toplam" and v}
                assert set(temiz) <= kodlar, (sinif, sinav, ad)
                assert sum(temiz.values()) == adetler["_toplam"], (sinif, sinav, ad)
                sinavlar[sinav][ad] = temiz
        siniflar[sinif] = {
            "program": PROGRAM[sinif]["surum"],
            "programAdi": PROGRAM[sinif]["ad"],
            "temalar": [baslik(t["tema"]) for t in temalar.get(sinif, [])],
            "ciktilar": [{"kod": c["kod"], "ad": c["ad"], "alan": baslik(c["alan"])} for c in s["ciktilar"]],
            "yil": yillik(s["ciktilar"], temalar.get(sinif, [])),
            "sinavlar": sinavlar,
            "sinavNotlari": s.get("notlar", {}),
        }

    bilesenler = {k: v["bilesenler"] for k, v in surec.items()}
    notlar = dict(ACIKLAMA)
    for k, v in elle.items():
        assert k in bilesenler, k
        parca = [v.get("not", "").strip(), v.get("arac", "").strip()]
        notlar[k] = " ".join(p for p in parca if p)

    veri = {
        "tarih": "2026-11-13",
        "tablo": "MEB 2026-2027 eğitim öğretim yılı 1. dönem konu soru dağılım tablosu (Türkçe)",
        "siniflar": siniflar,
        "bilesenler": bilesenler,
        "notlar": notlar,
    }
    metin = (
        "/*\n"
        " * Türkçe Soru Atölyesi: veri. Bu dosya betikle üretilir, elle düzenlenmez (araclar/veri_js.py).\n"
        " * Kaynak: MEB konu soru dağılım tablosu ve Türkçe Dersi Öğretim Programı.\n"
        " */\n"
        "window.SoruVerisi = " + json.dumps(veri, ensure_ascii=False, indent=1) + ";\n"
    )
    Path(hedef).write_text(metin, encoding="utf-8")
    print(f"yazıldı: {hedef}  {len(metin.encode('utf-8'))} bayt  bileşenli çıktı: {len(bilesenler)}  not: {len(notlar)}")
    for sinif, d in siniflar.items():
        print(f"  {sinif}. sınıf: {len(d['ciktilar'])} çıktı (yıllık {len(d['yil'])}), {sum(len(x) for x in d['sinavlar'].values())} senaryo, temalar: {d['temalar']}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(KOK / "veri.js"))
