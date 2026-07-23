# Gospel of Mark Koine Reader Implementation Plan

**Goal:** Add and deploy the complete standard-text Gospel of Mark in Koine Greek.

### 1. Pin and extract sources

- Create `imports/mark-koine/manifest.json` and 16 Greek/English chapter files.
- Create a reproducible extractor using pinned Perseus and PROIEL revisions.
- Extract all 16 chapters and every verse represented in the standard PROIEL text; assert aligned line counts.

### 2. Build Greek dictionary coverage

- Convert the selected PROIEL token stream to the repository treebank format.
- Run the existing Greek dictionary builder and inspect unresolved or merged analyses.
- Add audited English and Dutch glosses for every new lemma, regenerate the accumulated dictionary, and require 100% coverage.

### 3. Validate and release

- Run `make import && make check`, syntax checks, and `git diff --check`.
- Bump imported-content and service-worker versions.
- Commit, push `main`, confirm the GitHub Pages build, and verify the live Mark bundle and representative dictionary entries.
