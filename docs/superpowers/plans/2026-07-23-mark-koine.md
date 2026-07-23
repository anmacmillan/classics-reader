# Gospel of Mark Koine Reader Implementation Plan

**Goal:** Add and deploy a compact, fully dictionary-covered Gospel of Mark Koine Greek selection.

### 1. Pin and extract sources

- Create `imports/mark-koine/manifest.json` and 15 Greek/English unit files.
- Create a reproducible extractor using pinned Perseus and PROIEL revisions.
- Extract verse-referenced narrative passages and assert aligned line counts.

### 2. Build Greek dictionary coverage

- Convert the selected PROIEL token stream to the repository treebank format.
- Run the existing Greek dictionary builder and inspect unresolved or merged analyses.
- Add audited English and Dutch glosses for every new lemma, regenerate the accumulated dictionary, and require 100% coverage.

### 3. Validate and release

- Run `make import && make check`, syntax checks, and `git diff --check`.
- Bump imported-content and service-worker versions.
- Commit, push `main`, confirm the GitHub Pages build, and verify the live Mark bundle and representative dictionary entries.
