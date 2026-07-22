.PHONY: import dictionary check

import:
	python3 scripts/import_texts.py

dictionary:
	npm run latin-dictionary

check:
	python3 scripts/import_texts.py --check
	node --test tests/test_progress_restore.mjs
	node --check app.js
	node --check data.js
	node --check dictionary.js
	node --check generated/imported-books.js
	node --check generated/imported-latin-dictionary.js
	node --check generated/imported-greek-dictionary.js
