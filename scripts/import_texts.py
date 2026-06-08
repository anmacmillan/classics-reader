#!/usr/bin/env python3
"""Validate import folders and rebuild generated/imported-books.js."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
IMPORTS_DIR = ROOT / "imports"
OUTPUT_PATH = ROOT / "generated" / "imported-books.js"
DATA_PATH = ROOT / "data.js"
DICTIONARY_PATH = ROOT / "dictionary.js"
IMPORTED_LATIN_DICTIONARY_PATH = ROOT / "generated" / "imported-latin-dictionary.js"


def read_lines(path: Path) -> list[str]:
    if not path.exists():
        raise ValueError(f"missing text file: {path.relative_to(ROOT)}")
    return [line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def read_optional_lines(import_dir: Path, filename: str | None) -> list[str] | None:
    return read_lines(import_dir / filename) if filename else None


def load_existing_ids() -> set[str]:
    return set(re.findall(r'\bid:\s*"([^"]+)"', DATA_PATH.read_text(encoding="utf-8")))


def load_dictionary_keys(dictionary_name: str) -> set[str]:
    text = DICTIONARY_PATH.read_text(encoding="utf-8")
    start = text.index(f"const {dictionary_name} = {{")
    end = text.index("\n};", start)
    keys = set(re.findall(r'^\s*"([^"]+)":', text[start:end], flags=re.MULTILINE))
    if dictionary_name == "LATIN_DICT" and IMPORTED_LATIN_DICTIONARY_PATH.exists():
        supplement = IMPORTED_LATIN_DICTIONARY_PATH.read_text(encoding="utf-8")
        keys.update(re.findall(r'^\s*"([^"]+)":', supplement, flags=re.MULTILINE))
    return keys


def normalise_word(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value.lower())
    return "".join(char for char in decomposed if unicodedata.category(char) != "Mn")


def greek_words(lines: list[str]) -> list[str]:
    words: list[str] = []
    for line in lines:
        current = []
        for char in line:
            if char.isalpha() or unicodedata.category(char).startswith("M"):
                current.append(char)
            elif current:
                words.append("".join(current).lower())
                current = []
        if current:
            words.append("".join(current).lower())
    return words


def dictionary_coverage(lines: list[str], dictionary_keys: set[str]) -> tuple[int, int]:
    normalised_keys = {normalise_word(key) for key in dictionary_keys}
    words = greek_words(lines)
    covered = sum(word in dictionary_keys or normalise_word(word) in normalised_keys for word in words)
    return covered, len(words)


def validate_speakers(speakers: list[dict], start_line: int, line_count: int) -> None:
    final_line = start_line + line_count - 1
    for speaker in speakers:
        if not {"start", "end", "name"} <= speaker.keys():
            raise ValueError("each speaker requires start, end, and name")
        if not start_line <= speaker["start"] <= speaker["end"] <= final_line:
            raise ValueError(
                f"speaker range {speaker['start']}-{speaker['end']} is outside "
                f"{start_line}-{final_line}"
            )


def build_chapter(import_dir: Path, chapter: dict) -> tuple[dict, list[str]]:
    original = read_lines(import_dir / chapter["original"])
    english = read_lines(import_dir / chapter["english"])
    dutch = read_optional_lines(import_dir, chapter.get("dutch"))

    if len(original) != len(english):
        raise ValueError(
            f"{import_dir.name}: original has {len(original)} lines, "
            f"English has {len(english)}"
        )
    if dutch is not None and len(original) != len(dutch):
        raise ValueError(
            f"{import_dir.name}: original has {len(original)} lines, Dutch has {len(dutch)}"
        )
    if not original:
        raise ValueError(f"{import_dir.name}: text files contain no lines")

    start_line = chapter.get("startLine", 1)
    speakers = chapter.get("speakers", [])
    validate_speakers(speakers, start_line, len(original))

    result = {
        "title": chapter["title"],
        "startLine": start_line,
        "lines": original,
        "translationEn": english,
    }
    if dutch is not None:
        result["translationNl"] = dutch
    for key in ("translationCredit", "translationCreditLanguage", "translationUrl"):
        if chapter.get(key):
            result[key] = chapter[key]
    if speakers:
        result["speakers"] = speakers
    return result, original


def load_import(import_dir: Path) -> tuple[dict, list[list[str]]]:
    manifest_path = import_dir / "manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"missing manifest: {manifest_path.relative_to(ROOT)}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON in {manifest_path.relative_to(ROOT)}: {exc}") from exc

    required = {"id", "title", "author", "year", "lang", "chapters"}
    missing = required - manifest.keys()
    if missing:
        raise ValueError(f"{import_dir.name}: manifest missing {', '.join(sorted(missing))}")
    if manifest["lang"] not in {"greek", "latin"}:
        raise ValueError(f"{import_dir.name}: lang must be greek or latin")
    if not manifest["chapters"]:
        raise ValueError(f"{import_dir.name}: manifest requires at least one chapter")

    chapters = []
    originals = []
    for chapter in manifest["chapters"]:
        built, original = build_chapter(import_dir, chapter)
        chapters.append(built)
        originals.append(original)

    book = {
        "id": manifest["id"],
        "title": manifest["title"],
        "author": manifest["author"],
        "year": manifest["year"],
        "lang": manifest["lang"],
        "chapters": chapters,
    }
    return book, originals


def render_output(books: list[dict]) -> str:
    payload = json.dumps(books, ensure_ascii=False, indent=2)
    return (
        "// AUTO-GENERATED by scripts/import_texts.py. Do not edit manually.\n"
        "// Edit files under imports/ and rerun the importer.\n\n"
        f"BOOKS.push(...{payload});\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="validate without rewriting generated output")
    args = parser.parse_args()

    existing_ids = load_existing_ids()
    dictionary_keys = {
        "greek": load_dictionary_keys("GREEK_DICT"),
        "latin": load_dictionary_keys("LATIN_DICT"),
    }
    books = []
    seen_ids = set()

    for manifest_path in sorted(IMPORTS_DIR.glob("*/manifest.json")):
        import_dir = manifest_path.parent
        if import_dir.name.startswith("_"):
            continue
        try:
            book, originals = load_import(import_dir)
        except ValueError as exc:
            print(f"ERROR: {exc}", file=sys.stderr)
            return 1

        if book["id"] in existing_ids or book["id"] in seen_ids:
            print(f"ERROR: duplicate book id: {book['id']}", file=sys.stderr)
            return 1
        seen_ids.add(book["id"])
        books.append(book)

        line_count = sum(len(lines) for lines in originals)
        message = f"OK {book['id']}: {len(book['chapters'])} chapter(s), {line_count} source lines"
        if book["lang"] in dictionary_keys:
            covered, total = dictionary_coverage(
                [line for lines in originals for line in lines],
                dictionary_keys[book["lang"]],
            )
            percentage = round(covered / total * 100) if total else 0
            language = book["lang"].title()
            message += f", {language} dictionary coverage {covered}/{total} ({percentage}%)"
        print(message)

    output = render_output(books)
    if args.check:
        if not OUTPUT_PATH.exists() or OUTPUT_PATH.read_text(encoding="utf-8") != output:
            print("ERROR: generated/imported-books.js is out of date", file=sys.stderr)
            return 1
        print("Generated import bundle is up to date.")
        return 0

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(output, encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH.relative_to(ROOT)} with {len(books)} imported book(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
