# Matthew, Luke and John Koine Readers

## Goal

Complete the New Testament Gospel set in Classics Reader by adding the standard-text Greek Gospels according to Matthew, Luke and John.

## Scope

- Imports: `matthew-koine`, `luke-koine`, and `john-koine`.
- One reader unit per chapter, one Greek verse per line, and aligned World English Bible reference text.
- PROIEL Greek New Testament morphology supplies dictionary-linked analyses; all new lemmas receive English and Dutch glosses.
- Textual numbering follows the standard PROIEL/Perseus verse keys; unattested critical-text verse numbers are not fabricated.

## Validation

Each source stream is pinned to its Perseus/PROIEL revision, checked for zero alignment errors, and required to pass `make import && make check` with 100% Greek dictionary coverage before release.
