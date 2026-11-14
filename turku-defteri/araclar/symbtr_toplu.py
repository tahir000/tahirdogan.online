#!/usr/bin/env python3
"""SymbTr veri setindeki türküleri toplu olarak kaynak/ klasörüne çevirir.

Kullanım (turku-defteri klasöründen):
  python3 -I araclar/symbtr_toplu.py --txt <SymbTr txt klasörü> --mu2 <SymbTr mu2 klasörü>

Her türkü için:
  - Adı, makamı ve söz sahibi mu2 dosyasının başlığından okunur.
  - Bestecisi ya da söz yazarı belli olan eserler alınmaz (yalnız anonim türküler).
  - Bütün sesleri 23 perdeli uzun sapta, bozuk düzende çalınamayan türküler alınmaz.
  - Zorluk, notaların hızına ve ses aralığına göre kabaca tahmin edilir.

Üretilen dosyaların başında "ceviri: toplu" yazar. Bu betik yeniden çalıştırılınca
yalnız bu satırı taşıyan dosyaların üzerine yazar. Bir dosyayı elle düzelttiysen
satırı "ceviri: elle" yap; betik o dosyaya bir daha dokunmaz. Elle açılmış dosyalara
(ör. ilk beş türkü) hiç dokunmaz.

Sonuç araclar/toplu_rapor.txt dosyasına yazılır: eklenenler ve alınmayanlar, nedeniyle.
"""
import argparse
import io
import os
import re
import statistics
import sys
import types

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import symbtr_al as S  # noqa: E402

YORELER = {
    "": "", "adana": "Adana", "adiyaman": "Adıyaman", "afyon": "Afyon", "afyon-sandikli": "Afyon, Sandıklı",
    "akdagmadeni": "Akdağmadeni", "ankara": "Ankara", "antalya": "Antalya", "artvin": "Artvin", "aydin": "Aydın",
    "azeri": "Azerbaycan", "bartin": "Bartın", "biga": "Biga", "bilecik": "Bilecik", "bolu": "Bolu", "burdur": "Burdur",
    "bursa": "Bursa", "canakkale": "Çanakkale", "cankiri": "Çankırı", "corum": "Çorum", "denizli": "Denizli",
    "diyarbakir": "Diyarbakır", "edirne-kesan": "Edirne, Keşan", "elazig": "Elazığ", "erzincan": "Erzincan",
    "erzurum": "Erzurum", "eskisehir": "Eskişehir", "gaziantep": "Gaziantep", "giresun": "Giresun",
    "hacibektas": "Hacıbektaş", "hatay": "Hatay", "hendek": "Hendek", "igdir": "Iğdır", "istanbul": "İstanbul",
    "izmir": "İzmir", "kars": "Kars", "kastamonu": "Kastamonu", "kayseri": "Kayseri", "kerkuk": "Kerkük",
    "kirikkale-keskin": "Kırıkkale, Keskin", "kirim": "Kırım", "kirsehir": "Kırşehir", "kirsehir-mucur": "Kırşehir, Mucur",
    "konya": "Konya", "kutahya": "Kütahya", "macka": "Maçka", "malatya": "Malatya", "manisa": "Manisa", "maras": "Maraş",
    "mugla": "Muğla", "mus": "Muş", "nevsehir": "Nevşehir", "ordu": "Ordu", "orta_anadolu": "Orta Anadolu", "rize": "Rize",
    "rumeli": "Rumeli", "sarkisla": "Şarkışla", "sivas": "Sivas", "tokat": "Tokat", "tokat-zile": "Tokat, Zile",
    "trabzon": "Trabzon", "trakya": "Trakya", "tunceli": "Tunceli", "urfa": "Urfa", "usak": "Uşak", "yozgat": "Yozgat",
}
ANONIM_SOZ = ("[Anonim]", "(Anonim)", "?", "-", "")

HARF = {"Do": 0, "Re": 2, "Mi": 4, "Fa": 5, "Sol": 7, "La": 9, "Si": 11}
DEGISIM = {"": 0, "b": -2, "b2": -1, "#": 2, "#3": 1}
PERDELER = [2, 3, 4, 6, 7, 8, 10, 12, 13, 14, 16, 17, 18, 20, 21, 22, 24, 26, 27, 28, 30, 32, 34]  # perde.js ile aynı


def adim(ad):
    m = re.match(r"^(Do|Re|Mi|Fa|Sol|La|Si)(\d)(b2|b|#3|#)?$", ad)
    return ((int(m.group(2)) - 4) * 12 + HARF[m.group(1)] - 9) * 2 + DEGISIM[m.group(3) or ""]


def calinir(ad):
    """Varsayılan yerleşimle çalınabiliyor mu: la ve üstü alt telde, sol boş üst telde, pesler orta telde."""
    a = adim(ad)
    if a >= 0:
        return a == 0 or a in PERDELER
    if a == -4:
        return True
    orta = a + 14
    return orta == 0 or orta in PERDELER


def baslik_oku(yol):
    ham = open(yol, "rb").read()
    for kod in ("utf-8", "cp1254"):
        try:
            metin = ham.decode(kod)
            break
        except UnicodeDecodeError:
            continue
    alan = {}
    for satir in metin.splitlines()[:30]:
        p = satir.split("\t")
        if len(p) >= 8 and p[0] in ("50", "58", "59", "60") and p[0] not in alan:
            alan[p[0]] = p[7].strip()
    return alan


def makam_adi(ham):
    ad = S.sapkasiz(ham).replace("'", "").replace("-", " ").strip()
    if ad == "Çargah(Yeni)":
        ad = "Yeni Çargah"
    return ad


def kimlik_yap(ad):
    cevir = str.maketrans("çğıöşüâîûÇĞİÖŞÜI", "cgiosuaiucgiosui")
    duz = ad.translate(cevir).lower().replace("'", "").replace("’", "")
    return re.sub(r"[^a-z0-9]+", "-", duz).strip("-")


def zorluk_bul(olculer, tempo):
    birlik = 240.0 / tempo
    sureler, adimlar, carpma, nota = [], [], 0, 0
    for o in olculer:
        for n in o["notalar"]:
            if n["ad"] == "Es":
                continue
            nota += 1
            sureler.append(float(n["sure"]) * birlik)
            adimlar.append(adim(n["ad"]))
            if n["carpma"]:
                carpma += 1
    sureler.sort()
    hizli = sureler[len(sureler) // 10]            # en kısa onda birlik dilimin süresi (sn)
    aralik = (max(adimlar) - min(adimlar)) / 2.0   # yarım ses
    orta_sure = statistics.median(sureler)
    # Puan: hızlı geçişler, kısa notalar, geniş ses aralığı ve çarpmalar zorlaştırır.
    puan = 0
    puan += 2 if hizli < 0.14 else (1 if hizli < 0.18 else (-1 if hizli >= 0.24 else 0))
    puan += 1 if orta_sure < 0.2 else (-1 if orta_sure >= 0.3 else 0)
    puan += 1 if aralik > 14 else (-1 if aralik <= 10.5 else 0)
    puan += 1 if carpma > nota * 0.035 else 0
    return "kolay" if puan <= -1 else ("zor" if puan >= 2 else "orta")


def var_olanlar(kaynak):
    """kaynak/ klasöründeki dosyalar: SymbTr adı -> (dosya, toplu mu)."""
    bulunan, kimlikler = {}, {}
    for ad in os.listdir(kaynak):
        if not ad.endswith(".txt"):
            continue
        ust = io.open(os.path.join(kaynak, ad), encoding="utf-8").read().split("\n---\n")[0]
        toplu = re.search(r"^ceviri: toplu\s*$", ust, re.M) is not None
        kimlikler[ad[:-4]] = toplu
        m = re.search(r"^kaynak: SymbTr [\d.]+, (\S+)\s*$", ust, re.M)
        if m:
            bulunan[m.group(1)] = (ad[:-4], toplu)
    return bulunan, kimlikler


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--txt", required=True)
    ap.add_argument("--mu2", required=True)
    a = ap.parse_args()
    kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    kaynak = os.path.join(kok, "kaynak")
    bulunan, kimlikler = var_olanlar(kaynak)
    # Yeniden üretimde eski toplu dosyalar silinmez, üzerine yazılır
    eklenen, atlanan = [], []
    kullanilan = set(k for k, toplu in kimlikler.items() if not toplu)

    for dosya in sorted(os.listdir(a.txt)):
        if not dosya.endswith(".txt"):
            continue
        symbtr = dosya[:-4]
        parca = symbtr.split("--")
        if len(parca) != 5:
            atlanan.append((symbtr, "dosya adı beklenen biçimde değil"))
            continue
        if symbtr in bulunan and not bulunan[symbtr][1]:
            atlanan.append((symbtr, "zaten var (elle): " + bulunan[symbtr][0]))
            continue
        mu2 = os.path.join(a.mu2, symbtr + ".mu2")
        baslik = baslik_oku(mu2) if os.path.exists(mu2) else {}
        ad = S.sapkasiz(baslik.get("60", "")).strip()
        if not ad:
            atlanan.append((symbtr, "başlık okunamadı"))
            continue
        if parca[4] not in YORELER:
            atlanan.append((symbtr, "bestecisi yazıyor: " + parca[4].replace("_", " ")))
            continue
        if baslik.get("59", "") not in ANONIM_SOZ:
            atlanan.append((symbtr, "söz yazarı yazıyor: " + S.sapkasiz(baslik.get("59", ""))))
            continue
        try:
            olculer, tempo, uyarilar = S.olculere_bol(S.oku(os.path.join(a.txt, dosya)))
        except (ValueError, KeyError) as h:
            atlanan.append((symbtr, "okunamadı: %s" % h))
            continue
        if any("ortasında" in u or "aşıyor" in u for u in uyarilar):
            atlanan.append((symbtr, "ölçüler usule oturmuyor"))
            continue
        sesler = set()
        for o in olculer:
            for n in o["notalar"]:
                if n["ad"] != "Es":
                    sesler.add(n["ad"])
                sesler.update(n["carpma"])
        perdesiz = sorted(s for s in sesler if not calinir(s))
        if perdesiz:
            atlanan.append((symbtr, "sapta perdesi olmayan ses: " + " ".join(perdesiz)))
            continue
        if sum(1 for o in olculer for n in o["notalar"] if n["ad"] != "Es") < 20:
            atlanan.append((symbtr, "çok kısa"))
            continue

        kimlik = bulunan[symbtr][0] if symbtr in bulunan else kimlik_yap(ad)
        if symbtr not in bulunan:
            aday, ek = kimlik, 2
            ekler = [kimlik_yap(YORELER[parca[4]]), kimlik_yap(makam_adi(baslik.get("50", "")))]
            while aday in kullanilan or not aday:
                sonek = ekler.pop(0) if ekler else str(ek)
                if not ekler:
                    ek += 1
                aday = (kimlik + "-" + sonek).strip("-") if sonek else kimlik + "-" + str(ek)
            kimlik = aday
        kullanilan.add(kimlik)

        bilgi = types.SimpleNamespace(
            ad=ad, yore=YORELER[parca[4]], dizi=makam_adi(baslik.get("50", "")),
            zorluk=zorluk_bul(olculer, tempo), aciklama="")
        metin, gecis = S.yaz(olculer, tempo, S.katla(olculer), bilgi, symbtr)
        metin = metin.replace("\ndurum: taslak\n", "\ndurum: taslak\nceviri: toplu\n", 1)
        io.open(os.path.join(kaynak, kimlik + ".txt"), "w", encoding="utf-8").write(metin)
        eklenen.append((kimlik, ad, bilgi.yore, bilgi.zorluk, len(olculer), gecis))

    # Artık üretilmeyen eski toplu dosyaları bildir (silmez)
    artik = sorted(k for k, toplu in kimlikler.items() if toplu and k not in kullanilan)

    rapor = ["SymbTr toplu çeviri raporu", "", "Eklenen: %d" % len(eklenen), "Alınmayan: %d" % len(atlanan), ""]
    nedenler = {}
    for _, neden in atlanan:
        anahtar = neden.split(":")[0]
        nedenler[anahtar] = nedenler.get(anahtar, 0) + 1
    rapor.append("Alınmama nedenleri:")
    for k, v in sorted(nedenler.items(), key=lambda x: -x[1]):
        rapor.append("  %3d  %s" % (v, k))
    zor = {}
    for e in eklenen:
        zor[e[3]] = zor.get(e[3], 0) + 1
    rapor += ["", "Zorluk dağılımı: " + ", ".join("%s %d" % kv for kv in sorted(zor.items())), "", "EKLENENLER"]
    for e in eklenen:
        rapor.append("  %-44s %s%s" % (e[0], e[1], " (" + e[2] + ")" if e[2] else ""))
    rapor += ["", "ALINMAYANLAR"]
    for symbtr, neden in atlanan:
        rapor.append("  %-70s %s" % (symbtr, neden))
    if artik:
        rapor += ["", "ARTIK ÜRETİLMEYEN ESKİ TOPLU DOSYALAR (elle silinmeli)"] + ["  " + k for k in artik]
    io.open(os.path.join(kok, "araclar", "toplu_rapor.txt"), "w", encoding="utf-8").write("\n".join(rapor) + "\n")
    print("\n".join(rapor[:12 + len(nedenler)]))


if __name__ == "__main__":
    main()
