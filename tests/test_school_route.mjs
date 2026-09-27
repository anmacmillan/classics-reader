import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

const tag = (network, stage, status, genres) => ({ network, stage, status, genres });
const books = [
  { id: "ovid", author: "Ovidius", year: 8, lang: "latin", chapters: [{}],
    curriculum: [tag("kov", "second-degree", "required-author", ["myth"]), tag("go", "second-degree", "supporting-text", ["myth"])] },
  { id: "caesar", author: "Caesar", year: -50, lang: "latin", chapters: [{}],
    curriculum: [tag("kov", "second-degree", "required-author", ["historiography"]), tag("go", "second-degree", "required-genre-example", ["historiography"])] },
  { id: "bede", author: "Beda", year: 731, lang: "latin", chapters: [{}],
    curriculum: [tag("go", "second-degree", "supporting-text", ["post-classical"])] },
  { id: "tacitus", author: "Tacitus", year: 100, lang: "latin", chapters: [{}],
    curriculum: [tag("kov", "third-degree", "required-author", ["historiography"])] },
  { id: "homer", author: "Homerus", year: -800, lang: "greek", chapters: [{}],
    curriculum: [tag("kov", "second-degree", "required-author", ["epic"])] },
  { id: "untagged", author: "Petrarca", year: 1336, lang: "latin", chapters: [{}] }
];

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
  return context;
}

function route(filters) {
  const context = createRuntime();
  return JSON.parse(vm.runInContext(
    `JSON.stringify(schoolRouteBooks(${JSON.stringify(books)}, ${JSON.stringify(filters)}).map((m) => [m.book.id, m.status, m.networks]))`,
    context
  ));
}

test("both profiles rank required authors first and keep the strongest status per book", () => {
  assert.deepEqual(route({ profile: "both", stage: "second-degree", lang: "latin" }), [
    ["caesar", "required-author", ["kov", "go"]],
    ["ovid", "required-author", ["kov", "go"]],
    ["bede", "supporting-text", ["go"]]
  ]);
});

test("a single network shows only its own tags and statuses", () => {
  assert.deepEqual(route({ profile: "go", stage: "second-degree", lang: "latin" }), [
    ["caesar", "required-genre-example", ["go"]],
    ["ovid", "supporting-text", ["go"]],
    ["bede", "supporting-text", ["go"]]
  ]);
  assert.deepEqual(route({ profile: "kov", stage: "third-degree", lang: "latin" }), [
    ["tacitus", "required-author", ["kov"]]
  ]);
});

test("language and stage filter, and untagged books never appear", () => {
  assert.deepEqual(route({ profile: "both", stage: "second-degree", lang: "greek" }), [
    ["homer", "required-author", ["kov"]]
  ]);
  const all = ["second-degree", "third-degree"].flatMap((stage) =>
    ["latin", "greek"].flatMap((lang) => route({ profile: "both", stage, lang }).map(([id]) => id)));
  assert.ok(!all.includes("untagged"));
});
