#!/usr/bin/env python3
"""Extract Kierkegaard's Frygt og Bæven (1843) from Søren Kierkegaards Skrifter
into one-sentence-per-line Danish unit files for imports/kierkegaard-frygt-og-baeven/.

Source: SKS text on the Royal Danish Library portal, dedicated to the public
domain (CC0) by the Søren Kierkegaard Research Centre. Commentary markers, the
hidden textual-variant apparatus, page numbers and person/place icons are
stripped; the 1843 spelling (aa, hv-, capitalised nouns) is kept as printed.

Usage: python3 scripts/build_kierkegaard_import.py [--html cached.html]
Writes danish-XX.txt only; english-XX.txt and the manifest are maintained by hand.
"""
import argparse
import re
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "imports" / "kierkegaard-frygt-og-baeven"
SOURCE_URL = "https://tekster.kb.dk/text/sks-fb-txt-root"

# Units: (section heading as printed in SKS, None for the whole section or a
# (first, last) paragraph slice of it). Headings repeat ("I".."IV" recur in the
# Problemata), so units are resolved in document order.
UNITS = [
    ("Forord", None),
    ("Stemning", None),
    ("I", None),
    ("II", None),
    ("III", None),
    ("IV", None),
    ("Lovtale over Abraham", (0, 2)),
    ("Lovtale over Abraham", (2, 5)),
    ("Lovtale over Abraham", (5, 10)),
    ("Lovtale over Abraham", (10, None)),
]

SEPARATORS = {"** *", "──────────"}
# Abbreviations after which a full stop does not end a sentence.
NO_BREAK_AFTER = ("Cfr.", "f. Ex.", "o. s. v.", "Hr.", "cfr.", "Ex.", "S.")


def load_html(cached: Path | None) -> str:
    if cached and cached.exists():
        return cached.read_text(encoding="utf-8")
    with urllib.request.urlopen(SOURCE_URL) as response:
        return response.read().decode("utf-8")


def sections(html: str) -> list[tuple[str, list[str]]]:
    soup = BeautifulSoup(html, "html.parser")
    for node in soup.select(".symbol, .pagination, small, .debug, .apparatus-criticus, script"):
        node.decompose()
    result: list[tuple[str, list[str]]] = []
    for element in soup.find("body").find_all(["h2", "p"]):
        text = re.sub(r"\s+", " ", element.get_text()).strip()
        if not text:
            continue
        if element.name == "h2" and "head-in-work" in (element.get("class") or []):
            result.append((text, []))
        elif element.name == "p" and result and text not in SEPARATORS:
            result[-1][1].append(text)
    return result


def split_sentences(paragraph: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])[«»]?\s+(?=[»A-ZÆØÅ(–])", paragraph)
    # The split consumes a closing « after the stop; slice by position to keep it.
    pieces, cursor = [], 0
    for part in parts:
        start = paragraph.index(part, cursor)
        pieces.append((start, start + len(part)))
        cursor = start + len(part)
    sentences = []
    for i, (start, _end) in enumerate(pieces):
        end = pieces[i + 1][0] if i + 1 < len(pieces) else len(paragraph)
        sentences.append(paragraph[start:end].strip())
    merged: list[str] = []
    for sentence in sentences:
        if merged and merged[-1].endswith(NO_BREAK_AFTER):
            merged[-1] = f"{merged[-1]} {sentence}"
        else:
            merged.append(sentence)
    return merged


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--html", type=Path, help="cached copy of the SKS page")
    args = parser.parse_args()

    found = sections(load_html(args.html))
    OUT.mkdir(parents=True, exist_ok=True)
    cursor = 0
    for number, (heading, window) in enumerate(UNITS, start=1):
        while found[cursor][0] != heading:
            cursor += 1
        paragraphs = found[cursor][1]
        if window is not None:
            paragraphs = paragraphs[window[0]:window[1]]
        if window is None or window[1] is None:
            cursor += 1
        lines = [s for p in paragraphs for s in split_sentences(p)]
        (OUT / f"danish-{number:02d}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"danish-{number:02d}.txt  {heading:<22} {len(lines):>3} lines")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
