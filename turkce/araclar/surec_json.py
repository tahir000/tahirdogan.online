#!/usr/bin/env python3
"""Programın "öğrenme çıktısı ve süreç bileşenleri" tablosundan süreç bileşenlerini çıkarır.

Kullanım:
    python3 -I araclar/surec_json.py

Girdi : metin/program.txt (2026 sürümü, 5. sınıf), metin/program-eski.txt (2024 sürümü, 6 ve 7. sınıf),
        bilgi-paketi/senaryolar.json (hangi çıktılar gerekli, adları ne)
Çıktı : bilgi-paketi/surec-bilesenleri.json

Tablodaki düzen: çıktının adı, altında a) b) c) maddeleri. Bir blok yalnız maddelerden önceki metinde
en sonda geçen çıktı adı aranan adsa, maddeleri a, b, c sırasıyla geliyorsa ve tek aday varsa kabul edilir.
Kabul edilmeyen çıktı dosyaya yazılmaz; hangilerinin eksik kaldığı ekrana basılır.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KOD = re.compile(r"T\.[DOKY]\.\d\.\d+\.")
MADDE = re.compile(r"^([a-hç])\)\s+(.*)$")
SIRA = ["a", "b", "c", "ç", "d", "e", "f", "g", "ğ", "h"]


def norm(s):
    s = unicodedata.normalize("NFC", s).replace("-\n", "").replace("\n", " ")
    s = re.sub(r"[^0-9A-Za-zÇĞİÖŞÜçğıöşü]+", "", s)
    return s.lower()


def birlestir(parcalar):
    """Satır sonu tirelerini birleştirerek tek satıra çevirir."""
    cikti = ""
    for p in parcalar:
        p = p.strip()
        if not p:
            continue
        if cikti.endswith("-") and p[:1].islower():
            cikti = cikti[:-1] + p
        elif cikti:
            cikti += " " + p
        else:
            cikti = p
    return re.sub(r"\s+", " ", cikti).strip()


def tamam(metin):
    """Madde cümlesi bitti mi: nokta ile bitiyor ve parantezler kapalı."""
    m = metin.strip()
    return m.endswith(".") and m.count("(") == m.count(")") and not m.endswith("vb.")


def bolum(satirlar):
    bas = next(i for i, s in enumerate(satirlar) if s.startswith("ÖĞRENME ÇIKTISI VE SÜREÇ BİLEŞENLERİ"))
    son = next(i for i, s in enumerate(satirlar) if i > bas and (
        re.match(r"^T\.D\.5\.1\. / T\.D\.6\.1\.", s) or s.strip() == "ÖĞRENME ÇIKTILARI"))
    return satirlar[bas:son]


def coz(yol):
    """Bölümü (ön metin, maddeler) bloklarına ayırır. Ön metin: önceki bloğun bitişinden a) maddesine kadar."""
    satirlar = bolum(Path(yol).read_text(encoding="utf-8").split("\n"))
    bloklar = []
    on, maddeler = [], []
    alanlar = []          # her bloğun alanı: bloktan sonra görülen ilk kodun harfi (D, O, K, Y)
    for ham in satirlar:
        s = unicodedata.normalize("NFC", ham).strip()
        if not s or s.startswith("===== SAYFA") or re.fullmatch(r"\d{1,3}", s):
            continue
        for atla in ("ORTAOKUL TÜRKÇE DERSİ ÖĞRETİM PROGRAMI", "ÖĞRENME ÇIKTISI VE SÜREÇ BİLEŞENLERİ",
                     "ÖĞRENME ÇIKTISININ SINIF SEVİYESİNE GÖRE KODLARI VE AÇIKLAMALARI",
                     "ÖĞRENME ÇIKTISI SINIF SEVİYESİNE GÖRE KODLARI VE AÇIKLAMALARI"):
            s = s.replace(atla, "").strip()
        kodlar = KOD.findall(s)
        govde = KOD.sub("", s).strip()
        m = MADDE.match(govde) if govde else None
        if m and m.group(1) == "a":
            if maddeler:
                bloklar.append((on, maddeler))
                alanlar.append(None)
                on = sonraki
            maddeler, sonraki = [("a", [m.group(2)])], []
        elif m and maddeler and not sonraki and SIRA.index(m.group(1)) == len(maddeler):
            maddeler.append((m.group(1), [m.group(2)]))
        elif maddeler and not sonraki and not tamam(birlestir(maddeler[-1][1])):
            maddeler[-1][1].append(govde)
        elif maddeler and govde:
            sonraki.append(govde)
        elif govde:
            on.append(govde)
        if kodlar:
            # kod, o an açık olan bloğun ve alanı henüz belli olmayan öncekilerin alanını verir
            harf = kodlar[0][2]
            for i in range(len(alanlar) - 1, -1, -1):
                if alanlar[i] is not None:
                    break
                alanlar[i] = harf
            acik_alan = harf
            if maddeler:
                son_alan = harf
    if maddeler:
        bloklar.append((on, maddeler))
        alanlar.append(None)
    # son bloklar için alan: kendilerinden sonra kod gelmediyse en son görülen kod
    return [("\n".join(o), [(h, birlestir(p)) for h, p in m], a) for (o, m), a in zip(bloklar, alanlar)]


def sec(bloklar, ad, bilinen_adlar, alan):
    """Maddelerden önceki metinde en sonda geçen çıktı adı aranan adsa bloğu kabul eder."""
    hedef = norm(ad)
    adaylar = []
    for on, maddeler, blok_alani in bloklar:
        n = norm(on)
        yer = n.rfind(hedef)
        if yer < 0:
            continue
        bitis = yer + len(hedef)
        # ön metinde daha sonra biten başka bir çıktı adı varsa maddeler ona aittir
        if any(b != hedef and n.rfind(b) >= 0 and n.rfind(b) + len(b) > bitis for b in bilinen_adlar):
            continue
        if len(maddeler) < 2 or not all(t.endswith(".") for _, t in maddeler):
            continue
        adaylar.append(({h: t for h, t in maddeler}, blok_alani))
    tekil = []
    for a, _ in adaylar:
        if a not in tekil:
            tekil.append(a)
    if len(tekil) > 1:
        # aynı ad birden çok alanda geçiyor (dinleme ve okuma): çıktının kendi alanındaki blok seçilir
        alandaki = []
        for a, blok_alani in adaylar:
            if blok_alani == alan and a not in alandaki:
                alandaki.append(a)
        return alandaki
    return tekil


def main():
    senaryo = json.loads((KOK / "bilgi-paketi/senaryolar.json").read_text(encoding="utf-8"))
    temalar = {}
    for dosya in ("temalar-5-program2026.json", "temalar-6-7-program2024.json"):
        temalar.update(json.loads((KOK / "bilgi-paketi" / dosya).read_text(encoding="utf-8")))
    kaynak = {"5": ("2026", "metin/program.txt"), "6": ("2024", "metin/program-eski.txt"), "7": ("2024", "metin/program-eski.txt")}
    cozulmus = {}
    sonuc, eksik = {}, []
    for sinif, (surum, yol) in kaynak.items():
        if yol not in cozulmus:
            cozulmus[yol] = coz(KOK / yol)
        adlar = {norm(c["ad"]) for c in senaryo[sinif]["ciktilar"]}
        adlar |= {norm(c["ad"]) for t in temalar[sinif] for c in t["ciktilar"]}
        for c in senaryo[sinif]["ciktilar"]:
            bulunan = sec(cozulmus[yol], c["ad"], adlar, c["kod"][2])
            if len(bulunan) == 1:
                sonuc[c["kod"]] = {"ad": c["ad"], "surum": surum, "bilesenler": bulunan[0]}
            else:
                eksik.append((c["kod"], c["ad"], len(bulunan)))
    hedef = KOK / "bilgi-paketi/surec-bilesenleri.json"
    hedef.write_text(json.dumps(sonuc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"yazıldı: {hedef.name}  kabul: {len(sonuc)}  eksik: {len(eksik)}")
    for k, a, n in eksik:
        print(f"  EKSİK {k} ({n} farklı aday) {a}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
