# Koine Collection and Syntax Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the four canonical Gospels under one Koine New Testament catalogue entry and make agreement syntax highlighting readable in dark and light themes.

**Architecture:** Preserve each Gospel as an independent book and add optional collection metadata at the import boundary. Refactor the catalogue's pure grouping operations to select a collection when present and an author otherwise, while leaving reading progress keyed by book ID. Make the existing deterministic syntax palette resolve through theme-level CSS variables instead of embedding light-only colours.

**Tech Stack:** Vanilla JavaScript and CSS, Python 3 import pipeline, Node.js built-in test runner, Python `unittest`, static GitHub Pages/service worker.

---

### Task 1: Preserve Gospel collection metadata through the import pipeline

**Files:**
- Create: `tests/test_import_texts.py`
- Modify: `scripts/import_texts.py:176-186`
- Modify: `imports/matthew-koine/manifest.json:1-8`
- Modify: `imports/mark-koine/manifest.json:1-8`
- Modify: `imports/luke-koine/manifest.json:1-8`
- Modify: `imports/john-koine/manifest.json:1-8`
- Regenerate: `generated/imported-books.js`

- [ ] **Step 1: Write the failing importer tests**

Create `tests/test_import_texts.py` with tests that construct a minimal import and assert optional collection metadata survives, then verify the four real Gospel manifests agree:

```python
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts import import_texts


class ImportTextCollectionTests(unittest.TestCase):
    def test_load_import_preserves_optional_collection(self) -> None:
        with tempfile.TemporaryDirectory() as temp:
            import_dir = Path(temp)
            (import_dir / "greek.txt").write_text("λόγος\n", encoding="utf-8")
            (import_dir / "english.txt").write_text("word\n", encoding="utf-8")
            (import_dir / "manifest.json").write_text(
                json.dumps(
                    {
                        "id": "sample",
                        "title": "Sample",
                        "author": "Writer",
                        "collection": "Shared Corpus",
                        "year": 1,
                        "lang": "greek",
                        "chapters": [
                            {
                                "title": "One",
                                "original": "greek.txt",
                                "english": "english.txt",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )

            book, _ = import_texts.load_import(import_dir)

            self.assertEqual(book["collection"], "Shared Corpus")

    def test_all_four_gospels_share_the_koine_new_testament_collection(self) -> None:
        gospel_ids = ("matthew-koine", "mark-koine", "luke-koine", "john-koine")
        manifests = [
            json.loads(
                (import_texts.IMPORTS_DIR / gospel_id / "manifest.json").read_text(
                    encoding="utf-8"
                )
            )
            for gospel_id in gospel_ids
        ]

        self.assertEqual(
            {manifest.get("collection") for manifest in manifests},
            {"Koine New Testament"},
        )


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests.test_import_texts -v
```

Expected: two failures—`collection` is absent from the loaded book and absent from all four Gospel manifests.

- [ ] **Step 3: Add collection metadata to the importer and Gospel manifests**

In `scripts/import_texts.py`, copy optional book metadata with one shared loop:

```python
    for key in ("shortTitle", "collection"):
        if manifest.get(key):
            book[key] = manifest[key]
```

Replace the existing one-off `shortTitle` block. In each of the four Gospel manifests, add this property directly after `author`:

```json
  "collection": "Koine New Testament",
```

- [ ] **Step 4: Run the importer tests and verify GREEN**

Run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests.test_import_texts -v
```

Expected: both tests pass.

- [ ] **Step 5: Regenerate the imported-book bundle and verify its metadata**

Run:

```bash
python3 scripts/import_texts.py
python3 scripts/import_texts.py --check
rg -n -A6 '"id": "(matthew|mark|luke|john)-koine"' generated/imported-books.js
```

Expected: generation succeeds, the check reports `Generated import bundle is up to date.`, and each Gospel record contains `"collection": "Koine New Testament"`.

- [ ] **Step 6: Commit the import-boundary change**

```bash
git add tests/test_import_texts.py scripts/import_texts.py imports/matthew-koine/manifest.json imports/mark-koine/manifest.json imports/luke-koine/manifest.json imports/john-koine/manifest.json generated/imported-books.js
git commit -m "feat: identify Gospels as a Koine collection"
```

### Task 2: Group the top-level catalogue by collection or author

**Files:**
- Create: `tests/test_library_grouping.mjs`
- Modify: `app.js:1-70,144-151,250-440`

- [ ] **Step 1: Write failing tests for catalogue grouping**

Create `tests/test_library_grouping.mjs`. Load `app.js` into the same minimal VM style used by `tests/test_progress_restore.mjs`, then call the wished-for pure API:

```javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function runtime() {
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {}, contains() { return false; } } },
  };
  const context = {
    Blob,
    URL,
    console,
    document,
    fetch: async () => ({ ok: true }),
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return context;
}

const books = [
  { id: "matthew", author: "Matthaeus", collection: "Koine New Testament", lang: "greek", chapters: [{}, {}] },
  { id: "mark", author: "Marcus", collection: "Koine New Testament", lang: "greek", chapters: [{}] },
  { id: "luke", author: "Lucas", collection: "Koine New Testament", lang: "greek", chapters: [{}, {}, {}] },
  { id: "john", author: "Ioannes", collection: "Koine New Testament", lang: "greek", chapters: [{}, {}] },
  { id: "aeneid", author: "Vergilius", lang: "latin", chapters: [{}] },
  { id: "eclogues", author: "Vergilius", lang: "latin", chapters: [{}, {}] },
];

test("four Gospel authors form one collection group", () => {
  const context = runtime();
  context.__books = books;
  const groups = JSON.parse(
    vm.runInContext("JSON.stringify(libraryGroups(__books))", context)
  );

  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, "collection:Koine New Testament");
  assert.equal(groups[0].label, "Koine New Testament");
  assert.deepEqual(groups[0].books.map((book) => book.id), ["matthew", "mark", "luke", "john"]);
});

test("books without a collection remain grouped by author", () => {
  const context = runtime();
  context.__books = books;
  const group = JSON.parse(
    vm.runInContext(
      "JSON.stringify(libraryGroups(__books).find((item) => item.key === 'author:Vergilius'))",
      context
    )
  );

  assert.equal(group.label, "Vergilius");
  assert.deepEqual(group.books.map((book) => book.id), ["aeneid", "eclogues"]);
});

test("group summaries count works, sections, and languages", () => {
  const context = runtime();
  context.__books = books;

  assert.equal(
    vm.runInContext("libraryGroupSummary(libraryGroups(__books)[0])", context),
    "4 texts · Greek · 8 sections"
  );
});
```

- [ ] **Step 2: Run the grouping tests and verify RED**

Run:

```bash
node --test tests/test_library_grouping.mjs
```

Expected: failures reporting that `libraryGroups` is not defined.

- [ ] **Step 3: Implement pure catalogue grouping helpers**

Add before the library rendering functions in `app.js`:

```javascript
function libraryGroupKey(book) {
  return book.collection ? `collection:${book.collection}` : `author:${book.author}`;
}

function libraryGroups(books) {
  const groups = new Map();
  books.forEach((book) => {
    const key = libraryGroupKey(book);
    if (!groups.has(key)) {
      groups.set(key, { key, label: book.collection || book.author, books: [] });
    }
    groups.get(key).books.push(book);
  });
  return [...groups.values()];
}

function libraryGroupSummary(group) {
  const languages = [...new Set(group.books.map((book) =>
    book.lang === "latin" ? "Latin" : book.lang === "greek" ? "Greek" : "Old English"
  ))];
  const sections = group.books.reduce((total, book) => total + book.chapters.length, 0);
  return `${group.books.length} ${group.books.length === 1 ? "text" : "texts"} · ${languages.join(" · ")} · ${sections} ${sections === 1 ? "section" : "sections"}`;
}
```

- [ ] **Step 4: Run the grouping tests and verify GREEN**

Run:

```bash
node --test tests/test_library_grouping.mjs
```

Expected: all three tests pass.

- [ ] **Step 5: Refactor catalogue state and navigation to use group keys**

In the `state` object, replace this property:

```javascript
libraryAuthor: null,
```

with:

```javascript
libraryGroupKey: null,
```

Replace the library-mode branch of `updateHeaderContext` with:

```javascript
  if (!document.body.classList.contains("reader-mode")) {
    const group = selectedLibraryGroup();
    primary.textContent = group?.label || "Library";
    secondary.textContent = group ? libraryGroupSummary(group) : "Latin · Greek";
    return;
  }
```

Update the DOMContentLoaded back-button handler to use `state.libraryGroupKey`
and return a reader to the group containing its current book:

```javascript
    backBtn.addEventListener("click", () => {
      const inLibrary = document.getElementById("app-workspace").hasAttribute("hidden");
      if (inLibrary && state.overviewBookIndex !== null) {
        state.overviewBookIndex = null;
        renderLibrary();
      } else if (inLibrary && state.libraryGroupKey) {
        state.libraryGroupKey = null;
        renderLibrary();
      } else {
        const book = state.books[state.currentBookIndex];
        if (book && book.chapters.length > 1) {
          state.overviewBookIndex = state.currentBookIndex;
        } else {
          state.overviewBookIndex = null;
        }
        showLibrary(book ? libraryGroupKey(book) : null);
      }
    });
```

Replace `showLibrary` and add `selectedLibraryGroup` immediately before it:

```javascript
function selectedLibraryGroup() {
  return libraryGroups(state.books).find((group) => group.key === state.libraryGroupKey) || null;
}

function showLibrary(groupKey = null) {
  state.libraryGroupKey = groupKey;
  const splash = document.getElementById("splash-screen");
  const workspace = document.getElementById("app-workspace");
  if (splash) splash.removeAttribute("hidden");
  if (workspace) workspace.setAttribute("hidden", "");
  document.body.classList.remove("reader-mode");
  showFocusHeader(false);

  if (state.currentBookIndex >= 0 && state.currentBookIndex < state.books.length) {
    saveProgressToStorage();
  }

  renderLibrary();
}
```

Replace `renderLibrary` completely so it renders the selected group and shows
an author label on collection members:

```javascript
function renderLibrary() {
  const grid = document.getElementById("book-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (state.overviewBookIndex !== null) {
    renderBookOverview(grid, state.overviewBookIndex);
    return;
  }

  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    backBtn.style.display = state.libraryGroupKey ? "block" : "none";
    backBtn.textContent = "← Library";
  }
  updateHeaderContext();

  const group = selectedLibraryGroup();
  if (!group) {
    renderGroupLibrary(grid);
    return;
  }

  const heading = document.createElement("div");
  heading.className = "catalogue-heading";
  heading.innerHTML = `<h1>${group.label}</h1><p>${libraryGroupSummary(group)}</p>`;
  grid.appendChild(heading);

  group.books.forEach((book) => {
    const idx = state.books.indexOf(book);
    const card = document.createElement("div");
    card.className = "book-card";

    const totalCh = book.chapters.length;
    const completedCh = completedChapterSet(book).size;
    const pct = Math.round((completedCh / totalCh) * 100);
    const isDone = completedCh === totalCh;
    const langIcon = book.lang === "latin" ? "\u{1F4DC}" : book.lang === "greek" ? "\u{1F525}" : "\u{1F4D6}";
    const langLabel = book.lang === "latin" ? "Latijn" : book.lang === "greek" ? "Grieks" : "Oudengels";
    const displayTitle = workDisplayTitle(book);
    const shortTitle = book.shortTitle ? `<p class="book-short-title">${book.shortTitle}</p>` : "";
    const authorMeta = book.collection ? `<span>${book.author}</span>` : "";

    if (isDone) card.classList.add("book-done");
    card.innerHTML = `
      <div class="book-icon">${isDone ? "\u{1F3C6}" : langIcon}</div>
      <h3>${displayTitle}</h3>
      ${shortTitle}
      <div class="book-meta">
        ${authorMeta}
        <span>${book.year < 0 ? Math.abs(book.year) + " v.Chr." : book.year}</span>
        <span>· ${completedCh}/${totalCh} ${totalCh !== 1 ? "delen" : "deel"}</span>
      </div>
      <div class="book-progress">
        <div class="progress-track">
          <div class="progress-bar" style="width: ${pct}%"></div>
        </div>
        <span class="progress-text">${isDone ? "✓" : pct + "%"}</span>
      </div>
      <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">
        ${langLabel}
      </div>
    `;

    card.addEventListener("click", () => {
      if (book.chapters.length > 1) {
        state.overviewBookIndex = idx;
        renderLibrary();
      } else {
        selectBook(idx, 0);
      }
    });
    grid.appendChild(card);
  });
}
```

Replace `renderAuthorLibrary` with this collection-aware top-level renderer and
delete `authorSummary`:

```javascript
function renderGroupLibrary(grid) {
  libraryGroups(state.books).forEach((group) => {
    const card = document.createElement("div");
    card.className = "book-card author-card";
    const languages = [...new Set(group.books.map((book) =>
      book.lang === "latin" ? "Latijn" : book.lang === "greek" ? "Grieks" : "Oudengels"
    ))];
    const sections = group.books.reduce((total, book) => total + book.chapters.length, 0);

    card.innerHTML = `
      <div class="book-icon">${group.books[0].lang === "latin" ? "\u{1F4DC}" : group.books[0].lang === "greek" ? "\u{1F525}" : "\u{1F4D6}"}</div>
      <h3>${group.label}</h3>
      <p class="author-work-count">${group.books.length} ${group.books.length === 1 ? "text" : "texts"}</p>
      <div class="book-meta"><span>${languages.join(" · ")}</span><span>· ${sections} ${sections === 1 ? "section" : "sections"}</span></div>
    `;
    card.addEventListener("click", () => {
      state.libraryGroupKey = group.key;
      renderLibrary();
    });
    grid.appendChild(card);
  });
}
```

Finally, change the back-button block in `renderBookOverview` to:

```javascript
  const backBtn = document.getElementById("back-btn");
  if (backBtn) {
    const group = libraryGroups(state.books).find((item) => item.key === libraryGroupKey(book));
    backBtn.style.display = "block";
    backBtn.textContent = `← ${group?.label || book.author}`;
  }
```

- [ ] **Step 6: Run catalogue and progress tests**

Run:

```bash
node --test tests/test_library_grouping.mjs tests/test_progress_restore.mjs
node --check app.js
```

Expected: all tests pass and the syntax check prints no errors.

- [ ] **Step 7: Commit the catalogue grouping change**

```bash
git add app.js tests/test_library_grouping.mjs
git commit -m "feat: group the Gospels as one catalogue collection"
```

### Task 3: Make agreement highlighting theme-aware

**Files:**
- Create: `tests/test_syntax_contrast.mjs`
- Modify: `app.js:882-905`
- Modify: `styles.css:1-48,507-513`

- [ ] **Step 1: Write failing syntax palette tests**

Create `tests/test_syntax_contrast.mjs`:

```javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

function runtime() {
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {}, contains() { return false; } } },
  };
  const context = {
    Blob,
    URL,
    console,
    document,
    fetch: async () => ({ ok: true }),
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return context;
}

test("syntax groups resolve through a theme variable", () => {
  const context = runtime();
  const value = vm.runInContext("syntaxPastel('odyssey-group')", context);
  assert.match(value, /^var\(--syntax-pastel-[0-5]\)$/);
});

test("dark theme syntax backgrounds use translucent colours", () => {
  const darkRoot = styles.slice(styles.indexOf(":root {"), styles.indexOf(":root[data-theme=\"light\"]"));
  for (let index = 0; index < 6; index += 1) {
    assert.match(darkRoot, new RegExp(`--syntax-pastel-${index}:\\s*rgba\\(`));
  }
});

test("light theme supplies opaque pastel overrides", () => {
  const lightRoot = styles.slice(styles.indexOf(":root[data-theme=\"light\"]"), styles.indexOf("* {"));
  for (let index = 0; index < 6; index += 1) {
    assert.match(lightRoot, new RegExp(`--syntax-pastel-${index}:\\s*#[0-9a-f]{6}`, "i"));
  }
});
```

- [ ] **Step 2: Run syntax contrast tests and verify RED**

Run:

```bash
node --test tests/test_syntax_contrast.mjs
```

Expected: `syntaxPastel` returns a hex colour and the six CSS variables are absent.

- [ ] **Step 3: Add theme-level syntax palette variables**

Add to the dark `:root` block in `styles.css`:

```css
  --syntax-pastel-0: rgba(96, 165, 250, 0.20);
  --syntax-pastel-1: rgba(74, 222, 128, 0.20);
  --syntax-pastel-2: rgba(250, 204, 21, 0.20);
  --syntax-pastel-3: rgba(244, 114, 182, 0.20);
  --syntax-pastel-4: rgba(167, 139, 250, 0.20);
  --syntax-pastel-5: rgba(34, 211, 238, 0.20);
```

Add the current light palette to `:root[data-theme="light"]`:

```css
  --syntax-pastel-0: #dbeafe;
  --syntax-pastel-1: #dcfce7;
  --syntax-pastel-2: #fef3c7;
  --syntax-pastel-3: #fce7f3;
  --syntax-pastel-4: #ede9fe;
  --syntax-pastel-5: #cffafe;
```

- [ ] **Step 4: Resolve deterministic syntax groups through CSS variables**

Change `syntaxPastel` in `app.js` to return the relevant variable:

```javascript
function syntaxPastel(group) {
  let hash = 0;
  for (const char of String(group || "")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `var(--syntax-pastel-${hash % 6})`;
}
```

Keep the existing `--syntax-pastel:${syntaxPastel(...)}` inline assignment and `.dict-word[data-syntax-agreement]` rule unchanged; it will now respond immediately to theme changes.

- [ ] **Step 5: Run syntax tests and verify GREEN**

Run:

```bash
node --test tests/test_syntax_contrast.mjs
node --check app.js
```

Expected: all three tests pass and JavaScript syntax is valid.

- [ ] **Step 6: Commit the contrast fix**

```bash
git add app.js styles.css tests/test_syntax_contrast.mjs
git commit -m "fix: preserve syntax contrast in dark mode"
```

### Task 4: Refresh static deployment caches and verify the complete build

**Files:**
- Modify: `index.html:10,86-92`
- Modify: `sw.js:1`

- [ ] **Step 1: Write the deployment cache assertions**

Append to `tests/test_syntax_contrast.mjs`:

```javascript
const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const serviceWorker = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");

test("deployment versions refresh the changed assets", () => {
  assert.match(indexHtml, /styles\.css\?v=20260802-1/);
  assert.match(indexHtml, /app\.js\?v=20260802-1/);
  assert.match(indexHtml, /generated\/imported-books\.js\?v=20260802-1/);
  assert.match(serviceWorker, /const CACHE = "classics-reader-v26"/);
});
```

- [ ] **Step 2: Run the deployment assertion and verify RED**

Run:

```bash
node --test tests/test_syntax_contrast.mjs
```

Expected: the new deployment-version test fails on the old query strings/cache name while the three syntax tests pass.

- [ ] **Step 3: Bump asset and service-worker cache versions**

In `index.html`, set these exact asset URLs:

```html
<link rel="stylesheet" href="styles.css?v=20260802-1">
<script src="generated/imported-books.js?v=20260802-1"></script>
<script src="app.js?v=20260802-1"></script>
```

In `sw.js`, change the first line to:

```javascript
const CACHE = "classics-reader-v26";
```

- [ ] **Step 4: Run the complete automated verification**

Run:

```bash
make check
node --test tests/test_library_grouping.mjs tests/test_syntax_contrast.mjs tests/test_progress_restore.mjs
git diff --check
```

Expected: importer consistency, all Python and Node tests, JavaScript syntax checks, and whitespace validation pass without errors.

- [ ] **Step 5: Serve and verify the interface in both themes**

Run:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` and verify:

1. The top-level catalogue contains one `Koine New Testament` card reporting four texts and 89 sections.
2. Opening it shows Matthew, Mark, Luke, and John as separate Gospel work cards with their author names.
3. Opening and backing out of a Gospel returns first to its chapter grid, then to `Koine New Testament`, then to the complete catalogue.
4. Odyssey I agreement groups remain visibly tinted in dark mode without obscuring the Greek.
5. Switching to light mode preserves distinct, legible agreement tints.

Stop the local HTTP server after verification.

- [ ] **Step 6: Commit deployment metadata**

```bash
git add index.html sw.js tests/test_syntax_contrast.mjs
git commit -m "chore: refresh Classics Reader asset caches"
```

- [ ] **Step 7: Review final scope**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: the working tree is clean and the recent commits contain only the approved Gospel grouping, syntax contrast, tests, deployment metadata, and their design/plan documentation.
