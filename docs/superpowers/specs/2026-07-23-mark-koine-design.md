# Gospel of Mark Koine Reader Design

## Goal

Add a complete, verse-referenced Koine Greek reader for the Gospel according to Mark, giving the Classics Reader a first New Testament text suitable for gradual home study.

## Scope

- Import id: `mark-koine`.
- Source text: pinned Perseus canonical Greek and Perseus/World English Bible reference text, with PROIEL Greek New Testament morphology for dictionary-linked forms.
- Coverage: all 16 chapters and 673 standard-text verses spanning Mark 1–16, from the opening through the empty tomb.
- Presentation: one Greek verse per displayed line, one aligned English line, standard Mark chapter:verse references, and dictionary coverage for every Greek form.

## Selection

The standard PROIEL text omits the four verse numbers conventionally absent from the critical text (7:16, 9:44, 9:46, 11:26). Perseus’ separately marked alternate ending 16:20a is not silently folded into the standard 16:20; the reader uses the complete standard Gospel text.

## Validation and release

The extractor pins source revisions and checks Greek/English verse alignment. PROIEL-derived analyses are converted into the repository’s Greek morphology format and reviewed for unresolved forms. `make import && make check`, JavaScript checks, cache-version bumps, a main-branch push, Pages-build confirmation, and live-file checks are required before release.
