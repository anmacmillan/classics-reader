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
    required = sorted(
        {(book, chapter) for unit in caesar.UNITS for book, chapter in unit.passages}
    )
    books: dict[int, ET.Element] = {}
    for book, chapter in required:
        book_node = books.setdefault(
            book,
            ET.SubElement(
                body,
                f"{{{NS}}}div",
                {"type": "textpart", "subtype": "book", "n": str(book)},
            ),
        )
        chapter_node = ET.SubElement(
            book_node,
            f"{{{NS}}}div",
            {"type": "textpart", "subtype": "chapter", "n": str(chapter)},
        )
        if language == "latin":
            first = ET.SubElement(
                chapter_node, f"{{{NS}}}div", {"type": "section", "n": "1"}
            )
            ET.SubElement(first, f"{{{NS}}}p").text = (
                f"Latina {book}.{chapter} pars una."
            )
            second = ET.SubElement(
                chapter_node, f"{{{NS}}}div", {"type": "section", "n": "2"}
            )
            ET.SubElement(second, f"{{{NS}}}p").text = "Pars altera."
        else:
            ET.SubElement(chapter_node, f"{{{NS}}}p").text = (
                f"English {book}.{chapter}."
            )
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
                english = (output / chapter["english"]).read_text(
                    encoding="utf-8"
                ).splitlines()
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
            payload = {
                record["key"]: f"Nederlands {record['key']}." for record in records
            }
            payload.pop("5.44")
            payload["9.99"] = "Onverwacht."
            translations.write_text(json.dumps(payload), encoding="utf-8")

            with self.assertRaisesRegex(
                ValueError, r"missing keys: 5\.44; extra keys: 9\.99"
            ):
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
            payload = {
                record["key"]: f"Nederlands {record['key']}." for record in records
            }
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
