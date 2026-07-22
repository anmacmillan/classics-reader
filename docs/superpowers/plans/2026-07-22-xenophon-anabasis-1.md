# Xenophon *Anabasis* I Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a fully searchable, translated, dictionary-covered Xenophon *Anabasis* I selection to Classics Reader and deploy it.

**Architecture:** Extract canonical Greek and aligned Perseus English by Book I section into an import folder, split into 12 narrative units, and use the existing GLAUx/Greek dictionary assembly pipeline to merge morphology and glosses into the accumulated generated dictionary. Regenerate the import bundle, bump browser cache versions, validate, commit, push, and verify GitHub Pages.

**Tech Stack:** Python XML extraction, GLAUx dependency-treebank data, repository Greek import scripts, generated JavaScript bundles, `make import`, Python unittest, Node syntax/tests, GitHub Pages.

---

### Task 1: Extract and pin the source selection

**Files:**
- Create: `imports/xenophon-anabasis-1/manifest.json`
- Create: `imports/xenophon-anabasis-1/greek-01.txt` through `greek-12.txt`
- Create: `imports/xenophon-anabasis-1/english-01.txt` through `english-12.txt`
- Create: `scripts/extract_xenophon_anabasis.py`

- [ ] Pin the canonical Perseus XML revision and GLAUx source URL in the extraction script and manifest credit.
- [ ] Extract Book I sections into 12 narrative ranges covering chapters 1–7; preserve Greek punctuation and citation labels in unit titles.
- [ ] Extract the corresponding English section text, normalize whitespace only, and assert equal Greek/English line counts per unit.
- [ ] Run the extractor and inspect the first, middle, and final units for source alignment.
- [ ] Commit the source import and extraction script as `feat: add Xenophon Anabasis source selection`.

### Task 2: Build and complete Greek dictionary coverage

**Files:**
- Create: scratch `xenophon_anabasis_1_forms.json` and lemma worklist
- Modify: `generated/greek-forms-store.json`
- Modify: `generated/greek-glosses.json`
- Regenerate: `generated/imported-greek-dictionary.js`

- [ ] Concatenate the 12 Greek files in citation order and run `build_greek_treebank_dictionary.py` against GLAUx `0032-001.xml`.
- [ ] Review every mismatch, merged form, and empty lemma before merging; stop if the stream does not align cleanly through Book I.
- [ ] Merge the forms, draft exact English and natural Dutch glosses for every new lemma, verify the gloss-key set exactly matches the worklist, and build the generated dictionary.
- [ ] Run `make import` and require the new book’s line to report `Greek dictionary coverage N/N (100%)`.
- [ ] Commit dictionary coverage as `feat: add Xenophon Greek dictionary coverage`.

### Task 3: Validate, release, and verify live deployment

**Files:**
- Modify: `index.html`
- Modify: `sw.js`
- Regenerate: `generated/imported-books.js`

- [ ] Run `make import && make check`, `git diff --check`, and all JavaScript syntax/tests.
- [ ] Bump imported-book and imported-Greek-dictionary query versions in `index.html` and increment the service-worker cache name.
- [ ] Commit release plumbing as `chore: release Xenophon Anabasis reader`.
- [ ] Push `main`, verify origin matches HEAD, wait for the GitHub Pages build to report the exact commit as built, and check the public index, book bundle, dictionary, and service worker.
- [ ] Confirm the worktree is clean and report the book id, units, line count, dictionary coverage, and deployed commit.
