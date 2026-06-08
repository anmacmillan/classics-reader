# Classics Reader

A bilingual Latin and Ancient Greek reading/revision tool.

## Add A New Text

The fast import workflow is documented in [`imports/README.md`](imports/README.md).

In summary:

1. Copy `imports/_example-greek/` to a new folder without the leading `_`.
2. Replace `greek.txt` and `english.txt`, keeping one translated line per source
   line.
3. Edit `manifest.json`.
4. Optionally add an aligned `dutch.txt`.
5. Run:

```bash
make import
make dictionary
make check
```

Commit the import folder, `generated/imported-books.js`, and for Latin imports
`generated/imported-latin-dictionary.js`. No manual editing of the large
`data.js` file is required.
