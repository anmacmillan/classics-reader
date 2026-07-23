# Catullus *Carmina* Reader Design

Add the complete surviving Catullus collection (115 transmitted poem units, including 14a) as a Latin poetry reader, with one poem per unit, aligned Perseus English reference text, and the existing Whitaker’s Words Latin morphology/dictionary pipeline. Poems 18–20 are not transmitted in the pinned Latin edition and are not invented.

The extractor pins the Perseus revision and refuses any Latin/English poem line-count mismatch. The finished import must pass `make import && make check` with full Latin dictionary coverage.
