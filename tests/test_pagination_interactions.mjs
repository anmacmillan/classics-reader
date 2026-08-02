import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const appSource = fs.readFileSync(new URL("app.js", root), "utf8");
const policySource = fs.readFileSync(new URL("pagination.js", root), "utf8");

function classList() {
  return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
}

function element({ lineIndex = null } = {}) {
  return {
    classList: classList(),
    style: {},
    dataset: lineIndex === null ? {} : { lineIndex: String(lineIndex) },
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { children.forEach((child) => this.appendChild(child)); },
    replaceChildren(...children) { this.children = children; },
    addEventListener() {},
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
  pane.scrollTo = ({ top }) => { pane.scrollTop = top; };
  pane.getBoundingClientRect = () => ({ top: 0, left: 100, width: 200 });
  const chapterSelect = element();
  const content = element();
  const document = {
    addEventListener() {},
    body: { classList: classList() },
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
  const context = {
    console,
    document,
    LATIN_DICT: {},
    GREEK_DICT: {},
    OLD_ENGLISH_DICT: {},
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { getSelection() { return { toString() { return ""; } }; }, matchMedia() { return { matches: false }; }, getComputedStyle() { return {}; } },
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(policySource, context, { filename: "pagination.js" });
  vm.runInContext(`${appSource}\nglobalThis.__readerApi = { state, navigatePaged, handleReaderPointerUp, handleReaderKeydown, syncPageFromScroll, getPendingPageEdge: () => pendingPageEdge };`, context, { filename: "app.js" });
  vm.runInContext(`state.books = [{ id: "book", author: "Author", title: "Book", lang: "latin", chapters: [{ title: "One", lines: ["a"] }, { title: "Two", lines: ["b"] }] }]; state.currentBookIndex = 0; state.currentChapterIndex = 0; state.currentPageIndex = 1; state.currentLineIndex = 10; state.totalPages = 3; state.readingMode = "paged"; state.vocabulary = []; state.completed = {};`, context);
  return { context, api: context.__readerApi, pages, pane, chapterSelect };
}

function event(overrides = {}) {
  return {
    pointerType: "touch",
    target: { closest() { return null; } },
    currentTarget: { getBoundingClientRect() { return { left: 100, width: 200 }; } },
    clientX: 290,
    key: "",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    prevented: false,
    preventDefault() { this.prevented = true; },
    ...overrides,
  };
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
  api.handleReaderPointerUp(event());
  assert.equal(api.state.currentPageIndex, 2);
  api.handleReaderPointerUp(event({ clientX: 200 }));
  assert.equal(api.state.currentPageIndex, 2);
  api.handleReaderPointerUp(event({ pointerType: "mouse", clientX: 110 }));
  assert.equal(api.state.currentPageIndex, 2);
  api.handleReaderPointerUp(event({ target: { closest() { return {}; } }, clientX: 110 }));
  assert.equal(api.state.currentPageIndex, 2);
  context.window.getSelection = () => ({ toString() { return "word"; } });
  api.handleReaderPointerUp(event({ clientX: 110 }));
  assert.equal(api.state.currentPageIndex, 2);
});

test("production keyboard handling ignores editable or modified events and turns arrows", () => {
  const { api } = createRuntime();
  const right = event({ key: "ArrowRight" });
  api.handleReaderKeydown(right);
  assert.equal(right.prevented, true);
  assert.equal(api.state.currentPageIndex, 2);
  const modified = event({ key: "ArrowLeft", ctrlKey: true });
  api.handleReaderKeydown(modified);
  assert.equal(modified.prevented, false);
  assert.equal(api.state.currentPageIndex, 2);
  const editable = event({ key: "ArrowLeft", target: { closest() { return {}; } } });
  api.handleReaderKeydown(editable);
  assert.equal(editable.prevented, false);
  assert.equal(api.state.currentPageIndex, 2);
  const left = event({ key: "ArrowLeft" });
  api.handleReaderKeydown(left);
  assert.equal(left.prevented, true);
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

test("production paged navigation syncs once after movement and never at a boundary no-op", () => {
  const { api, context } = createRuntime();
  vm.runInContext(`syncProgressToGist = () => {
    globalThis.__syncCalls = (globalThis.__syncCalls || 0) + 1;
    return Promise.resolve();
  };`, context);

  api.navigatePaged(1);
  assert.equal(vm.runInContext("__syncCalls", context), 1);
  api.navigatePaged(1);
  assert.equal(vm.runInContext("__syncCalls", context), 2);
  api.state.currentChapterIndex = 0;
  api.state.currentPageIndex = 0;
  api.navigatePaged(-1);
  assert.equal(vm.runInContext("__syncCalls", context), 2);
});
