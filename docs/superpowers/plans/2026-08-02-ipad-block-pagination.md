# iPad Block Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add block-aware, Kindle-style pagination for tablet touchscreens, with side-tap chapter navigation and the existing continuous reader retained as a device-local option.

**Architecture:** Put deterministic pagination policy in a new dependency-free `pagination.js` library and keep DOM orchestration in `app.js`. The renderer will continue producing semantic chapter blocks, then a paged adapter will measure and move those existing nodes into discrete page containers while preserving a source-line anchor across layout changes. Device preference stays in local storage, while the semantic line anchor joins the existing cross-device reading-progress payload.

**Tech Stack:** Vanilla JavaScript and CSS, Node.js built-in test runner and VM, static HTML, service worker, GitHub Pages.

---

### Task 1: Build and test the pagination policy library

**Files:**
- Create: `pagination.js`
- Create: `tests/test_pagination_core.mjs`

- [ ] **Step 1: Write the failing core tests**

Create `tests/test_pagination_core.mjs`:

```javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../pagination.js", import.meta.url), "utf8");

function library() {
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "pagination.js" });
  return vm.runInContext("ReaderPagination", context);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    value(key) { return values.get(key); },
  };
}

test("tablet mode defaults to paged but respects a local continuous preference", () => {
  const api = library();
  assert.equal(api.TABLET_TOUCH_QUERY, "(any-pointer: coarse) and (min-width: 768px) and (max-width: 1366px)");
  assert.equal(api.effectiveMode({ tabletTouch: true, savedMode: null }), "paged");
  assert.equal(api.effectiveMode({ tabletTouch: true, savedMode: "continuous" }), "continuous");
  assert.equal(api.effectiveMode({ tabletTouch: false, savedMode: "paged" }), "continuous");
});

test("reader mode persistence accepts only known values", () => {
  const api = library();
  const local = storage();
  api.persistMode(local, "continuous");
  assert.equal(local.value(api.MODE_KEY), "continuous");
  assert.throws(() => api.persistMode(local, "columns"), /unknown reader mode/);
});

test("block packing keeps order and places an oversized block alone", () => {
  const api = library();
  const blocks = [{ id: "a", height: 40 }, { id: "b", height: 50 }, { id: "large", height: 140 }, { id: "c", height: 30 }];
  const pages = api.packBlocks(blocks, 100, (block) => block.height);
  assert.deepEqual(plain(pages.map((page) => page.map((block) => block.id))), [["a", "b"], ["large"], ["c"]]);
  assert.equal(pages[1][0], blocks[2]);
});

test("block packing rejects an unavailable page height", () => {
  assert.throws(() => library().packBlocks([], 0, () => 1), /page height/);
});

test("line anchors resolve to their containing page", () => {
  const pages = [[{ dataset: {} }], [{ dataset: { lineIndex: "0" } }, { dataset: { lineIndex: "1" } }], [{ dataset: { lineIndex: "2" } }]];
  assert.equal(library().pageIndexForLine(pages, 1), 1);
  assert.equal(library().pageIndexForLine(pages, 99), 0);
});

test("touch zones reserve the centre and use 28 percent edges", () => {
  const api = library();
  assert.equal(api.pageTurnDirection(27, 0, 100), -1);
  assert.equal(api.pageTurnDirection(28, 0, 100), 0);
  assert.equal(api.pageTurnDirection(72, 0, 100), 0);
  assert.equal(api.pageTurnDirection(73, 0, 100), 1);
});

test("interactive descendants suppress page turns", () => {
  const api = library();
  let selector = "";
  assert.equal(api.isInteractiveTarget({ closest(value) { selector = value; return {}; } }), true);
  assert.match(selector, /\.dict-word/);
  assert.match(selector, /button/);
  assert.match(selector, /\.word-tooltip/);
  assert.equal(api.isInteractiveTarget({ closest: () => null }), false);
});

test("navigation decisions cross chapters but stop at work boundaries", () => {
  const api = library();
  assert.deepEqual(plain(api.navigationDecision({ direction: 1, pageIndex: 0, totalPages: 3, chapterIndex: 1, chapterCount: 4 })), { type: "page", pageIndex: 1 });
  assert.deepEqual(plain(api.navigationDecision({ direction: 1, pageIndex: 2, totalPages: 3, chapterIndex: 1, chapterCount: 4 })), { type: "chapter", chapterIndex: 2, edge: "first" });
  assert.deepEqual(plain(api.navigationDecision({ direction: -1, pageIndex: 0, totalPages: 3, chapterIndex: 1, chapterCount: 4 })), { type: "chapter", chapterIndex: 0, edge: "last" });
  assert.deepEqual(plain(api.navigationDecision({ direction: -1, pageIndex: 0, totalPages: 3, chapterIndex: 0, chapterCount: 4 })), { type: "none" });
  assert.deepEqual(plain(api.navigationDecision({ direction: 1, pageIndex: 2, totalPages: 3, chapterIndex: 3, chapterCount: 4 })), { type: "none" });
});
```

- [ ] **Step 2: Run the core tests and verify RED**

Run:

```bash
node --test tests/test_pagination_core.mjs
```

Expected: failure because `pagination.js` does not exist.

- [ ] **Step 3: Implement the dependency-free policy library**

Create `pagination.js`:

```javascript
const ReaderPagination = (() => {
  const MODE_KEY = "classics_reader_mode_v1";
  const TABLET_TOUCH_QUERY = "(any-pointer: coarse) and (min-width: 768px) and (max-width: 1366px)";
  const INTERACTIVE_SELECTOR = [
    "a", "button", "select", "input", "textarea", "[role='button']",
    ".dict-word", ".word-tooltip", ".vocabulary-panel"
  ].join(", ");

  function savedMode(storage) {
    const value = storage.getItem(MODE_KEY);
    return value === "paged" || value === "continuous" ? value : null;
  }

  function effectiveMode({ tabletTouch, savedMode: preference }) {
    return tabletTouch ? (preference || "paged") : "continuous";
  }

  function persistMode(storage, mode) {
    if (mode !== "paged" && mode !== "continuous") {
      throw new RangeError(`unknown reader mode: ${mode}`);
    }
    storage.setItem(MODE_KEY, mode);
  }

  function packBlocks(blocks, pageHeight, measure) {
    if (!Number.isFinite(pageHeight) || pageHeight <= 0) {
      throw new RangeError("page height must be positive");
    }
    const pages = [];
    let page = [];
    let used = 0;
    for (const block of blocks) {
      const height = Number(measure(block));
      if (!Number.isFinite(height) || height < 0) throw new RangeError("block height must be non-negative");
      if (page.length && used + height > pageHeight) {
        pages.push(page);
        page = [];
        used = 0;
      }
      page.push(block);
      used += height;
      if (height > pageHeight) {
        pages.push(page);
        page = [];
        used = 0;
      }
    }
    if (page.length || !pages.length) pages.push(page);
    return pages;
  }

  function pageIndexForLine(pages, lineIndex) {
    if (!Number.isInteger(lineIndex) || lineIndex < 0) return 0;
    const index = pages.findIndex((page) => page.some((block) => Number(block.dataset?.lineIndex) === lineIndex));
    return index >= 0 ? index : 0;
  }

  function pageTurnDirection(clientX, left, width) {
    if (!Number.isFinite(width) || width <= 0) return 0;
    const ratio = (clientX - left) / width;
    return ratio < 0.28 ? -1 : ratio > 0.72 ? 1 : 0;
  }

  function isInteractiveTarget(target) {
    return Boolean(target?.closest?.(INTERACTIVE_SELECTOR));
  }

  function navigationDecision({ direction, pageIndex, totalPages, chapterIndex, chapterCount }) {
    const targetPage = pageIndex + direction;
    if (targetPage >= 0 && targetPage < totalPages) return { type: "page", pageIndex: targetPage };
    const targetChapter = chapterIndex + direction;
    if (targetChapter < 0 || targetChapter >= chapterCount) return { type: "none" };
    return { type: "chapter", chapterIndex: targetChapter, edge: direction > 0 ? "first" : "last" };
  }

  return Object.freeze({
    MODE_KEY,
    TABLET_TOUCH_QUERY,
    savedMode,
    effectiveMode,
    persistMode,
    packBlocks,
    pageIndexForLine,
    pageTurnDirection,
    isInteractiveTarget,
    navigationDecision,
  });
})();
```

- [ ] **Step 4: Run the core tests and verify GREEN**

Run `node --test tests/test_pagination_core.mjs`.

Expected: 8 tests pass.

- [ ] **Step 5: Commit the core**

```bash
git add pagination.js tests/test_pagination_core.mjs
git commit -m "feat: add reader pagination policy"
```

### Task 2: Add the tablet mode control and semantic chapter blocks

**Files:**
- Create: `tests/test_pagination_ui.mjs`
- Modify: `index.html:15-85`
- Modify: `app.js:1-115,500-640`
- Modify: `styles.css:85-150,330-490`

- [ ] **Step 1: Write failing UI structure tests**

Create `tests/test_pagination_ui.mjs`:

```javascript
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("pagination policy loads before the app and the tablet control is accessible", () => {
  assert.ok(html.indexOf("pagination.js?v=20260802-2") < html.indexOf("app.js?v="));
  assert.match(html, /id="reading-mode-btn"[^>]+aria-label="Reading layout"[^>]+aria-pressed="true"[^>]+hidden/);
});

test("reader state includes device-local mode and semantic line position", () => {
  assert.match(app, /currentLineIndex:\s*0/);
  assert.match(app, /readingMode:\s*"continuous"/);
  assert.match(app, /function setupReadingMode\(/);
});

test("chapter rendering marks block boundaries and transition metadata", () => {
  assert.match(app, /chapter-intro/);
  assert.match(app, /chapter-progress/);
  assert.match(app, /row\.dataset\.lineIndex\s*=\s*String\(lineIdx\)/);
});

test("tablet mode styles expose a compact header control and chapter banner", () => {
  assert.match(styles, /\.header-reading-mode/);
  assert.match(styles, /body\.paged-reader \.chapter-progress/);
  assert.match(styles, /body\.tablet-touch-reader \.header-context/);
  assert.match(styles, /\.word-tooltip\.hidden\s*\{[^}]*pointer-events:\s*none/s);
});
```

- [ ] **Step 2: Run the UI tests and verify RED**

Run `node --test tests/test_pagination_ui.mjs`.

Expected: four failures for the absent script, control, state, semantic markup, and styles.

- [ ] **Step 3: Add the mode script and header control**

In `index.html`, add beside the theme control:

```html
<button id="reading-mode-btn" class="btn header-reading-mode" aria-label="Reading layout" aria-pressed="true" hidden>Paged</button>
```

Load the policy immediately before `app.js`:

```html
<script src="pagination.js?v=20260802-2"></script>
<script src="app.js?v=20260802-1"></script>
```

- [ ] **Step 4: Add state and mode setup**

Add to `state`:

```javascript
currentLineIndex: 0,
readingMode: "continuous",
```

Call `setupReadingMode()` after `setupTheme()` during DOMContentLoaded. Add:

```javascript
let tabletTouchMedia;

function updateReadingModeControl(tabletTouch) {
  const button = document.getElementById("reading-mode-btn");
  if (!button) return;
  button.hidden = !tabletTouch;
  button.textContent = state.readingMode === "paged" ? "Paged" : "Continuous";
  button.setAttribute("aria-pressed", String(state.readingMode === "paged"));
}

function applyReadingMode(tabletTouch, anchorLineIndex = state.currentLineIndex) {
  state.readingMode = ReaderPagination.effectiveMode({
    tabletTouch,
    savedMode: ReaderPagination.savedMode(localStorage),
  });
  document.body.classList.toggle("tablet-touch-reader", tabletTouch);
  document.body.classList.toggle("paged-reader", state.readingMode === "paged");
  updateReadingModeControl(tabletTouch);
  if (document.body.classList.contains("reader-mode")) recalcPages({ anchorLineIndex });
}

function setupReadingMode() {
  tabletTouchMedia = window.matchMedia(ReaderPagination.TABLET_TOUCH_QUERY);
  applyReadingMode(tabletTouchMedia.matches);
  tabletTouchMedia.addEventListener?.("change", (event) => applyReadingMode(event.matches, captureReadingAnchor()));
  document.getElementById("reading-mode-btn")?.addEventListener("click", () => {
    const anchor = captureReadingAnchor();
    const next = state.readingMode === "paged" ? "continuous" : "paged";
    ReaderPagination.persistMode(localStorage, next);
    applyReadingMode(tabletTouchMedia.matches, anchor);
  });
  document.fonts?.ready?.then(() => {
    if (document.body.classList.contains("reader-mode")) recalcPages({ anchorLineIndex: captureReadingAnchor() });
  });
}
```

- [ ] **Step 5: Render a chapter intro and mark line blocks**

In `renderChapter`, replace the standalone title-row append with an intro container:

```javascript
  const intro = document.createElement("section");
  intro.className = "chapter-intro";
  const titleRow = document.createElement("div");
  titleRow.className = "chapter-row-title chapter-banner";
  titleRow.innerHTML = `
    <span class="chapter-kicker">${workDisplayTitle(book)}</span>
    <h2>${ch.title || "Tekst"}</h2>
    <span class="chapter-progress">Hoofdstuk ${state.currentChapterIndex + 1} van ${book.chapters.length}</span>
  `;
  intro.appendChild(titleRow);
```

Append the translation credit to `intro` rather than directly to `wrapper`, then append `intro` once after the credit block. Leave a missing-translation notice as its own wrapper child. When creating each row, add:

```javascript
row.dataset.lineIndex = String(lineIdx);
```

- [ ] **Step 6: Style the control and banner**

Add:

```css
.header-reading-mode {
  position: absolute;
  right: 164px;
}

.chapter-banner h2 {
  margin-bottom: 24px;
  font-family: var(--font-display);
  font-size: 1.6rem;
}

.chapter-kicker,
.chapter-progress {
  display: none;
}

body.paged-reader .chapter-kicker,
body.paged-reader .chapter-progress {
  display: block;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  color: var(--text-muted);
}

body.paged-reader .chapter-kicker {
  margin-bottom: 6px;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

body.paged-reader .chapter-progress {
  margin-top: -16px;
  margin-bottom: 24px;
}

body.tablet-touch-reader .header-context {
  max-width: 38vw;
}

.word-tooltip.hidden {
  pointer-events: none;
}
```

- [ ] **Step 7: Verify and commit the UI foundation**

Run:

```bash
node --test tests/test_pagination_ui.mjs tests/test_pagination_core.mjs
node --check pagination.js
node --check app.js
git diff --check
```

Expected: 12 tests pass and syntax/whitespace checks are clean.

```bash
git add index.html app.js styles.css tests/test_pagination_ui.mjs
git commit -m "feat: add tablet reader mode controls"
```

### Task 3: Compose measured blocks into discrete pages

**Files:**
- Modify: `app.js:740-825`
- Modify: `styles.css:330-425`
- Modify: `tests/test_pagination_ui.mjs`

- [ ] **Step 1: Add failing composition-contract tests**

Append:

```javascript
test("app defines page composition, unwrapping, and anchor restoration", () => {
  assert.match(app, /function unwrapReaderPages\(/);
  assert.match(app, /function composeReaderPages\(/);
  assert.match(app, /ReaderPagination\.packBlocks/);
  assert.match(app, /ReaderPagination\.pageIndexForLine/);
  assert.match(app, /function captureReadingAnchor\(/);
});

test("paged CSS shows one bounded page and permits oversized-page scrolling", () => {
  assert.match(styles, /body\.paged-reader \.reader-pane\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(styles, /\.reader-page\[hidden\]\s*\{[^}]*display:\s*none/s);
  assert.match(styles, /\.reader-page-oversized\s*\{[^}]*overflow-y:\s*auto/s);
});

test("composition failure falls back for the render without overwriting preference", () => {
  const recalc = app.slice(app.indexOf("function recalcPages"), app.indexOf("function prevPage"));
  assert.match(recalc, /Paged reader unavailable; using continuous layout/);
  assert.match(recalc, /state\.readingMode\s*=\s*"continuous"/);
  assert.doesNotMatch(recalc, /persistMode/);
});
```

Run `node --test tests/test_pagination_ui.mjs`; expect three new failures.

- [ ] **Step 2: Add DOM measurement and unwrapping helpers**

Add above `recalcPages`:

```javascript
let pendingPageEdge = null;
let resizeTimer;

function unwrapReaderPages(wrapper) {
  const pages = [...wrapper.children].filter((child) => child.classList.contains("reader-page"));
  if (!pages.length) return;
  const fragment = document.createDocumentFragment();
  pages.forEach((page) => {
    while (page.firstChild) fragment.appendChild(page.firstChild);
  });
  wrapper.replaceChildren(fragment);
}

function outerBlockHeight(block) {
  const style = window.getComputedStyle(block);
  return block.getBoundingClientRect().height
    + (parseFloat(style.marginTop) || 0)
    + (parseFloat(style.marginBottom) || 0);
}

function usablePageHeight(pane) {
  const style = window.getComputedStyle(pane);
  return pane.clientHeight
    - (parseFloat(style.paddingTop) || 0)
    - (parseFloat(style.paddingBottom) || 0);
}

function firstLineOnPage(page) {
  const value = page?.querySelector(".chunk-row")?.dataset.lineIndex;
  return value === undefined ? null : Number(value);
}

function captureReadingAnchor() {
  const pane = document.querySelector(".reader-pane");
  if (!pane) return state.currentLineIndex;
  if (state.readingMode === "paged") {
    const active = document.querySelector(".reader-page:not([hidden])");
    return firstLineOnPage(active) ?? state.currentLineIndex;
  }
  const paneTop = pane.getBoundingClientRect().top;
  const row = [...document.querySelectorAll(".chunk-row")].find((candidate) => candidate.getBoundingClientRect().bottom > paneTop);
  return row ? Number(row.dataset.lineIndex) : state.currentLineIndex;
}
```

- [ ] **Step 3: Add page creation and display**

```javascript
function showPagedPage(index) {
  const pages = [...document.querySelectorAll(".reader-page")];
  if (!pages.length) return;
  state.currentPageIndex = Math.min(pages.length - 1, Math.max(0, index));
  pages.forEach((page, pageIndex) => { page.hidden = pageIndex !== state.currentPageIndex; });
  state.currentLineIndex = firstLineOnPage(pages[state.currentPageIndex]) ?? state.currentLineIndex;
  const pane = document.querySelector(".reader-pane");
  if (pane) pane.scrollTop = 0;
  updatePageIndicator();
}

function composeReaderPages(anchorLineIndex = state.currentLineIndex) {
  const pane = document.querySelector(".reader-pane");
  const wrapper = document.getElementById("chunks-inner");
  if (!pane || !wrapper) return;
  unwrapReaderPages(wrapper);
  const pageHeight = usablePageHeight(pane);
  const blocks = [...wrapper.children];
  const heights = new Map(blocks.map((block) => [block, outerBlockHeight(block)]));
  const groups = ReaderPagination.packBlocks(blocks, pageHeight, (block) => heights.get(block));
  wrapper.replaceChildren();
  groups.forEach((group, pageIndex) => {
    const page = document.createElement("section");
    page.className = "reader-page";
    page.dataset.pageIndex = String(pageIndex);
    page.style.height = `${pageHeight}px`;
    if (group.some((block) => heights.get(block) > pageHeight)) page.classList.add("reader-page-oversized");
    group.forEach((block) => page.appendChild(block));
    wrapper.appendChild(page);
  });
  state.totalPages = groups.length;
  const target = pendingPageEdge === "last"
    ? groups.length - 1
    : ReaderPagination.pageIndexForLine(groups, anchorLineIndex);
  pendingPageEdge = null;
  showPagedPage(target);
}

function updatePageIndicator() {
  const indicator = document.getElementById("page-indicator");
  if (indicator) indicator.textContent = `${state.currentPageIndex + 1} / ${state.totalPages}`;
}
```

- [ ] **Step 4: Replace `recalcPages` with a mode-aware implementation**

```javascript
function recalcPages({ anchorLineIndex = captureReadingAnchor() } = {}) {
  const pane = document.querySelector(".reader-pane");
  const content = document.querySelector(".reader-content");
  const wrapper = document.getElementById("chunks-inner");
  if (!pane || !content || !wrapper || pane.clientHeight === 0) return;

  if (state.readingMode === "paged") {
    try {
      composeReaderPages(anchorLineIndex);
      return;
    } catch (error) {
      console.warn("Paged reader unavailable; using continuous layout:", error);
      state.readingMode = "continuous";
      document.body.classList.remove("paged-reader");
      updateReadingModeControl(Boolean(tabletTouchMedia?.matches));
    }
  }

  unwrapReaderPages(wrapper);
  state.totalPages = Math.max(1, Math.ceil(content.scrollHeight / pane.clientHeight));
  const row = wrapper.querySelector(`.chunk-row[data-line-index="${anchorLineIndex}"]`);
  if (row) pane.scrollTop = Math.max(0, row.offsetTop - wrapper.offsetTop);
  state.currentPageIndex = Math.min(state.totalPages - 1, Math.max(0, Math.round(pane.scrollTop / pane.clientHeight)));
  state.currentLineIndex = Number.isInteger(anchorLineIndex) ? anchorLineIndex : 0;
  updatePageIndicator();
}
```

Replace the resize listener with a debounced anchor-preserving version:

```javascript
window.addEventListener("resize", () => {
  if (!document.querySelector(".reader-pane") || !document.getElementById("splash-screen").hasAttribute("hidden")) return;
  const anchor = captureReadingAnchor();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => recalcPages({ anchorLineIndex: anchor }), 120);
});
```

- [ ] **Step 5: Add discrete-page CSS**

```css
body.paged-reader .reader-pane {
  overflow: hidden;
}

body.paged-reader .reader-content,
body.paged-reader #chunks-inner {
  height: 100%;
}

.reader-page {
  width: 100%;
  overflow: hidden;
}

.reader-page[hidden] {
  display: none;
}

.reader-page-oversized {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
```

- [ ] **Step 6: Verify and commit composition**

Run `node --test tests/test_pagination_core.mjs tests/test_pagination_ui.mjs && node --check app.js && git diff --check`.

Expected: 15 tests pass.

```bash
git add app.js styles.css tests/test_pagination_ui.mjs
git commit -m "feat: compose reader blocks into pages"
```

### Task 4: Wire touch, keyboard, chapter boundaries, and semantic progress

**Files:**
- Modify: `app.js:45-105,650-825,1290-1410`
- Modify: `tests/test_progress_restore.mjs`
- Modify: `tests/test_pagination_ui.mjs`

- [ ] **Step 1: Write failing progress tests**

In `tests/test_progress_restore.mjs`, extend the sync test with:

```javascript
vm.runInContext("state.currentLineIndex = 17; state.readingMode = 'paged'", context);
```

and assertions:

```javascript
assert.equal(saved.currentLineIndex, 17);
assert.equal("readingMode" in saved, false);
```

Add:

```javascript
test("Gist restoration prefers a semantic line anchor while retaining legacy page data", async () => {
  const { context } = createRuntime({
    currentBookId: "cicero",
    currentChapterIndex: 1,
    currentPageIndex: 4,
    currentLineIndex: 23,
    books: [{ id: "cicero", title: "Cicero", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")]);
  await restore(context);
  const restored = currentState(context);
  assert.equal(restored.currentLineIndex, 23);
  assert.equal(restored.currentPageIndex, 4);
});
```

Run `node --test tests/test_progress_restore.mjs`; expect failures because line anchors are not synced/restored.

- [ ] **Step 2: Write failing interaction-contract tests**

Append to `tests/test_pagination_ui.mjs`:

```javascript
test("reader installs touch and keyboard navigation without overlay zones", () => {
  assert.match(app, /function handleReaderPointerUp\(/);
  assert.match(app, /ReaderPagination\.isInteractiveTarget/);
  assert.match(app, /ReaderPagination\.pageTurnDirection/);
  assert.match(app, /function handleReaderKeydown\(/);
  assert.doesNotMatch(html, /page-turn-zone/);
});

test("paged navigation applies cross-chapter decisions", () => {
  assert.match(app, /ReaderPagination\.navigationDecision/);
  assert.match(app, /pendingPageEdge\s*=\s*decision\.edge/);
});
```

Run `node --test tests/test_pagination_ui.mjs`; expect two new failures.

- [ ] **Step 3: Add shared paged navigation**

Replace `prevPage`, `nextPage`, and `translatePane` with:

```javascript
function navigatePaged(direction) {
  const book = state.books[state.currentBookIndex];
  const decision = ReaderPagination.navigationDecision({
    direction,
    pageIndex: state.currentPageIndex,
    totalPages: state.totalPages,
    chapterIndex: state.currentChapterIndex,
    chapterCount: book.chapters.length,
  });
  if (decision.type === "none") return;
  if (decision.type === "page") {
    showPagedPage(decision.pageIndex);
  } else {
    state.currentChapterIndex = decision.chapterIndex;
    state.currentPageIndex = 0;
    state.currentLineIndex = 0;
    pendingPageEdge = decision.edge;
    const select = document.getElementById("chapter-select");
    if (select) select.value = decision.chapterIndex;
    renderChapter();
  }
  syncProgressToGist().catch((error) => console.log("Gist sync skipped:", error.message));
}

function prevPage() {
  if (state.readingMode === "paged") return navigatePaged(-1);
  if (state.currentPageIndex > 0) {
    state.currentPageIndex--;
    translatePane();
    syncProgressToGist().catch((error) => console.log("Gist sync skipped:", error.message));
  }
}

function nextPage() {
  if (state.readingMode === "paged") return navigatePaged(1);
  if (state.currentPageIndex < state.totalPages - 1) {
    state.currentPageIndex++;
    translatePane();
    syncProgressToGist().catch((error) => console.log("Gist sync skipped:", error.message));
  }
}

function translatePane() {
  if (state.readingMode === "paged") return showPagedPage(state.currentPageIndex);
  const pane = document.querySelector(".reader-pane");
  if (!pane) return;
  pane.scrollTo({ top: state.currentPageIndex * pane.clientHeight, behavior: "smooth" });
  updatePageIndicator();
}
```

At the start of `syncPageFromScroll`, return when paged:

```javascript
if (state.readingMode === "paged") return;
```

Then replace the block from `if (pageIndex === state.currentPageIndex) return;`
through the existing manual `page-indicator` update with the following, so
continuous scrolling also refreshes the semantic line anchor even when the
derived viewport page number has not changed:

```javascript
  const lineIndex = captureReadingAnchor();
  if (pageIndex === state.currentPageIndex && lineIndex === state.currentLineIndex) return;
  state.currentPageIndex = pageIndex;
  state.currentLineIndex = lineIndex;
  updatePageIndicator();
```

- [ ] **Step 4: Add side taps and keyboard arrows**

```javascript
function handleReaderPointerUp(event) {
  if (state.readingMode !== "paged" || event.pointerType !== "touch") return;
  if (ReaderPagination.isInteractiveTarget(event.target)) return;
  if (window.getSelection?.()?.toString()) return;
  const pane = event.currentTarget;
  const rect = pane.getBoundingClientRect();
  const direction = ReaderPagination.pageTurnDirection(event.clientX, rect.left, rect.width);
  if (direction < 0) prevPage();
  if (direction > 0) nextPage();
}

function handleReaderKeydown(event) {
  if (state.readingMode !== "paged" || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target?.matches?.("input, textarea, select, button, [contenteditable='true']")) return;
  if (event.key === "ArrowLeft") { event.preventDefault(); prevPage(); }
  if (event.key === "ArrowRight") { event.preventDefault(); nextPage(); }
}
```

During DOMContentLoaded, add:

```javascript
readerPane.addEventListener("pointerup", handleReaderPointerUp);
document.addEventListener("keydown", handleReaderKeydown);
```

- [ ] **Step 5: Persist and restore the semantic anchor**

In `syncProgressToGist`, add beside `currentPageIndex`:

```javascript
currentLineIndex: state.currentLineIndex,
```

Do not add `readingMode` to the payload. Replace the opening state-selection
portion of `selectBook` with:

```javascript
function selectBook(idx, chapterIndex, lineIndex = 0) {
  const book = state.books[idx];
  const defaultChapterIndex = Number.isInteger(book.defaultChapterIndex)
    ? book.defaultChapterIndex
    : firstUncompletedChapter(book);

  state.currentBookIndex = idx;
  state.currentChapterIndex = Number.isInteger(chapterIndex) && book.chapters[chapterIndex]
    ? chapterIndex
    : defaultChapterIndex;
  state.currentPageIndex = 0;
  state.currentLineIndex = Number.isInteger(lineIndex) && lineIndex >= 0 ? lineIndex : 0;
```

The following splash/workspace and chapter-selector code remains after this
replacement without behavioural changes.

In Gist restoration, set:

```javascript
state.currentLineIndex = Number.isInteger(cl.currentLineIndex) ? cl.currentLineIndex : 0;
```

Call:

```javascript
selectBook(resolvedBookIndex, savedChapterIndex, state.currentLineIndex);
```

and replace the restore timeout body with:

```javascript
setTimeout(() => {
  state.currentPageIndex = cl.currentPageIndex || 0;
  recalcPages({ anchorLineIndex: state.currentLineIndex });
  if (state.readingMode === "continuous" && !Number.isInteger(cl.currentLineIndex)) translatePane();
}, 200);
```

When the chapter selector or completion footer opens another chapter, reset `currentLineIndex` to `0` before `renderChapter()`.

- [ ] **Step 6: Verify and commit navigation/progress**

Run:

```bash
node --test tests/test_pagination_core.mjs tests/test_pagination_ui.mjs tests/test_progress_restore.mjs
node --check app.js
git diff --check
```

Expected: all pagination and progress tests pass, including legacy progress cases.

```bash
git add app.js tests/test_progress_restore.mjs tests/test_pagination_ui.mjs
git commit -m "feat: add touch page and chapter navigation"
```

### Task 5: Refresh offline assets and verify on an iPad-sized browser

**Files:**
- Modify: `Makefile:8-17`
- Modify: `index.html:12,78-85`
- Modify: `sw.js:1-7`
- Modify: `tests/test_syntax_contrast.mjs`

- [ ] **Step 1: Update the deployment regression test first**

Replace the deployment test with:

```javascript
test("deployment versions refresh all changed reader assets", () => {
  assert.match(indexHtml, /styles\.css\?v=20260802-2/);
  assert.match(indexHtml, /pagination\.js\?v=20260802-2/);
  assert.match(indexHtml, /app\.js\?v=20260802-2/);
  assert.match(serviceWorker, /const CACHE = "classics-reader-v27"/);
  assert.match(serviceWorker, /"pagination\.js"/);
});
```

Run `node --test tests/test_syntax_contrast.mjs`; expect the deployment test to fail on old styles/app/cache values and missing service-worker pagination asset.

- [ ] **Step 2: Update versions and offline cache**

Set in `index.html`:

```html
<link rel="stylesheet" href="styles.css?v=20260802-2">
<script src="pagination.js?v=20260802-2"></script>
<script src="app.js?v=20260802-2"></script>
```

Set in `sw.js`:

```javascript
const CACHE = "classics-reader-v27";
const CORE = [
  "./", "index.html", "styles.css", "pagination.js", "app.js", "data.js", "dictionary.js",
  "generated/imported-books.js", "generated/imported-latin-dictionary.js",
  "generated/imported-greek-dictionary.js",
  "generated/imported-old-english-dictionary.js", "icon.png", "manifest.json"
];
```

Add `node --check pagination.js` immediately before `node --check app.js` in `Makefile`.

- [ ] **Step 3: Run the full automated gate**

Run:

```bash
make check
git diff --check
git status --short
```

Expected: importer current, 13 Python tests pass, all Node suites pass, every JavaScript syntax check passes, and only Task 5 files are uncommitted.

- [ ] **Step 4: Verify the served UI in tablet portrait and landscape**

Serve with:

```bash
python3 -m http.server 8000
```

Using a clean temporary Chrome profile with touch emulation at 768×1024 and 1024×768, verify:

1. The mode control is visible and defaults to `Paged`; it is absent at a 390-pixel phone width and on a fine-pointer desktop.
2. Page containers retain source-line/translation blocks without duplication or reordering.
3. Right and left edge taps turn pages, while centre taps do nothing.
4. Word lookup wins over page turning for a word in each edge zone.
5. The final page opens the next chapter at its banner; the first page returns to the preceding chapter's last page; work boundaries stop.
6. Rotation preserves the first visible source line.
7. Switching Paged → Continuous → Paged preserves that line and the local preference survives reload.
8. Dark/light syntax highlighting and the Gospel collection remain intact.
9. An artificially zero-height pane logs the fallback and renders continuous content without changing local preference.

Capture portrait and landscape screenshots, stop the server, and delete or trash the temporary profile.

- [ ] **Step 5: Commit deployment metadata**

```bash
git add Makefile index.html sw.js tests/test_syntax_contrast.mjs
git commit -m "chore: deploy tablet reader pagination"
```

- [ ] **Step 6: Final verification and scope review**

Run:

```bash
make check
git diff --check
git status --short
git log --oneline -7
```

Expected: all checks pass, the worktree is clean, and recent commits contain only the approved pagination feature, tests, deployment metadata, and documentation.
