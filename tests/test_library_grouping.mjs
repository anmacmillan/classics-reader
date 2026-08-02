import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

const books = [
  { id: "matthew", title: "Matthew", author: "Matthaeus", collection: "Koine New Testament", lang: "greek", chapters: [{}, {}] },
  { id: "mark", title: "Mark", author: "Marcus", collection: "Koine New Testament", lang: "greek", chapters: [{}] },
  { id: "luke", title: "Luke", author: "Lucas", collection: "Koine New Testament", lang: "greek", chapters: [{}, {}, {}] },
  { id: "john", title: "John", author: "Ioannes", collection: "Koine New Testament", lang: "greek", chapters: [{}, {}] },
  { id: "aeneid", title: "Aeneid", author: "Vergilius", lang: "latin", chapters: [{}] },
  { id: "eclogues", title: "Eclogues", author: "Vergilius", lang: "latin", chapters: [{}, {}] }
];

function createRuntime(elements = {}) {
  const document = {
    addEventListener() {},
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {}, contains() { return false; } } }
  };
  const context = {
    Blob,
    URL,
    console,
    document,
    fetch() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return context;
}

function getGroups(context) {
  return JSON.parse(vm.runInContext(`JSON.stringify(libraryGroups(${JSON.stringify(books)}))`, context));
}

test("libraryGroups groups collection members first in source order", () => {
  const groups = getGroups(createRuntime());

  assert.equal(groups.length, 2);
  assert.equal(groups[0].key, "collection:Koine New Testament");
  assert.equal(groups[0].label, "Koine New Testament");
  assert.deepEqual(groups[0].books.map((book) => book.id), ["matthew", "mark", "luke", "john"]);
});

test("libraryGroups falls back to author groups without a collection", () => {
  const group = getGroups(createRuntime()).find((item) => item.key === "author:Vergilius");

  assert.equal(group.label, "Vergilius");
  assert.deepEqual(group.books.map((book) => book.id), ["aeneid", "eclogues"]);
});

test("libraryGroupSummary counts texts, language, and sections", () => {
  const context = createRuntime();
  const summary = vm.runInContext(
    `libraryGroupSummary(libraryGroups(${JSON.stringify(books)})[0])`,
    context
  );

  assert.equal(summary, "4 texts · Greek · 8 sections");
});

test("a single-chapter collection text returns to its collection label", () => {
  const backButton = { style: {}, textContent: "" };
  const context = createRuntime({ "back-btn": backButton });
  const collectionBook = { ...books[1], chapters: [{}] };

  vm.runInContext(`state.books = ${JSON.stringify([collectionBook])}; state.completed = {}; selectBook(0, 0)`, context);

  assert.equal(backButton.textContent, "← Koine New Testament");
});
