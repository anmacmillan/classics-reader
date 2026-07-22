import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function book(id, title) {
  return {
    id,
    title,
    author: title,
    lang: "latin",
    chapters: [{ title: "One", lines: ["text"] }, { title: "Two", lines: ["text"] }]
  };
}

function createRuntime(classics) {
  const values = new Map([
    ["slovo_gist_id", "gist-1"],
    ["slovo_github_pat", "test-token"]
  ]);
  const patches = [];
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement() { return { classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} }; },
    body: { classList: { add() {}, remove() {}, contains() { return false; } } }
  };
  const context = {
    Blob,
    URL,
    console,
    document,
    fetch: async (_url, options = {}) => {
      if (options.method === "PATCH") {
        patches.push(JSON.parse(options.body));
        return { ok: true, status: 200, text: async () => "" };
      }
      return {
        ok: true,
        json: async () => ({
          files: { "slovo_progress.json": { content: JSON.stringify({ classics }) } }
        })
      };
    },
    localStorage,
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return { context, patches };
}

function setBooks(context, books, currentBookIndex = 0) {
  vm.runInContext(
    `state.books = ${JSON.stringify(books)}; state.currentBookIndex = ${currentBookIndex}; state.currentChapterIndex = 0; state.currentPageIndex = 0; state.vocabulary = []; state.completed = {};`,
    context
  );
}

function currentState(context) {
  return JSON.parse(vm.runInContext("JSON.stringify(state)", context));
}

async function restore(context) {
  await vm.runInContext("loadProgressFromGist()", context);
}

test("legacy Gist resolves selection and chaptersRead by saved title after an insertion", async () => {
  const { context } = createRuntime({
    currentBookIndex: 0,
    currentChapterIndex: 1,
    currentPageIndex: 0,
    books: [{ title: "Cicero", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")]);

  await restore(context);

  const state = currentState(context);
  assert.equal(state.currentBookIndex, 1);
  assert.equal(state.books[0].chaptersRead || 0, 0);
  assert.equal(state.books[1].chaptersRead, 1);
});

test("new Gist prefers stable IDs over stale positional fields", async () => {
  const { context } = createRuntime({
    currentBookId: "cicero",
    currentBookIndex: 0,
    currentChapterIndex: 1,
    currentPageIndex: 0,
    books: [{ id: "cicero", title: "Cicero", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")]);

  await restore(context);

  const state = currentState(context);
  assert.equal(state.currentBookIndex, 1);
  assert.equal(state.books[0].chaptersRead || 0, 0);
  assert.equal(state.books[1].chaptersRead, 1);
});

test("sync retains legacy fields while writing stable IDs", async () => {
  const { context, patches } = createRuntime({});
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")], 1);
  vm.runInContext("state.currentChapterIndex = 1", context);

  await vm.runInContext("syncProgressToGist()", context);

  const saved = JSON.parse(patches.at(-1).files["slovo_progress.json"].content).classics;
  assert.equal(saved.currentBookId, "cicero");
  assert.equal(saved.currentBookIndex, 1);
  assert.deepEqual(saved.books.map((entry) => entry.id), ["caesar", "cicero"]);
  assert.deepEqual(saved.books.map((entry) => entry.title), ["Caesar", "Cicero"]);
});

test("malformed legacy indexes fall back safely without selecting an undefined book", async () => {
  const { context } = createRuntime({
    currentBookIndex: 99,
    currentChapterIndex: 1,
    currentPageIndex: 0,
    books: [{ chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")]);

  await restore(context);

  const state = currentState(context);
  assert.equal(state.currentBookIndex, 0);
  assert.equal(state.books[0].chaptersRead, 1);
  assert.equal(state.books[1].chaptersRead || 0, 0);
});

test("selection still inspects a saved stable key before rejecting a stale numeric index", async () => {
  const { context } = createRuntime({
    currentBookIndex: 2,
    currentChapterIndex: 1,
    currentPageIndex: 0,
    books: [{ title: "Removed" }, { title: "Also removed" }, { id: "cicero", title: "Cicero", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")]);

  await restore(context);

  assert.equal(currentState(context).currentBookIndex, 1);
});

test("unrecognized stable selection keys do not fall back to a displaced numeric index", async () => {
  const { context } = createRuntime({
    currentBookId: "removed-current-book",
    currentBookIndex: 1,
    currentChapterIndex: 1,
    currentPageIndex: 0,
    books: [{}, { id: "removed-saved-book", title: "Removed saved book", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar"), book("cicero", "Cicero")]);

  await restore(context);

  const state = currentState(context);
  assert.equal(state.currentBookIndex, 0);
  assert.equal(state.books[0].chaptersRead || 0, 0);
  assert.equal(state.books[1].chaptersRead || 0, 0);
});
