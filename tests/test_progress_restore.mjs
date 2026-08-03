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

function createRuntime(classics, { deferTimers = false } = {}) {
  const values = new Map([
    ["slovo_gist_id", "gist-1"],
    ["slovo_github_pat", "test-token"]
  ]);
  const patches = [];
  const timers = [];
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
    setTimeout(callback) {
      if (!deferTimers) {
        callback();
        return 1;
      }
      const timer = { callback, cancelled: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) { if (timer) timer.cancelled = true; },
    window: { matchMedia() { return { matches: false }; } }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  const runTimers = () => timers.splice(0).forEach((timer) => {
    if (!timer.cancelled) timer.callback();
  });
  return { context, patches, runTimers };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createDeferredSyncRuntime() {
  const values = new Map([
    ["slovo_gist_id", "gist-1"],
    ["slovo_github_pat", "test-token"]
  ]);
  const requests = [];
  const logs = { warnings: [], errors: [] };
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
    console: {
      ...console,
      warn(...args) { logs.warnings.push(args); },
      error(...args) { logs.errors.push(args); }
    },
    document,
    fetch: (_url, options = {}) => {
      const response = deferred();
      requests.push({ method: options.method || "GET", options, response });
      return response.promise;
    },
    localStorage,
    setTimeout(callback) { callback(); return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return { context, logs, requests };
}

function gistReadResponse(classics = {}) {
  return {
    ok: true,
    json: async () => ({
      files: { "slovo_progress.json": { content: JSON.stringify({ classics }) } }
    })
  };
}

function gistPatchResponse() {
  return { ok: true, status: 200, text: async () => "" };
}

function syncedClassics(request) {
  return JSON.parse(JSON.parse(request.options.body).files["slovo_progress.json"].content).classics;
}

async function waitForRequestCount(requests, count) {
  for (let attempt = 0; attempt < 20 && requests.length < count; attempt += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.equal(requests.length, count);
}

function setBooks(context, books, currentBookIndex = 0) {
  vm.runInContext(
    `state.books = ${JSON.stringify(books)}; state.currentBookIndex = ${currentBookIndex}; state.currentChapterIndex = 0; state.currentPageIndex = 0; state.currentLineIndex = 0; state.vocabulary = []; state.completed = {};`,
    context
  );
}

function currentState(context) {
  return JSON.parse(vm.runInContext("JSON.stringify(state)", context));
}

async function restore(context) {
  await vm.runInContext("loadProgressFromGist()", context);
}

function observeRestorePlacement(context) {
  vm.runInContext(`
    const originalSelectBook = selectBook;
    selectBook = (...args) => {
      globalThis.__restoreSelectArgs = args;
      return originalSelectBook(...args);
    };
    recalcPages = (options) => {
      globalThis.__restoreRecalcArgs = options;
      state.currentPageIndex = 1;
    };
    translatePane = () => {
      globalThis.__restoreTranslateCount = (globalThis.__restoreTranslateCount || 0) + 1;
      globalThis.__restoreTranslatedPage = state.currentPageIndex;
    };
  `, context);
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

test("sync writes semantic line progress beside legacy page progress without syncing device-local mode", async () => {
  const { context, patches } = createRuntime({});
  setBooks(context, [book("caesar", "Caesar")]);
  vm.runInContext('state.currentPageIndex = 4; state.currentLineIndex = 17; state.readingMode = "paged"', context);

  await vm.runInContext("syncProgressToGist()", context);

  const saved = JSON.parse(patches.at(-1).files["slovo_progress.json"].content).classics;
  assert.equal(saved.currentPageIndex, 4);
  assert.equal(saved.currentLineIndex, 17);
  assert.equal(typeof saved.currentLineIndex, "number");
  assert.equal(Number.isInteger(saved.currentLineIndex) && saved.currentLineIndex >= 0, true);
  assert.equal(Object.hasOwn(saved, "readingMode"), false);
});

test("concurrent syncs serialize writes and coalesce trailing requests to the latest progress", async () => {
  const { context, requests } = createDeferredSyncRuntime();
  setBooks(context, [book("caesar", "Caesar")]);
  vm.runInContext("state.currentPageIndex = 4; state.currentLineIndex = 11", context);

  const firstSync = vm.runInContext("syncProgressToGist()", context);
  assert.deepEqual(requests.map((request) => request.method), ["GET"]);
  requests[0].response.resolve(gistReadResponse());
  await waitForRequestCount(requests, 2);
  assert.deepEqual(requests.map((request) => request.method), ["GET", "PATCH"]);
  assert.equal(syncedClassics(requests[1]).currentLineIndex, 11);

  vm.runInContext("state.currentPageIndex = 5; state.currentLineIndex = 17", context);
  const secondSync = vm.runInContext("syncProgressToGist()", context);
  vm.runInContext("state.currentPageIndex = 6; state.currentLineIndex = 23", context);
  const thirdSync = vm.runInContext("syncProgressToGist()", context);
  vm.runInContext("state.currentPageIndex = 9; state.currentLineIndex = 41", context);
  const fourthSync = vm.runInContext("syncProgressToGist()", context);

  assert.deepEqual(
    requests.map((request) => request.method),
    ["GET", "PATCH"],
    "the trailing GET must not start before the older PATCH finishes"
  );

  requests[1].response.resolve(gistPatchResponse());
  await waitForRequestCount(requests, 3);
  assert.deepEqual(requests.map((request) => request.method), ["GET", "PATCH", "GET"]);
  requests[2].response.resolve(gistReadResponse());
  await waitForRequestCount(requests, 4);
  assert.deepEqual(requests.map((request) => request.method), ["GET", "PATCH", "GET", "PATCH"]);
  assert.equal(syncedClassics(requests[3]).currentPageIndex, 9);
  assert.equal(syncedClassics(requests[3]).currentLineIndex, 41);

  requests[3].response.resolve(gistPatchResponse());
  await Promise.all([firstSync, secondSync, thirdSync, fourthSync]);
  assert.equal(requests.filter((request) => request.method === "PATCH").length, 2);
});

test("a failed sync does not poison later serialized progress writes", async () => {
  const { context, logs, requests } = createDeferredSyncRuntime();
  setBooks(context, [book("caesar", "Caesar")]);

  const failedSync = vm.runInContext("syncProgressToGist()", context);
  let failedSyncSettled = false;
  failedSync.then(() => { failedSyncSettled = true; });
  requests[0].response.reject(new Error("read failed"));
  await waitForRequestCount(requests, 2);
  assert.equal(requests[1].method, "PATCH");

  vm.runInContext("state.currentPageIndex = 12; state.currentLineIndex = 77", context);
  const laterSync = vm.runInContext("syncProgressToGist()", context);
  assert.equal(requests.length, 2);
  requests[1].response.reject(new Error("write failed"));
  await waitForRequestCount(requests, 3);
  assert.equal(failedSyncSettled, false);
  assert.equal(requests[2].method, "GET");
  requests[2].response.resolve(gistReadResponse());
  await waitForRequestCount(requests, 4);
  assert.equal(requests[3].method, "PATCH");
  assert.equal(syncedClassics(requests[3]).currentLineIndex, 77);
  requests[3].response.resolve(gistPatchResponse());
  await Promise.all([failedSync, laterSync]);
  assert.equal(logs.warnings.length, 1);
  assert.equal(logs.errors.length, 1);
});

test("sync resolves safely without Gist credentials and makes no network request", async () => {
  const { context, requests } = createDeferredSyncRuntime();
  setBooks(context, [book("caesar", "Caesar")]);

  vm.runInContext('localStorage.removeItem("slovo_gist_id")', context);
  await vm.runInContext("syncProgressToGist()", context);
  vm.runInContext('localStorage.setItem("slovo_gist_id", "gist-1"); localStorage.removeItem("slovo_github_pat")', context);
  await vm.runInContext("syncProgressToGist()", context);

  assert.equal(requests.length, 0);
});

test("restore prefers a valid semantic line while retaining legacy page progress", async () => {
  const { context } = createRuntime({
    currentBookId: "caesar",
    currentBookIndex: 0,
    currentChapterIndex: 1,
    currentPageIndex: 4,
    currentLineIndex: 17,
    books: [{ id: "caesar", title: "Caesar", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar")]);
  observeRestorePlacement(context);

  await restore(context);

  const state = currentState(context);
  assert.equal(state.currentChapterIndex, 1);
  assert.equal(state.currentPageIndex, 1);
  assert.equal(state.currentLineIndex, 17);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__restoreSelectArgs)", context)), [0, 1, 17, { syncAfterPlacement: false }]);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__restoreRecalcArgs)", context)), { anchorLineIndex: 17 });
  assert.equal(vm.runInContext("globalThis.__restoreTranslateCount || 0", context), 0);
});

test("Gist restore remains read-only before and after semantic placement", async () => {
  const { context, patches, runTimers } = createRuntime({
    currentBookId: "caesar",
    currentBookIndex: 0,
    currentChapterIndex: 1,
    currentPageIndex: 4,
    currentLineIndex: 17,
    books: [{ id: "caesar", title: "Caesar", chaptersRead: 1 }]
  }, { deferTimers: true });
  setBooks(context, [book("caesar", "Caesar")]);

  await restore(context);

  assert.equal(patches.length, 0);
  runTimers();
  assert.equal(patches.length, 0);
});

test("restore safely defaults absent semantic line progress and preserves legacy-only payloads", async () => {
  const { context } = createRuntime({
    currentBookIndex: 0,
    currentChapterIndex: 1,
    currentPageIndex: 3,
    books: [{ id: "caesar", title: "Caesar", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar")]);
  observeRestorePlacement(context);

  await restore(context);

  const state = currentState(context);
  assert.equal(state.currentPageIndex, 3);
  assert.equal(state.currentLineIndex, 0);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__restoreSelectArgs)", context)), [0, 1, 0, { syncAfterPlacement: false }]);
  assert.deepEqual(JSON.parse(vm.runInContext("JSON.stringify(__restoreRecalcArgs)", context)), { anchorLineIndex: 0 });
  assert.equal(vm.runInContext("__restoreTranslateCount", context), 1);
  assert.equal(vm.runInContext("__restoreTranslatedPage", context), 3);
  assert.equal(state.currentPageIndex, 3);
});

test("restore safely defaults invalid semantic line progress", async () => {
  const { context } = createRuntime({
    currentBookIndex: 0,
    currentChapterIndex: 1,
    currentPageIndex: 3,
    currentLineIndex: -1,
    books: [{ id: "caesar", title: "Caesar", chaptersRead: 1 }]
  });
  setBooks(context, [book("caesar", "Caesar")]);

  await restore(context);

  assert.equal(currentState(context).currentLineIndex, 0);
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
