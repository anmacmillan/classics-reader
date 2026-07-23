#!/usr/bin/env python3
"""Extract the selected Mark Koine reader and a repository-compatible PROIEL stream."""
from __future__ import annotations

import json
import re
import unicodedata
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "imports" / "mark-koine"
TMP = Path("/tmp/mark-koine-source")
PERSEUS = "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/91595f89e15b4d3000cd93efcf8990720c8be2b9/data/tlg0031/tlg002"
PROIEL = "https://raw.githubusercontent.com/proiel/proiel-treebank/8e388967a1335ed12335ddc655fe46993ee7d57a/greek-nt.xml"

# Small narrative arc; ranges deliberately avoid the five verses absent from PROIEL.
RANGES = [
    ("1", 1, 20, "Η αρχή και η κλήση των μαθητών"),
    ("1", 21, 45, "Η εξουσία και οι θεραπείες"),
    ("2", 1, 17, "Ο παραλυτικός και ο Λευί"),
    ("4", 1, 20, "Η παραβολή του σπορέως"),
    ("4", 35, 41, "Η κατάπαυση της θύελλας"),
    ("5", 1, 20, "Ο δαιμονισμένος των Γερασηνῶν"),
    ("5", 21, 43, "Η θυγάτηρ του Ιαείρου"),
    ("6", 30, 44, "Ο χορτασμός των πεντακισχιλίων"),
    ("8", 27, 38, "Η ομολογία του Πέτρου"),
    ("9", 2, 13, "Η μεταμόρφωση"),
    ("10", 13, 31, "Τα παιδία και ο πλούσιος"),
    ("11", 1, 11, "Η είσοδος στα Ιεροσόλυμα"),
    ("14", 32, 52, "Η Γεθσημανή και η σύλληψη"),
    ("15", 1, 27, "Η δίκη και η σταύρωση (1)"),
    ("15", 29, 39, "Η δίκη και η σταύρωση (2)"),
    ("16", 1, 8, "Ο κενός τάφος"),
]

POS = {"N": "n", "A": "a", "S": "l", "M": "m", "V": "v", "R": "r",
       "C": "c", "G": "c", "D": "d", "P": "p", "I": "i", "X": "x", "T": "b"}

def fetch(url: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-L", "--fail", "-sS", "-o", str(path), url], check=True)

def postag(tok: ET.Element) -> str:
    morph = (tok.get("morphology") or "----------").ljust(10, "-")
    p = POS.get((tok.get("part-of-speech") or "X-")[0], "x")
    # PROIEL uses the same feature alphabet as Perseus for the first nine fields.
    return p + morph[:8]

def main() -> None:
    TMP.mkdir(parents=True, exist_ok=True)
    fetch(f"{PERSEUS}/tlg0031.tlg002.perseus-grc2.xml", TMP / "greek.xml")
    fetch(f"{PERSEUS}/tlg0031.tlg002.perseus-eng2.xml", TMP / "english.xml")
    fetch(PROIEL, TMP / "proiel.xml")
    gr = ET.parse(TMP / "greek.xml").getroot()
    en = ET.parse(TMP / "english.xml").getroot()
    canonical: dict[str, str] = {}
    for div in gr.iter():
        if div.get("subtype") == "verse":
            ch = next((p.get("n") for p in gr.iter() if p.get("subtype") == "chapter" and div in list(p)), None)
            if ch:
                canonical[f"{ch}:{div.get('n')}"] = " ".join(" ".join(div.itertext()).split())
    # Chapter ancestry is easier and safer with an explicit walk.
    canonical = {}
    def walk(node: ET.Element, chapter: str | None = None):
        if node.get("subtype") == "chapter": chapter = node.get("n")
        if node.get("subtype") == "verse" and chapter:
            canonical[f"{chapter}:{node.get('n')}"] = " ".join(" ".join(node.itertext()).split())
        for child in list(node): walk(child, chapter)
    walk(gr)
    eroot = en
    english = {}
    def walk_en(node: ET.Element, chapter: str | None = None):
        if node.get("subtype") == "chapter": chapter = node.get("n")
        if node.get("subtype") == "verse" and chapter:
            english[f"{chapter}:{node.get('n')}"] = " ".join(" ".join(node.itertext()).split())
        for child in list(node): walk_en(child, chapter)
    walk_en(eroot)
    proiel = ET.parse(TMP / "proiel.xml").getroot()
    by_verse: dict[str, list[ET.Element]] = {}
    for tok in proiel.iter("token"):
        cp = tok.get("citation-part") or ""
        if cp.startswith("MARK "):
            by_verse.setdefault(cp[5:].replace(".", ":"), []).append(tok)
    selected: list[tuple[str, int, int, str]] = []
    for ch, start, end, title in RANGES:
        selected.append((ch, start, end, title))
    OUT.mkdir(parents=True, exist_ok=True)
    tbroot = ET.Element("treebank")
    for i, (ch, start, end, title) in enumerate(selected, 1):
        greek_lines, english_lines = [], []
        for verse in range(start, end + 1):
            key = f"{ch}:{verse}"
            toks = by_verse.get(key)
            if not toks or key not in english:
                raise RuntimeError(f"missing source verse {key}")
            parts = []
            for tok in toks:
                form = tok.get("form") or ""
                if form: parts.append(form)
                after = tok.get("presentation-after") or ""
                if after.strip(): parts.append(after.strip())
            greek_lines.append(" ".join(parts).replace("  ", " ").strip())
            english_lines.append(english[key])
            s = ET.SubElement(tbroot, "sentence", id=f"mark-{ch}-{verse}")
            for tok in toks:
                if not tok.get("form") or not any(unicodedata.category(c).startswith("L") for c in tok.get("form")):
                    continue
                ET.SubElement(s, "word", form=tok.get("form"), lemma=tok.get("lemma") or "", postag=postag(tok))
        (OUT / f"greek-{i:02}.txt").write_text("\n".join(greek_lines) + "\n", encoding="utf-8")
        (OUT / f"english-{i:02}.txt").write_text("\n".join(english_lines) + "\n", encoding="utf-8")
    ET.ElementTree(tbroot).write(TMP / "mark-treebank.xml", encoding="utf-8", xml_declaration=True)
    chapters = []
    for i, (ch, start, end, title) in enumerate(selected, 1):
        chapter = {"title": f"Markus {ch}:{start}–{end} — {title}", "startLine": 1,
                   "original": f"greek-{i:02}.txt", "english": f"english-{i:02}.txt"}
        if i == 1:
            chapter.update({"translationCredit": "Grieks: Perseus Digital Library (tlg0031.tlg002.perseus-grc2) · EN: World English Bible via Perseus · Parsing: PROIEL Greek New Testament treebank (CC BY-NC-SA 3.0)",
                            "translationCreditLanguage": "Bronnen",
                            "translationUrl": "https://catalog.perseus.org/catalog/urn:cts:greekLit:tlg0031.tlg002"})
        chapters.append(chapter)
    manifest = {"id": "mark-koine", "title": "Marcus — Evangelium volgens Marcus",
                "shortTitle": "Een eerste leestocht door het Markusevangelie", "author": "Marcus",
                "year": 70, "lang": "greek", "chapters": chapters,
                "source": {"greek": "Perseus Digital Library, tlg0031.tlg002.perseus-grc2 (revision 91595f89e15b4d3000cd93efcf8990720c8be2b9)",
                           "english": "Perseus English reference (World English Bible), revision 91595f89e15b4d3000cd93efcf8990720c8be2b9",
                           "parsing": "PROIEL Greek New Testament treebank (CC BY-NC-SA 3.0), revision 8e388967a1335ed12335ddc655fe46993ee7d57a"}}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__": main()
