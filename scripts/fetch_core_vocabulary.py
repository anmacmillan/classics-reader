#!/usr/bin/env python3
"""Fetch the Dickinson College Commentaries core vocabularies into TSV files.

Latin: the 1,000 most frequent words (ranks from the LASLA frequency dictionary,
Liège). Greek: the 500 most frequent words. Both © Dickinson College
Commentaries, CC BY-SA 3.0 (https://dcc.dickinson.edu/vocab/core-vocabulary);
the TSVs and anything derived from them stay under that licence.

Writes data/core-vocabulary/dcc-{latin,greek}-core.tsv with the columns
rank, headword, en, pos, group, nl. The nl column is filled separately
(Dutch school glosses) and is preserved when the script is re-run.

Usage: python3 scripts/fetch_core_vocabulary.py
"""
import csv
import html
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "core-vocabulary"
LISTS = {
    "latin": "https://dcc.dickinson.edu/latin-core-list1",
    "greek": "https://dcc.dickinson.edu/greek-core-list",
}
COLUMNS = ["rank", "headword", "en", "pos", "group", "nl"]


def rows(url: str) -> list[dict]:
    # curl, not urllib: this Python build lacks the CA chain dickinson.edu needs.
    page = subprocess.run(["curl", "-sfL", url], capture_output=True, check=True).stdout.decode("utf-8")
    found = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", page, flags=re.S):
        cells = [
            re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", cell))).strip()
            for cell in re.findall(r"<td[^>]*>(.*?)</td>", row, flags=re.S)
        ]
        if len(cells) == 5 and cells[4].isdigit():
            headword, en, pos, group, rank = cells
            found.append({"rank": int(rank), "headword": headword, "en": en, "pos": pos, "group": group})
    return sorted(found, key=lambda r: (r["rank"], r["headword"]))


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for lang, url in LISTS.items():
        path = OUT / f"dcc-{lang}-core.tsv"
        dutch = {}
        if path.exists():
            with path.open(encoding="utf-8") as handle:
                dutch = {r["headword"]: r["nl"] for r in csv.DictReader(handle, delimiter="\t")}
        entries = rows(url)
        with path.open("w", encoding="utf-8", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=COLUMNS, delimiter="\t", lineterminator="\n")
            writer.writeheader()
            for entry in entries:
                writer.writerow({**entry, "nl": dutch.get(entry["headword"], "")})
        print(f"{path.relative_to(ROOT)}: {len(entries)} words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
