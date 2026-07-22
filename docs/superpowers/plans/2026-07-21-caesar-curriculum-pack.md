# Caesar Curriculum Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Read and follow `/Users/alexandermacmillan/.pi/agent/skills/new-classic-text/SKILL.md` before changing corpus files.

**Goal:** Add a substantial, school-relevant *De Bello Gallico* reader with 14 teachable units, chapter-aligned English and Dutch translations, and 100% Latin dictionary coverage.

**Architecture:** A small standard-library Python builder reproducibly extracts the approved Caesar chapters from Perseus TEI into the repository's existing import format. It emits one display line per ancient chapter, groups those lines into 14 micro-units, and records a machine-checkable Dutch translation worklist. The existing import compiler and Whitaker's Words supplement remain the only runtime content and dictionary paths; this release adds reviewed exceptions to that pipeline rather than creating another dictionary system.

**Tech Stack:** Python 3 (`argparse`, `json`, `unittest`, `urllib.request`, `xml.etree.ElementTree`), Node.js, Whitaker's Words, existing static JavaScript reader, Make.

---

## Release scope

This plan implements only Release 1 from the Flemish curriculum design. Do not add school-route metadata, curriculum filters, a new dictionary, or UI infrastructure in this release.

| Unit | Passage | Dutch title |
|---:|---|---|
| 1 | I.1 | Gallië en de Belgen |
| 2 | I.2–4 | Orgetorix en de samenzwering |
| 3 | I.5–7 | Het vertrek van de Helvetii |
| 4 | I.15–16 | Achtervolging en graantekort |
| 5 | I.17–18 | De verdenking valt op Dumnorix |
| 6 | I.19–20 | Diviciacus pleit voor zijn broer |
| 7 | V.24–25 | De winterkampen en Tasgetius |
| 8 | V.26–27 | Ambiorix komt met zijn waarschuwing |
| 9 | V.28–29 | Geloof of valstrik |
| 10 | V.30–31 | De krijgsraad breekt |
| 11 | V.32–33 | De colonne loopt in de hinderlaag |
| 12 | V.34–35 | Sabinus verliest de strijd |
| 13 | V.36–37 | Overgave en ondergang |
| 14 | V.44 | Pullo en Vorenus |

The fixed source texts are:

- Latin: Perseus `phi0448.phi001.perseus-lat2.xml`, CC BY-SA 4.0.
- English: W. A. McDevitte and W. S. Bohn (1869), public-domain translation in Perseus `phi0448.phi001.perseus-eng2.xml`; Perseus digitization CC BY-SA 4.0.
- Dutch: newly prepared for this reader, aligned chapter-for-chapter and stored in the import folder.

Expected release identity and totals:

- Book id: `caesar-de-bello-gallico-curriculum`
- Title: `Caesar — De Bello Gallico: schoolselecties`
- Short title: `Gallië, Dumnorix en Ambiorix`
- 14 reader chapters (micro-units)
- 28 source lines (one per ancient chapter)
- 3,935 Latin word tokens
- 3,935/3,935 dictionary coverage

### Task 1: Build and test the reproducible Caesar extractor

**Files:**

- Create: `scripts/build_caesar_curriculum_import.py`
- Create: `tests/test_build_caesar_curriculum_import.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_build_caesar_curriculum_import.py`:

```python
from __future__ import annotations

import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from scripts import build_caesar_curriculum_import as caesar


NS = "http://www.tei-c.org/ns/1.0"
ET.register_namespace("", NS)


def tei_fixture(language: str) -> ET.Element:
    root = ET.Element(f"{{{NS}}}TEI")
    text = ET.SubElement(root, f"{{{NS}}}text")
    body = ET.SubElement(text, f"{{{NS}}}body")
    required = sorted({(book, chapter) for unit in caesar.UNITS for book, chapter in unit.passages})
    books: dict[int, ET.Element] = {}
    for book, chapter in required:
        book_node = books.setdefault(
            book,
            ET.SubElement(body, f"{{{NS}}}div", {"type": "book", "n": str(book)}),
        )
        chapter_node = ET.SubElement(
            book_node,
            f"{{{NS}}}div",
            {"type": "chapter", "n": str(chapter)},
        )
        if language == "latin":
            first = ET.SubElement(chapter_node, f"{{{NS}}}div", {"type": "section", "n": "1"})
            ET.SubElement(first, f"{{{NS}}}p").text = f"Latina {book}.{chapter} pars una."
            second = ET.SubElement(chapter_node, f"{{{NS}}}div", {"type": "section", "n": "2"})
            ET.SubElement(second, f"{{{NS}}}p").text = "Pars altera."
        else:
            ET.SubElement(chapter_node, f"{{{NS}}}p").text = f"English {book}.{chapter}."
    return root


class CaesarCurriculumImportTests(unittest.TestCase):
    def test_extract_writes_fourteen_units_and_twenty_eight_aligned_records(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "import"
            worklist = root / "worklist.json"

            caesar.write_extract(
                tei_fixture("latin"),
                tei_fixture("english"),
                output,
                worklist,
            )

            manifest = json.loads((output / "manifest.json").read_text(encoding="utf-8"))
            records = json.loads(worklist.read_text(encoding="utf-8"))
            self.assertEqual(manifest["id"], "caesar-de-bello-gallico-curriculum")
            self.assertEqual(len(manifest["chapters"]), 14)
            self.assertEqual(len(records), 28)
            self.assertEqual(records[0]["key"], "1.1")
            self.assertEqual(records[-1]["key"], "5.44")
            self.assertEqual(records[0]["latin"], "Latina 1.1 pars una. Pars altera.")
            for number, chapter in enumerate(manifest["chapters"], start=1):
                suffix = f"{number:02d}.txt"
                self.assertEqual(chapter["original"], f"latin-{suffix}")
                self.assertEqual(chapter["english"], f"english-{suffix}")
                self.assertEqual(chapter["dutch"], f"dutch-{suffix}")
                latin = (output / chapter["original"]).read_text(encoding="utf-8").splitlines()
                english = (output / chapter["english"]).read_text(encoding="utf-8").splitlines()
                self.assertEqual(len(latin), len(english))

    def test_add_dutch_rejects_a_missing_or_extra_key(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "import"
            worklist = root / "worklist.json"
            translations = root / "translations.json"
            caesar.write_extract(
                tei_fixture("latin"),
                tei_fixture("english"),
                output,
                worklist,
            )
            records = json.loads(worklist.read_text(encoding="utf-8"))
            payload = {record["key"]: f"Nederlands {record['key']}." for record in records}
            payload.pop("5.44")
            payload["9.99"] = "Onverwacht."
            translations.write_text(json.dumps(payload), encoding="utf-8")

            with self.assertRaisesRegex(ValueError, r"missing keys: 5\.44; extra keys: 9\.99"):
                caesar.add_dutch(output, worklist, translations)

    def test_add_dutch_writes_one_aligned_line_per_source_chapter(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "import"
            worklist = root / "worklist.json"
            translations = root / "translations.json"
            caesar.write_extract(
                tei_fixture("latin"),
                tei_fixture("english"),
                output,
                worklist,
            )
            records = json.loads(worklist.read_text(encoding="utf-8"))
            payload = {record["key"]: f"Nederlands {record['key']}." for record in records}
            translations.write_text(json.dumps(payload), encoding="utf-8")

            caesar.add_dutch(output, worklist, translations)

            self.assertEqual(
                (output / "dutch-02.txt").read_text(encoding="utf-8").splitlines(),
                ["Nederlands 1.2.", "Nederlands 1.3.", "Nederlands 1.4."],
            )
            self.assertEqual(
                (output / "dutch-14.txt").read_text(encoding="utf-8").splitlines(),
                ["Nederlands 5.44."],
            )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests and verify they fail for the missing module**

Run:

```bash
python3 -m unittest tests.test_build_caesar_curriculum_import -v
```

Expected: `ImportError` because `scripts/build_caesar_curriculum_import.py` does not exist yet.

- [ ] **Step 3: Implement the extractor and Dutch alignment validator**

Create `scripts/build_caesar_curriculum_import.py`:

```python
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


def fetch_xml(url: str) -> ET.Element:
    request = urllib.request.Request(url, headers={"User-Agent": "classics-reader-import/1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return ET.fromstring(response.read())


def normalise_text(node: ET.Element) -> str:
    return " ".join("".join(node.itertext()).split())


def chapter_map(root: ET.Element) -> dict[tuple[int, int], str]:
    result: dict[tuple[int, int], str] = {}
    for book in root.findall(".//{*}div[@type='book']"):
        book_number = int(book.attrib["n"])
        for chapter in book.findall("./{*}div[@type='chapter']"):
            chapter_number = int(chapter.attrib["n"])
            paragraphs = [normalise_text(p) for p in chapter.findall(".//{*}p")]
            text = " ".join(part for part in paragraphs if part)
            if text:
                result[(book_number, chapter_number)] = text
    return result


def manifest() -> dict:
    chapters = []
    for number, unit in enumerate(UNITS, start=1):
        suffix = f"{number:02d}.txt"
        chapter = {
            "title": f"{unit.title} ({unit.reference})",
            "startLine": unit.passages[0][1],
            "original": f"latin-{suffix}",
            "english": f"english-{suffix}",
            "dutch": f"dutch-{suffix}",
        }
        if number == 1:
            chapter.update(
                {
                    "translationCredit": (
                        "Latin: Perseus, CC BY-SA 4.0 · EN: W. A. McDevitte and W. S. Bohn "
                        "(1869), public domain, via Perseus · NL: Classics Reader"
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


def write_lines(path: Path, lines: list[str]) -> None:
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_extract(
    latin_root: ET.Element,
    english_root: ET.Element,
    output: Path,
    worklist_path: Path,
) -> None:
    latin = chapter_map(latin_root)
    english = chapter_map(english_root)
    required = {passage for unit in UNITS for passage in unit.passages}
    missing_latin = sorted(required - latin.keys())
    missing_english = sorted(required - english.keys())
    if missing_latin or missing_english:
        raise ValueError(
            f"missing Latin passages: {missing_latin}; missing English passages: {missing_english}"
        )

    output.mkdir(parents=True, exist_ok=True)
    records = []
    for number, unit in enumerate(UNITS, start=1):
        latin_lines = []
        english_lines = []
        for book, chapter in unit.passages:
            key = f"{book}.{chapter}"
            latin_lines.append(latin[(book, chapter)])
            english_lines.append(english[(book, chapter)])
            records.append(
                {
                    "key": key,
                    "unit": number,
                    "reference": unit.reference,
                    "latin": latin[(book, chapter)],
                    "english": english[(book, chapter)],
                }
            )
        write_lines(output / f"latin-{number:02d}.txt", latin_lines)
        write_lines(output / f"english-{number:02d}.txt", english_lines)

    (output / "manifest.json").write_text(
        json.dumps(manifest(), ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    worklist_path.parent.mkdir(parents=True, exist_ok=True)
    worklist_path.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def add_dutch(output: Path, worklist_path: Path, translations_path: Path) -> None:
    records = json.loads(worklist_path.read_text(encoding="utf-8"))
    translations = json.loads(translations_path.read_text(encoding="utf-8"))
    expected = {record["key"] for record in records}
    actual = set(translations)
    missing = sorted(expected - actual)
    extra = sorted(actual - expected)
    if missing or extra:
        messages = []
        if missing:
            messages.append(f"missing keys: {', '.join(missing)}")
        if extra:
            messages.append(f"extra keys: {', '.join(extra)}")
        raise ValueError("; ".join(messages))

    by_unit: dict[int, list[str]] = {number: [] for number in range(1, len(UNITS) + 1)}
    for record in records:
        value = translations[record["key"]]
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"empty or non-string Dutch translation: {record['key']}")
        line = re.sub(r"\s+", " ", value).strip()
        by_unit[record["unit"]].append(line)
    for number, lines in by_unit.items():
        write_lines(output / f"dutch-{number:02d}.txt", lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    extract = subparsers.add_parser("extract")
    extract.add_argument("--output", type=Path, required=True)
    extract.add_argument("--worklist", type=Path, required=True)

    dutch = subparsers.add_parser("add-dutch")
    dutch.add_argument("--output", type=Path, required=True)
    dutch.add_argument("--worklist", type=Path, required=True)
    dutch.add_argument("--translations", type=Path, required=True)

    args = parser.parse_args()
    if args.command == "extract":
        write_extract(fetch_xml(LATIN_URL), fetch_xml(ENGLISH_URL), args.output, args.worklist)
    else:
        add_dutch(args.output, args.worklist, args.translations)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
python3 -m unittest tests.test_build_caesar_curriculum_import -v
```

Expected: three tests pass.

- [ ] **Step 5: Commit the tested builder only**

Run:

```bash
git add scripts/build_caesar_curriculum_import.py tests/test_build_caesar_curriculum_import.py
git commit -m "feat: add reproducible Caesar import builder"
```

### Task 2: Generate the canonical import and prepare the Dutch facing translation

**Files:**

- Create: `imports/caesar-de-bello-gallico-curriculum/manifest.json`
- Create: `imports/caesar-de-bello-gallico-curriculum/latin-01.txt` through `latin-14.txt`
- Create: `imports/caesar-de-bello-gallico-curriculum/english-01.txt` through `english-14.txt`
- Create: `imports/caesar-de-bello-gallico-curriculum/dutch-01.txt` through `dutch-14.txt`

- [ ] **Step 1: Extract the fixed Latin and English source passages**

Run:

```bash
caesar_scratch=$(mktemp -d /tmp/caesar-import.XXXXXX)
python3 scripts/build_caesar_curriculum_import.py extract \
  --output imports/caesar-de-bello-gallico-curriculum \
  --worklist "$caesar_scratch/caesar-dutch-worklist.json"
```

The scratch directory contains working data only. Do not copy the worklist into the repository.

- [ ] **Step 2: Verify the extraction boundaries before translating**

Run:

```bash
python3 - "$caesar_scratch/caesar-dutch-worklist.json" <<'PY'
import json
import sys
from pathlib import Path

records = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
assert len(records) == 28, len(records)
assert records[0]["key"] == "1.1", records[0]["key"]
assert records[-1]["key"] == "5.44", records[-1]["key"]
assert {record["unit"] for record in records} == set(range(1, 15))
print(records[0]["key"], records[0]["latin"][:100])
print(records[-1]["key"], records[-1]["latin"][:100])
PY
```

Expected: 28 records, exactly units 1–14, beginning at I.1 and ending at V.44. Read both printed samples against the source; stop if either boundary is wrong.

- [ ] **Step 3: Confirm that the importer rejects the intentionally incomplete import**

Run:

```bash
python3 scripts/import_texts.py
```

Expected: non-zero exit with `missing text file: imports/caesar-de-bello-gallico-curriculum/dutch-01.txt`. This proves Dutch is a mandatory facing text, not an optional later enhancement.

- [ ] **Step 4: Translate all 28 aligned records into Dutch**

Use the JSON worklist as the only translation input. Translate every record in a single coherent batch with this exact brief:

```text
Translate each Caesar passage into natural, precise modern Dutch for a Flemish secondary-school classics reader. Preserve the structure and force of Caesar's Latin: reported speech, subordination, causal links, military terms, names, and changes of subject must remain explicit. Prefer readable Dutch, but do not paraphrase away syntactic relationships that a pupil may need to trace back to the Latin. Keep each ancient chapter as exactly one string, with no line breaks inside it. Use the supplied public-domain English only as a check; resolve meaning from the Latin. Return one valid JSON object and nothing else. Its keys must be exactly the supplied book.chapter keys, and every value must be a non-empty Dutch string.
```

Write the resulting JSON object to `$caesar_scratch/caesar-dutch.json`. Do not put model commentary, markdown fences, source text, or keys other than the 28 required passage keys in that file.

- [ ] **Step 5: Validate the translation key set and write the aligned Dutch files**

Run:

```bash
python3 scripts/build_caesar_curriculum_import.py add-dutch \
  --output imports/caesar-de-bello-gallico-curriculum \
  --worklist "$caesar_scratch/caesar-dutch-worklist.json" \
  --translations "$caesar_scratch/caesar-dutch.json"
```

Expected: success. Any missing, extra, empty, non-string, or multiline value must stop the release.

- [ ] **Step 6: Check alignment and establish the pre-dictionary baseline**

Run:

```bash
python3 - <<'PY'
from pathlib import Path

root = Path("imports/caesar-de-bello-gallico-curriculum")
total = 0
for number in range(1, 15):
    counts = {
        language: len((root / f"{language}-{number:02d}.txt").read_text(encoding="utf-8").splitlines())
        for language in ("latin", "english", "dutch")
    }
    assert len(set(counts.values())) == 1, (number, counts)
    total += counts["latin"]
assert total == 28, total
print("14 aligned units; 28 Latin/English/Dutch source lines")
PY
python3 scripts/import_texts.py
```

Expected importer line for the new book before rebuilding the dictionary:

```text
OK caesar-de-bello-gallico-curriculum: 14 chapter(s), 28 source lines, Latin dictionary coverage 2747/3935 (70%)
```

Do not commit the corpus yet. Its dictionary coverage is intentionally below the release gate until Task 3.

### Task 3: Extend the existing Latin supplement to 100% Caesar coverage

**Files:**

- Modify: `scripts/build_latin_import_dictionary.mjs:13`
- Regenerate: `generated/imported-latin-dictionary.js`
- Regenerate: `generated/imported-books.js`

- [ ] **Step 1: Demonstrate the dictionary gate failing on the new forms**

Run:

```bash
make dictionary
```

Expected: non-zero exit identifying the 51 unresolved normalized forms listed in Step 2. If the set differs, first check the Latin extraction and normalization; do not blindly expand the override list.

- [ ] **Step 2: Add the reviewed exceptions to the existing `OVERRIDES` object**

Insert these entries at the beginning of `OVERRIDES` in `scripts/build_latin_import_dictionary.mjs`, preserving the existing entries below them:

```js
  aduatuci: { lemma: "Aduatuci, Aduatucorum", en: "the Aduatuci", grammar: "N NOM P M (proper name)" },
  aduatucis: { lemma: "Aduatuci, Aduatucorum", en: "to, by, or from the Aduatuci", grammar: "N DAT/ABL P M (proper name)" },
  arpineius: { lemma: "Arpineius, Arpineii", en: "Arpineius", grammar: "N NOM S M (proper name)" },
  audierunt: { lemma: "audio, audire, audivi, auditus", en: "they heard", grammar: "V PERF ACTIVE IND 3 P" },
  aurunculeium: { lemma: "Aurunculeius, Aurunculeii", en: "Aurunculeius", grammar: "N ACC S M (proper name)" },
  aurunculeius: { lemma: "Aurunculeius, Aurunculeii", en: "Aurunculeius", grammar: "N NOM S M (proper name)" },
  balventio: { lemma: "Balventius, Balventii", en: "to Balventius", grammar: "N DAT S M (proper name)" },
  catamantaloedis: { lemma: "Catamantaloedes, Catamantaloedis", en: "of Catamantaloedes", grammar: "N GEN S M (proper name)" },
  catuvolci: { lemma: "Catuvolcus, Catuvolci", en: "of Catuvolcus", grammar: "N GEN S M (proper name)" },
  catuvolco: { lemma: "Catuvolcus, Catuvolci", en: "Catuvolcus", grammar: "N ABL S M (proper name)" },
  ccxl: { lemma: "CCXL", en: "240", grammar: "NUM (Roman numeral)" },
  clxxx: { lemma: "CLXXX", en: "180", grammar: "NUM (Roman numeral)" },
  cogitasset: { lemma: "cogito, cogitare, cogitavi, cogitatus", en: "had considered", grammar: "V PLUP ACTIVE SUB 3 S" },
  comparasse: { lemma: "comparo, comparare, comparavi, comparatus", en: "to have acquired; prepared", grammar: "V PERF ACTIVE INF (syncopated)" },
  conlocasse: { lemma: "conloco, conlocare, conlocavi, conlocatus", en: "to have placed", grammar: "V PERF ACTIVE INF (syncopated)" },
  consuesset: { lemma: "consuesco, consuescere, consuevi, consuetus", en: "had been accustomed", grammar: "V PLUP ACTIVE SUB 3 S" },
  curasset: { lemma: "curo, curare, curavi, curatus", en: "had arranged; taken care", grammar: "V PLUP ACTIVE SUB 3 S (syncopated)" },
  enuntiarit: { lemma: "enuntio, enuntiare, enuntiavi, enuntiatus", en: "will have disclosed", grammar: "V FUTP ACTIVE IND 3 S (syncopated)" },
  esubios: { lemma: "Esubii, Esubiorum", en: "the Esubii", grammar: "N ACC P M (proper name)" },
  garumna: { lemma: "Garumna, Garumnae", en: "the Garonne", grammar: "N NOM S F (proper name)" },
  interpretibus: { lemma: "interpres, interpretis", en: "interpreters", grammar: "N DAT/ABL P C" },
  iuram: { lemma: "Iura, Iurae", en: "the Jura", grammar: "N ACC S M (proper name)" },
  latobrigis: { lemma: "Latobrigi, Latobrigorum", en: "to the Latobrigi", grammar: "N DAT P M (proper name)" },
  lisci: { lemma: "Liscus, Lisci", en: "of Liscus", grammar: "N GEN S M (proper name)" },
  lisco: { lemma: "Liscus, Lisci", en: "Liscus", grammar: "N DAT/ABL S M (proper name)" },
  liscum: { lemma: "Liscus, Lisci", en: "Liscus", grammar: "N ACC S M (proper name)" },
  liscus: { lemma: "Liscus, Lisci", en: "Liscus", grammar: "N NOM S M (proper name)" },
  militibusque: { lemma: "miles, militis", en: "and to or for the soldiers", grammar: "N DAT/ABL P M + TACKON" },
  munatium: { lemma: "Munatius, Munatii", en: "Munatius", grammar: "N ACC S M (proper name)" },
  nammeius: { lemma: "Nammeius, Nammeii", en: "Nammeius", grammar: "N NOM S M (proper name)" },
  noreiamque: { lemma: "Noreia, Noreiae", en: "and Noreia", grammar: "N ACC S F (proper name) + TACKON" },
  noricum: { lemma: "Noricus, Norica, Noricum", en: "Noric", grammar: "ADJ ACC S M" },
  orgetoricem: { lemma: "Orgetorix, Orgetorigis", en: "Orgetorix", grammar: "N ACC S M (proper name)" },
  petrosidius: { lemma: "Petrosidius, Petrosidii", en: "Petrosidius", grammar: "N NOM S M (proper name)" },
  pulloni: { lemma: "Pullo, Pullonis", en: "to Pullo", grammar: "N DAT S M (proper name)" },
  rauracis: { lemma: "Rauraci, Rauracorum", en: "to the Rauraci", grammar: "N DAT P M (proper name)" },
  roscio: { lemma: "Roscius, Roscii", en: "to Roscius", grammar: "N DAT S M (proper name)" },
  samarobrivae: { lemma: "Samarobriva, Samarobrivae", en: "at Samarobriva", grammar: "N LOC S F (proper name)" },
  tasgeti: { lemma: "Tasgetius, Tasgetii", en: "of Tasgetius", grammar: "N GEN S M (proper name)" },
  tasgetium: { lemma: "Tasgetius, Tasgetii", en: "Tasgetius", grammar: "N ACC S M (proper name)" },
  tasgetius: { lemma: "Tasgetius, Tasgetii", en: "Tasgetius", grammar: "N NOM S M (proper name)" },
  titurium: { lemma: "Titurius, Titurii", en: "Titurius", grammar: "N ACC S M (proper name)" },
  titurius: { lemma: "Titurius, Titurii", en: "Titurius", grammar: "N NOM S M (proper name)" },
  transierant: { lemma: "transeo, transire, transii, transitus", en: "they had crossed", grammar: "V PLUP ACTIVE IND 3 P" },
  trebonium: { lemma: "Trebonius, Trebonii", en: "Trebonius", grammar: "N ACC S M (proper name)" },
  troucillum: { lemma: "Troucillus, Troucilli", en: "Troucillus", grammar: "N ACC S M (proper name)" },
  v: { lemma: "V", en: "five", grammar: "NUM (Roman numeral)" },
  verucloetius: { lemma: "Verucloetius, Verucloetii", en: "Verucloetius", grammar: "N NOM S M (proper name)" },
  vorene: { lemma: "Vorenus, Voreni", en: "Vorenus", grammar: "N VOC S M (proper name)" },
  vorenus: { lemma: "Vorenus, Voreni", en: "Vorenus", grammar: "N NOM S M (proper name)" },
  xv: { lemma: "XV", en: "fifteen", grammar: "NUM (Roman numeral)" },
```

- [ ] **Step 3: Rebuild the supplement and generated books**

Run:

```bash
make dictionary
make import
```

Expected dictionary output:

```text
Wrote generated/imported-latin-dictionary.js with 11475 Latin forms.
```

Expected importer line:

```text
OK caesar-de-bello-gallico-curriculum: 14 chapter(s), 28 source lines, Latin dictionary coverage 3935/3935 (100%)
```

- [ ] **Step 4: Run the focused validation gates**

Run:

```bash
python3 -m unittest tests.test_build_caesar_curriculum_import -v
python3 scripts/import_texts.py --check
```

Expected: all extractor tests pass; every import, including Caesar, reports 100%; generated bundle is up to date.

### Task 4: Ship and verify the Caesar release

**Files:**

- Modify: `index.html:78`
- Modify: `index.html:80`
- Modify: `sw.js:1`
- Verify: all files created or regenerated in Tasks 1–3

- [ ] **Step 1: Bust the changed generated assets and offline cache**

In `index.html`, change:

```html
  <script src="generated/imported-books.js?v=20260722-1"></script>
```

to:

```html
  <script src="generated/imported-books.js?v=20260722-2"></script>
```

Change:

```html
  <script src="generated/imported-latin-dictionary.js?v=20260722-1"></script>
```

to:

```html
  <script src="generated/imported-latin-dictionary.js?v=20260722-2"></script>
```

In `sw.js`, change:

```js
const CACHE = "classics-reader-v6";
```

to:

```js
const CACHE = "classics-reader-v7";
```

- [ ] **Step 2: Run the complete repository release gate**

Run exactly as required by the classic-text workflow:

```bash
make import && make check
```

Expected: all imported Greek and Latin corpora report 100% dictionary coverage; the generated import bundle is current; every `node --check` command succeeds. Do not commit or push if any line fails.

- [ ] **Step 3: Recheck the trilingual alignment and token total**

Run:

```bash
python3 - <<'PY'
from pathlib import Path
import sys

sys.path.insert(0, "scripts")
import import_texts

root = Path("imports/caesar-de-bello-gallico-curriculum")
latin_lines = []
for number in range(1, 15):
    paths = [root / f"{language}-{number:02d}.txt" for language in ("latin", "english", "dutch")]
    counts = [len(path.read_text(encoding="utf-8").splitlines()) for path in paths]
    assert len(set(counts)) == 1, (number, counts)
    latin_lines.extend(paths[0].read_text(encoding="utf-8").splitlines())
keys = import_texts.load_dictionary_keys("LATIN_DICT")
covered, total = import_texts.dictionary_coverage(latin_lines, keys)
assert len(latin_lines) == 28, len(latin_lines)
assert (covered, total) == (3935, 3935), (covered, total)
print("Caesar: 14 units, 28 aligned lines, 3935/3935 Latin tokens")
PY
```

- [ ] **Step 4: Perform the human source and translation review**

Read all 28 Latin/English/Dutch rows, with particular attention to these risk points:

- I.1: the three-part geographical structure and the description of the Belgae.
- I.19–20: switches among Caesar, Dumnorix, and Diviciacus; indirect speech and the brother's plea.
- V.26–27: Ambiorix's professed friendship, reported intelligence, and deliberately ambiguous warning.
- V.44: the rivalry and mutual rescue of Pullo and Vorenus.
- Every first and last line in each of the 14 files, ensuring no chapter is clipped, duplicated, or placed in the wrong unit.

Correct Dutch only where the Latin requires it. After any correction, rerun Steps 2 and 3.

- [ ] **Step 5: Inspect the exact release diff and exclude scratch artifacts**

Run:

```bash
git status --short
git diff --check
git diff --stat
find imports/caesar-de-bello-gallico-curriculum -maxdepth 1 -type f | sort
```

Expected import folder: one manifest plus exactly 42 text files (14 Latin, 14 English, 14 Dutch). No worklist, model response, downloaded TEI, temporary file, or unrelated user change may be staged.

- [ ] **Step 6: Commit the release**

Run:

```bash
git add \
  imports/caesar-de-bello-gallico-curriculum \
  scripts/build_latin_import_dictionary.mjs \
  generated/imported-books.js \
  generated/imported-latin-dictionary.js \
  index.html \
  sw.js
git commit -m "Add Caesar curriculum selections"
```

Do not add a `Co-authored-by` line.

- [ ] **Step 7: Push and report the release**

Run:

```bash
git push origin main
git rev-parse --short HEAD
```

Report:

- id `caesar-de-bello-gallico-curriculum`
- 14 units and 28 chapter-aligned rows
- Latin dictionary coverage 3,935/3,935
- 51 reviewed Latin override forms
- one Dutch translation batch, reviewed against the Latin
- both commit hashes: the tested extractor commit and the content release commit

If push fails, preserve the local commits and report the exact failure; do not rewrite history or force-push.
