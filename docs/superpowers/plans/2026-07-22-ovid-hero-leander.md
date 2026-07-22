# Ovid Hero and Leander Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a 13-unit, 248-line paired reader from Ovid's *Heroides* 18 and 19 with aligned Latin, English, and Dutch and complete Latin dictionary support.

**Architecture:** Follow the repository's manifest-driven import format. Source files live in one new import directory; existing import and Whitaker scripts regenerate the production bundles, while query-string and service-worker version changes invalidate installed caches.

**Tech Stack:** Static text/JSON imports, Python importer, Node/Whitaker Latin dictionary builder, GitHub Pages.

---

### Task 1: Create the source import

**Files:**
- Create: `imports/ovid-hero-leander/manifest.json`
- Create: `imports/ovid-hero-leander/latin-01.txt` through `latin-13.txt`

- [ ] Extract poem 18 ranges `1–24`, `55–120`, `179–218` and poem 19 ranges `1–30`, `33–68`, `149–170`, `181–210` from the pinned Perseus XML.
- [ ] Split them at the 13 boundaries in the design and preserve one verse per line.
- [ ] Add the stable id `ovid-hero-leander`, Dutch unit titles, standard starting line numbers, EN/NL file references, and pinned source credit.
- [ ] Run an XML comparison asserting every selected Latin line equals the pinned source and the total equals 248.
- [ ] Commit with:

```bash
git add imports/ovid-hero-leander
git commit -m "feat: add Hero and Leander Latin selections"
```

### Task 2: Add aligned study translations

**Files:**
- Create: `imports/ovid-hero-leander/english-01.txt` through `english-13.txt`
- Create: `imports/ovid-hero-leander/dutch-01.txt` through `dutch-13.txt`

- [ ] Translate each Latin verse into one structurally close English line, checking sense against the 1813 public-domain translation.
- [ ] Translate each verse into one clear Dutch study line suitable for syntax comparison.
- [ ] Assert equal Latin/English/Dutch line counts per unit and spot-read all unit boundaries for complete syntax.
- [ ] Commit with:

```bash
git add imports/ovid-hero-leander
git commit -m "feat: translate Hero and Leander selections"
```

### Task 3: Integrate dictionary and bundles

**Files:**
- Modify: `scripts/build_latin_import_dictionary.mjs`
- Modify: `generated/imported-latin-dictionary.js`
- Modify: `generated/imported-books.js`

- [ ] Run `make dictionary` and review every unresolved form in its passage context.
- [ ] Add explicit `OVERRIDES` entries for unresolved proper names, Greek inflections, poetic forms, or clearly wrong first-choice homonyms.
- [ ] Rerun `make dictionary` and `make import`; require the new import line to report `100%` coverage.
- [ ] Commit with:

```bash
git add scripts/build_latin_import_dictionary.mjs generated/imported-latin-dictionary.js generated/imported-books.js
git commit -m "feat: add Heroides dictionary coverage"
```

### Task 4: Release and verify

**Files:**
- Modify: `index.html`
- Modify: `sw.js`

- [ ] Increment the imported-books and imported-Latin-dictionary query versions and increment the service-worker cache version.
- [ ] Run the exact source/alignment verifier, `make import && make check`, and `git diff --check`.
- [ ] Request one focused release review and fix every Critical or Important issue.
- [ ] Commit release plumbing, push `main`, wait for the Pages build for the pushed SHA, and fetch the live index/book/dictionary assets to prove deployment.

```bash
git add index.html sw.js generated/imported-books.js generated/imported-latin-dictionary.js
git commit -m "chore: release Hero and Leander reader"
git push origin main
```
