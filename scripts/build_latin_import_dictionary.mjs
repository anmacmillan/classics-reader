#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine, dictionaryForm } from "whitakers-words/node";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMPORTS_DIR = path.join(ROOT, "imports");
const BASE_DICTIONARY = path.join(ROOT, "dictionary.js");
const OUTPUT = path.join(ROOT, "generated", "imported-latin-dictionary.js");

const OVERRIDES = {
  abierunt: { lemma: "abeo, abire, abii, abitus", en: "they departed; they passed away", grammar: "V PERF ACTIVE IND 3 P" },
  alicuius: { lemma: "aliquis, aliquid", en: "of someone; of something", grammar: "PRON GEN S" },
  antiochi: { lemma: "Antiochus, Antiochi", en: "of Antiochus", grammar: "N GEN S M (proper name)" },
  appropinquasse: { lemma: "appropinquo, appropinquare, appropinquavi", en: "to have approached", grammar: "V PERF ACTIVE INF" },
  aristotelen: { lemma: "Aristoteles, Aristotelis", en: "Aristotle", grammar: "N ACC S M (proper name)" },
  aristotelis: { lemma: "Aristoteles, Aristotelis", en: "of Aristotle", grammar: "N GEN S M (proper name)" },
  auentinum: { lemma: "Aventinus, Aventina, Aventinum", en: "the Aventine", grammar: "ADJ ACC S M (proper name)" },
  boccho: { lemma: "Bocchus, Bocchi", en: "to or by Bocchus", grammar: "N DAT/ABL S M (proper name)" },
  caepionis: { lemma: "Caepio, Caepionis", en: "of Caepio", grammar: "N GEN S M (proper name)" },
  carneade: { lemma: "Carneades, Carneadis", en: "Carneades", grammar: "N ABL S M (proper name)" },
  catilinas: { lemma: "Catilina, Catilinae", en: "Catilines; men like Catiline", grammar: "N ACC P M (proper name)" },
  ciuibus: { lemma: "civis, civis", en: "to or among citizens", grammar: "N DAT/ABL P C" },
  clientibus: { lemma: "cliens, clientis", en: "to or among clients", grammar: "N DAT/ABL P C" },
  concupiit: { lemma: "concupisco, concupiscere, concupivi", en: "desired eagerly", grammar: "V PERF ACTIVE IND 3 S" },
  danuuium: { lemma: "Danuvius, Danuvii", en: "the Danube", grammar: "N ACC S M (proper name)" },
  datast: { lemma: "data est", en: "has been given", grammar: "V PERF PASSIVE IND 3 S (contracted)" },
  democritum: { lemma: "Democritus, Democriti", en: "Democritus", grammar: "N ACC S M (proper name)" },
  desiimus: { lemma: "desino, desinere, desii, desitus", en: "we ceased; we stopped", grammar: "V PERF ACTIVE IND 1 P" },
  desiit: { lemma: "desino, desinere, desii, desitus", en: "ceased; stopped", grammar: "V PERF ACTIVE IND 3 S" },
  drusus: { lemma: "Drusus, Drusi", en: "Drusus", grammar: "N NOM S M (proper name)" },
  duilius: { lemma: "Duilius, Duilii", en: "Duilius", grammar: "N NOM S M (proper name)" },
  duplicasse: { lemma: "duplico, duplicare, duplicavi, duplicatus", en: "to have doubled", grammar: "V PERF ACTIVE INF" },
  effocantur: { lemma: "effoco, effocare, effocavi, effocatus", en: "are choked; are suffocated", grammar: "V PRES PASSIVE IND 3 P" },
  foratosque: { lemma: "foratus, forata, foratum", en: "pierced, and", grammar: "ADJ ACC P M + TACKON" },
  gracchana: { lemma: "Gracchanus, Gracchana, Gracchanum", en: "of the Gracchi; Gracchan", grammar: "ADJ ACC P N" },
  insanierint: { lemma: "insanio, insanire, insanivi", en: "have been mad; have raved", grammar: "V PERF ACTIVE SUB 3 P" },
  interierit: { lemma: "intereo, interire, interii, interitus", en: "will have perished; has died", grammar: "V FUTP ACTIVE IND 3 S" },
  laborasse: { lemma: "laboro, laborare, laboravi, laboratus", en: "to have worked; to have suffered", grammar: "V PERF ACTIVE INF" },
  mimorum: { lemma: "mimus, mimi", en: "of mimes; of actors", grammar: "N GEN P M" },
  nauigasse: { lemma: "navigo, navigare, navigavi, navigatus", en: "to have sailed", grammar: "V PERF ACTIVE INF" },
  nosse: { lemma: "nosco, noscere, novi, notus", en: "to know", grammar: "V PERF ACTIVE INF (syncopated)" },
  odyssia: { lemma: "Odyssea, Odysseae", en: "the Odyssey", grammar: "N NOM S F (proper name)" },
  praeterierint: { lemma: "praetereo, praeterire, praeterii, praeteritus", en: "have passed by", grammar: "V PERF ACTIVE SUB 3 P" },
  pythagoran: { lemma: "Pythagoras, Pythagorae", en: "Pythagoras", grammar: "N ACC S M (proper name)" },
  quantumlibet: { lemma: "quantumlibet", en: "however much; as much as you please", grammar: "ADV" },
  quendam: { lemma: "quidam, quaedam, quoddam", en: "a certain man; someone", grammar: "PRON ACC S M" },
  quoi: { lemma: "qui, quae, quod", en: "to whom; for whom", grammar: "PRON DAT S (archaic)" },
  remigum: { lemma: "remex, remigis", en: "of rowers", grammar: "N GEN P M" },
  renuntiassent: { lemma: "renuntio, renuntiare, renuntiavi, renuntiatus", en: "had announced; had reported", grammar: "V PLUP ACTIVE SUB 3 P" },
  semisomnes: { lemma: "semisomnis, semisomne", en: "half-asleep", grammar: "ADJ NOM P C" },
  theophrastum: { lemma: "Theophrastus, Theophrasti", en: "Theophrastus", grammar: "N ACC S M (proper name)" },
  transierit: { lemma: "transeo, transire, transii, transitus", en: "will have passed; has crossed", grammar: "V FUTP ACTIVE IND 3 S" },
  turannius: { lemma: "Turannius, Turannii", en: "Turannius", grammar: "N NOM S M (proper name)" },
  apatheian: { lemma: "apatheia", en: "freedom from passion; impassivity", grammar: "GREEK TERM ACC S F" },
  aristoteles: { lemma: "Aristoteles, Aristotelis", en: "Aristotle", grammar: "N NOM S M (proper name)" },
  athenodorum: { lemma: "Athenodorus, Athenodori", en: "Athenodorus", grammar: "N ACC S M (proper name)" },
  audisset: { lemma: "audio, audire, audivi, auditus", en: "had heard", grammar: "V PLUP ACTIVE SUB 3 S" },
  bebōtai: { lemma: "bebōtai", en: "he has lived; life is complete", grammar: "GREEK TERM" },
  chrysippi: { lemma: "Chrysippus, Chrysippi", en: "of Chrysippus", grammar: "N GEN S M (proper name)" },
  cleanthes: { lemma: "Cleanthes, Cleanthis", en: "Cleanthes", grammar: "N NOM S M (proper name)" },
  demetrio: { lemma: "Demetrius, Demetrii", en: "to Demetrius", grammar: "N DAT S M (proper name)" },
  democritus: { lemma: "Democritus, Democriti", en: "Democritus", grammar: "N NOM S M (proper name)" },
  desierunt: { lemma: "desino, desinere, desii, desitus", en: "they ceased; they stopped", grammar: "V PERF ACTIVE IND 3 P" },
  epicuri: { lemma: "Epicurus, Epicuri", en: "of Epicurus", grammar: "N GEN S M (proper name)" },
  epicuro: { lemma: "Epicurus, Epicuri", en: "to or by Epicurus", grammar: "N DAT/ABL S M (proper name)" },
  epicurus: { lemma: "Epicurus, Epicuri", en: "Epicurus", grammar: "N NOM S M (proper name)" },
  expunxi: { lemma: "expungo, expungere, expunxi, expunctus", en: "I crossed out; I cancelled", grammar: "V PERF ACTIVE IND 1 S" },
  fatigasse: { lemma: "fatigo, fatigare, fatigavi, fatigatus", en: "to have wearied; to have exhausted", grammar: "V PERF ACTIVE INF" },
  hecaton: { lemma: "Hecato, Hecatonis", en: "Hecato", grammar: "N NOM S M (proper name)" },
  heraclitus: { lemma: "Heraclitus, Heracliti", en: "Heraclitus", grammar: "N NOM S M (proper name)" },
  hermarchum: { lemma: "Hermarchus, Hermarchi", en: "Hermarchus", grammar: "N ACC S M (proper name)" },
  hominibus: { lemma: "homo, hominis", en: "to or among people", grammar: "N DAT/ABL P C" },
  laelio: { lemma: "Laelius, Laelii", en: "Laelius", grammar: "N DAT/ABL S M (proper name)" },
  laelium: { lemma: "Laelius, Laelii", en: "Laelius", grammar: "N ACC S M (proper name)" },
  metrodorum: { lemma: "Metrodorus, Metrodori", en: "Metrodorus", grammar: "N ACC S M (proper name)" },
  pacuvius: { lemma: "Pacuvius, Pacuvii", en: "Pacuvius", grammar: "N NOM S M (proper name)" },
  phidias: { lemma: "Phidias, Phidiae", en: "Phidias", grammar: "N NOM S M (proper name)" },
  philositi: { lemma: "Philositus, Philositi", en: "of Philositus", grammar: "N GEN S M (proper name)" },
  platon: { lemma: "Plato, Platonis", en: "Plato", grammar: "N NOM S M (proper name)" },
  poliorcetes: { lemma: "Poliorcetes, Poliorcetis", en: "Poliorcetes", grammar: "N NOM S M (proper name)" },
  polyaenum: { lemma: "Polyaenus, Polyaeni", en: "Polyaenus", grammar: "N ACC S M (proper name)" },
  postulaticiis: { lemma: "postulaticius, postulaticia, postulaticium", en: "requested by the crowd; demanded", grammar: "ADJ DAT/ABL P M" },
  proximam: { lemma: "proximus, proxima, proximum", en: "nearest; next", grammar: "ADJ ACC S F SUPER" },
  publilii: { lemma: "Publilius, Publilii", en: "of Publilius", grammar: "N GEN S M (proper name)" },
  quorundam: { lemma: "quidam, quaedam, quoddam", en: "of certain people; of some", grammar: "PRON GEN P M" },
  stilbon: { lemma: "Stilbo, Stilbonis", en: "Stilbo", grammar: "N NOM S M (proper name)" },
  abierit: { lemma: "abeo, abire, abii, abitus", en: "will have gone away; has departed", grammar: "V FUTP ACTIVE IND 3 S" },
  chaereae: { lemma: "Chaerea, Chaereae", en: "of Chaerea", grammar: "N GEN S M (proper name)" },
  desieris: { lemma: "desino, desinere, desii, desitus", en: "you will have ceased; you stop", grammar: "V FUTP ACTIVE IND 2 S" },
  epicurum: { lemma: "Epicurus, Epicuri", en: "Epicurus", grammar: "N ACC S M (proper name)" },
  hecatonem: { lemma: "Hecato, Hecatonis", en: "Hecato", grammar: "N ACC S M (proper name)" },
  hostium: { lemma: "hostis, hostis", en: "of enemies", grammar: "N GEN P C" },
  negasti: { lemma: "nego, negare, negavi, negatus", en: "you denied; you said no", grammar: "V PERF ACTIVE IND 2 S" },
  nosti: { lemma: "nosco, noscere, novi, notus", en: "you know", grammar: "V PERF ACTIVE IND 2 S" },
  perierunt: { lemma: "pereo, perire, perii, peritus", en: "they perished; they were lost", grammar: "V PERF ACTIVE IND 3 P" },
  pomponium: { lemma: "Pomponius, Pomponii", en: "Pomponius", grammar: "N ACC S M (proper name)" },
  puerorum: { lemma: "puer, pueri", en: "of boys; of children", grammar: "N GEN P M" },
  quidam: { lemma: "quidam, quaedam, quoddam", en: "a certain man; someone", grammar: "PRON NOM S M" },
  regum: { lemma: "rex, regis", en: "of kings", grammar: "N GEN P M" },
  theophrasti: { lemma: "Theophrastus, Theophrasti", en: "of Theophrastus", grammar: "N GEN S M (proper name)" },
  vocasti: { lemma: "voco, vocare, vocavi, vocatus", en: "you called; you named", grammar: "V PERF ACTIVE IND 2 S" },
  agentibus: {
    lemma: "ago, agere, egi, actus",
    en: "doing; acting",
    grammar: "VPAR PRES ACTIVE ABL P"
  },
  aliena: {
    lemma: "alienus, aliena, alienum",
    en: "belonging to another; another's",
    grammar: "ADJ NOM P N"
  },
  aliquod: {
    lemma: "aliquis, aliquid",
    en: "some; any",
    grammar: "PRON ACC S N"
  },
  attendere: {
    lemma: "attendo, attendere, attendi, attentus",
    en: "to pay attention; to notice",
    grammar: "V PRES ACTIVE INF"
  },
  bono: {
    lemma: "bonus, bona, bonum",
    en: "good; favourable",
    grammar: "ADJ ABL S N"
  },
  complectere: {
    lemma: "complector, complecti, complexus sum",
    en: "embrace; seize; hold fast",
    grammar: "V PRES IMP 2 S DEP"
  },
  crastino: {
    lemma: "crastinus, crastina, crastinum",
    en: "tomorrow; the future",
    grammar: "ADJ ABL S N"
  },
  debere: {
    lemma: "debeo, debere, debui, debitus",
    en: "to owe; to be obliged",
    grammar: "V PRES ACTIVE INF"
  },
  diligentem: {
    lemma: "diligens, diligentis",
    en: "careful; diligent",
    grammar: "ADJ ACC S M"
  },
  evenit: {
    lemma: "evenio, evenire, eveni, eventus",
    en: "happens; occurs",
    grammar: "V PRES ACTIVE IND 3 S"
  },
  facere: {
    lemma: "facio, facere, feci, factus",
    en: "to do; to make",
    grammar: "V PRES ACTIVE INF"
  },
  fundo: {
    lemma: "fundus, fundi",
    en: "bottom; lowest part",
    grammar: "N ABL S M"
  },
  hodierno: {
    lemma: "hodiernus, hodierna, hodiernum",
    en: "today; the present day",
    grammar: "ADJ ABL S N"
  },
  iactura: {
    lemma: "iactura, iacturae",
    en: "loss; waste",
    grammar: "N NOM S F"
  },
  imo: {
    lemma: "imus, ima, imum",
    en: "lowest; bottom",
    grammar: "ADJ ABL S N SUPER"
  },
  ingenue: {
    lemma: "ingenue",
    en: "frankly; candidly",
    grammar: "ADV"
  },
  ista: {
    lemma: "iste, ista, istud",
    en: "those things; these teachings",
    grammar: "PRON ACC P N"
  },
  lucili: {
    lemma: "Lucilius",
    en: "Lucilius",
    grammar: "N 2 VOC S M (proper name)"
  },
  luxuriosum: {
    lemma: "luxuriosus, luxuriosa, luxuriosum",
    en: "extravagant; wasteful",
    grammar: "ADJ ACC S M"
  },
  male: {
    lemma: "male",
    en: "badly; wrongly",
    grammar: "ADV"
  },
  minima: {
    lemma: "parvus, parva, parvum",
    en: "smallest; least important",
    grammar: "ADJ SUPER NOM P N"
  },
  minus: {
    lemma: "minus",
    en: "less",
    grammar: "ADV COMP"
  },
  mori: {
    lemma: "morior, mori, mortuus sum",
    en: "to die",
    grammar: "V PRES INF DEP"
  },
  pessimum: {
    lemma: "malus, mala, malum",
    en: "worst; the worst thing",
    grammar: "ADJ SUPER NOM S N"
  },
  praeterit: {
    lemma: "praetereo, praeterire, praeterii, praeteritus",
    en: "has passed; has gone by",
    grammar: "V PERF ACTIVE IND 3 S"
  },
  pretium: {
    lemma: "pretium, pretii",
    en: "value; price; worth",
    grammar: "N ACC S N"
  },
  quaedam: {
    lemma: "quidam, quaedam, quoddam",
    en: "certain; some",
    grammar: "PRON NOM P N"
  },
  reparabilia: {
    lemma: "reparabilis, reparabile",
    en: "replaceable; recoverable",
    grammar: "ADJ NOM P N"
  },
  sat: {
    lemma: "sat",
    en: "enough; sufficiently",
    grammar: "ADV"
  },
  tempore: {
    lemma: "tempus, temporis",
    en: "time; occasion",
    grammar: "N ABL S N"
  },
  turpissima: {
    lemma: "turpis, turpe",
    en: "most disgraceful",
    grammar: "ADJ SUPER NOM S F"
  },
  unum: {
    lemma: "unus, una, unum",
    en: "one; the only thing",
    grammar: "ADJ NOM S N"
  },
  vilissima: {
    lemma: "vilis, vile",
    en: "cheapest; most worthless",
    grammar: "ADJ SUPER NOM P N"
  },
  visum: {
    lemma: "video, videre, vidi, visus",
    en: "it seemed good; it was judged",
    grammar: "VPAR PERF PASSIVE NOM S N"
  },
  vitio: {
    lemma: "vitium, vitii",
    en: "fault; blame",
    grammar: "N ABL S N"
  },
  vult: {
    lemma: "volo, velle, volui",
    en: "wishes; wants",
    grammar: "V PRES ACTIVE IND 3 S"
  }
};

function normalise(value) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function wordsFrom(value) {
  return value.toLowerCase().match(/[\p{L}\p{M}]+/gu) || [];
}

function existingKeys() {
  const source = fs.readFileSync(BASE_DICTIONARY, "utf8");
  const latin = source.slice(source.indexOf("const LATIN_DICT = {"), source.indexOf("const GREEK_DICT = {"));
  return new Set([...latin.matchAll(/^\s*"([^"]+)":/gm)].map((match) => match[1]));
}

function importedLatinWords() {
  const words = new Set();
  for (const name of fs.readdirSync(IMPORTS_DIR).sort()) {
    if (name.startsWith("_")) continue;
    const directory = path.join(IMPORTS_DIR, name);
    const manifestPath = path.join(directory, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (manifest.lang !== "latin") continue;
    for (const chapter of manifest.chapters) {
      const original = fs.readFileSync(path.join(directory, chapter.original), "utf8");
      for (const word of wordsFrom(original)) words.add(word);
    }
  }
  return [...words].sort();
}

function grammarFor(qual) {
  const type = qual.pofs;
  const detail = qual[type.toLowerCase()] || qual.verb || qual.noun || qual.pron || qual.adj || qual.vpar;
  if (!detail) return type;
  if (type === "V") {
    const tvm = detail.tenseVoiceMood;
    return [type, detail.con?.which, detail.con?.var, tvm?.tense, tvm?.voice, tvm?.mood, detail.person, detail.number]
      .filter((value) => value !== undefined).join(" ");
  }
  if (type === "VPAR") {
    const tvm = detail.tenseVoiceMood;
    return [type, detail.con?.which, detail.con?.var, detail.cs, detail.number, detail.gender, tvm?.tense, tvm?.voice, tvm?.mood]
      .filter((value) => value !== undefined).join(" ");
  }
  if (type === "N") {
    return [type, detail.decl?.which, detail.decl?.var, detail.cs, detail.number, detail.gender]
      .filter((value) => value !== undefined).join(" ");
  }
  if (type === "ADJ") {
    return [type, detail.decl?.which, detail.decl?.var, detail.cs, detail.number, detail.gender, detail.comparison]
      .filter((value) => value !== undefined).join(" ");
  }
  if (type === "PRON" || type === "PACK") {
    return [type, detail.decl?.which, detail.decl?.var, detail.cs, detail.number, detail.gender]
      .filter((value) => value !== undefined).join(" ");
  }
  return type;
}

function cleanMeaning(value) {
  return value.replace(/\s+/g, " ").replace(/;+$/, "");
}

function entryFromResult(result) {
  return {
    lemma: dictionaryForm(result.de).replace(/\s+/g, " ").trim(),
    en: cleanMeaning(result.de.mean),
    grammar: grammarFor(result.ir.qual)
  };
}

function entryFor(engine, word) {
  if (OVERRIDES[word]) return OVERRIDES[word];
  const analysis = engine.parseWord(word);
  if (analysis.results.length) return entryFromResult(analysis.results[0]);
  if (analysis.uniqueResults.length) {
    const result = analysis.uniqueResults[0];
    return {
      lemma: dictionaryForm(result.de).replace(/\s+/g, " ").trim(),
      en: cleanMeaning(result.de.mean),
      grammar: grammarFor(result.qual)
    };
  }
  if (analysis.addonResults.length && analysis.addonResults[0].baseResults.length) {
    const addon = analysis.addonResults[0];
    const entry = entryFromResult(addon.baseResults[0]);
    const addonMeaning = cleanMeaning(addon.addon.mean);
    entry.en = addon.type === "tackon" ? addonMeaning : `${entry.en}; ${addonMeaning}`;
    entry.grammar = `${entry.grammar} + ${addon.type.toUpperCase()}`;
    return entry;
  }
  throw new Error(`No Latin analysis for "${word}"; add a reviewed OVERRIDES entry`);
}

const baseKeys = existingKeys();
const missing = importedLatinWords().filter((word) => !baseKeys.has(word) && !baseKeys.has(normalise(word)));
const engine = createEngine();
const entries = Object.fromEntries(missing.map((word) => [word, entryFor(engine, word)]));
const payload = JSON.stringify(entries, null, 2);
const output = [
  "// AUTO-GENERATED by scripts/build_latin_import_dictionary.mjs. Do not edit manually.",
  "// Adds morphological lookup entries required by imported Latin texts.",
  "",
  `Object.assign(LATIN_DICT, ${payload});`,
  ""
].join("\n");

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, output);
console.log(`Wrote ${path.relative(ROOT, OUTPUT)} with ${missing.length} Latin forms.`);
