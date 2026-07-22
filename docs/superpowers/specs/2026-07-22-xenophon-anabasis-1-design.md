# Xenophon *Anabasis* I Reader Design

## Goal

Add a Greek prose reader for selected sections of Xenophon’s *Anabasis* Book I, completing the principal Greek historiography gap in the Classics Reader corpus.

## Scope

- Import id: `xenophon-anabasis-1`.
- Source: Perseus canonical Greek, `tlg0032.tlg001.perseus-grc2`, paired with the public-domain Perseus English reference, and GLAUx automatic prose parsing for dictionary morphology.
- Coverage: a balanced selection across all seven chapters of Book I, arranged as 12 small reading units and kept at standard Xenophon book.chapter.section citations.
- Presentation: one Greek section per displayed line, with one aligned English study translation per line; unit-level completion grid and clickable dictionary entries for every Greek form.
- The corpus already contains Vergil *Aeneid* I and Sophocles *Oedipus Rex*, so neither tragedy nor Latin epic is part of this change.

## Content selection

The selection will preserve the narrative arc: Cyrus’s preparations, the march inland, the approach to Cunaxa, the battle, and the immediate leadership crisis. Units will be small enough for independent home sessions while collectively giving students representative Attic historical prose.

## Validation and release

The Greek treebank stream will be aligned against the pinned canonical text; all missing lemmas will receive English and Dutch glosses before dictionary generation. `make import && make check`, JavaScript syntax checks, cache-version bumps, a main-branch commit, GitHub Pages build confirmation, and live-file checks are required before declaring completion.
