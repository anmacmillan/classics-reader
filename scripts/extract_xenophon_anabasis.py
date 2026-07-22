#!/usr/bin/env python3
"""Extract the pinned Perseus Xenophon *Anabasis* I section selection.

The import deliberately keeps one standard book.chapter.section citation per
display line.  This preserves the natural citation unit of Xenophon's prose
while giving each reading unit a manageable completion-grid size.
"""
from pathlib import Path
import json
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "imports" / "xenophon-anabasis-1"
SCRATCH = Path("/tmp/xenophon-anabasis.i0wjYJ")
NS = {"t": "http://www.tei-c.org/ns/1.0"}

CANONICAL_COMMIT = "91595f89e15b4d3000cd93efcf8990720c8be2b9"
CANONICAL_BASE = (
    "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/"
    f"{CANONICAL_COMMIT}/data/tlg0032/tlg001/"
)
GREEK_URL = CANONICAL_BASE + "tlg0032.tlg001.perseus-grc2.xml"
ENGLISH_URL = CANONICAL_BASE + "tlg0032.tlg001.perseus-eng2.xml"

# Every section of Book I is included, but split into short, coherent study
# sessions.  The final three units cover the crisis after Cyrus's death.
UNITS = [
    ("De opstand van Cyrus: begin van de expeditie", "1.1.1", "1.1.18"),
    ("Cyrus’ plannen en de mars naar Sardis", "1.1.19", "1.1.37"),
    ("De Tigris over: de mars oostwaarts", "1.2.1", "1.2.19"),
    ("De Grieken zien de ware bedoeling", "1.3.1", "1.3.22"),
    ("De opmars en de rivier de Eufraat", "1.4.1", "1.4.23"),
    ("Cyrus zet de Grieken onder druk", "1.5.1", "1.5.21"),
    ("De vooravond van de slag bij Cunaxa", "1.6.1", "1.6.12"),
    ("De slagorde van Cyrus", "1.6.13", "1.6.25"),
    ("De dood van Cyrus", "1.6.26", "1.6.38"),
    ("De nasleep van de slag", "1.7.1", "1.7.12"),
    ("Tissaphernes en de Griekse bevelhebbers", "1.7.13", "1.7.24"),
    ("De crisis van het leger", "1.7.25", "1.7.35"),
]


def fetch(url: str, filename: str) -> Path:
    SCRATCH.mkdir(parents=True, exist_ok=True)
    target = SCRATCH / filename
    if not target.exists():
        subprocess.run(["curl", "-L", "-f", "-sS", "-o", str(target), url], check=True)
    return target


def clean_text(element: ET.Element) -> str:
    """Return visible text, omitting editorial notes from the EN source."""
    pieces = []

    def visit(node: ET.Element) -> None:
        if node.tag.rsplit("}", 1)[-1] == "note":
            return
        if node.text:
            pieces.append(node.text)
        for child in node:
            visit(child)
            if child.tail:
                pieces.append(child.tail)

    visit(element)
    return re.sub(r"\s+", " ", " ".join(pieces)).strip()


def sections(path: Path) -> dict[str, str]:
    root = ET.parse(path).getroot()
    result = {}
    for book in root.findall('.//t:div[@subtype="book"]', NS):
        if book.get("n") != "1":
            continue
        for chapter in book.findall('./t:div[@subtype="chapter"]', NS):
            for section in chapter.findall('./t:div[@subtype="section"]', NS):
                key = f"1.{chapter.get('n')}.{section.get('n')}"
                result[key] = clean_text(section)
    return result


def parse_ref(ref: str) -> tuple[int, int, int]:
    return tuple(int(x) for x in ref.split("."))


def in_range(key: str, start: str, end: str) -> bool:
    return parse_ref(start) <= parse_ref(key) <= parse_ref(end)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    greek = sections(fetch(GREEK_URL, "greek.xml"))
    english = sections(fetch(ENGLISH_URL, "english.xml"))
    assert set(greek) == set(english), "Greek and English section keys differ"

    chapters = []
    for number, (title, start, end) in enumerate(UNITS, 1):
        keys = [key for key in greek if in_range(key, start, end)]
        keys.sort(key=parse_ref)
        assert keys, f"empty unit {number}"
        assert keys[0] == start and keys[-1] == end
        greek_lines = [greek[key] for key in keys]
        english_lines = [english[key] for key in keys]
        assert len(greek_lines) == len(english_lines)
        (OUT / f"greek-{number:02d}.txt").write_text(
            "\n".join(greek_lines) + "\n", encoding="utf-8"
        )
        (OUT / f"english-{number:02d}.txt").write_text(
            "\n".join(english_lines) + "\n", encoding="utf-8"
        )
        chapter = {
            "title": f"{title} ({start}–{end})",
            "startLine": 1,
            "original": f"greek-{number:02d}.txt",
            "english": f"english-{number:02d}.txt",
        }
        if number == 1:
            chapter.update({
                "translationCredit": (
                    "Grieks: Perseus Digital Library "
                    "(tlg0032.tlg001.perseus-grc2) · "
                    "EN: Perseus English reference · "
                    "Parsing: GLAUx-treebank (automatisch geparseerd, CC BY)"
                ),
                "translationCreditLanguage": "Bronnen",
                "translationUrl": (
                    "https://scaife.perseus.org/reader/"
                    "urn:cts:greekLit:tlg0032.tlg001.perseus-grc2:1.1.1"
                ),
            })
        chapters.append(chapter)

    manifest = {
        "id": "xenophon-anabasis-1",
        "title": "Xenophon — Anabasis I",
        "shortTitle": "De expeditie van Cyrus en de crisis van het leger",
        "author": "Xenophon",
        "year": -401,
        "lang": "greek",
        "chapters": chapters,
    }
    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"wrote {len(chapters)} units and {sum(len(greek[k]) > 0 for _, a, b in UNITS for k in greek if in_range(k, a, b))} lines")


if __name__ == "__main__":
    main()
