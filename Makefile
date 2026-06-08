.PHONY: import check

import:
	python3 scripts/import_texts.py

check:
	python3 scripts/import_texts.py --check
	node --check app.js
	node --check data.js
	node --check dictionary.js
	node --check generated/imported-books.js
