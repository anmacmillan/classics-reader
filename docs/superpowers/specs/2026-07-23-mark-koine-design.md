# Gospel of Mark Koine Reader Design

## Goal

Add a compact, verse-referenced Koine Greek reader for selected narrative passages from the Gospel according to Mark, giving the Classics Reader a first New Testament text suitable for gradual home study.

## Scope

- Import id: `mark-koine`.
- Source text: pinned Perseus canonical Greek and Perseus/World English Bible reference text, with PROIEL Greek New Testament morphology for dictionary-linked forms.
- Coverage: 15 short narrative units spanning Mark 1–16, from the opening and calling of the disciples through the empty tomb.
- Presentation: one Greek verse per displayed line, one aligned English line, standard Mark chapter:verse references, and dictionary coverage for every Greek form.

## Selection

The selection follows Mark’s narrative arc: opening ministry, healings, parables, miracles, confession and transfiguration, teaching, entry into Jerusalem, passion, crucifixion, and resurrection. It is intentionally a foundation rather than a full-Gospel edition; a later expansion can add further chapters without changing the import format.

## Validation and release

The extractor pins source revisions and checks Greek/English verse alignment. PROIEL-derived analyses are converted into the repository’s Greek morphology format and reviewed for unresolved forms. `make import && make check`, JavaScript checks, cache-version bumps, a main-branch push, Pages-build confirmation, and live-file checks are required before release.
