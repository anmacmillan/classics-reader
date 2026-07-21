# Flemish Classics Curriculum Corpus Design

**Date:** 21 July 2026

**Status:** Approved in conversation; awaiting review of this written specification

**Audience:** Maintainers of `classics-reader`

## Purpose

Expand `classics-reader` into a corpus that Alex can use to read ahead of his daughters' likely secondary-school classics courses. The corpus must support both:

- Sint-Lievenscollege Antwerpen, which follows the Katholiek Onderwijs Vlaanderen (KOV) curricula; and
- GO! Koninklijk Lyceum Antwerpen (KLA), which follows the GO! curricula.

The product goal is not to predict the exact passages a future teacher will assign. It is to provide enough authentic text from every required author and genre that a parent can learn the author's language and style, help with a later assigned passage, and practise author-specific unseen reading.

## Curriculum basis

The two networks express their requirements differently.

| Network and stage | Published requirement | Corpus implication |
| --- | --- | --- |
| KOV, second degree Latin | Ovid and Caesar | Both authors need substantial authentic passage banks. |
| KOV, second degree Greek | Herodotus | Herodotus is a priority gap. |
| KOV, third degree Latin | Vergil, Tacitus and rhetorical texts | Existing Vergil remains; add Tacitus and Cicero as the principal rhetoric exemplar. |
| KOV, third degree Greek | Homer, Plato and Sophocles or Euripides | Existing Homer and Plato remain; complete Sophocles' *Oedipus Tyrannus*. |
| GO!, second degree Latin | At least historiography, plus thematic reading | Caesar provides historiography; other corpus works provide thematic range. |
| GO!, second degree Greek | At least six culturally or historically grounded themes | Herodotus provides several themes; the wider Greek corpus supplies the rest. |
| GO!, third degree Latin | Epic plus other genres and themes | Vergil supplies epic; Cicero, Tacitus, Ovid and later-period Latin supply breadth. |
| GO!, third degree Greek | Five themes or genres, including epic and tragedy | Homer supplies epic; Sophocles supplies tragedy; Herodotus and Plato broaden the range. |

Primary references:

- KOV second-degree Latin: <https://pro.katholiekonderwijs.vlaanderen/leerplan-ii-lat-d/basisinformatie>
- KOV second-degree Greek: <https://pro.katholiekonderwijs.vlaanderen/leerplan-ii-gri-d/basisinformatie>
- KOV third-degree Latin: <https://pro.katholiekonderwijs.vlaanderen/iii-lat-d/basisinformatie>
- KOV third-degree Greek: <https://pro.katholiekonderwijs.vlaanderen/iii-gri-d/basisinformatie>
- GO! second-degree Greek-Latin: <https://pro.g-o.be/download/GOPRO-1830562155-27959/GO%20SO%202de%20graad%20doorstroom%20-%20leerplan%20Grieks-Latijn%20wijzigingen>
- GO! third-degree Greek-Latin: <https://pro.g-o.be/download/GOPRO-1830562155-27584/GO%21%20SO%203de%20graad%20doorstroom%20-%20leerplan%20Grieks-Latijn>

## Existing foundation

The project already has the corpus infrastructure needed for this programme. This design extends it; it does not replace it.

As audited on 21 July 2026:

- the final Latin dictionary contains 12,932 clickable form keys;
- the final Greek dictionary contains 7,648 clickable form keys;
- `generated/greek-forms-store.json` contains 7,646 form keys and 8,333 attested analyses;
- 542 Greek form keys preserve more than one attested analysis;
- `generated/greek-glosses.json` contains 3,267 lemmas, with no missing English or Dutch glosses; and
- every current imported Greek or Latin work reports 100% word coverage under `make check`.

Current directly relevant content is:

| Book | Current extent | Assessment |
| --- | ---: | --- |
| Vergil, *Aeneid* I | 756 lines | Strong initial KOV/GO! epic coverage. |
| Ovid, *Metamorphoses* I | 150 reader lines plus a filtered four-line preview | Useful opening, but too narrow for robust Ovid preparation. |
| Homer, *Iliad* I | 100 reader lines plus a filtered five-line preview | Useful opening, but not enough for sustained Homeric reading. |
| Homer, *Odyssey* I | 444 lines across five units | Strong Homeric coverage. |
| Sophocles, *Oedipus Tyrannus* | 77 reader lines plus a filtered five-line preview | Opening only; insufficient tragedy coverage. |
| Plato, *Symposium* | Complete, 1,015 source lines across nine units | Strong Plato coverage. |
| Cicero, *De Officiis* I and *Laelius de Amicitia* | 22 units in total | Strong philosophical prose, but not a substitute for rhetorical oratory. |

## Governing import workflow

`/Users/alexandermacmillan/.pi/agent/skills/new-classic-text/SKILL.md` is the normative production procedure for every new Greek or Latin text. Its hard gates remain mandatory.

In particular:

- Greek treebank analyses accumulate in `generated/greek-forms-store.json`.
- Greek lemma glosses accumulate in `generated/greek-glosses.json`.
- `scripts/assemble_greek_import.py` regenerates the Greek dictionary and refuses incomplete analyses or glosses.
- Latin forms are resolved by the existing Whitaker's Words pipeline in `scripts/build_latin_import_dictionary.mjs`, with only reviewed exceptions added to `OVERRIDES`.
- New works live under `imports/<work>/` and are bundled by `scripts/import_texts.py`.
- Texts are divided into short completable units, not monolithic chapters.
- Original, English and Dutch study-translation lines remain exactly aligned for every curriculum pack. Dutch facing translations are mandatory for this programme even though the general importer permits them to be omitted.
- A release is forbidden below 100% clickable Greek or Latin word coverage.
- `index.html` asset versions and the service-worker cache name are updated for every content release.

No parallel dictionary, per-book dictionary or replacement morphology service will be introduced.

## Corpus strategy

The programme uses a tiered anthology rather than token excerpts or an all-complete-works rule. Each author receives a coherent passage bank large enough to reveal characteristic vocabulary, syntax, genre and style. Complete works are used where they are especially valuable and technically tractable.

### Release 1: Caesar curriculum pack

Import authentic selections from *De Bello Gallico*:

- I.1-7: Gaul, its peoples and the opening of the Helvetian campaign;
- I.15-20: pursuit, supply difficulties and Dumnorix;
- V.24-37: Ambiorix, Sabinus and Cotta;
- V.44: Pullo and Vorenus.

The passages will be divided at narrative boundaries into completable units of no more than 30 source sentences or lines. The expected result is 12-18 units, but the narrative boundary and maximum size govern the split. This is the first delivery because it fills a KOV named-author gap, satisfies the GO! historiography requirement, and gives the Latin dictionary pipeline a representative classical-prose test.

### Release 2: Ovid curriculum anthology

Retain the existing *Metamorphoses* I material and add a single new curriculum-anthology book containing:

- VI.313-381: the Lycian peasants;
- VIII.183-235: Daedalus and Icarus; and
- X.243-297: Pygmalion.

Each myth becomes several scene-sized units. Together they provide narrative variety, hexameter practice, metamorphosis as a unifying theme and common school-text subject matter.

### Release 3: Herodotus curriculum pack

Import selections from the *Histories*:

- I.29-33: Solon and Croesus;
- I.86-91: Croesus on the pyre and the fulfilment of the oracle; and
- VII.201-238: Thermopylae, divided into coherent narrative episodes.

The display text will use canonical Ionic Greek. Treebank provenance and parse quality will be stated in the book credit exactly as required by the `new-classic-text` skill.

### Release 4: Cicero rhetoric pack

Import *In Catilinam* I in full, divided by its major rhetorical movements rather than arbitrary paragraph counts. The existing philosophical Cicero remains unchanged. The new work supplies periodic prose, direct address, anaphora, rhetorical questions, tricolon and argument structure.

### Release 5: Tacitus curriculum pack

Import:

- *Agricola* 30-32, the speech of Calgacus;
- *Annals* I.1-15, the transition from Augustus to Tiberius; and
- *Annals* XIV.1-13, the death of Agrippina.

This combination exposes students to Tacitean historiography, speeches, political interpretation and compressed narrative syntax.

### Release 6: Sophocles completion

Replace the current opening-only presentation of *Oedipus Tyrannus* with the complete play, preserving the stable book ID `sophocles-oedipus`. Keep the current visible lines 1-77 as reader chapter index 0, then append units divided by dramatic episode, stasimon and major speech while retaining standard line numbering and speaker ranges. The filtered preview is not a reader chapter and remains irrelevant to completion state. Existing completion therefore continues to refer to the same opening passage and needs no migration.

### Release 7: Homer completion

Expand `homer-iliad-1` from its current 100 reader lines to all 611 lines of *Iliad* I. Keep lines 1-100 as reader chapter index 0 and append scene-sized units of 80-130 lines. Retain standard line numbering. The filtered five-line preview remains irrelevant to completion state, so existing progress needs no migration.

### Release 8: depth expansion

Add the following after the required-author and genre gaps are closed:

- Vergil, *Aeneid* II.199-249 (Laocoon and the horse), IV.296-392 and IV.642-705 (Dido and Aeneas; Dido's death), and VI.679-892 (Anchises and Rome's future);
- Plato, *Apology* in full, divided by the speech's principal argumentative stages.

These are depth additions, not prerequisites for curriculum coverage, because the app already contains a complete book of Vergil and a complete Platonic dialogue.

## Curriculum metadata

Book manifests may carry an optional `curriculum` array. The importer validates it and copies it into `generated/imported-books.js`.

Each entry has this shape:

```json
{
  "network": "kov",
  "stage": "second-degree",
  "status": "required-author",
  "genres": ["historiography"]
}
```

Allowed values are:

- `network`: `kov` or `go`;
- `stage`: `second-degree` or `third-degree`;
- `status`: `required-author`, `required-genre-example` or `supporting-text`; and
- `genres`: one or more controlled labels from `historiography`, `epic`, `tragedy`, `rhetoric`, `philosophy`, `myth`, `letter`, `didactic` and `post-classical`.

The metadata describes the curricular relevance of the author or genre. It does not assert that the selected passage is prescribed by a school. The UI must render the distinction in Dutch:

- `Verplichte auteur` for `required-author`;
- `Voorbeeld voor verplicht genre` for `required-genre-example`; and
- `Aanvullende tekst` for `supporting-text`.

Legacy books in `data.js` receive the same optional property directly. Non-curricular works remain valid without it.

## School roadmap

The existing author library remains the default general-purpose collection. A second library view, `Schoolroute`, organises only curriculum-tagged books.

The roadmap provides three compact selectors:

- school profile: `Beide`, `Sint-Lievens · Katholiek` or `KLA · GO!`;
- stage: `2de graad` or `3de graad`; and
- language: `Latijn` or `Grieks`.

The default profile is `Beide`. The selected profile is stored locally but is not added to the shared progress Gist. Changing profile filters presentation only; it never changes completion data.

Each roadmap card shows:

- author and work;
- curriculum status;
- relevant genres;
- stage and language; and
- the existing completion progress.

Selecting a card follows the existing book and unit navigation. No new reading mode is introduced.

## Data flow

1. A work's manifest contains text files, translations, source credits, chapters and optional curriculum metadata.
2. `scripts/import_texts.py` validates the manifest, three-way original/English/Dutch line alignment for curriculum packs, speaker ranges, controlled curriculum values and duplicate IDs.
3. The importer writes `generated/imported-books.js` with the metadata intact.
4. `app.js` combines legacy and imported books as it does now.
5. The author library groups all books by author; `Schoolroute` filters the same in-memory book objects by curriculum metadata.
6. Opening a work uses the existing reader, dictionary lookup, unit completion and Gist merge paths.

The dictionary data path is unchanged and remains independent of curriculum metadata.

## Error handling and release gates

The importer fails with a specific message when curriculum metadata has an unknown network, stage, status or genre. A work without curriculum metadata remains valid and simply does not appear in `Schoolroute`.

Every content release must satisfy the full `new-classic-text` checklist, including:

- exact source/translation line counts;
- exact Greek treebank token alignment where applicable;
- no unresolved Greek merged tokens or empty lemmas;
- non-empty English and Dutch Greek lemma glosses;
- reviewed Latin overrides only when Whitaker's Words cannot analyse a form;
- 100% dictionary coverage for the new book;
- successful `make import && make check` and all JavaScript syntax checks;
- spot-reading across several passages and chapter boundaries;
- asset query-version bumps and a service-worker cache increment; and
- no commit or push if a hard gate fails.

## Testing

The curriculum-metadata change adds focused automated tests around `scripts/import_texts.py`:

- a valid curriculum entry is preserved in generated output;
- every invalid controlled value is rejected with a clear error;
- missing curriculum metadata remains backward compatible;
- non-curricular books do not enter the roadmap filter;
- each profile/stage/language combination returns the expected tagged fixture books; and
- existing completion state remains keyed solely by stable book ID and chapter index.

Each content release also uses the existing end-to-end coverage report. For expanded legacy books, tests verify stable IDs, preservation of the visible opening as chapter index 0 and append-only placement of new units.

## Explicit non-goals

This programme does not:

- replace or duplicate the existing dictionaries;
- create simplified Latin or Greek versions of upper-school texts;
- claim that a selected passage is a future classroom assignment;
- reproduce copyrighted modern school commentaries or translations;
- add quizzes, spaced repetition or a grammar course in this phase;
- remove the broader philosophical, medieval, Renaissance or Old English corpus; or
- postpone usable releases until the whole programme is complete.

## Success criteria

The programme is successful when:

1. every KOV named author and every relevant GO! required genre has a substantial authentic passage bank;
2. each new Greek or Latin work has 100% word-click coverage through the existing dictionaries;
3. every Greek lemma added by the programme has both English and Dutch glosses;
4. Alex can select either likely school profile and see an honest roadmap of relevant works;
5. existing reader behaviour and completion data continue to work; and
6. actual assigned passages can later be added through the same `new-classic-text` workflow without another architecture change.
