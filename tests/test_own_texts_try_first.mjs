import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function createRuntime(extra = {}) {
  const store = new Map();
  const context = {
    Blob,
    URL,
    console,
    document: {
      addEventListener() {},
      getElementById() { return null; },
      querySelector() { return null; },
      querySelectorAll() { return []; },
      documentElement: { setAttribute() {} },
      body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } }
    },
    fetch() {},
    localStorage: {
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); }
    },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } },
    ...extra
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: "app.js" });
  return context;
}

const run = (runtime, expression) => vm.runInContext(expression, runtime);

test("pasted prose is rejoined across page line breaks and cut into sentences", () => {
  const runtime = createRuntime();
  runtime.text = "Gallia est omnis divisa in par-\ntes tres. Quarum unam incolunt\nBelgae, aliam Aquitani! Quis\nhoc negat? Clamat: \"Porta saccos!\" Sed asinus stat.";
  assert.deepEqual(
    [...run(runtime, 'splitOwnText(text, "latin", false)')],
    ["Gallia est omnis divisa in partes tres.", "Quarum unam incolunt Belgae, aliam Aquitani!", "Quis hoc negat?",
      "Clamat: \"Porta saccos!\"", "Sed asinus stat."]
  );
});

test("verse keeps its lines, and Greek ends sentences at its question mark and high dot", () => {
  const runtime = createRuntime();
  runtime.verse = "Arma virumque cano, Troiae qui primus ab oris\nItaliam, fato profugus, Laviniaque venit";
  assert.equal(run(runtime, 'splitOwnText(verse, "latin", true)').length, 2);
  runtime.greek = "τίς εἶ; ἐγὼ Σωκράτης· σὺ δὲ τίς;";
  assert.deepEqual([...run(runtime, 'splitOwnText(greek, "greek", false)')], ["τίς εἶ;", "ἐγὼ Σωκράτης·", "σὺ δὲ τίς;"]);
});

test("an own text becomes a one-chapter book on its own shelf and is stored locally", () => {
  const runtime = createRuntime();
  run(runtime, 'state.books = []; addOwnText({ title: "Les 3", lang: "latin", text: "Puella rosam amat.", keepLines: false })');
  const book = run(runtime, "state.books[0]");
  assert.equal(book.collection, "Eigen teksten");
  assert.ok(book.own);
  assert.ok(book.id.startsWith("own-"));
  assert.deepEqual([...book.chapters[0].lines], ["Puella rosam amat."]);
  assert.equal(run(runtime, "loadOwnTexts().length"), 1);
  run(runtime, "deleteOwnText(state.books[0].id)");
  assert.equal(run(runtime, "loadOwnTexts().length + state.books.length"), 0);
});

test("words saved from an own text carry no title into the shared record", () => {
  const runtime = createRuntime();
  run(runtime, 'state.books = []; addOwnText({ title: "Toets hoofdstuk 4", lang: "latin", text: "Puella rosam amat.", keepLines: false }); state.currentBookIndex = 0; state.currentChapterIndex = 0');
  const entry = run(runtime, 'vocabularyEntryFor("rosam", "rosa", "rose", "roos", "zn.", "latin")');
  assert.equal(entry.work, "");
  assert.equal(entry.chapter, "");
  assert.doesNotMatch(JSON.stringify(entry), /Toets/);
});

test("try-first checks form, number and sentence role against the analysis", () => {
  const runtime = createRuntime();
  runtime.grammar = "zn. · 1e declinatie · accusatief enkelvoud vrouwelijk";
  runtime.syntax = { role: "obj", morph: "Case=Acc|Number=Sing" };
  runtime.guess = { form: "accusatief", number: "meervoud", role: "lijdend voorwerp", meaning: "roos" };
  const rows = run(runtime, "checkGuess(guess, grammar, syntax)");
  assert.deepEqual([...rows.map(({ label, ok }) => `${label}:${ok}`)], ["Vorm:true", "Getal:false", "Zinsdeel:true"]);
});

test("an ambiguous form accepts any of its analyses and says so", () => {
  const runtime = createRuntime();
  runtime.grammar = "zn. · 1e declinatie · genitief enkelvoud vrouwelijk of zn. · 1e declinatie · nominatief meervoud vrouwelijk";
  runtime.guess = { form: "nominatief", number: "", role: "", meaning: "" };
  const [row] = run(runtime, "checkGuess(guess, grammar, null)");
  assert.equal(row.ok, true);
  assert.equal(row.ambiguous, true);
});

test("verb forms are recognised as persoonsvorm, infinitief and participium", () => {
  const runtime = createRuntime();
  const cases = [
    ["ww. · indicatief praesens actief · 3e persoon enkelvoud", "persoonsvorm", true],
    ["ww. · infinitief praesens actief", "infinitief", true],
    ["gerundivum · nominatief enkelvoud onzijdig", "participium", true],
    ["vz. + ablatief", "onverbuigbaar", true],
    ["ww. · infinitief praesens actief", "persoonsvorm", false]
  ];
  for (const [grammar, form, expected] of cases) {
    runtime.grammar = grammar;
    runtime.form = form;
    assert.equal(run(runtime, 'checkGuess({ form, number: "", role: "", meaning: "" }, grammar)[0].ok'), expected, `${form} / ${grammar}`);
  }
});
