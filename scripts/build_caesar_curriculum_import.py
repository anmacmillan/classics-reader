#!/usr/bin/env python3
"""Build the chapter-aligned Caesar curriculum import from canonical Perseus TEI."""

from __future__ import annotations

import argparse
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path


LATIN_URL = (
    "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/"
    "data/phi0448/phi001/phi0448.phi001.perseus-lat2.xml"
)
ENGLISH_URL = (
    "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/master/"
    "data/phi0448/phi001/phi0448.phi001.perseus-eng2.xml"
)
USER_AGENT = "classics-reader-import/1"


@dataclass(frozen=True)
class Unit:
    title: str
    reference: str
    passages: tuple[tuple[int, int], ...]


UNITS = (
    Unit("Gallië en de Belgen", "I.1", ((1, 1),)),
    Unit("Orgetorix en de samenzwering", "I.2–4", ((1, 2), (1, 3), (1, 4))),
    Unit("Het vertrek van de Helvetii", "I.5–7", ((1, 5), (1, 6), (1, 7))),
    Unit("Achtervolging en graantekort", "I.15–16", ((1, 15), (1, 16))),
    Unit("De verdenking valt op Dumnorix", "I.17–18", ((1, 17), (1, 18))),
    Unit("Diviciacus pleit voor zijn broer", "I.19–20", ((1, 19), (1, 20))),
    Unit("De winterkampen en Tasgetius", "V.24–25", ((5, 24), (5, 25))),
    Unit("Ambiorix komt met zijn waarschuwing", "V.26–27", ((5, 26), (5, 27))),
    Unit("Geloof of valstrik", "V.28–29", ((5, 28), (5, 29))),
    Unit("De krijgsraad breekt", "V.30–31", ((5, 30), (5, 31))),
    Unit("De colonne loopt in de hinderlaag", "V.32–33", ((5, 32), (5, 33))),
    Unit("Sabinus verliest de strijd", "V.34–35", ((5, 34), (5, 35))),
    Unit("Overgave en ondergang", "V.36–37", ((5, 36), (5, 37))),
    Unit("Pullo en Vorenus", "V.44", ((5, 44),)),
)


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _number(value: str | None) -> int | None:
    if value is None:
        return None
    match = re.search(r"\d+", value)
    return int(match.group()) if match else None


def _division_kind(element: ET.Element) -> str | None:
    return element.get("subtype") or element.get("type")


def _chapter_texts(root: ET.Element) -> dict[tuple[int, int], str]:
    passages: dict[tuple[int, int], str] = {}
    for book in root.iter():
        if _local_name(book.tag) != "div" or _division_kind(book) != "book":
            continue
        book_number = _number(book.get("n"))
        if book_number is None:
            continue
        for chapter in book.iter():
            if (
                _local_name(chapter.tag) != "div"
                or _division_kind(chapter) != "chapter"
            ):
                continue
            chapter_number = _number(chapter.get("n"))
            if chapter_number is None:
                continue
            paragraphs = []
            for element in chapter.iter():
                if _local_name(element.tag) == "p":
                    text = " ".join("".join(element.itertext()).split())
                    if text:
                        paragraphs.append(text)
            if paragraphs:
                passages[(book_number, chapter_number)] = " ".join(paragraphs)
    return passages


def _required_passages(passages: dict[tuple[int, int], str], language: str) -> None:
    missing = [
        f"{book}.{chapter}"
        for unit in UNITS
        for book, chapter in unit.passages
        if (book, chapter) not in passages
    ]
    if missing:
        raise ValueError(f"Missing {language} passages: {', '.join(missing)}")


def _write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _manifest() -> dict[str, object]:
    chapters = []
    for number, unit in enumerate(UNITS, start=1):
        chapter: dict[str, object] = {
            "title": f"{unit.title} ({unit.reference})",
            "startLine": unit.passages[0][1],
            "original": f"latin-{number:02d}.txt",
            "english": f"english-{number:02d}.txt",
            "dutch": f"dutch-{number:02d}.txt",
        }
        if number == 1:
            chapter.update(
                {
                    "translationCredit": (
                        "Latin: Perseus, CC BY-SA 4.0 · EN: W. A. McDevitte and "
                        "W. S. Bohn (1869), public domain, via Perseus · NL: "
                        "Classics Reader"
                    ),
                    "translationCreditLanguage": "Sources",
                    "translationUrl": ENGLISH_URL,
                }
            )
        chapters.append(chapter)
    return {
        "id": "caesar-de-bello-gallico-curriculum",
        "title": "Caesar — De Bello Gallico: schoolselecties",
        "shortTitle": "Gallië, Dumnorix en Ambiorix",
        "author": "Julius Caesar",
        "year": -50,
        "lang": "latin",
        "chapters": chapters,
    }


def write_extract(
    latin_root: ET.Element, english_root: ET.Element, output: Path, worklist_path: Path
) -> None:
    """Extract the approved Latin and English chapters and create a Dutch worklist."""
    latin = _chapter_texts(latin_root)
    english = _chapter_texts(english_root)
    _required_passages(latin, "Latin")
    _required_passages(english, "English")

    output.mkdir(parents=True, exist_ok=True)
    worklist = []
    for number, unit in enumerate(UNITS, start=1):
        latin_lines = []
        english_lines = []
        for book, chapter in unit.passages:
            key = f"{book}.{chapter}"
            latin_lines.append(latin[(book, chapter)])
            english_lines.append(english[(book, chapter)])
            worklist.append(
                {
                    "key": key,
                    "unit": number,
                    "reference": unit.reference,
                    "latin": latin[(book, chapter)],
                    "english": english[(book, chapter)],
                }
            )
        _write_lines(output / f"latin-{number:02d}.txt", latin_lines)
        _write_lines(output / f"english-{number:02d}.txt", english_lines)

    (output / "manifest.json").write_text(
        json.dumps(_manifest(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    worklist_path.parent.mkdir(parents=True, exist_ok=True)
    worklist_path.write_text(
        json.dumps(worklist, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def add_dutch(output: Path, worklist_path: Path, translations_path: Path) -> None:
    """Validate aligned Dutch translations and write them by curriculum unit."""
    worklist = json.loads(worklist_path.read_text(encoding="utf-8"))
    translations = json.loads(translations_path.read_text(encoding="utf-8"))
    if not isinstance(translations, dict):
        raise ValueError("translations must be a JSON object")

    expected_keys = [record["key"] for record in worklist]
    expected_set = set(expected_keys)
    supplied_set = set(translations)
    missing = [key for key in expected_keys if key not in supplied_set]
    extra = sorted(supplied_set - expected_set)
    if missing or extra:
        raise ValueError(
            f"missing keys: {', '.join(missing)}; extra keys: {', '.join(extra)}"
        )

    grouped: dict[int, list[str]] = {}
    for record in worklist:
        value = translations[record["key"]]
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"invalid translation for key: {record['key']}")
        grouped.setdefault(record["unit"], []).append(" ".join(value.split()))
    for unit, lines in grouped.items():
        _write_lines(output / f"dutch-{unit:02d}.txt", lines)


def _fetch(url: str) -> ET.Element:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return ET.fromstring(response.read())


def main() -> None:
    parser = argparse.ArgumentParser()
    subcommands = parser.add_subparsers(dest="command", required=True)
    extract = subcommands.add_parser("extract")
    extract.add_argument("--output", type=Path, required=True)
    extract.add_argument("--worklist", type=Path, required=True)
    dutch = subcommands.add_parser("add-dutch")
    dutch.add_argument("--output", type=Path, required=True)
    dutch.add_argument("--worklist", type=Path, required=True)
    dutch.add_argument("--translations", type=Path, required=True)
    arguments = parser.parse_args()

    if arguments.command == "extract":
        write_extract(
            _fetch(LATIN_URL), _fetch(ENGLISH_URL), arguments.output, arguments.worklist
        )
    else:
        add_dutch(arguments.output, arguments.worklist, arguments.translations)


if __name__ == "__main__":
    main()
