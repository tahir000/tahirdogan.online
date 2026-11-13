"""Program metninden sinif > tema > ogrenme ciktilari listesini cikarir.
Kullanim: python3 -I program_json.py <program.txt> <siniflar: 5,6,7> <cikti.json>"""
import sys, re, json

txt = open(sys.argv[1], encoding="utf-8").read().split("\n")
siniflar = sys.argv[2].split(",")

tema_re = re.compile(r"^([1-6])\. TEMA: (.+)$")
kod_re = re.compile(r"^(T\.([DOKY])\.(\d)\.(\d+)\.)\s*([A-ZÇĞİÖŞÜa-zçğıöşü].*)$")
ALAN = {"D": "Dinleme/İzleme", "O": "Okuma", "K": "Konuşma", "Y": "Yazma"}

# tema basliklarinin satir numaralari; sinif, ilk gecen ciktinin kodundan anlasilir
temalar = [(i, m.group(1), m.group(2).strip()) for i, l in enumerate(txt) for m in [tema_re.match(l)] if m]
out = {}
for n, (start, no, ad) in enumerate(temalar):
    end = temalar[n + 1][0] if n + 1 < len(temalar) else len(txt)
    blok = txt[start:end]
    ciktilar, cur, gorulen = [], None, set()
    for l in blok[1:]:
        s_ = l.strip()
        m = kod_re.match(s_)
        if m:
            if m.group(1) in gorulen:
                cur = None
                continue
            gorulen.add(m.group(1))
            cur = {"kod": m.group(1), "alan": ALAN[m.group(2)], "sinif": m.group(3), "ad": m.group(5)}
            ciktilar.append(cur)
        elif ciktilar and (s_.startswith("Genellemeler") or s_.startswith("ÖĞRENME-ÖĞRETME")):
            break
        elif (not s_) or s_.isdigit() or s_.startswith("=====") or s_.startswith("ORTAOKUL TÜRKÇE") \
                or s_ in ("Dinleme/İzleme", "Okuma", "Konuşma", "Yazma", "ÖĞRENME ÇIKTILARI") \
                or s_.startswith("İÇERİK") or s_.isupper():
            cur = None
        elif cur is not None:
            if cur["ad"].endswith("-"):
                cur["ad"] = cur["ad"][:-1] + s_
            else:
                cur["ad"] += " " + s_
    if not ciktilar:
        continue
    sinif = ciktilar[0]["sinif"]
    if sinif not in siniflar:
        continue
    ders_saati = next((re.search(r"\d+", l).group(0) for l in blok[:40] if l.startswith("DERS SAATİ")), None)
    out.setdefault(sinif, []).append({
        "tema_no": int(no), "tema": ad, "ders_saati": ders_saati,
        "ciktilar": [{"kod": c["kod"], "alan": c["alan"], "ad": c["ad"].replace("­", "")} for c in ciktilar],
    })

json.dump(out, open(sys.argv[3], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for s in sorted(out):
    print("sinif", s, [(t["tema_no"], t["tema"][:22], len(t["ciktilar"])) for t in out[s]])
