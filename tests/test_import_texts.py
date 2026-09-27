import json
from pathlib import Path
import tempfile
import unittest

from scripts.import_texts import load_import, split_syntax, validate_curriculum


class LoadImportTests(unittest.TestCase):
    def test_preserves_collection_from_manifest(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            import_dir = Path(temp_dir)
            manifest = {
                "id": "test-greek",
                "title": "Test Greek",
                "author": "Test Author",
                "collection": "Shared Corpus",
                "year": 1,
                "lang": "greek",
                "chapters": [
                    {
                        "title": "Chapter 1",
                        "original": "greek.txt",
                        "english": "english.txt",
                    }
                ],
            }
            (import_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
            (import_dir / "greek.txt").write_text("λόγος\n", encoding="utf-8")
            (import_dir / "english.txt").write_text("word\n", encoding="utf-8")

            book, _ = load_import(import_dir)

            self.assertEqual(book["collection"], "Shared Corpus")

    def test_gospel_manifests_identify_koine_new_testament_collection(self):
        root = Path(__file__).resolve().parents[1]
        collections = {
            json.loads((root / "imports" / name / "manifest.json").read_text(encoding="utf-8")).get(
                "collection"
            )
            for name in ("matthew-koine", "mark-koine", "luke-koine", "john-koine")
        }

        self.assertEqual(collections, {"Koine New Testament"})


class CurriculumTests(unittest.TestCase):
    ENTRY = {"network": "kov", "stage": "third-degree", "status": "required-author", "genres": ["epic"]}

    def test_valid_curriculum_is_preserved(self):
        self.assertEqual(validate_curriculum("x", [dict(self.ENTRY)]), [self.ENTRY])

    def test_every_invalid_controlled_value_is_rejected(self):
        for key, bad in (("network", "vrij"), ("stage", "first-degree"), ("status", "optional"), ("genres", ["comedy"]), ("genres", [])):
            with self.subTest(key=key, bad=bad), self.assertRaises(ValueError):
                validate_curriculum("x", [{**self.ENTRY, key: bad}])
        with self.assertRaises(ValueError):
            validate_curriculum("x", [])
        with self.assertRaises(ValueError):
            validate_curriculum("x", [{**self.ENTRY, "passage": "I.1"}])


class SplitSyntaxTests(unittest.TestCase):
    def test_syntax_moves_to_a_versioned_per_book_file(self):
        books = [
            {"id": "a", "chapters": [{"lines": ["x"], "syntax": [[{"word": "x"}]]}, {"lines": ["y"]}]},
            {"id": "b", "chapters": [{"lines": ["z"]}]},
        ]
        files = split_syntax(books)
        self.assertEqual(list(files), ["a.json"])
        self.assertEqual(json.loads(files["a.json"]), [[[{"word": "x"}]], None])
        self.assertTrue(books[0]["syntaxUrl"].startswith("generated/syntax/a.json?v="))
        self.assertNotIn("syntax", books[0]["chapters"][0])
        self.assertNotIn("syntaxUrl", books[1])


if __name__ == "__main__":
    unittest.main()
