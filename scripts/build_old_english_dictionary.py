#!/usr/bin/env python3
"""Build an Old English lookup dictionary from the Beowulf thesaurus archive."""

from __future__ import annotations

import json
import html
import re
import unicodedata
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = Path("/Users/alexandermacmillan/Downloads/doi-10.34894-totfgz.zip")
OUTPUT = ROOT / "generated" / "imported-old-english-dictionary.js"
BEOWULF_TEXT = ROOT / "imports" / "beowulf" / "old_english.txt"
BEOWULF_ENGLISH = ROOT / "imports" / "beowulf" / "english.txt"
SEARCH_URL = "https://oldenglishthesaurus.arts.gla.ac.uk/category-selection"


def strip_diacritics(value: str) -> str:
    decomposed = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")


def normalise_key(value: str) -> str:
    return strip_diacritics(value.lower()).replace("’", "").replace("'", "")


def add_entry(entries: dict[str, dict[str, str]], key: str, value: dict[str, str]) -> None:
    if not key:
        return
    if key not in entries or len(value["def"]) < len(entries[key]["def"]):
        entries[key] = value


def alias_forms(lemma: str) -> set[str]:
    base = normalise_key(lemma)
    forms = {base}
    forms.add(base.replace("-", ""))
    forms.add(base.replace("-", " "))
    if base.endswith("an"):
        forms.add(base[:-2])
        forms.add(base[:-2] + "e")
    if base.endswith("on"):
        forms.add(base[:-2])
        forms.add(base[:-2] + "e")
    if base.endswith("en"):
        forms.add(base[:-2])
        forms.add(base[:-2] + "e")
    if base.endswith("um"):
        forms.add(base[:-2])
        forms.add(base[:-2] + "e")
    if base.endswith("a"):
        forms.add(base[:-1])
        forms.add(base[:-1] + "e")
    if base.endswith("e"):
        forms.add(base[:-1])
    if base.endswith("as"):
        forms.add(base[:-2])
        forms.add(base[:-2] + "e")
    if base.endswith("es"):
        forms.add(base[:-2])
        forms.add(base[:-2] + "e")
    if base.endswith("ne"):
        forms.add(base[:-2])
    if base.endswith("re"):
        forms.add(base[:-2])
    if base.endswith("de"):
        forms.add(base[:-2])
    if base.endswith("te"):
        forms.add(base[:-2])
    if base.endswith("ig"):
        forms.add(base[:-2] + "e")
    if base.endswith("ra"):
        forms.add(base[:-2] + "re")
        forms.add(base[:-2])
    if base.endswith("um") and "-" in base:
        forms.add(base.replace("-", ""))
    return {f for f in forms if f}


def clean_gloss(entry: str, lemma: str) -> str:
    text = entry.replace("\n", " ").strip()
    text = re.sub(rf"^\s*{re.escape(lemma)}\s*,\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^\s*[^,]+,\s*[^,]+,\s*", "", text)
    text = text.split(";", 1)[0].strip()
    text = text.split(".", 1)[0].strip()
    text = re.sub(r"\s+", " ", text)
    return text or "Old English word"


def fetch_search_gloss(word: str) -> tuple[str, str] | None:
    params = urllib.parse.urlencode({"word": word})
    url = f"{SEARCH_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        page = response.read().decode("utf-8", errors="replace")

    # Prefer the first explicit "Word results" entry.
    match = re.search(r"<h4 class=\"catList\">Word results:</h4>(.*?)<div id=\"recommended\">", page, flags=re.S)
    if not match:
        match = re.search(r"<h4 class=\"catList\">Word results:</h4>(.*)</div>\s*</div>\s*<div class=\"clear\">", page, flags=re.S)
    if not match:
        return None

    block = match.group(1)
    item = re.search(r"<p class=\"cat(?:Odd|Even)\">.*?<span class=\"small\">([^<]+)</span><br />.*?<b>([^<]+)</b>", block, flags=re.S)
    if not item:
        return None

    category = html.unescape(item.group(1)).strip()
    label = html.unescape(item.group(2)).strip()
    return category, label


def main() -> int:
    if not ARCHIVE.exists():
        raise SystemExit(f"Missing archive: {ARCHIVE}")

    with zipfile.ZipFile(ARCHIVE) as zf:
        data = json.loads(zf.read("Beowulf_Thesaurus_1.0.json"))

    entries: dict[str, dict[str, str]] = {}
    unresolved: set[str] = set()
    for page_entries in data.values():
        for item in page_entries:
            lemma = str(item.get("lemma", "") or "").strip()
            entry = str(item.get("entry", "") or "").strip()
            pos = str(item.get("pos", "") or "").strip()
            if not lemma or not entry:
                continue
            key = normalise_key(lemma)
            gloss = clean_gloss(entry, lemma)
            grammar = pos.replace("  ", " ").strip()
            value = {
                "def": gloss,
                "grammar": grammar,
                "lemma": lemma,
            }
            add_entry(entries, key, value)
            compact = normalise_key(strip_diacritics(lemma).replace(" ", ""))
            add_entry(entries, compact, value)
            for alias in alias_forms(lemma):
                add_entry(entries, alias, value)

    # Limited online fill for unresolved forms, using the site's own search endpoint.
    # This keeps the traffic bounded and only queries entries still missing after the
    # local thesaurus pass.
    unresolved_words = []
    seen = set(entries)
    for page_entries in data.values():
        for item in page_entries:
            lemma = str(item.get("lemma", "") or "").strip()
            if not lemma:
                continue
            for alias in alias_forms(lemma):
                if alias in seen or alias in unresolved:
                    continue
                unresolved.add(alias)
                unresolved_words.append(alias)
    unresolved_words = unresolved_words[:250]

    for word in unresolved_words:
        try:
            result = fetch_search_gloss(word)
        except Exception:
            result = None
        if not result:
            continue
        category, label = result
        add_entry(entries, word, {
            "def": f"See TOE category {category}: {label}",
            "grammar": "TOE",
            "lemma": word,
        })

    # Preserve a dictionary key for every attested surface form.  These
    # intentionally empty entries keep coverage honest while allowing app.js
    # to use its existing live Old English Thesaurus fallback for forms that
    # have no local lexical entry.
    if BEOWULF_TEXT.exists():
        old_lines = BEOWULF_TEXT.read_text(encoding="utf-8").splitlines()
        en_lines = BEOWULF_ENGLISH.read_text(encoding="utf-8").splitlines() if BEOWULF_ENGLISH.exists() else []
        for index, line in enumerate(old_lines):
            context = " ".join(en_lines[index].split()) if index < len(en_lines) else ""
            if len(context) > 220:
                context = context[:217] + "…"
            for word in re.findall(r"[\wþðæƿȝ]+", line.lower(), flags=re.UNICODE):
                key = normalise_key(word)
                if key and key not in entries:
                    entries[key] = {
                        "def": f"Contextual translation: {context}" if context else "Old English surface form; context stored offline",
                        "grammar": "Contextual translation",
                        "lemma": word,
                    }

    payload = json.dumps(entries, ensure_ascii=False, indent=2, sort_keys=True)
    OUTPUT.write_text(
        "// AUTO-GENERATED by scripts/build_old_english_dictionary.py. Do not edit manually.\n"
        "// Source: Beowulf Thesaurus archive.\n\n"
        f"const OLD_ENGLISH_DICT = {payload};\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(entries)} entries.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
