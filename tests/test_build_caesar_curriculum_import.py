from __future__ import annotations

import json
import tempfile
import unittest
import xml.etree.ElementTree as ET
from hashlib import sha256
from pathlib import Path
from unittest.mock import patch

from scripts import build_caesar_curriculum_import as caesar


NS = "http://www.tei-c.org/ns/1.0"
ET.register_namespace("", NS)


class FakeResponse:
    def __init__(self, data: bytes, content_length: str | None = None) -> None:
        self.data = data
        self.headers = {} if content_length is None else {"Content-Length": content_length}
        self.position = 0

    def __enter__(self) -> "FakeResponse":
        return self

    def __exit__(self, *arguments: object) -> None:
        return None

    def read(self, size: int = -1) -> bytes:
        if size < 0:
            size = len(self.data) - self.position
        result = self.data[self.position : self.position + size]
        self.position += len(result)
        return result


def tei_fixture(language: str) -> ET.Element:
    root = ET.Element(f"{{{NS}}}TEI")
    text = ET.SubElement(root, f"{{{NS}}}text")
    body = ET.SubElement(text, f"{{{NS}}}body")
    required = sorted(
        {(book, chapter) for unit in caesar.UNITS for book, chapter in unit.passages}
    )
    books: dict[int, ET.Element] = {}
    for book, chapter in required:
        book_node = books.get(book)
        if book_node is None:
            book_node = ET.SubElement(
                body,
                f"{{{NS}}}div",
                {"type": "textpart", "subtype": "book", "n": str(book)},
            )
            books[book] = book_node
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


def nested_punctuation_fixture() -> ET.Element:
    root = ET.Element(f"{{{NS}}}TEI")
    body = ET.SubElement(ET.SubElement(root, f"{{{NS}}}text"), f"{{{NS}}}body")
    book = ET.SubElement(
        body,
        f"{{{NS}}}div",
        {"type": "textpart", "subtype": "book", "n": "1"},
    )
    chapter = ET.SubElement(
        book,
        f"{{{NS}}}div",
        {"type": "textpart", "subtype": "chapter", "n": "1"},
    )
    paragraph = ET.SubElement(chapter, f"{{{NS}}}p")
    paragraph.text = " Rhine \n"
    place = ET.SubElement(paragraph, f"{{{NS}}}name")
    place.text = " , Rhone "
    place.tail = " ; Saone . Colon : bang ! question ? "
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
            first_chapter = manifest["chapters"][0]
            self.assertEqual(
                first_chapter["translationCredit"],
                "Perseus-bestanden (Latijn en Engels): CC BY-SA 4.0 · "
                "Engelse vertaling: W. A. McDevitte en W. S. Bohn (1869), "
                "publiek domein · NL: Classics Reader",
            )
            self.assertEqual(first_chapter["translationCreditLanguage"], "Bronnen")
            self.assertEqual(
                first_chapter["translationUrl"],
                "https://github.com/PerseusDL/canonical-latinLit/tree/"
                "e69eee761e5bd89c00a5d0744efa2367c5e1d7e3/data/phi0448/phi001",
            )
            self.assertEqual(len(records), 28)
            self.assertEqual(records[0]["key"], "1.1")
            self.assertEqual(records[-1]["key"], "5.44")
            self.assertEqual(records[0]["reference"], "I.1")
            self.assertEqual(
                [record["reference"] for record in records[1:4]],
                ["I.2–4", "I.2–4", "I.2–4"],
            )
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

    def test_extract_normalises_nested_text_before_punctuation(self) -> None:
        passages = caesar._chapter_texts(nested_punctuation_fixture())

        self.assertEqual(
            passages[(1, 1)],
            "Rhine, Rhone; Saone. Colon: bang! question?",
        )

    def test_extract_removes_stale_dutch_translations(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            output = root / "import"
            worklist = root / "worklist.json"
            output.mkdir()
            for number in range(1, 15):
                (output / f"dutch-{number:02d}.txt").write_text(
                    "stale translation\n", encoding="utf-8"
                )

            caesar.write_extract(
                tei_fixture("latin"),
                tei_fixture("english"),
                output,
                worklist,
            )

            for number in range(1, 15):
                self.assertFalse((output / f"dutch-{number:02d}.txt").exists())

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

    def test_add_dutch_rejects_untrusted_worklists_before_writing(self) -> None:
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

            cases = {
                "missing": lambda value: value.pop(),
                "duplicate": lambda value: value[1].update({"key": "1.1"}),
                "misrouted": lambda value: value[1].update({"unit": 1}),
                "empty latin": lambda value: value[0].update({"latin": ""}),
                "not an object": lambda value: value.__setitem__(0, []),
            }
            for label, mutate in cases.items():
                with self.subTest(label=label):
                    invalid = json.loads(json.dumps(records))
                    mutate(invalid)
                    worklist.write_text(json.dumps(invalid), encoding="utf-8")
                    sentinel = output / "dutch-01.txt"
                    sentinel.write_text("unchanged\n", encoding="utf-8")

                    with self.assertRaisesRegex(ValueError, r"invalid worklist"):
                        caesar.add_dutch(output, worklist, translations)

                    self.assertEqual(sentinel.read_text(encoding="utf-8"), "unchanged\n")

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

    def test_source_urls_are_pinned_to_a_commit(self) -> None:
        self.assertIn(caesar.SOURCE_COMMIT, caesar.LATIN_URL)
        self.assertIn(caesar.SOURCE_COMMIT, caesar.ENGLISH_URL)
        self.assertNotIn("master", caesar.LATIN_URL)
        self.assertNotIn("master", caesar.ENGLISH_URL)

    def test_fetch_rejects_oversized_or_tampered_responses(self) -> None:
        valid = b"<TEI/>"
        with patch.object(caesar, "MAX_DOWNLOAD_BYTES", 8):
            cases = (
                ("content length", valid, "9", sha256(valid).hexdigest(), "too large"),
                ("stream", valid + b"abc", None, sha256(valid).hexdigest(), "too large"),
                ("checksum", valid, None, "0" * 64, "checksum mismatch"),
            )
            for label, data, content_length, expected_hash, message in cases:
                with self.subTest(label=label):
                    response = FakeResponse(data, content_length)
                    with patch.object(
                        caesar.urllib.request, "urlopen", return_value=response
                    ):
                        with self.assertRaisesRegex(ValueError, message):
                            caesar._fetch("https://example.test/source.xml", expected_hash)


if __name__ == "__main__":
    unittest.main()
