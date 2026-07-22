# Ovid, Hero and Leander — Design

## Goal

Add a paired Latin reader drawn from Ovid's *Heroides* 18 and 19 for Flemish secondary-school practice. It must preserve both Leander's and Hero's voices, the narrative arc, elegiac verse lines, and the story's tragic foreshadowing without making pupils work through all 428 lines.

## Scope

Use 248 lines from the pinned Perseus Rudolf Ehwald text:

- *Heroides* 18.1–24, 55–120, and 179–218 (Leander; 130 lines).
- *Heroides* 19.1–30, 33–68, 149–170, and 181–210 (Hero; 118 lines).

The omissions remove catalogues and repeated arguments while retaining the opening exchange, Leander's first crossing, Hero's vigil, their reunion and separation, Leander's fatal promise, Hero's imagined mid-sea meeting, and her warning dream.

## Reader structure

Create `ovid-hero-leander` as a separate imported Latin book with 13 completable units. Unit boundaries must preserve complete sentences or coherent movements wherever verse syntax permits. Titles are in Dutch and include the standard letter and line references.

Each unit has one Latin verse per line and exactly one corresponding English and Dutch study-translation line. The translations stay structurally close enough for syntax work while using readable modern language.

## Sources and attribution

- Latin: Rudolf Ehwald's 1907 Teubner text in Perseus `canonical-latinLit`, pinned to commit `e69eee761e5bd89c00a5d0744efa2367c5e1d7e3`.
- English reference: the public-domain 1813 *Epistles of Ovid* Perseus file. It is a checking source, not copied line-for-line.
- English and Dutch display texts: new Classics Reader line-by-line study translations.

The first manifest chapter records the pinned Perseus directory and these credits.

## Dictionary and release

Run the existing Whitaker-based Latin importer. Add reviewed overrides only for unresolved or materially misleading analyses in these passages, regenerate the imported dictionary, and require 100% word-click coverage.

Bump the imported-books and imported-Latin-dictionary asset versions and the service-worker cache. Run exact source/alignment checks plus `make import && make check`, review the release diff, commit without a co-author trailer, push `main`, and verify the deployed GitHub Pages assets.

## Acceptance criteria

- All 248 Latin lines exactly match the pinned source.
- All 13 units have equal Latin, English, and Dutch line counts.
- The import reports 100% Latin dictionary coverage.
- No unit boundary accidentally splits a sentence when the boundary can be moved safely.
- The complete repository test gate passes.
- GitHub Pages serves the new book and new asset versions.
