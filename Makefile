.PHONY: import dictionary check

import:
	python3 scripts/import_texts.py

dictionary:
	npm run latin-dictionary

check:
	python3 scripts/import_texts.py --check
	PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -v
	node --test tests/*.mjs
	node --check app.js
	node --check data.js
	node --check dictionary.js
	node --check generated/imported-books.js
	node --check generated/imported-latin-dictionary.js
	node --check generated/imported-greek-dictionary.js
