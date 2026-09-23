// Analyse Latin words the bundled dictionary does not know, for texts a reader
// pastes in herself (her own schoolbook passage). Runs Whitaker's Words in the
// browser; its 1.2 MB (gzipped) data is fetched only when this module is first
// used, then kept by the service worker like any other asset.
//
// Entries take the same shape the build pipeline writes into
// generated/imported-latin-dictionary.js, so the popup treats them alike.

import { WordsEngine, dictionaryForm } from "./vendor/whitakers-words/lib/index.js";

const DATA_FILES = ["DICTLINE.GEN", "DICTLINE.SUP", "INFLECTS.LAT", "ADDONS.LAT", "UNIQUES.LAT"];
let enginePromise = null;

function loadEngine() {
  enginePromise ||= Promise.all(DATA_FILES.map(async (name) => {
    const response = await fetch(`vendor/whitakers-words/data/${name}`);
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    return response.text();
  })).then(([dictGen, dictSup, inflects, addons, uniques]) => WordsEngine.create({
    dictline: `${dictGen}\n${dictSup}`, inflects, addons, uniques
  }));
  enginePromise.catch(() => { enginePromise = null; });
  return enginePromise;
}

// Mirrors grammarFor() in scripts/build_latin_import_dictionary.mjs.
function grammarFor(qual) {
  const type = qual.pofs;
  const detail = qual[type.toLowerCase()] || qual.verb || qual.noun || qual.pron || qual.adj || qual.vpar;
  if (!detail) return type;
  const join = (values) => values.filter((value) => value !== undefined).join(" ");
  if (type === "V") {
    const tvm = detail.tenseVoiceMood;
    return join([type, detail.con?.which, detail.con?.var, tvm?.tense, tvm?.voice, tvm?.mood, detail.person, detail.number]);
  }
  if (type === "VPAR") {
    const tvm = detail.tenseVoiceMood;
    return join([type, detail.con?.which, detail.con?.var, detail.cs, detail.number, detail.gender, tvm?.tense, tvm?.voice, tvm?.mood]);
  }
  if (type === "N" || type === "PRON" || type === "PACK") {
    return join([type, detail.decl?.which, detail.decl?.var, detail.cs, detail.number, detail.gender]);
  }
  if (type === "ADJ") {
    return join([type, detail.decl?.which, detail.decl?.var, detail.cs, detail.number, detail.gender, detail.comparison]);
  }
  return type;
}

const cleanMeaning = (value) => String(value || "").replace(/\s+/g, " ").replace(/;+$/, "");
const entryFrom = (result, qual = result.ir?.qual) => ({
  lemma: dictionaryForm(result.de).replace(/\s+/g, " ").trim(),
  en: cleanMeaning(result.de.mean),
  grammar: grammarFor(qual)
});

function entryFor(engine, word) {
  const analysis = engine.parseWord(word);
  if (analysis.results.length) return entryFrom(analysis.results[0]);
  if (analysis.uniqueResults.length) return entryFrom(analysis.uniqueResults[0], analysis.uniqueResults[0].qual);
  const addon = analysis.addonResults[0];
  if (addon?.baseResults.length) {
    // virumque: the base word's meaning, then the enclitic's.
    const entry = entryFrom(addon.baseResults[0]);
    return {
      ...entry,
      en: `${entry.en}; ${cleanMeaning(addon.addon.mean)}`,
      grammar: `${entry.grammar} + ${addon.type.toUpperCase()}`
    };
  }
  return null;
}

// words: lower-cased lookup keys. Returns { key: entry } for those it could analyse.
export async function analyseLatinWords(words) {
  const engine = await loadEngine();
  const entries = {};
  for (const word of words) {
    const entry = entryFor(engine, word);
    if (entry) entries[word] = entry;
  }
  return entries;
}
