import json
from pathlib import Path
import tempfile
import unittest

from scripts.import_texts import load_import


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


if __name__ == "__main__":
    unittest.main()
