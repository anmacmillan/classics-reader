# Importing A New Greek Or Latin Text

Create one folder per work under `imports/`. Each non-empty line in a text file
is one source line. The original and English files must have exactly the same
number of non-empty lines. Dutch is optional, but if supplied must also align.
Folders beginning with `_`, such as `_example-greek`, are ignored.

## Quick Start

```bash
mkdir -p imports/my-greek-work
cp /path/to/greek.txt imports/my-greek-work/greek.txt
cp /path/to/english.txt imports/my-greek-work/english.txt
```

Add `imports/my-greek-work/manifest.json`:

```json
{
  "id": "author-work-1",
  "title": "Author - Work I",
  "author": "Author",
  "year": -400,
  "lang": "greek",
  "chapters": [
    {
      "title": "Book I",
      "startLine": 1,
      "original": "greek.txt",
      "english": "english.txt",
      "translationCredit": "EN: Translator, public domain",
      "translationCreditLanguage": "Sources",
      "translationUrl": "https://example.com/source"
    }
  ]
}
```

Build and validate:

```bash
python3 scripts/import_texts.py
make dictionary
python3 scripts/import_texts.py --check
```

Commit the import folder and `generated/imported-books.js`. The website loads
the generated bundle automatically.

A complete ignored example is available at `imports/_example-greek/`.

## Optional Dutch

Add `"dutch": "dutch.txt"` to the chapter manifest. The importer will validate
that it has one Dutch line per original line.

## Plays And Speakers

Speaker ranges use the displayed source line numbers:

```json
"speakers": [
  { "start": 1, "end": 13, "name": "Oedipus" },
  { "start": 14, "end": 57, "name": "Priester" }
]
```

## Validation

The importer rejects:

- missing files or manifest fields;
- duplicate book IDs;
- original/English/Dutch line-count mismatches;
- speaker ranges outside the chapter;
- invalid language values.

For Greek and Latin imports it also reports current dictionary coverage. Low
coverage does not block the import, but indicates that word-click lookup needs
extending.

Run `npm install` once, then `make dictionary` after adding Latin imports. This
uses Whitaker's Words to generate morphological entries for Latin forms not
already present in `dictionary.js`. It covers both `imports/` and the Latin
texts in `data.js`. Unrecognised or incorrectly parsed forms must be added as
reviewed overrides in `scripts/build_latin_import_dictionary.mjs`.

## Greek Dictionary Pipeline

Greek word-click entries live in `generated/imported-greek-dictionary.js`
(merged over the legacy `GREEK_DICT`, so later entries win). They are built
from dependency treebanks with `scripts/build_greek_treebank_dictionary.py` —
see that script's docstring for usage and treebank sources:

- Hand-verified analyses (Homer, Sophocles, Aeschylus):
  PerseusDL `treebank_data` (AGDT v2.1).
- Automatic analyses for nearly everything else, including all of Plato:
  GLAUx (`perseids-publications/glaux-trees`), ~96-97% accurate on prose.

The script emits per-form analyses plus a lemma worklist; supply per-lemma
`{en, nl}` glosses (an LLM drafts these well from the worklist), merge, and
append to the generated file. Every form key must match what the app looks up:
lowercased, punctuation-stripped, elision apostrophe U+2019. The importer's
coverage line must read 100% before publishing.
