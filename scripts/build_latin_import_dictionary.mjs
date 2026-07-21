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
  },
  agrigentinum: { lemma: "Agrigentinus, Agrigentina, Agrigentinum", en: "of Agrigentum; Agrigentine", grammar: "ADJ ACC S M (proper name)" },
  andria: { lemma: "Andria, Andriae", en: "The Woman of Andros; the Andria", grammar: "N NOM S F (title)" },
  archyta: { lemma: "Archytas, Archytae", en: "Archytas", grammar: "N ABL S M (proper name)" },
  audisse: { lemma: "audio, audire, audivi, auditus", en: "to have heard", grammar: "V PERF ACTIVE INF (syncopated)" },
  blossius: { lemma: "Blossius, Blossii", en: "Blossius", grammar: "N NOM S M (proper name)" },
  coruncanium: { lemma: "Coruncanius, Coruncanii", en: "Coruncanius", grammar: "N ACC S M (proper name)" },
  cuiusdam: { lemma: "quidam, quaedam, quoddam", en: "of a certain person; of someone", grammar: "PRON GEN S" },
  ennius: { lemma: "Ennius, Ennii", en: "Ennius", grammar: "N NOM S M (proper name)" },
  errasse: { lemma: "erro, errare, erravi, erratus", en: "to have erred; to have gone astray", grammar: "V PERF ACTIVE INF (syncopated)" },
  erudierunt: { lemma: "erudio, erudire, erudivi, eruditus", en: "they educated; they instructed", grammar: "V PERF ACTIVE IND 3 P" },
  fanni: { lemma: "Fannius, Fannii", en: "of Fannius", grammar: "N GEN S M (proper name)" },
  fannio: { lemma: "Fannius, Fannii", en: "Fannius", grammar: "N DAT/ABL S M (proper name)" },
  fannius: { lemma: "Fannius, Fannii", en: "Fannius", grammar: "N NOM S M (proper name)" },
  galos: { lemma: "Galus, Gali", en: "men named Galus", grammar: "N ACC P M (proper name)" },
  galum: { lemma: "Galus, Gali", en: "Galus", grammar: "N ACC S M (proper name)" },
  gnathonis: { lemma: "Gnatho, Gnathonis", en: "of Gnatho", grammar: "N GEN S M (proper name)" },
  gnathonum: { lemma: "Gnatho, Gnathonis", en: "of men like Gnatho", grammar: "N GEN P M (proper name)" },
  gracchi: { lemma: "Gracchus, Gracchi", en: "of Gracchus", grammar: "N GEN S M (proper name)" },
  gracchum: { lemma: "Gracchus, Gracchi", en: "Gracchus", grammar: "N ACC S M (proper name)" },
  gracchus: { lemma: "Gracchus, Gracchi", en: "Gracchus", grammar: "N NOM S M (proper name)" },
  idemque: { lemma: "idem, eadem, idem", en: "the same, and; likewise", grammar: "PRON NOM S M + TACKON" },
  inlusseris: { lemma: "inludo, inludere, inlusi, inlusus", en: "you have mocked; you have made sport of", grammar: "V PERF ACTIVE SUB 2 S" },
  introieram: { lemma: "introeo, introire, introii, introitus", en: "I had entered", grammar: "V PLUP ACTIVE IND 1 S" },
  laeli: { lemma: "Laelius, Laelii", en: "Laelius", grammar: "N VOC S M (proper name)" },
  laelius: { lemma: "Laelius, Laelii", en: "Laelius", grammar: "N NOM S M (proper name)" },
  lautissume: { lemma: "lautissime", en: "most splendidly; most elegantly", grammar: "ADV SUPER (archaic spelling)" },
  licini: { lemma: "Licinius, Licinii", en: "of Licinius", grammar: "N GEN S M (proper name)" },
  luscino: { lemma: "Luscinus, Luscini", en: "Luscinus", grammar: "N DAT/ABL S M (proper name)" },
  lycomedem: { lemma: "Lycomedes, Lycomedis", en: "Lycomedes", grammar: "N ACC S M (proper name)" },
  maelium: { lemma: "Maelius, Maelii", en: "Maelius", grammar: "N ACC S M (proper name)" },
  mancino: { lemma: "Mancinus, Mancini", en: "Mancinus", grammar: "N DAT/ABL S M (proper name)" },
  mummio: { lemma: "Mummius, Mummii", en: "Mummius", grammar: "N DAT/ABL S M (proper name)" },
  mummium: { lemma: "Mummius, Mummii", en: "Mummius", grammar: "N ACC S M (proper name)" },
  neoptolemus: { lemma: "Neoptolemus, Neoptolemi", en: "Neoptolemus", grammar: "N NOM S M (proper name)" },
  norunt: { lemma: "nosco, noscere, novi, notus", en: "they know", grammar: "V PERF ACTIVE IND 3 P (syncopated)" },
  optumus: { lemma: "optimus, optima, optimum", en: "best; excellent", grammar: "ADJ NOM S M SUPER (archaic spelling)" },
  pacuvi: { lemma: "Pacuvius, Pacuvii", en: "of Pacuvius", grammar: "N GEN S M (proper name)" },
  papirius: { lemma: "Papirius, Papirii", en: "Papirius", grammar: "N NOM S M (proper name)" },
  papum: { lemma: "Papus, Papi", en: "Papus", grammar: "N ACC S M (proper name)" },
  parasitorum: { lemma: "parasitus, parasiti", en: "of parasites; of flatterers", grammar: "N GEN P M" },
  patribus: { lemma: "pater, patris", en: "to or among fathers; ancestors; senators", grammar: "N DAT/ABL P M" },
  peccasse: { lemma: "pecco, peccare, peccavi, peccatus", en: "to have done wrong; to have sinned", grammar: "V PERF ACTIVE INF (syncopated)" },
  phili: { lemma: "Philus, Phili", en: "of Philus", grammar: "N GEN S M (proper name)" },
  philo: { lemma: "Philus, Phili", en: "Philus", grammar: "N DAT/ABL S M (proper name)" },
  philos: { lemma: "Philus, Phili", en: "men named Philus", grammar: "N ACC P M (proper name)" },
  philus: { lemma: "Philus, Phili", en: "Philus", grammar: "N NOM S M (proper name)" },
  propensioresque: { lemma: "propensus, propensa, propensum", en: "more inclined, and; readier, and", grammar: "ADJ NOM P C COMP + TACKON" },
  pylades: { lemma: "Pylades, Pyladis", en: "Pylades", grammar: "N NOM S M (proper name)" },
  pyrrho: { lemma: "Pyrrhus, Pyrrhi", en: "Pyrrhus", grammar: "N DAT/ABL S M (proper name)" },
  quandam: { lemma: "quidam, quaedam, quoddam", en: "a certain; some", grammar: "PRON ACC S F" },
  rupilio: { lemma: "Rupilius, Rupilii", en: "Rupilius", grammar: "N DAT/ABL S M (proper name)" },
  scaevola: { lemma: "Scaevola, Scaevolae", en: "Scaevola", grammar: "N NOM/ABL S M (proper name)" },
  scaevolae: { lemma: "Scaevola, Scaevolae", en: "of or to Scaevola", grammar: "N GEN/DAT S M (proper name)" },
  scaevolam: { lemma: "Scaevola, Scaevolae", en: "Scaevola", grammar: "N ACC S M (proper name)" },
  tarentino: { lemma: "Tarentinus, Tarentina, Tarentinum", en: "of Tarentum; Tarentine", grammar: "ADJ DAT/ABL S M (proper name)" },
  terentiano: { lemma: "Terentianus, Terentiana, Terentianum", en: "of Terence; Terentian", grammar: "ADJ DAT/ABL S M (proper name)" },
  thais: { lemma: "Thais, Thaidis", en: "Thais", grammar: "N NOM S F (proper name)" },
  themistocle: { lemma: "Themistocles, Themistoclis", en: "Themistocles", grammar: "N ABL S M (proper name)" },
  timonem: { lemma: "Timon, Timonis", en: "Timon", grammar: "N ACC S M (proper name)" },
  tyrannorum: { lemma: "tyrannus, tyranni", en: "of tyrants", grammar: "N GEN P M" },
  vecellinum: { lemma: "Vecellinus, Vecellini", en: "Vecellinus", grammar: "N ACC S M (proper name)" },
  vergini: { lemma: "Verginius, Verginii", en: "Verginius", grammar: "N DAT S M (proper name)" },
  virosque: { lemma: "vir, viri", en: "men, and", grammar: "N ACC P M + TACKON" },
  xx: { lemma: "viginti", en: "twenty", grammar: "NUM (Roman numeral)" },
  acidaliae: { lemma: "Acidalius, Acidalia, Acidalium", en: "Acidalian (epithet of Venus, from the spring Acidalia in Boeotia)", grammar: "ADJ GEN S F (proper name)" },
  adflarat: { lemma: "adflo, adflare, adflavi, adflatus", en: "had breathed upon (syncopated adflaverat)", grammar: "V PLUP ACTIVE IND 3 S (syncopated)" },
  adriaticum: { lemma: "Adriaticus, Adriatica, Adriaticum", en: "Adriatic (the Adriatic Sea)", grammar: "ADJ ACC S N (proper name)" },
  aeneadum: { lemma: "Aeneadae, Aeneadum (pl.)", en: "of the Aeneadae (followers/descendants of Aeneas, the Trojans)", grammar: "N GEN P M (proper name)" },
  amazonidum: { lemma: "Amazonides, Amazonidum (pl.)", en: "of the Amazons (warrior women led by Penthesilea)", grammar: "N GEN P F (proper name)" },
  anchisae: { lemma: "Anchises, Anchisae", en: "of Anchises (father of Aeneas)", grammar: "N GEN S M (proper name)" },
  apuleius: { lemma: "Apuleius, Apuleii", en: "Apuleius (author of the Golden Ass, set partly in Thessaly)", grammar: "N NOM S M (proper name)" },
  argivae: { lemma: "Argivus, Argiva, Argivum", en: "Argive, Greek (of Argos)", grammar: "ADJ GEN S F (proper name)" },
  atridas: { lemma: "Atrides, Atridae", en: "the Atridae (sons of Atreus: Agamemnon and Menelaus)", grammar: "N ACC P M (proper name, Greek accusative)" },
  beli: { lemma: "Belus, Beli", en: "of Belus (king of Tyre, father of Dido; also her remote ancestor)", grammar: "N GEN S M (proper name)" },
  belus: { lemma: "Belus, Beli", en: "Belus (king of Tyre, father of Dido)", grammar: "N NOM S M (proper name)" },
  brabantiaeque: { lemma: "Brabantia, Brabantiae", en: "of Brabant (duchy in the Low Countries) + -que (and)", grammar: "N GEN S F (proper name) + TACKON" },
  certasse: { lemma: "certo, certare, certavi, certatus", en: "to have contended, striven (syncopated certavisse)", grammar: "V PERF ACTIVE INF (syncopated)" },
  cythera: { lemma: "Cythera, Cytherorum (pl.)", en: "Cythera (island sacred to Venus)", grammar: "N ACC P N (proper name)" },
  dardanidae: { lemma: "Dardanides, Dardanidae", en: "the Dardanidae (descendants of Dardanus, the Trojans)", grammar: "N NOM P M (proper name)" },
  epystolas: { lemma: "epistola, epistolae", en: "letters, epistles (medieval spelling of epistolas)", grammar: "N ACC P F (medieval spelling)" },
  erycis: { lemma: "Eryx, Erycis", en: "of Eryx (mountain and hero in western Sicily)", grammar: "N GEN S M (proper name)" },
  eurotae: { lemma: "Eurotas, Eurotae", en: "of the Eurotas (river of Sparta, haunt of Diana)", grammar: "N GEN S M (proper name)" },
  euxinum: { lemma: "Euxinus, Euxina, Euxinum", en: "Euxine (the Black Sea, Pontus Euxinus)", grammar: "ADJ ACC S M/N (proper name)" },
  flandriae: { lemma: "Flandria, Flandriae", en: "of Flanders (region in the Low Countries)", grammar: "N GEN S F (proper name)" },
  gandavum: { lemma: "Gandavum, Gandavi", en: "Ghent (city in Flanders)", grammar: "N ACC S N (proper name)" },
  grai: { lemma: "Grai, Graiorum (pl.)", en: "the Greeks", grammar: "N NOM P M (proper name)" },
  gustassent: { lemma: "gusto, gustare, gustavi, gustatus", en: "had tasted (syncopated gustavissent)", grammar: "V PLUP ACTIVE SUB 3 P (syncopated)" },
  haemum: { lemma: "Haemus, Haemi", en: "Haemus (mountain range in Thrace, the Balkan range)", grammar: "N ACC S M (proper name)" },
  hec: { lemma: "hic, haec, hoc", en: "this; these (medieval spelling of haec)", grammar: "PRON NOM S F / NOM P N (medieval spelling)" },
  hectora: { lemma: "Hector, Hectoris", en: "Hector (chief Trojan hero, son of Priam)", grammar: "N ACC S M (proper name, Greek accusative)" },
  hyadas: { lemma: "Hyades, Hyadum (pl.)", en: "the Hyades (rain-bringing star cluster in Taurus)", grammar: "N ACC P F (proper name, Greek accusative)" },
  hypatham: { lemma: "Hypata, Hypatae", en: "Hypata (town in Thessaly, setting of Apuleius' Golden Ass)", grammar: "N ACC S F (proper name, medieval spelling of Hypatam)" },
  idaliae: { lemma: "Idalia, Idaliae", en: "of Idalia (Idalium, sanctuary of Venus on Cyprus)", grammar: "N GEN S F (proper name)" },
  ignavom: { lemma: "ignavus, ignava, ignavum", en: "lazy, idle (archaic spelling of ignavum; of the drones, ignavom pecus)", grammar: "ADJ ACC S N (archaic spelling)" },
  iliades: { lemma: "Ilias, Iliadis", en: "the Trojan women", grammar: "N NOM P F (proper name)" },
  ilus: { lemma: "Ilus, Ili", en: "Ilus (founder of Ilium; also the earlier name of Ascanius/Iulus)", grammar: "N NOM S M (proper name)" },
  inamenam: { lemma: "inamoenus, inamoena, inamoenum", en: "unlovely, charmless, dismal (medieval spelling of inamoenam)", grammar: "ADJ ACC S F (medieval spelling)" },
  inflasse: { lemma: "inflo, inflare, inflavi, inflatus", en: "to have inflated, puffed up (syncopated inflavisse)", grammar: "V PERF ACTIVE INF (syncopated)" },
  inhiasse: { lemma: "inhio, inhiare, inhiavi, inhiatus", en: "to have gaped after, coveted eagerly (syncopated inhiavisse)", grammar: "V PERF ACTIVE INF (syncopated)" },
  iopas: { lemma: "Iopas, Iopae", en: "Iopas (long-haired bard who sings at Dido's banquet)", grammar: "N NOM S M (proper name)" },
  latonae: { lemma: "Latona, Latonae", en: "of Latona (mother of Apollo and Diana)", grammar: "N GEN S F (proper name)" },
  latronum: { lemma: "latro, latronis", en: "of robbers, brigands", grammar: "N GEN P M" },
  ledae: { lemma: "Leda, Ledae", en: "of Leda (mother of Helen)", grammar: "N GEN S F (proper name)" },
  malidiceres: { lemma: "maledico, maledicere, maledixi, maledictus", en: "you might speak ill of, revile (medieval spelling of malediceres)", grammar: "V IMPF ACTIVE SUB 2 S (medieval spelling)" },
  malidictis: { lemma: "maledictum, maledicti", en: "curses, insults, abusive words (medieval spelling of maledictis)", grammar: "N DAT/ABL P N (medieval spelling)" },
  malifaceret: { lemma: "malefacio, malefacere, malefeci, malefactus", en: "he might do harm, do evil (medieval spelling of malefaceret)", grammar: "V IMPF ACTIVE SUB 3 S (medieval spelling)" },
  malifacientibus: { lemma: "malefacio, malefacere, malefeci, malefactus", en: "to/for those doing harm, evildoers (medieval spelling of malefacientibus)", grammar: "VPAR PRES ACTIVE DAT/ABL P (medieval spelling)" },
  mcccxlv: { lemma: "MCCCXLV", en: "1345 (Roman numeral year)", grammar: "NUM (Roman numeral)" },
  memnonis: { lemma: "Memnon, Memnonis", en: "of Memnon (Ethiopian king, son of Aurora, slain at Troy)", grammar: "N GEN S M (proper name)" },
  monstrarat: { lemma: "monstro, monstrare, monstravi, monstratus", en: "had shown, pointed out (syncopated monstraverat)", grammar: "V PLUP ACTIVE IND 3 S (syncopated)" },
  oenotri: { lemma: "Oenotri, Oenotrorum (pl.)", en: "the Oenotrians (early inhabitants of southern Italy)", grammar: "N NOM P M (proper name)" },
  oreades: { lemma: "Oreas, Oreadis", en: "Oreads (mountain nymphs, attendants of Diana)", grammar: "N NOM P F (proper name)" },
  pariseorum: { lemma: "Parisii, Parisiorum (pl.)", en: "of the Parisians (people of Paris; medieval spelling of Parisiorum)", grammar: "N GEN P M (proper name, medieval spelling)" },
  pariusve: { lemma: "Parius, Paria, Parium", en: "Parian (of Paros, island famed for white marble) + -ve (or)", grammar: "ADJ NOM S M (proper name) + TACKON" },
  penthesilea: { lemma: "Penthesilea, Penthesileae", en: "Penthesilea (queen of the Amazons, slain at Troy)", grammar: "N NOM S F (proper name)" },
  phryges: { lemma: "Phryx, Phrygis", en: "the Phrygians (the Trojans)", grammar: "N NOM P M (proper name)" },
  pomponius: { lemma: "Pomponius, Pomponii", en: "Pomponius (Roman gentile name; esp. Pomponius Mela, the geographer)", grammar: "N NOM S M (proper name)" },
  preceps: { lemma: "praeceps, (gen.) praecipitis", en: "headlong, steep, precipitous (medieval spelling of praeceps)", grammar: "ADJ NOM S M/F/N (medieval spelling)" },
  preceptor: { lemma: "praeceptor, praeceptoris", en: "teacher, instructor (medieval spelling of praeceptor)", grammar: "N NOM S M (medieval spelling)" },
  preceptorum: { lemma: "praeceptum, praecepti", en: "of precepts, teachings (medieval spelling of praeceptorum; or of teachers, from praeceptor)", grammar: "N GEN P N (or GEN P M from praeceptor) (medieval spelling)" },
  prefectique: { lemma: "praefectus, praefecti", en: "prefects, governors (medieval spelling of praefecti) + -que (and)", grammar: "N NOM P M (medieval spelling) + TACKON" },
  presertim: { lemma: "praesertim", en: "especially, particularly (medieval spelling of praesertim)", grammar: "ADV (medieval spelling)" },
  presides: { lemma: "praeses, praesidis", en: "governors, protectors (medieval spelling of praesides)", grammar: "N NOM/ACC P M (medieval spelling)" },
  preterea: { lemma: "praeterea", en: "besides, moreover (medieval spelling of praeterea)", grammar: "ADV (medieval spelling)" },
  pretervehor: { lemma: "praetervehor, praetervehi, praetervectus sum", en: "I ride/sail past, pass by (medieval spelling of praetervehor)", grammar: "V PRES DEP IND 1 S (medieval spelling)" },
  proceribus: { lemma: "proceres, procerum (pl.)", en: "to/for/by the nobles, chief men", grammar: "N DAT/ABL P M" },
  reipublice: { lemma: "res publica, rei publicae", en: "of/to the republic, the state (medieval spelling of reipublicae, written as one word)", grammar: "N GEN/DAT S F (medieval spelling)" },
  rhesi: { lemma: "Rhesus, Rhesi", en: "of Rhesus (Thracian king slain at Troy by Diomedes)", grammar: "N GEN S M (proper name)" },
  sacerdotibus: { lemma: "sacerdos, sacerdotis", en: "to/for/by the priests", grammar: "N DAT/ABL P C" },
  serestum: { lemma: "Serestus, Seresti", en: "Serestus (Trojan captain, companion of Aeneas)", grammar: "N ACC S M (proper name)" },
  simoentis: { lemma: "Simois, Simoentis", en: "of the Simois (river on the plain of Troy)", grammar: "N GEN S M (proper name)" },
  thesaliae: { lemma: "Thessalia, Thessaliae", en: "of Thessaly (region of northern Greece; medieval spelling of Thessaliae)", grammar: "N GEN S F (proper name, medieval spelling)" },
  thessalicum: { lemma: "Thessalicus, Thessalica, Thessalicum", en: "Thessalian, of Thessaly", grammar: "ADJ ACC S M/N (proper name)" },
  troesque: { lemma: "Tros, Trois", en: "the Trojans (Greek nominative plural Troes) + -que (and)", grammar: "N NOM P M (proper name, Greek plural) + TACKON" },
  troilus: { lemma: "Troilus, Troili", en: "Troilus (young son of Priam, slain by Achilles)", grammar: "N NOM S M (proper name)" },
  troius: { lemma: "Troius, Troia, Troium", en: "Trojan (Troius Aeneas)", grammar: "ADJ NOM S M (proper name)" },
  tros: { lemma: "Tros, Trois", en: "a Trojan (also Tros, ancestor-king of Troy)", grammar: "N NOM S M (proper name)" },
  tydides: { lemma: "Tydides, Tydidae", en: "son of Tydeus (Diomedes)", grammar: "N NOM S M (proper name, Greek patronymic)" },
  typhoia: { lemma: "Typhoius, Typhoia, Typhoium", en: "Typhoean, of the giant Typhoeus (tela Typhoia = Jupiter's thunderbolts)", grammar: "ADJ ACC P N (proper name)" },
  verona: { lemma: "Verona, Veronae", en: "Verona (city in northern Italy)", grammar: "N NOM/ABL S F (proper name)" }
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
  for (const word of dataJsLatinWords()) words.add(word);
  return [...words].sort();
}

function dataJsLatinWords() {
  const source = fs.readFileSync(path.join(ROOT, "data.js"), "utf8");
  let BOOKS;
  eval(source.replace(/^const BOOKS = /m, "BOOKS = "));
  const words = new Set();
  for (const book of BOOKS) {
    if (book.lang !== "latin") continue;
    for (const chapter of book.chapters) {
      for (const line of chapter.lines) {
        for (const word of wordsFrom(String(line))) words.add(word);
      }
    }
  }
  return words;
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
  if (OVERRIDES[normalise(word)]) return OVERRIDES[normalise(word)];
  let analysis = engine.parseWord(word);
  if (!analysis.results.length && !analysis.uniqueResults.length && !analysis.addonResults.length && normalise(word) !== word) {
    analysis = engine.parseWord(normalise(word));
  }
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
const entries = {};
const unresolved = [];
for (const word of missing) {
  try {
    entries[word] = entryFor(engine, word);
  } catch {
    unresolved.push(word);
  }
}
if (unresolved.length) {
  throw new Error(
    `No Latin analysis for ${unresolved.length} form(s); add reviewed OVERRIDES entries:\n${unresolved.join("\n")}`
  );
}
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
