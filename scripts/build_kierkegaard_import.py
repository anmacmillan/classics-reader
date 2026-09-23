#!/usr/bin/env python3
"""Extract Kierkegaard texts from Søren Kierkegaards Skrifter into
one-sentence-per-line Danish unit files under imports/kierkegaard-*/.

Source: SKS on the Royal Danish Library portal, dedicated to the public
domain (CC0) by the Søren Kierkegaard Research Centre. Commentary markers, the
hidden textual-variant apparatus, page numbers and person/place icons are
stripped; the 1843 spelling (aa, hv-, capitalised nouns) is kept as printed.

Works:
  frygt-og-baeven  Frygt og Bæven: Forord, Stemning, Lovtale over Abraham
  diapsalmata      Enten – Eller I: Diapsalmata, plus journal entry JJ:167
                   ("Livet maa forstaaes baglænds")

Usage: python3 scripts/build_kierkegaard_import.py [--cache DIR] [work ...]
Writes danish-XX.txt only; english-XX.txt and the manifest are maintained by hand.
"""
import argparse
import re
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
PORTAL = "https://tekster.kb.dk/text/"
STRIP = ".symbol, .pagination, small, .debug, .apparatus-criticus, script, .modal"

# Frygt og Bæven units: (section heading as printed in SKS, None for the whole
# section or a (first, last) paragraph slice of it). Headings repeat ("I".."IV"
# recur in the Problemata), so units are resolved in document order.
FB_UNITS = [
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

# Diapsalmata: aphorisms are grouped in order into units of roughly this many
# words; the Ecstatic Lecture ("Gift Dig, Du vil fortryde det") stands alone.
DIAPSALMATA_UNIT_WORDS = 520
ALONE = "Et exstatisk Foredrag"
# Marks the first line of each aphorism, in both columns; it carries no word.
APHORISM_MARK = "❧"
# Aristophanes, Knights 32–35: SKS prints variant Greek letter forms and a verse number.
GREEK_FORMS = str.maketrans({"ϑ": "θ", "ϱ": "ρ", "ϰ": "κ"})

SEPARATORS = {"** *", "* **", "──────────"}
# Abbreviations after which a full stop does not end a sentence.
NO_BREAK_AFTER = ("Cfr.", "f. Ex.", "o. s. v.", "o. fl.", "Hr.", "Dr.", "cfr.", "Ex.", "S.", " B.", " v.")


def fetch(page: str, cache: Path | None) -> BeautifulSoup:
    """The SKS page, unstripped (the table of contents is still in it)."""
    cached = cache / f"{page}.html" if cache else None
    if cached and cached.exists():
        html = cached.read_text(encoding="utf-8")
    else:
        with urllib.request.urlopen(PORTAL + page) as response:
            html = response.read().decode("utf-8")
        if cached:
            cached.write_text(html, encoding="utf-8")
    return BeautifulSoup(html, "html.parser")


def strip(soup: BeautifulSoup) -> BeautifulSoup:
    for node in soup.select(STRIP):
        node.decompose()
    return soup


def text_of(element) -> str:
    return re.sub(r"\s+", " ", element.get_text()).strip()


def split_sentences(paragraph: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])[«»]?\s+(?=[»A-ZÆØÅ(–])", paragraph)
    # The split consumes a closing « after the stop; slice by position to keep it.
    starts, cursor = [], 0
    for part in parts:
        start = paragraph.index(part, cursor)
        starts.append(start)
        cursor = start + len(part)
    sentences = [
        paragraph[start : (starts[i + 1] if i + 1 < len(starts) else len(paragraph))].strip()
        for i, start in enumerate(starts)
    ]
    merged: list[str] = []
    for sentence in sentences:
        # A stray dash has no words to align; it stays with the sentence before it.
        if merged and (merged[-1].endswith(NO_BREAK_AFTER) or not re.search(r"\w", sentence)):
            merged[-1] = f"{merged[-1]} {sentence}"
        else:
            merged.append(sentence)
    return merged


def write_units(folder: str, units: list[list[str]]) -> None:
    out = ROOT / "imports" / folder
    out.mkdir(parents=True, exist_ok=True)
    for number, lines in enumerate(units, start=1):
        (out / f"danish-{number:02d}.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{folder}/danish-{number:02d}.txt  {len(lines):>3} lines  {sum(len(l.split()) for l in lines):>4} words")


def frygt_og_baeven(cache: Path | None) -> None:
    soup = strip(fetch("sks-fb-txt-root", cache))
    found: list[tuple[str, list[str]]] = []
    for element in soup.find("body").find_all(["h2", "p"]):
        text = text_of(element)
        if not text:
            continue
        if element.name == "h2" and "head-in-work" in (element.get("class") or []):
            found.append((text, []))
        elif element.name == "p" and found and text not in SEPARATORS:
            found[-1][1].append(text)
    units, cursor = [], 0
    for heading, window in FB_UNITS:
        while found[cursor][0] != heading:
            cursor += 1
        paragraphs = found[cursor][1]
        if window is not None:
            paragraphs = paragraphs[window[0] : window[1]]
        if window is None or window[1] is None:
            cursor += 1
        units.append([s for p in paragraphs for s in split_sentences(p)])
    write_units("kierkegaard-frygt-og-baeven", units)


def toc_anchor(soup: BeautifulSoup, title: str) -> str:
    for link in soup.select('li[id^="list-"] > a'):
        if link.get_text().strip().startswith(title):
            return link["href"].split("#", 1)[1]
    raise ValueError(f"no table-of-contents entry {title!r}")


def aphorisms(cache: Path | None) -> list[list[str]]:
    """Each aphorism as a list of paragraphs, separator to separator."""
    soup = fetch("sks-ee1-txt-root", cache)
    start_id = toc_anchor(soup, "Diapsalmata")
    stop_id = toc_anchor(soup, "De umiddelbare erotiske Stadier")
    strip(soup)
    stop = soup.find(id=stop_id)
    beyond = {id(p) for p in stop.find_all_next("p")} | {id(p) for p in stop.find_all("p")}
    groups: list[list[str]] = [[]]
    for element in soup.find(id=start_id).find_all_next("p"):
        if id(element) in beyond:
            break
        text = text_of(element)
        if not text or text in {"ΔΙΑΨΑΛΜΑΤΑ", "ad se ipsum."}:
            continue
        if "lineGroup" in (element.get("class") or []) and text.startswith("Grandeur"):
            continue  # the French title-page epigraph, not an aphorism
        if text in SEPARATORS:
            groups.append([])
            continue
        if re.match(r"[Α-ω]", text):
            text = re.sub(r" \d+\.", "", text.translate(GREEK_FORMS))
        groups[-1].append(text)
    return [g for g in groups if g]


def journal_jj167(cache: Path | None) -> list[str]:
    soup = strip(fetch("sks-jj-txt-root", cache))
    entry = [text_of(p) for p in soup.find(id="n167").find_all("p")]
    return split_sentences(next(t for t in entry if t not in SEPARATORS))


def diapsalmata(cache: Path | None) -> None:
    units: list[list[str]] = []
    current: list[str] = []
    for aphorism in aphorisms(cache):
        lines = [s for p in aphorism for s in split_sentences(p)]
        lines[0] = f"{APHORISM_MARK} {lines[0]}"
        if any(ALONE in p for p in aphorism):
            units += [current, lines] if current else [lines]
            current = []
            continue
        current += lines
        if sum(len(l.split()) for l in current) >= DIAPSALMATA_UNIT_WORDS:
            units.append(current)
            current = []
    if current:
        units.append(current)
    units.append(journal_jj167(cache))
    write_units("kierkegaard-diapsalmata", units)


WORKS = {"frygt-og-baeven": frygt_og_baeven, "diapsalmata": diapsalmata}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("works", nargs="*", help=f"any of {', '.join(WORKS)} (default: all)")
    parser.add_argument("--cache", type=Path, help="directory holding <page>.html copies of the SKS pages")
    args = parser.parse_args()
    for work in args.works or WORKS:
        WORKS[work](args.cache)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
