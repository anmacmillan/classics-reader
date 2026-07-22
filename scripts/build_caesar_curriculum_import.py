#!/usr/bin/env python3
"""Build the chapter-aligned Caesar curriculum import from canonical Perseus TEI."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from types import MappingProxyType


SOURCE_COMMIT = "e69eee761e5bd89c00a5d0744efa2367c5e1d7e3"
SOURCE_ROOT = (
    "https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/"
    f"{SOURCE_COMMIT}/"
)
LATIN_URL = SOURCE_ROOT + "data/phi0448/phi001/phi0448.phi001.perseus-lat2.xml"
ENGLISH_URL = SOURCE_ROOT + "data/phi0448/phi001/phi0448.phi001.perseus-eng2.xml"
LATIN_SHA256 = "d1a330891be6983f8f00fe07c6a857873355cc4c0cc22fe1a33ceaeb9d2e1079"
ENGLISH_SHA256 = "1d87ee4a4f9facbdf2a903e380fdfb59586de9500099631f946f0ce5a64a1421"
USER_AGENT = "classics-reader-import/1"
MAX_DOWNLOAD_BYTES = 20 * 1024 * 1024
DOWNLOAD_CHUNK_SIZE = 64 * 1024
LATIN_CORRECTIONS = MappingProxyType(
    {
        (1, 18): (
            "sororum ex matre et propinquas suas",
            "sororem ex matre et propinquas suas",
        )
    }
)


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


def normalise_text(text: str) -> str:
    """Collapse whitespace and remove spaces immediately before punctuation."""
    return re.sub(r"\s+([,.;:!?])", r"\1", " ".join(text.split()))


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
                    text = normalise_text("".join(element.itertext()))
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


def _apply_latin_corrections(passages: dict[tuple[int, int], str]) -> None:
    for passage, (before, after) in LATIN_CORRECTIONS.items():
        count = passages[passage].count(before)
        if count != 1:
            reference = f"{passage[0]}.{passage[1]}"
            raise ValueError(
                f"Latin correction {reference} expected exactly one match; found {count}"
            )
        passages[passage] = passages[passage].replace(before, after, 1)


def _write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _canonical_records() -> list[tuple[str, int, str]]:
    return [
        (f"{book}.{chapter}", number, unit.reference)
        for number, unit in enumerate(UNITS, start=1)
        for book, chapter in unit.passages
    ]


def _load_worklist(worklist_path: Path) -> list[dict[str, object]]:
    try:
        worklist = json.loads(worklist_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ValueError("invalid worklist: invalid JSON") from error
    expected = _canonical_records()
    if not isinstance(worklist, list):
        raise ValueError("invalid worklist: expected a list")
    if len(worklist) != len(expected):
        raise ValueError(
            f"invalid worklist: expected {len(expected)} records, got {len(worklist)}"
        )
    for index, (record, expected_record) in enumerate(zip(worklist, expected), start=1):
        key, unit, reference = expected_record
        if not isinstance(record, dict):
            raise ValueError(f"invalid worklist: record {index} is not an object")
        for field in ("key", "unit", "reference", "latin", "english"):
            if field not in record:
                raise ValueError(f"invalid worklist: record {index} lacks {field}")
        if record["key"] != key:
            raise ValueError(f"invalid worklist: record {index} has an unexpected key")
        if type(record["unit"]) is not int or record["unit"] != unit:
            raise ValueError(f"invalid worklist: record {index} has an unexpected unit")
        if record["reference"] != reference:
            raise ValueError(
                f"invalid worklist: record {index} has an unexpected reference"
            )
        for field in ("latin", "english"):
            if not isinstance(record[field], str) or not record[field].strip():
                raise ValueError(f"invalid worklist: record {index} has empty {field}")
    return worklist


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
                        "Perseus-bestanden (Latijn en Engels): CC BY-SA 4.0 · "
                        "Latijn I.18: ‘sororum’ gecorrigeerd naar ‘sororem’ volgens "
                        "de standaardtekst · "
                        "Engelse vertaling: W. A. McDevitte en W. S. Bohn (1869), "
                        "publiek domein · NL: Classics Reader"
                    ),
                    "translationCreditLanguage": "Bronnen",
                    "translationUrl": (
                        "https://github.com/PerseusDL/canonical-latinLit/tree/"
                        f"{SOURCE_COMMIT}/data/phi0448/phi001"
                    ),
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
    _apply_latin_corrections(latin)

    output.mkdir(parents=True, exist_ok=True)
    for number in range(1, len(UNITS) + 1):
        (output / f"dutch-{number:02d}.txt").unlink(missing_ok=True)
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
    worklist = _load_worklist(worklist_path)
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


def _fetch(url: str, expected_sha256: str) -> ET.Element:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        content_length = response.headers.get("Content-Length")
        if content_length is not None:
            try:
                length = int(content_length)
            except ValueError as error:
                raise ValueError(f"invalid Content-Length for {url}") from error
            if length < 0 or length > MAX_DOWNLOAD_BYTES:
                raise ValueError(f"download too large for {url}")
        chunks = []
        size = 0
        while True:
            chunk = response.read(
                min(DOWNLOAD_CHUNK_SIZE, MAX_DOWNLOAD_BYTES - size + 1)
            )
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_DOWNLOAD_BYTES:
                raise ValueError(f"download too large for {url}")
            chunks.append(chunk)
    data = b"".join(chunks)
    if hashlib.sha256(data).hexdigest() != expected_sha256:
        raise ValueError(f"download checksum mismatch for {url}")
    return ET.fromstring(data)


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
            _fetch(LATIN_URL, LATIN_SHA256),
            _fetch(ENGLISH_URL, ENGLISH_SHA256),
            arguments.output,
            arguments.worklist,
        )
    else:
        add_dutch(arguments.output, arguments.worklist, arguments.translations)


if __name__ == "__main__":
    main()
