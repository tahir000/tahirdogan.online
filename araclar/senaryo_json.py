"""Konu-soru dagilim tablosunu (xlsx) okuyup senaryolar.json uretir.
Kullanim: python3 -I senaryo_json.py <xlsx> <cikti.json>"""
import sys, zipfile, re, json
import xml.etree.ElementTree as ET

M = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

def col_idx(ref):
    letters = re.match(r"[A-Z]+", ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n

def read(path):
    z = zipfile.ZipFile(path)
    shared = []
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    for si in root.findall("{%s}si" % M):
        shared.append("".join(t.text or "" for t in si.iter("{%s}t" % M)))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))}
    out = {}
    for sh in wb.find("{%s}sheets" % M):
        target = rels[sh.get("{%s}id" % R)].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        rows = []
        for row in ET.fromstring(z.read(target)).iter("{%s}row" % M):
            cells = {}
            for c in row.findall("{%s}c" % M):
                v = c.find("{%s}v" % M)
                if c.get("t") == "s" and v is not None:
                    val = shared[int(v.text)]
                elif v is not None:
                    val = v.text
                else:
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % M))
                val = re.sub(r"\s+", " ", val or "").strip()
                if val:
                    cells[col_idx(c.get("r"))] = val
            if cells:
                rows.append(cells)
        out[sh.get("name")] = rows
    return out

def build(sheets):
    result = {}
    for name, rows in sheets.items():
        sinif = re.search(r"\d", name).group(0)
        # baslik satiri: "1. Donem 1. Ortak Yazili Sinav" hucrelerinin sutunlari
        sinav_cols, senaryo_row, code_col = {}, None, None
        for r in rows:
            for c, v in r.items():
                if re.match(r"1\. Dönem [12]\. Ortak Yazılı Sınav$", v):
                    sinav_cols[c] = v
            if any(re.match(r"Senaryo \d+$", v) for v in r.values()):
                senaryo_row = r
        code_re = re.compile(r"^(T\.[A-ZÇĞİÖŞÜ]?\.?\d+\.\d+\.(?:\d+\.)?)\s*(.+)$")
        for r in rows:
            for c, v in r.items():
                if code_re.match(v):
                    code_col = c
                    break
            if code_col:
                break
        starts = sorted(sinav_cols)
        def sinav_of(col):
            cur = None
            for s in starts:
                if col >= s:
                    cur = sinav_cols[s]
            return cur
        senaryolar = {}   # sinav -> senaryo -> {kod: adet}
        notlar = {}
        for c, v in (senaryo_row or {}).items():
            if re.match(r"Senaryo \d+$", v):
                senaryolar.setdefault(sinav_of(c), {})[v] = {}
            elif sinav_of(c):
                notlar[sinav_of(c)] = v
        ciktilar, alan = [], None
        for r in rows:
            if code_col not in r or not code_re.match(r[code_col]):
                continue
            for c in range(1, code_col):
                if c in r and r[c].isupper():
                    alan = r[c]
            m = code_re.match(r[code_col])
            kod, ad = m.group(1), m.group(2)
            ciktilar.append({"kod": kod, "ad": ad, "alan": alan})
            for c, v in r.items():
                if c > code_col and v.isdigit() and senaryo_row and c in senaryo_row:
                    sn = senaryo_row[c]
                    if re.match(r"Senaryo \d+$", sn):
                        senaryolar[sinav_of(c)][sn][kod] = int(v)
        for sinav in senaryolar:
            for sn, d in senaryolar[sinav].items():
                d["_toplam"] = sum(d.values())
        result[sinif] = {"sayfa": name, "ciktilar": ciktilar, "senaryolar": senaryolar, "notlar": notlar}
    return result

data = build(read(sys.argv[1]))
json.dump(data, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for s, d in data.items():
    print("sinif", s, "| cikti:", len(d["ciktilar"]), "|", {k: {a: b["_toplam"] for a, b in v.items()} for k, v in d["senaryolar"].items()}, "| not:", list(d["notlar"]))
