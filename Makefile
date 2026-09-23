.PHONY: import dictionary dutch-dictionary danish-dictionary check

import:
	python3 scripts/import_texts.py

dictionary:
	npm run latin-dictionary

dutch-dictionary:
	python3 scripts/build_dutch_dictionaries.py

danish-dictionary:
	python3 scripts/build_danish_dictionary.py

check:
	python3 scripts/import_texts.py --check
	PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -v
	node --test tests/*.mjs
	node --check pagination.js
	node --check app.js
	node --check data.js
	node --check dictionary.js
	node --check generated/imported-books.js
	node --check generated/imported-latin-dictionary.js
	node --check generated/imported-greek-dictionary.js
	node --check generated/imported-old-english-dictionary.js
	node --check generated/imported-middle-dutch-dictionary.js
	node --check generated/imported-dutch-dictionary.js
	node --check generated/imported-danish-dictionary.js
