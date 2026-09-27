#!/usr/bin/env node
// Build the "examples from the literature" index shown in the word popup.
//
// Every line of every book is run through the app's own tokenizer and
// dictionary lookup (app.js is loaded in a VM exactly as the tests do), so an
// example is only ever indexed under the lemma the reader would show for that
// word. Greek forms whose entry joins several lemmas ("ὅς / ὁ") are skipped:
// an example for the wrong homograph would mislead more than it helps. So are
// Whitaker's stem-only pronoun and numeral lemmas ("qu PRON", "tr NUM"), which
// lump qui with quis and tres with tertius.
//
// Output, per language: generated/examples/<lang>.json
//   { "books": [bookId, ...], "lemmas": { lemma: [[book, chapter, line, word], ...] } }
// where chapter indexes the reader's chapters (previews filtered out, as in
// app.js) and word counts non-space tokens in the line. Up to MAX_PER_LEMMA
// occurrences are kept, spread round-robin across works, shortest lines first.
// The app picks from these at runtime (other works first, lines already read
// marked). generated/examples/manifest.js carries content-hashed URLs.
//
//   node scripts/build_examples.mjs          rebuild
//   node scripts/build_examples.mjs --check  fail if the output is stale

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = path.join(ROOT, "generated", "examples");
const MAX_PER_LEMMA = 8;
const MIN_OCCURRENCES = 2;
const LOOSE_LEMMA = /^\S+ (?:PRON|NUM)$/;

// Same load order as index.html; app.js last, against a stub DOM.
const SCRIPTS = [
  "data.js",
  "dictionary.js",
  "generated/imported-books.js",
  "generated/imported-latin-dictionary.js",
  "generated/imported-greek-dictionary.js",
  "generated/imported-old-english-dictionary.js",
  "generated/imported-middle-dutch-dictionary.js",
  "generated/imported-dutch-dictionary.js",
  "generated/imported-danish-dictionary.js",
  "generated/core-vocabulary.js",
  "app.js",
];

function createRuntime() {
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { setAttribute() {} },
    body: { classList: { add() {}, remove() {}, contains() { return false; } } },
  };
  const context = {
    Blob, URL, console, document,
    fetch() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
    window: { matchMedia() { return { matches: false }; } },
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const file of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
  }
  return context;
}

function collect(context) {
  return JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const out = {};
    BOOKS.forEach((book) => {
      const chapters = book.chapters.filter((chapter) => !chapter.isPreview);
      chapters.forEach((chapter, c) => {
        (chapter.lines || []).forEach((line, l) => {
          const tokens = String(line).split(/\\s+/).filter(Boolean);
          tokens.forEach((token, w) => {
            const { word } = splitIntoWordAndPunctuation(token);
            const entry = getDictionaryEntry(word, book.lang);
            // The key the popup uses (data-lemma): older dictionary.js entries
            // carry only a definition, shared by every form of the word.
            const lemma = entry && (entry.lemma || entry.def);
            if (!lemma || lemma.includes(" / ")) return;
            const lang = (out[book.lang] ||= {});
            (lang[lemma] ||= []).push([book.id, c, l, w, tokens.length]);
          });
        });
      });
    });
    return out;
  })())`, context));
}

// Round-robin across works so one long text cannot crowd out the rest;
// within a work prefer short lines (they make readable examples).
function select(occurrences) {
  const byBook = new Map();
  for (const occurrence of occurrences) {
    if (!byBook.has(occurrence[0])) byBook.set(occurrence[0], []);
    byBook.get(occurrence[0]).push(occurrence);
  }
  const queues = [...byBook.values()].map((list) => {
    const seenLines = new Set();
    return list
      .sort((a, b) => a[4] - b[4] || a[1] - b[1] || a[2] - b[2])
      .filter(([, c, l]) => !seenLines.has(`${c}:${l}`) && seenLines.add(`${c}:${l}`));
  });
  const chosen = [];
  while (chosen.length < MAX_PER_LEMMA && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      if (queue.length && chosen.length < MAX_PER_LEMMA) chosen.push(queue.shift());
    }
  }
  return chosen;
}

function build() {
  const byLang = collect(createRuntime());
  const files = {};
  for (const [lang, lemmas] of Object.entries(byLang).sort()) {
    const books = [];
    const bookIndex = new Map();
    const index = {};
    for (const lemma of Object.keys(lemmas).sort()) {
      const occurrences = lemmas[lemma];
      if (occurrences.length < MIN_OCCURRENCES || LOOSE_LEMMA.test(lemma)) continue;
      index[lemma] = select(occurrences).map(([id, c, l, w]) => {
        if (!bookIndex.has(id)) { bookIndex.set(id, books.length); books.push(id); }
        return [bookIndex.get(id), c, l, w];
      });
    }
    files[`${lang}.json`] = JSON.stringify({ books, lemmas: index }) + "\n";
  }
  const urls = Object.fromEntries(Object.entries(files).map(([name, payload]) => {
    const digest = crypto.createHash("sha256").update(payload).digest("hex").slice(0, 10);
    return [name.replace(/\.json$/, ""), `generated/examples/${name}?v=${digest}`];
  }));
  files["manifest.js"] =
    "// AUTO-GENERATED by scripts/build_examples.mjs. Do not edit manually.\n" +
    `const EXAMPLE_FILES = ${JSON.stringify(urls, null, 2)};\n`;
  return files;
}

const files = build();
const existing = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR) : [];
if (process.argv.includes("--check")) {
  const stale = existing.sort().join() !== Object.keys(files).sort().join() ||
    Object.entries(files).some(([name, payload]) => fs.readFileSync(path.join(OUT_DIR, name), "utf8") !== payload);
  if (stale) {
    console.error("ERROR: generated/examples/ is out of date; run make examples");
    process.exit(1);
  }
  console.log("Examples index is up to date.");
} else {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const name of existing) if (!(name in files)) fs.unlinkSync(path.join(OUT_DIR, name));
  for (const [name, payload] of Object.entries(files)) fs.writeFileSync(path.join(OUT_DIR, name), payload);
  for (const [name, payload] of Object.entries(files)) {
    if (name.endsWith(".json")) {
      const data = JSON.parse(payload);
      console.log(`${name}: ${Object.keys(data.lemmas).length} lemmas, ${(payload.length / 1024).toFixed(0)} KB`);
    }
  }
}
