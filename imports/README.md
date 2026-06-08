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
