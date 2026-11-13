"""xlsx dosyasini stdlib ile okur, sayfa sayfa satirlari yazar. Kullanim: python3 -I xlsxoku.py dosya.xlsx"""
import sys, zipfile, re
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}

def main(path):
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.get("Id"): r.get("Target") for r in rels}
    for sh in wb.find("m:sheets", NS):
        name = sh.get("name")
        rid = sh.get("{%s}id" % NS["r"])
        target = relmap[rid]
        target = target.lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        root = ET.fromstring(z.read(target))
        print("\n##### SAYFA: %s #####" % name)
        for row in root.iter("{%s}row" % NS["m"]):
            cells = []
            for c in row.findall("m:c", NS):
                ref = c.get("r")
                t = c.get("t")
                v = c.find("m:v", NS)
                val = ""
                if t == "s" and v is not None:
                    val = shared[int(v.text)]
                elif t == "inlineStr":
                    val = "".join(x.text or "" for x in c.iter("{%s}t" % NS["m"]))
                elif v is not None:
                    val = v.text
                val = re.sub(r"\s+", " ", val or "").strip()
                if val:
                    cells.append("%s=%s" % (ref, val))
            if cells:
                print(" | ".join(cells))

main(sys.argv[1])
