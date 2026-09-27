"""Guard the Greek glosses a pupil sees against the failures found in the
September 2026 audit: machine-translated profanity, first-person phrasing
("I'm selling" for πωρόω) and placeholder glosses."""
import json
import re
import unittest
from pathlib import Path

GLOSSES = Path(__file__).resolve().parents[1] / "generated" / "greek-glosses.json"

PROFANITY = re.compile(
    r"\b(fuck\w*|shit\w*|bitch\w*|bullshit|cunt|piss\w*|crap|asshole|slut|moron"
    r"|neuk\w*|kut|klootzak|teef|trut|lul|kanker\w*|tering)\b",
    re.IGNORECASE,
)
# Glosses that are about the first person itself.
FIRST_PERSON_OK = {"ἐγώ", "ἐγώγε", "ἐγώ + οἴομαι"}


class GlossHygieneTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.glosses = json.loads(GLOSSES.read_text(encoding="utf-8"))

    def test_no_profanity(self):
        hits = {k: v for k, v in self.glosses.items() if PROFANITY.search(f"{v['en']} {v['nl']}")}
        self.assertEqual(hits, {})

    def test_no_first_person_glosses(self):
        hits = sorted(
            k for k, v in self.glosses.items()
            if k not in FIRST_PERSON_OK and (re.match(r"I('m)?\b", v["en"]) or re.match(r"[Ii]k\b", v["nl"]))
        )
        self.assertEqual(hits, [])

    def test_no_placeholders_or_blanks(self):
        hits = sorted(
            k for k, v in self.glosses.items()
            if not v.get("en", "").strip() or not v.get("nl", "").strip()
            or v["en"].startswith("Greek lemma") or v["nl"].startswith("Grieks lemma")
        )
        self.assertEqual(hits, [])


if __name__ == "__main__":
    unittest.main()
