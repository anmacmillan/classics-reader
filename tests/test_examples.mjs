import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function createRuntime() {
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {}, contains() { return false; } } }
  };
  const context = {
    Blob, URL, console, document,
    fetch() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  vm.runInContext(`
    state.books = [
      { id: "caesar", author: "Caesar", title: "Caesar — BG", lang: "latin",
        chapters: [{ title: "I", lines: ["Gallia est omnis divisa in partes tres.", "Horum omnium fortissimi sunt Belgae."] }] },
      { id: "cicero", author: "Cicero", title: "Cicero — Off.", lang: "latin",
        chapters: [{ title: "A", lines: ["Omnis est honesti ratio."], translationNl: ["Alle ..."] }, { title: "B", lines: ["Omnis vita."] }] }
    ];
    state.completed = { cicero: new Set([1]) };
  `, context);
  return context;
}

const index = { books: ["caesar", "cicero"], lemmas: { omnis: [[0, 0, 0, 2], [0, 0, 1, 1], [1, 0, 0, 0], [1, 1, 0, 0]] } };

function pick(here) {
  const context = createRuntime();
  return JSON.parse(vm.runInContext(
    `JSON.stringify(pickExamples(${JSON.stringify(index)}, "omnis", ${JSON.stringify(here)}).map((e) => [e.book.id, e.chapterIndex, e.lineIndex, e.read]))`,
    context
  ));
}

test("other works come first, read chapters before unread, and the current line is never offered", () => {
  assert.deepEqual(pick({ bookId: "caesar", chapterIndex: 0, lineIndex: 0 }), [
    ["cicero", 1, 0, true],
    ["cicero", 0, 0, false],
    ["caesar", 0, 1, false]
  ]);
});

test("without a reading place every indexed occurrence is a candidate", () => {
  assert.equal(pick(null).length, 3);
});

test("missing index or unknown lemma yields no examples", () => {
  const context = createRuntime();
  assert.equal(vm.runInContext(`pickExamples(null, "omnis", null).length`, context), 0);
  assert.equal(vm.runInContext(`pickExamples(${JSON.stringify(index)}, "nemo", null).length`, context), 0);
});

test("snippets window the line, mark the word without its punctuation, and escape", () => {
  const context = createRuntime();
  const html = vm.runInContext(`exampleSnippetHtml("a b c d e f g h i j k l m <n> o, p q r", 14)`, context);
  assert.equal(html, "… j k l m &lt;n&gt; <mark>o</mark>, p q r");
});
