#!/usr/bin/env python3
"""Bilgi paketindeki JSON dosyalarından sitenin veri dosyasını (veri.js) üretir.

Kullanım (deponun kökünden):
    python3 -I araclar/veri_js.py

Girdi : bilgi-paketi/senaryolar.json, temalar-5-program2026.json, temalar-6-7-program2024.json,
        surec-bilesenleri.json (betikle çıkarılan), surec-bilesenleri-7.json (elle yazılan notlar)
"""
import json
import sys
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


def main(hedef):
    senaryo = json.loads((PAKET / "senaryolar.json").read_text(encoding="utf-8"))
    temalar = {}
    for dosya in ("temalar-5-program2026.json", "temalar-6-7-program2024.json"):
        temalar.update(json.loads((PAKET / dosya).read_text(encoding="utf-8")))
    surec = json.loads((PAKET / "surec-bilesenleri.json").read_text(encoding="utf-8"))
    elle = json.loads((PAKET / "surec-bilesenleri-7.json").read_text(encoding="utf-8"))

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
        print(f"  {sinif}. sınıf: {len(d['ciktilar'])} çıktı, {sum(len(x) for x in d['sinavlar'].values())} senaryo, temalar: {d['temalar']}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(KOK / "veri.js"))
