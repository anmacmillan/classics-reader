import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const appSource = fs.readFileSync(new URL("app.js", root), "utf8");
const policySource = fs.readFileSync(new URL("pagination.js", root), "utf8");

function classList() {
  const values = new Set();
  return {
    add(...classes) { classes.forEach((name) => values.add(name)); },
    remove(...classes) { classes.forEach((name) => values.delete(name)); },
    toggle(name, force) {
      const enabled = force === undefined ? !values.has(name) : Boolean(force);
      if (enabled) values.add(name); else values.delete(name);
      return enabled;
    },
    contains(name) { return values.has(name); },
  };
}

function element({ lineIndex = null } = {}) {
  return {
    classList: classList(),
    style: {},
    dataset: lineIndex === null ? {} : { lineIndex: String(lineIndex) },
    children: [],
    listeners: new Map(),
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    replaceChildren(...children) { this.children = children; },
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    setAttribute() {},
    removeAttribute() {},
    hasAttribute() { return false; },
    querySelector(selector) {
      return selector.includes("chunk-row") && lineIndex !== null ? { dataset: { lineIndex: String(lineIndex) } } : null;
    },
    querySelectorAll() { return []; },
  };
}

function createRuntime() {
  const pages = [element({ lineIndex: 0 }), element({ lineIndex: 10 }), element({ lineIndex: 20 })];
  const continuousRows = [
    { dataset: { lineIndex: "17" }, getBoundingClientRect() { return { bottom: 10 }; } },
  ];
  const pane = element();
  pane.clientHeight = 500;
  pane.scrollTop = 0;
  pane.scrollRequests = [];
  pane.scrollTo = ({ top, behavior } = {}) => {
    pane.scrollTop = top;
    pane.scrollRequests.push({ top, behavior });
  };
  pane.getBoundingClientRect = () => ({ top: 0, left: 100, width: 200 });
  const chapterSelect = element();
  const content = element();
  const document = {
    addEventListener() {},
    body: { classList: classList() },
    activeElement: null,
    fonts: null,
    getElementById(id) {
      if (id === "chapter-select") return chapterSelect;
      if (id === "reader-content") return content;
      return null;
    },
    querySelector(selector) {
      if (selector === ".reader-pane") return pane;
      if (selector === ".reader-content") return content;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "#chunks-inner > .reader-page") return pages;
      if (selector === "#chunks-inner .chunk-row[data-line-index]") return continuousRows;
      return [];
    },
    createElement() { return element(); },
    createDocumentFragment() { return element(); },
  };
  const timers = [];
  const context = {
    console,
    document,
    LATIN_DICT: {},
    GREEK_DICT: {},
    OLD_ENGLISH_DICT: {},
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout(callback) {
      const timer = { callback, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) { if (timer) timer.cancelled = true; },
    window: { getSelection() { return { toString() { return ""; } }; }, matchMedia() { return { matches: false }; }, getComputedStyle() { return {}; } },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(policySource, context, { filename: "pagination.js" });
  vm.runInContext(`${appSource}\nglobalThis.__readerApi = { state, renderChapter, navigatePaged, handleReaderPointerDown, handleReaderPointerUp, handleReaderPointerCancel, handleReaderKeydown, syncPageFromScroll, prevPage, nextPage, translatePane, getPendingPageEdge: () => pendingPageEdge, getPointerStart: () => readerPointerStart };`, context, { filename: "app.js" });
  vm.runInContext(`state.books = [{ id: "book", author: "Author", title: "Book", lang: "latin", chapters: [{ title: "One", lines: ["a"] }, { title: "Two", lines: ["b"] }] }]; state.currentBookIndex = 0; state.currentChapterIndex = 0; state.currentPageIndex = 1; state.currentLineIndex = 10; state.totalPages = 3; state.readingMode = "paged"; state.vocabulary = []; state.completed = {};`, context);
  const runTimers = () => timers.splice(0).forEach((timer) => {
    if (!timer.cancelled) timer.callback();
  });
  return { context, api: context.__readerApi, pages, pane, chapterSelect, continuousRows, document, timers, runTimers };
}

function event(overrides = {}) {
  return {
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    target: { closest() { return null; } },
    currentTarget: { getBoundingClientRect() { return { left: 100, width: 200 }; } },
    clientX: 290,
    clientY: 50,
    key: "",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    prevented: false,
    preventDefault() { this.prevented = true; },
    ...overrides,
  };
}

function tap(api, overrides = {}) {
  const start = event(overrides);
  api.handleReaderPointerDown(start);
  api.handleReaderPointerUp(event(overrides));
}

async function createChapterControlRuntime({ renderStub = true } = {}) {
  const listeners = new Map();
  const windowListeners = new Map();
  const timers = [];
  const pane = element();
  pane.clientHeight = 100;
  pane.scrollTop = 400;
  pane.scrollTo = ({ top } = {}) => { pane.scrollTop = top; };
  pane.getBoundingClientRect = () => ({ top: 0, left: 0, width: 300 });
  const content = element();
  content.scrollHeight = 800;
  const wrapper = element();
  wrapper.id = "chunks-inner";
  wrapper.getBoundingClientRect = () => ({ top: 0, bottom: 800, height: 800 });
  const row = element({ lineIndex: 0 });
  row.getBoundingClientRect = () => ({ top: 230, bottom: 260, height: 30 });
  wrapper.querySelector = () => row;
  wrapper.querySelectorAll = () => [row];
  const chapterSelect = element();
  const indicator = element();
  const document = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    body: { classList: classList() },
    fonts: null,
    getElementById(id) {
      return ({ "chapter-select": chapterSelect, "reader-content": content, "chunks-inner": wrapper, "page-indicator": indicator })[id] || null;
    },
    querySelector(selector) {
      if (selector === ".reader-pane") return pane;
      if (selector === ".reader-content") return content;
      return null;
    },
    querySelectorAll(selector) {
      return selector.includes("chunk-row") ? [row] : [];
    },
    createElement() { return element(); },
    createDocumentFragment() { return element(); },
  };
  const context = {
    console,
    BOOKS: [{ id: "book", author: "Author", title: "Book", lang: "latin", chapters: [{ title: "One", lines: ["a"] }, { title: "Two", lines: ["b"] }] }],
    LATIN_DICT: {},
    GREEK_DICT: {},
    OLD_ENGLISH_DICT: {},
    document,
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout(callback) {
      const timer = { callback, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) { if (timer) timer.cancelled = true; },
    window: { addEventListener(type, listener) { windowListeners.set(type, listener); }, getComputedStyle() { return {}; }, matchMedia() { return { matches: false }; } },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(policySource, context, { filename: "pagination.js" });
  vm.runInContext(`${appSource}\nglobalThis.__chapterApi = { state, renderChapter, recalcPages, buildCompletionFooter, getPendingPageEdge: () => pendingPageEdge };`, context, { filename: "app.js" });
  vm.runInContext(`
    loadProgressFromStorage = () => {};
    loadCompletedFromStorage = () => {};
    loadVocabularyFromStorage = () => {};
    setupTheme = () => {};
    setupReadingMode = () => {};
    renderLibrary = () => {};
    setupFocusHeader = () => {};
    setupVocabulary = () => {};
    loadProgressFromGist = async () => {};
    ${renderStub ? "renderChapter = () => recalcPages({ anchorLineIndex: state.currentLineIndex });" : ""}
  `, context);
  await listeners.get("DOMContentLoaded")();
  return { api: context.__chapterApi, chapterSelect, pane, document, context, timers, windowListeners };
}

test("production paged navigation chooses pages, chapters, and no-op boundaries", () => {
  const { api, pages, chapterSelect } = createRuntime();
  api.navigatePaged(1);
  assert.equal(api.state.currentPageIndex, 2);
  assert.equal(pages[2].hidden, false);

  api.navigatePaged(1);
  assert.equal(api.state.currentChapterIndex, 1);
  assert.equal(api.state.currentPageIndex, 0);
  assert.equal(api.state.currentLineIndex, 0);
  assert.equal(api.getPendingPageEdge(), "first");
  assert.equal(chapterSelect.value, 1);

  api.state.currentChapterIndex = 0;
  api.state.currentPageIndex = 0;
  api.navigatePaged(-1);
  assert.equal(api.state.currentChapterIndex, 0);
  assert.equal(api.getPendingPageEdge(), "first");

  api.state.currentChapterIndex = 1;
  api.state.currentPageIndex = 0;
  api.navigatePaged(-1);
  assert.equal(api.state.currentChapterIndex, 0);
  assert.equal(api.state.currentPageIndex, 0);
  assert.equal(api.state.currentLineIndex, 0);
  assert.equal(api.getPendingPageEdge(), "last");
});

test("production touch handling turns only edge taps and suppresses interactive, selected, and centre taps", () => {
  const { api, context } = createRuntime();
  tap(api);
  assert.equal(api.state.currentPageIndex, 2);
  tap(api, { clientX: 200 });
  assert.equal(api.state.currentPageIndex, 2);
  tap(api, { clientX: 110 });
  assert.equal(api.state.currentPageIndex, 1);
  tap(api, { pointerType: "mouse", clientX: 110 });
  assert.equal(api.state.currentPageIndex, 1);
  tap(api, { pointerType: "pen", clientX: 290 });
  assert.equal(api.state.currentPageIndex, 1);
  tap(api, { target: { closest() { return {}; } }, clientX: 110 });
  assert.equal(api.state.currentPageIndex, 1);
  context.window.getSelection = () => ({ toString() { return "word"; } });
  tap(api, { clientX: 110 });
  assert.equal(api.state.currentPageIndex, 1);
  api.state.readingMode = "continuous";
  tap(api, { clientX: 290 });
  assert.equal(api.state.currentPageIndex, 1);
});

test("production pointer gesture tracking accepts only primary edge taps", () => {
  const { api } = createRuntime();
  api.handleReaderPointerDown(event({ clientX: 290, clientY: 40 }));
  api.handleReaderPointerUp(event({ clientX: 290, clientY: 65 }));
  assert.equal(api.state.currentPageIndex, 1);
  api.handleReaderPointerDown(event({ clientX: 290, clientY: 40 }));
  api.handleReaderPointerUp(event({ clientX: 260, clientY: 40 }));
  assert.equal(api.state.currentPageIndex, 1);
  api.handleReaderPointerDown(event({ clientX: 290 }));
  api.handleReaderPointerCancel(event({ clientX: 290 }));
  assert.equal(api.getPointerStart(), null);
  api.handleReaderPointerUp(event({ clientX: 290 }));
  assert.equal(api.state.currentPageIndex, 1);
  api.handleReaderPointerDown(event({ clientX: 290 }));
  api.handleReaderPointerUp(event({ clientX: 290, pointerId: 2 }));
  assert.equal(api.state.currentPageIndex, 1);
  api.handleReaderPointerDown(event({ clientX: 290 }));
  api.handleReaderPointerDown(event({ clientX: 290, pointerId: 2, isPrimary: false }));
  assert.equal(api.getPointerStart(), null);
  api.handleReaderPointerUp(event({ clientX: 290 }));
  assert.equal(api.state.currentPageIndex, 1);
  tap(api, { clientX: 290 });
  assert.equal(api.state.currentPageIndex, 2);
});

test("production keyboard handling ignores editable, modified, continuous, and unrelated events", () => {
  const { api, document } = createRuntime();
  const right = event({ key: "ArrowRight" });
  api.handleReaderKeydown(right);
  assert.equal(right.prevented, true);
  assert.equal(api.state.currentPageIndex, 2);
  const modified = event({ key: "ArrowLeft", ctrlKey: true });
  api.handleReaderKeydown(modified);
  assert.equal(modified.prevented, false);
  assert.equal(api.state.currentPageIndex, 2);
  const alt = event({ key: "ArrowLeft", altKey: true });
  api.handleReaderKeydown(alt);
  assert.equal(alt.prevented, false);
  const meta = event({ key: "ArrowLeft", metaKey: true });
  api.handleReaderKeydown(meta);
  assert.equal(meta.prevented, false);
  const shift = event({ key: "ArrowLeft", shiftKey: true });
  api.handleReaderKeydown(shift);
  assert.equal(shift.prevented, false);
  const editable = event({ key: "ArrowLeft", target: { closest() { return {}; } } });
  api.handleReaderKeydown(editable);
  assert.equal(editable.prevented, false);
  assert.equal(api.state.currentPageIndex, 2);
  document.activeElement = { closest() { return {}; } };
  const focusedEditable = event({ key: "ArrowLeft" });
  api.handleReaderKeydown(focusedEditable);
  assert.equal(focusedEditable.prevented, false);
  assert.equal(api.state.currentPageIndex, 2);
  document.activeElement = null;
  const unrelated = event({ key: "Enter" });
  api.handleReaderKeydown(unrelated);
  assert.equal(unrelated.prevented, false);
  assert.equal(api.state.currentPageIndex, 2);
  const left = event({ key: "ArrowLeft" });
  api.handleReaderKeydown(left);
  assert.equal(left.prevented, true);
  assert.equal(api.state.currentPageIndex, 1);
  api.state.readingMode = "continuous";
  const continuous = event({ key: "ArrowRight" });
  api.handleReaderKeydown(continuous);
  assert.equal(continuous.prevented, false);
  assert.equal(api.state.currentPageIndex, 1);
});

test("production continuous scrolling refreshes semantic progress even within the same viewport page", () => {
  const { api, pane } = createRuntime();
  api.state.readingMode = "continuous";
  api.state.currentPageIndex = 1;
  api.state.currentLineIndex = 2;
  api.state.totalPages = 3;
  pane.scrollTop = 500;

  api.syncPageFromScroll();

  assert.equal(api.state.currentPageIndex, 1);
  assert.equal(api.state.currentLineIndex, 17);
  api.state.readingMode = "paged";
  api.state.currentLineIndex = 8;
  api.syncPageFromScroll();
  assert.equal(api.state.currentLineIndex, 8);
});

test("production continuous scrolling does not sync unchanged state and debounces semantic changes", () => {
  const { api, context, continuousRows, timers, runTimers } = createRuntime();
  vm.runInContext(`syncProgressToGist = () => {
    globalThis.__scrollSyncCalls = (globalThis.__scrollSyncCalls || 0) + 1;
    return Promise.resolve();
  };`, context);
  api.state.readingMode = "continuous";
  api.state.currentPageIndex = 0;
  api.state.currentLineIndex = 17;
  api.state.totalPages = 3;

  api.syncPageFromScroll();
  assert.equal(timers.length, 0);
  continuousRows[0].dataset.lineIndex = "18";
  api.syncPageFromScroll();
  continuousRows[0].dataset.lineIndex = "19";
  api.syncPageFromScroll();
  assert.equal(timers.length, 2);
  runTimers();
  assert.equal(vm.runInContext("__scrollSyncCalls", context), 1);
});

test("production continuous prev and next page navigation translates, syncs, and respects boundaries", () => {
  const { api, context, pane } = createRuntime();
  vm.runInContext(`syncProgressToGist = () => {
    globalThis.__continuousSyncCalls = (globalThis.__continuousSyncCalls || 0) + 1;
    return Promise.resolve();
  };`, context);
  api.state.readingMode = "continuous";
  api.state.currentPageIndex = 1;
  api.state.totalPages = 3;

  api.nextPage();
  assert.equal(api.state.currentPageIndex, 2);
  assert.deepEqual(pane.scrollRequests.at(-1), { top: 1000, behavior: "smooth" });
  api.nextPage();
  assert.equal(api.state.currentPageIndex, 2);
  api.prevPage();
  assert.equal(api.state.currentPageIndex, 1);
  api.prevPage();
  assert.equal(api.state.currentPageIndex, 0);
  api.prevPage();
  assert.equal(api.state.currentPageIndex, 0);
  assert.equal(vm.runInContext("__continuousSyncCalls", context), 3);
});

test("production paged navigation syncs once after settled chapter movement and never at a boundary no-op", () => {
  const { api, context, runTimers } = createRuntime();
  vm.runInContext(`syncProgressToGist = () => {
    globalThis.__syncCalls = (globalThis.__syncCalls || 0) + 1;
    return Promise.resolve();
  };`, context);

  api.navigatePaged(1);
  assert.equal(vm.runInContext("__syncCalls", context), 1);
  api.navigatePaged(1);
  assert.equal(vm.runInContext("__syncCalls", context), 1);
  runTimers();
  assert.equal(vm.runInContext("__syncCalls", context), 2);
  api.state.currentChapterIndex = 0;
  api.state.currentPageIndex = 0;
  api.navigatePaged(-1);
  assert.equal(vm.runInContext("__syncCalls", context), 2);
});

test("production chapter placement settles state before its single requested sync", () => {
  const { api, context, runTimers } = createRuntime();
  vm.runInContext(`
    recalcPages = () => { state.currentPageIndex = 2; state.currentLineIndex = 20; };
    syncProgressToGist = () => {
      globalThis.__settledSync = [state.currentPageIndex, state.currentLineIndex];
      return Promise.resolve();
    };
  `, context);
  api.renderChapter({ syncAfterPlacement: true });
  assert.equal(vm.runInContext("globalThis.__settledSync", context), undefined);
  runTimers();
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__settledSync)", context)), [2, 20]);
});

test("production cross-chapter navigation syncs only after the destination edge has settled", () => {
  const { api, context, runTimers } = createRuntime();
  vm.runInContext(`
    renderChapter = ({ syncAfterPlacement } = {}) => setTimeout(() => {
      const backwards = pendingPageEdge === "last";
      state.currentPageIndex = backwards ? 9 : 0;
      state.currentLineIndex = backwards ? 90 : 0;
      pendingPageEdge = null;
      if (syncAfterPlacement) syncProgressToGist().catch(() => {});
    }, 1);
    syncProgressToGist = () => {
      globalThis.__chapterSyncs = [...(globalThis.__chapterSyncs || []), [state.currentPageIndex, state.currentLineIndex]];
      return Promise.resolve();
    };
  `, context);
  api.state.currentChapterIndex = 1;
  api.state.currentPageIndex = 0;
  api.state.totalPages = 1;
  api.navigatePaged(-1);
  assert.equal(vm.runInContext("globalThis.__chapterSyncs", context), undefined);
  runTimers();
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__chapterSyncs)", context)), [[9, 90]]);

  api.state.currentChapterIndex = 0;
  api.state.currentPageIndex = 0;
  api.navigatePaged(1);
  runTimers();
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__chapterSyncs)", context)), [[9, 90], [0, 0]]);
});

test("production chapter selector and completion footer reset continuous reading to the chapter top", async () => {
  const { api, chapterSelect, pane } = await createChapterControlRuntime();
  api.state.readingMode = "continuous";
  api.state.currentPageIndex = 4;
  api.state.currentLineIndex = 17;
  api.state.totalPages = 8;
  chapterSelect.value = "1";
  chapterSelect.listeners.get("change")({ target: chapterSelect });
  assert.equal(api.state.currentChapterIndex, 1);
  assert.equal(api.state.currentPageIndex, 0);
  assert.equal(api.state.currentLineIndex, 0);
  assert.equal(api.getPendingPageEdge(), null);
  assert.equal(pane.scrollTop, 0);

  api.state.currentChapterIndex = 0;
  api.state.currentPageIndex = 4;
  api.state.currentLineIndex = 17;
  api.state.completed = { book: [0] };
  const footer = api.buildCompletionFooter(api.state.books[0]);
  footer.children.at(-1).listeners.get("click")();
  assert.equal(api.state.currentChapterIndex, 1);
  assert.equal(api.state.currentPageIndex, 0);
  assert.equal(api.state.currentLineIndex, 0);
  assert.equal(api.getPendingPageEdge(), null);
  assert.equal(pane.scrollTop, 0);
});

test("production resize callback ignores an anchor from a superseded chapter render", async () => {
  const { api, context, document, timers, windowListeners } = await createChapterControlRuntime({ renderStub: false });
  document.body.classList.add("reader-mode");
  vm.runInContext(`
    captureReadingAnchor = () => 17;
    recalcPages = () => { globalThis.__staleResizeReflows = (globalThis.__staleResizeReflows || 0) + 1; };
  `, context);

  windowListeners.get("resize")();
  const staleResize = timers.at(-1);
  api.state.currentChapterIndex = 1;
  api.renderChapter();
  staleResize.callback();

  assert.equal(vm.runInContext("globalThis.__staleResizeReflows || 0", context), 0);
});
