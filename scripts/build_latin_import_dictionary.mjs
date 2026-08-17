#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createEngine, dictionaryForm } from "whitakers-words/node";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMPORTS_DIR = path.join(ROOT, "imports");
const BASE_DICTIONARY = path.join(ROOT, "dictionary.js");
const OUTPUT = path.join(ROOT, "generated", "imported-latin-dictionary.js");
const CATULLUS_OVERRIDES = path.join(ROOT, "imports", "catullus", "latin-overrides.json");

const OVERRIDES = {
  abire: { lemma: "abeo, abire, abii, abitus", en: "to go away; to depart", grammar: "V PRES ACTIVE INF" },
  amare: { lemma: "amo, amare, amavi, amatus", en: "to love", grammar: "V PRES ACTIVE INF" },
  arte: { lemma: "ars, artis", en: "by skill; with art", grammar: "N ABL S F" },
  collaque: { lemma: "collum, colli", en: "and necks; and my neck", grammar: "N ACC P N + TACKON" },
  cumque: { lemma: "cum", en: "and since; and when", grammar: "CONJ + TACKON" },
  currere: { lemma: "curro, currere, cucurri, cursus", en: "to run; to race", grammar: "V PRES ACTIVE INF" },
  cynthia: { lemma: "Cynthia, Cynthiae", en: "Cynthia; the Moon", grammar: "N VOC S F (proper name)" },
  celare: { lemma: "celo, celare, celavi, celatus", en: "to conceal; to hide", grammar: "V PRES ACTIVE INF" },
  deponere: { lemma: "depono, deponere, deposui, depositus", en: "to lay aside; to take off", grammar: "V PRES ACTIVE INF" },
  descendere: { lemma: "descendo, descendere, descendi, descensus", en: "to descend; to go down", grammar: "V PRES ACTIVE INF" },
  dignabere: { lemma: "dignor, dignari, dignatus sum", en: "you will deign; you will honour", grammar: "V FUT DEP IND 2 S" },
  dumque: { lemma: "dum", en: "and while", grammar: "CONJ + TACKON" },
  eque: { lemma: "e, ex", en: "and from; and out of", grammar: "PREP ABL + TACKON" },
  excussaque: { lemma: "excutio, excutere, excussi, excussus", en: "and tossed; and shaken", grammar: "VPAR PERF PASSIVE ACC P N + TACKON" },
  exitus: { lemma: "exitus, exitus", en: "outcome; end; result", grammar: "N NOM S M" },
  feliciaque: { lemma: "felix, felicis", en: "and happy; and fortunate", grammar: "ADJ ACC P N + TACKON" },
  ferre: { lemma: "fero, ferre, tuli, latus", en: "to carry; to bring; to bear", grammar: "V PRES ACTIVE INF" },
  firmius: { lemma: "firmiter", en: "more firmly; more securely", grammar: "ADV COMP" },
  fovere: { lemma: "foveo, fovere, fovi, fotus", en: "to warm; to cherish", grammar: "V PRES ACTIVE INF" },
  frigora: { lemma: "frigus, frigoris", en: "cold; chills", grammar: "N ACC P N" },
  iamne: { lemma: "iam", en: "now?; already?", grammar: "ADV + TACKON (question)" },
  invitis: { lemma: "invitus, invita, invitum", en: "unwilling; reluctant", grammar: "ADJ ABL P M" },
  abydenus: { lemma: "Abydenus, Abydena, Abydenum", en: "of Abydos; man of Abydos", grammar: "ADJ NOM S M (substantive)" },
  abydo: { lemma: "Abydos, Abydi", en: "from Abydos", grammar: "N ABL S F (proper name; city)" },
  abydon: { lemma: "Abydos, Abydi", en: "to Abydos", grammar: "N ACC S F (proper name; city)" },
  abydos: { lemma: "Abydos, Abydi", en: "Abydos", grammar: "N NOM S F (proper name; city)" },
  arctophylax: { lemma: "Arctophylax, Arctophylacis", en: "the Bear-keeper; Boötes", grammar: "N NOM S M (Greek proper name)" },
  booten: { lemma: "Boötes, Boötae", en: "Boötes; the Herdsman constellation", grammar: "N ACC S M (Greek proper name)" },
  calymne: { lemma: "Calymne, Calymnes", en: "Calymne", grammar: "N NOM S F (proper name; island)" },
  coei: { lemma: "Coeus, Coei", en: "of Coeus", grammar: "N GEN S M (proper name)" },
  crevisse: { lemma: "cresco, crescere, crevi, cretus", en: "to have grown", grammar: "V PERF ACTIVE INF" },
  delosque: { lemma: "Delos, Deli", en: "and Delos", grammar: "N NOM S F (proper name; island) + TACKON" },
  endymion: { lemma: "Endymion, Endymionis", en: "Endymion", grammar: "N NOM S M (proper name)" },
  faunine: { lemma: "Faunus, Fauni", en: "or of Faunus", grammar: "N GEN S M (proper name) + TACKON" },
  heliadum: { lemma: "Heliades, Heliadum", en: "of the Heliades; of the daughters of the Sun", grammar: "N GEN P F (proper name)" },
  helicen: { lemma: "Helice, Helices", en: "Helice; the Great Bear constellation", grammar: "N ACC S F (Greek proper name)" },
  hellespontiaci: { lemma: "Hellespontiacus, Hellespontiaca, Hellespontiacum", en: "of the Hellespont", grammar: "ADJ GEN S N" },
  habere: { lemma: "habeo, habere, habui, habitus", en: "to have; to possess", grammar: "V PRES ACTIVE INF" },
  inpediarque: { lemma: "impedio, impedire, impedivi, impeditus", en: "and may I be held back", grammar: "V PRES PASSIVE SUB 1 S + TACKON" },
  hymettia: { lemma: "Hymettius, Hymettia, Hymettium", en: "Hymettian; of Mount Hymettus", grammar: "ADJ NOM S F" },
  iunonia: { lemma: "Iunonius, Iunonia, Iunonium", en: "of Juno; sacred to Juno", grammar: "ADJ NOM S F" },
  ire: { lemma: "eo, ire, ivi, itus", en: "to go; to travel", grammar: "V PRES ACTIVE INF" },
  istic: { lemma: "istic", en: "there; in that place of yours", grammar: "ADV" },
  latona: { lemma: "Latona, Latonae", en: "Latona", grammar: "N NOM S F (proper name)" },
  latmia: { lemma: "Latmius, Latmia, Latmium", en: "Latmian; of Mount Latmos", grammar: "ADJ ACC P N" },
  lebinthos: { lemma: "Lebinthos, Lebinthi", en: "Lebinthos", grammar: "N NOM S F (proper name; island)" },
  leandre: { lemma: "Leander, Leandri", en: "Leander", grammar: "N VOC S M (proper name)" },
  leandri: { lemma: "Leander, Leandri", en: "of Leander", grammar: "N GEN S M (proper name)" },
  lentaque: { lemma: "lentus, lenta, lentum", en: "and supple; and pliant", grammar: "ADJ ACC P N + TACKON" },
  litteraque: { lemma: "littera, litterae", en: "and the letter", grammar: "N NOM S F + TACKON" },
  lucifer: { lemma: "Lucifer, Luciferi", en: "the Morning Star", grammar: "N NOM S M (proper name)" },
  meque: { lemma: "ego", en: "and me", grammar: "PRON ACC S C + TACKON" },
  mollibat: { lemma: "mollio, mollire, mollivi, mollitus", en: "was softening", grammar: "V IMPF ACTIVE IND 3 S (poetic form)" },
  natare: { lemma: "nato, natare, natavi, natatus", en: "to swim; to float", grammar: "V PRES ACTIVE INF" },
  nigrius: { lemma: "niger, nigra, nigrum", en: "blacker; darker", grammar: "ADJ NOM S N COMP" },
  notamque: { lemma: "nota, notae", en: "and a marker; and a sign", grammar: "N ACC S F + TACKON" },
  multaque: { lemma: "multus, multa, multum", en: "and many things", grammar: "ADJ ACC P N (substantive) + TACKON" },
  naiadum: { lemma: "Naias, Naiadis", en: "of the Naiads; of the water nymphs", grammar: "N GEN P F" },
  orionis: { lemma: "Orion, Orionis", en: "of Orion; of the Orion constellation", grammar: "N GEN S M (proper name)" },
  oleniumque: { lemma: "Olenius, Olenia, Olenium", en: "and Olenian; and of Olenos", grammar: "ADJ NOM S N + TACKON" },
  obviaque: { lemma: "obvius, obvia, obvium", en: "and meeting; and face-to-face", grammar: "ADJ ACC P N + TACKON" },
  paphius: { lemma: "Paphius, Paphia, Paphium", en: "Paphian; Cypriot", grammar: "ADJ NOM S M" },
  pallade: { lemma: "Pallas, Palladis", en: "with olive oil; by Pallas", grammar: "N ABL S F (proper name/metonymy)" },
  paucaque: { lemma: "paucus, pauca, paucum", en: "and a few", grammar: "ADJ ACC P N + TACKON" },
  persuadere: { lemma: "persuadeo, persuadere, persuasi, persuasus", en: "to persuade", grammar: "V PRES ACTIVE INF" },
  paphon: { lemma: "Paphos, Paphi", en: "Paphos", grammar: "N ACC S F (proper name)" },
  parosque: { lemma: "Paros, Pari", en: "and Paros", grammar: "N NOM S F (proper name; island) + TACKON" },
  portasse: { lemma: "porto, portare, portavi, portatus", en: "to have carried", grammar: "V PERF ACTIVE INF (syncopated)" },
  phrixique: { lemma: "Phrixus, Phrixi", en: "and of Phrixus", grammar: "N GEN S M (proper name) + TACKON" },
  phrixo: { lemma: "Phrixus, Phrixi", en: "by Phrixus", grammar: "N ABL S M (proper name)" },
  pignora: { lemma: "pignus, pignoris", en: "proofs; pledges", grammar: "N ACC P N" },
  plias: { lemma: "Plias, Pliadis", en: "the Pleiad; the Pleiades constellation", grammar: "N NOM S F (proper name)" },
  pollice: { lemma: "pollex, pollicis", en: "with a thumb", grammar: "N ABL S M" },
  postque: { lemma: "post", en: "and afterwards; and after", grammar: "ADV + TACKON" },
  prendere: { lemma: "prendo, prendere, prendi, prensus", en: "to grasp; to seize", grammar: "V PRES ACTIVE INF" },
  promittere: { lemma: "promitto, promittere, promisi, promissus", en: "to promise", grammar: "V PRES ACTIVE INF" },
  puellis: { lemma: "puella, puellae", en: "to or for girls", grammar: "N DAT P F" },
  propiore: { lemma: "propior, propius", en: "nearer; more recent", grammar: "ADJ ABL S N COMP" },
  propioraque: { lemma: "propior, propius", en: "and nearer", grammar: "ADJ NOM P N COMP + TACKON" },
  quemque: { lemma: "qui, quae, quod", en: "and whom; and which", grammar: "PRON ACC S M + TACKON" },
  quodque: { lemma: "qui, quae, quod", en: "and which", grammar: "PRON NOM S N + TACKON" },
  rediere: { lemma: "redeo, redire, redii, reditus", en: "they returned", grammar: "V PERF ACTIVE IND 3 P" },
  repetoque: { lemma: "repeto, repetere, repetivi, repetitus", en: "and I return; and I seek again", grammar: "V PRES ACTIVE IND 1 S + TACKON" },
  rumpere: { lemma: "rumpo, rumpere, rupi, ruptus", en: "to break; to tear", grammar: "V PRES ACTIVE INF" },
  samos: { lemma: "Samos, Sami", en: "Samos", grammar: "N NOM S F (proper name; island)" },
  sesti: { lemma: "Sestos, Sesti", en: "of Sestos", grammar: "N GEN S F (proper name; city)" },
  sentire: { lemma: "sentio, sentire, sensi, sensus", en: "to feel; to perceive", grammar: "V PRES ACTIVE INF" },
  servaque: { lemma: "servo, servare, servavi, servatus", en: "and save; and preserve", grammar: "V PRES ACTIVE IMP 2 S + TACKON" },
  sidonide: { lemma: "Sidonis, Sidonidis", en: "Sidonian; of Sidon", grammar: "ADJ ABL S F" },
  siqua: { lemma: "si quis, si qua, si quid", en: "if any", grammar: "PRON NOM S F" },
  sisque: { lemma: "sum, esse, fui, futurus", en: "and may you be", grammar: "V PRES ACTIVE SUB 2 S + TACKON" },
  spectare: { lemma: "specto, spectare, spectavi, spectatus", en: "to watch; to look at", grammar: "V PRES ACTIVE INF" },
  tactuque: { lemma: "tactus, tactus", en: "and with a touch", grammar: "N ABL S M + TACKON" },
  tangere: { lemma: "tango, tangere, tetigi, tactus", en: "to touch", grammar: "V PRES ACTIVE INF" },
  tenerique: { lemma: "tener, tenera, tenerum", en: "and tender; and loving", grammar: "ADJ NOM P M + TACKON" },
  teneris: { lemma: "tener, tenera, tenerum", en: "to or for tender girls", grammar: "ADJ DAT P F" },
  teque: { lemma: "tu", en: "and you", grammar: "PRON ACC/ABL S C + TACKON" },
  tinguere: { lemma: "tinguo, tinguere, tinxi, tinctus", en: "to moisten; to anoint", grammar: "V PRES ACTIVE INF" },
  titania: { lemma: "Titanius, Titania, Titanium", en: "the Titan's daughter; Titanian", grammar: "ADJ NOM S F (substantive epithet)" },
  tortaque: { lemma: "tortus, torta, tortum", en: "and twisted", grammar: "ADJ ACC P N + TACKON" },
  triste: { lemma: "tristis, triste", en: "harsh; grievous", grammar: "ADJ ACC S N" },
  turbida: { lemma: "turbidus, turbida, turbidum", en: "stormy; turbulent", grammar: "ADJ ACC P N" },
  valeamque: { lemma: "valeo, valere, valui", en: "and so that I may be strong", grammar: "V PRES ACTIVE SUB 1 S + TACKON" },
  velle: { lemma: "volo, velle, volui", en: "to wish; to want", grammar: "V PRES ACTIVE INF" },
  venire: { lemma: "venio, venire, veni, ventus", en: "to come", grammar: "V PRES ACTIVE INF" },
  visaque: { lemma: "video, videre, vidi, visus", en: "and having seemed; and having been seen", grammar: "VPAR PERF PASSIVE NOM S F + TACKON" },
  vitaque: { lemma: "vita, vitae", en: "and life", grammar: "N NOM S F + TACKON" },
  aduatuci: { lemma: "Aduatuci, Aduatucorum", en: "the Aduatuci", grammar: "N NOM P M (proper name)" },
  aduatucis: { lemma: "Aduatuci, Aduatucorum", en: "to, by, or from the Aduatuci", grammar: "N DAT/ABL P M (proper name)" },
  arpineius: { lemma: "Arpineius, Arpineii", en: "Arpineius", grammar: "N NOM S M (proper name)" },
  audierunt: { lemma: "audio, audire, audivi, auditus", en: "they heard", grammar: "V PERF ACTIVE IND 3 P" },
  aurunculeium: { lemma: "Aurunculeius, Aurunculeii", en: "Aurunculeius", grammar: "N ACC S M (proper name)" },
  aurunculeius: { lemma: "Aurunculeius, Aurunculeii", en: "Aurunculeius", grammar: "N NOM S M (proper name)" },
  balventio: { lemma: "Balventius, Balventii", en: "to Balventius", grammar: "N DAT S M (proper name)" },
  catamantaloedis: { lemma: "Catamantaloedes, Catamantaloedis", en: "of Catamantaloedes", grammar: "N GEN S M (proper name)" },
  catuvolci: { lemma: "Catuvolcus, Catuvolci", en: "of Catuvolcus", grammar: "N GEN S M (proper name)" },
  catuvolco: { lemma: "Catuvolcus, Catuvolci", en: "Catuvolcus", grammar: "N ABL S M (proper name)" },
  ccxl: { lemma: "CCXL", en: "240", grammar: "NUM (Roman numeral)" },
  clxxx: { lemma: "CLXXX", en: "180", grammar: "NUM (Roman numeral)" },
  cogitasset: { lemma: "cogito, cogitare, cogitavi, cogitatus", en: "had considered", grammar: "V PLUP ACTIVE SUB 3 S (syncopated)" },
  comparasse: { lemma: "comparo, comparare, comparavi, comparatus", en: "to have acquired; to have prepared", grammar: "V PERF ACTIVE INF (syncopated)" },
  conlocasse: { lemma: "conloco, conlocare, conlocavi, conlocatus", en: "to have placed", grammar: "V PERF ACTIVE INF (syncopated)" },
  consuesset: { lemma: "consuesco, consuescere, consuevi, consuetus", en: "had been accustomed", grammar: "V PLUP ACTIVE SUB 3 S (syncopated)" },
  curasset: { lemma: "curo, curare, curavi, curatus", en: "had arranged; had taken care", grammar: "V PLUP ACTIVE SUB 3 S (syncopated)" },
  enuntiarit: { lemma: "enuntio, enuntiare, enuntiavi, enuntiatus", en: "had disclosed", grammar: "V PERF ACTIVE SUB 3 S (syncopated)" },
  esubios: { lemma: "Esubii, Esubiorum", en: "the Esubii", grammar: "N ACC P M (proper name)" },
  garumna: { lemma: "Garumna, Garumnae", en: "the Garonne", grammar: "N NOM/ABL S M (proper name)" },
  interpretibus: { lemma: "interpres, interpretis", en: "interpreters", grammar: "N DAT/ABL P C" },
  iuram: { lemma: "Iura, Iurae", en: "the Jura", grammar: "N ACC S M (proper name)" },
  latobrigis: { lemma: "Latobrigi, Latobrigorum", en: "to the Latobrigi", grammar: "N DAT P M (proper name)" },
  lisci: { lemma: "Liscus, Lisci", en: "of Liscus", grammar: "N GEN S M (proper name)" },
  lisco: { lemma: "Liscus, Lisci", en: "Liscus", grammar: "N DAT/ABL S M (proper name)" },
  liscum: { lemma: "Liscus, Lisci", en: "Liscus", grammar: "N ACC S M (proper name)" },
  liscus: { lemma: "Liscus, Lisci", en: "Liscus", grammar: "N NOM S M (proper name)" },
  militibusque: { lemma: "miles, militis", en: "and to or for the soldiers", grammar: "N DAT/ABL P M + TACKON" },
  munatium: { lemma: "Munatius, Munatii", en: "Munatius", grammar: "N ACC S M (proper name)" },
  nammeius: { lemma: "Nammeius, Nammeii", en: "Nammeius", grammar: "N NOM S M (proper name)" },
  noreiamque: { lemma: "Noreia, Noreiae", en: "and Noreia", grammar: "N ACC S F (proper name) + TACKON" },
  noricum: { lemma: "Noricus, Norica, Noricum", en: "Noric", grammar: "ADJ ACC S M" },
  orgetoricem: { lemma: "Orgetorix, Orgetorigis", en: "Orgetorix", grammar: "N ACC S M (proper name)" },
  petrosidius: { lemma: "Petrosidius, Petrosidii", en: "Petrosidius", grammar: "N NOM S M (proper name)" },
  pulloni: { lemma: "Pullo, Pullonis", en: "to Pullo", grammar: "N DAT S M (proper name)" },
  rauracis: { lemma: "Rauraci, Rauracorum", en: "to the Rauraci", grammar: "N DAT P M (proper name)" },
  roscio: { lemma: "Roscius, Roscii", en: "to Roscius", grammar: "N DAT S M (proper name)" },
  samarobrivae: { lemma: "Samarobriva, Samarobrivae", en: "at Samarobriva", grammar: "N LOC S F (proper name)" },
  tasgeti: { lemma: "Tasgetius, Tasgetii", en: "of Tasgetius", grammar: "N GEN S M (proper name)" },
  tasgetium: { lemma: "Tasgetius, Tasgetii", en: "Tasgetius", grammar: "N ACC S M (proper name)" },
  tasgetius: { lemma: "Tasgetius, Tasgetii", en: "Tasgetius", grammar: "N NOM S M (proper name)" },
  titurium: { lemma: "Titurius, Titurii", en: "Titurius", grammar: "N ACC S M (proper name)" },
  titurius: { lemma: "Titurius, Titurii", en: "Titurius", grammar: "N NOM S M (proper name)" },
  transierant: { lemma: "transeo, transire, transii, transitus", en: "they had crossed", grammar: "V PLUP ACTIVE IND 3 P" },
  trebonium: { lemma: "Trebonius, Trebonii", en: "Trebonius", grammar: "N ACC S M (proper name)" },
  troucillum: { lemma: "Troucillus, Troucilli", en: "Troucillus", grammar: "N ACC S M (proper name)" },
  v: { lemma: "V", en: "five; fifth (in dates)", grammar: "NUM (Roman numeral; cardinal/ordinal in dates)" },
  verucloetius: { lemma: "Verucloetius, Verucloetii", en: "Verucloetius", grammar: "N NOM S M (proper name)" },
  vorene: { lemma: "Vorenus, Voreni", en: "Vorenus", grammar: "N VOC S M (proper name)" },
  vorenus: { lemma: "Vorenus, Voreni", en: "Vorenus", grammar: "N NOM S M (proper name)" },
  xv: { lemma: "XV", en: "fifteen", grammar: "NUM (Roman numeral)" },
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
  verona: { lemma: "Verona, Veronae", en: "Verona (city in northern Italy)", grammar: "N NOM/ABL S F (proper name)" },
  aeacidarum: { lemma: "Aeacides, Aeacidae", en: "of the Aeacidae (descendants of Aeacus; Pyrrhus' line, in the Ennius quotation)", grammar: "N GEN P M (proper name, patronymic)" },
  aeacus: { lemma: "Aeacus, Aeaci", en: "Aeacus (judge of the dead, grandfather of Achilles)", grammar: "N NOM S M (proper name)" },
  aedificasset: { lemma: "aedifico, aedificare, aedificavi, aedificatus", en: "had built (syncopated aedificavisset)", grammar: "V PLUP ACTIVE SUB 3 S (syncopated)" },
  aequarunt: { lemma: "aequo, aequare, aequavi, aequatus", en: "made equal, matched (syncopated aequaverunt)", grammar: "V PERF ACTIVE IND 3 P (syncopated)" },
  aiacem: { lemma: "Aiax, Aiacis", en: "Ajax (Greek hero at Troy, son of Telamon; driven mad when denied Achilles' arms)", grammar: "N ACC S M (proper name)" },
  aiax: { lemma: "Aiax, Aiacis", en: "Ajax (Greek hero at Troy, son of Telamon)", grammar: "N NOM S M (proper name)" },
  antiopam: { lemma: "Antiopa, Antiopae", en: "Antiope (heroine and title role of Pacuvius' tragedy)", grammar: "N ACC S F (proper name)" },
  areopagitas: { lemma: "Areopagites, Areopagitae", en: "Areopagites (members of the Athenian council of the Areopagus)", grammar: "N ACC P M (proper name, Greek loanword)" },
  areopagum: { lemma: "Areopagus, Areopagi", en: "the Areopagus (hill of Ares at Athens and its ancient council)", grammar: "N ACC S M (proper name, Greek loanword)" },
  arginusis: { lemma: "Arginusae, Arginusarum", en: "at Arginusae (islands off Lesbos; naval battle of 406 BC where Callicratidas fell)", grammar: "N ABL P F (proper name)" },
  aristippus: { lemma: "Aristippus, Aristippi", en: "Aristippus (of Cyrene, hedonist philosopher, founder of the Cyrenaic school)", grammar: "N NOM S M (proper name)" },
  aristonis: { lemma: "Aristo, Aristonis", en: "of Aristo (of Chios, unorthodox Stoic whose ethics Cicero sets aside)", grammar: "N GEN S M (proper name)" },
  aristotele: { lemma: "Aristoteles, Aristotelis", en: "Aristotle (founder of the Peripatetic school)", grammar: "N ABL S M (proper name)" },
  arpinas: { lemma: "Arpinas, Arpinatis", en: "Arpinate, of Arpinum (Cicero's home town in Latium)", grammar: "ADJ NOM S (proper adjective)" },
  arpinatium: { lemma: "Arpinas, Arpinatis", en: "of the Arpinates (people of Arpinum, Cicero's home town)", grammar: "N GEN P M (proper adjective as noun)" },
  atreo: { lemma: "Atreus, Atrei", en: "Atreus (king of Mycenae, father of Agamemnon; speaker of 'oderint dum metuant' in Accius' tragedy)", grammar: "N ABL S M (proper name)" },
  callicratidam: { lemma: "Callicratidas, Callicratidae", en: "Callicratidas (Spartan admiral who refused to withdraw and fell at Arginusae, 406 BC)", grammar: "N ACC S M (proper name, Greek declension)" },
  callicratidas: { lemma: "Callicratidas, Callicratidae", en: "Callicratidas (Spartan admiral who refused to withdraw and fell at Arginusae, 406 BC)", grammar: "N NOM S M (proper name, Greek declension)" },
  calypso: { lemma: "Calypso, Calypsus", en: "Calypso (nymph who detained Ulysses on Ogygia)", grammar: "N NOM S F (proper name, Greek loanword)" },
  cannensem: { lemma: "Cannensis, Cannense", en: "of Cannae (Hannibal's crushing victory over Rome, 216 BC)", grammar: "ADJ ACC S C (proper adjective)" },
  casn: { lemma: "casus, casus", en: "by chance, by accident (OCR error for casu)", grammar: "N ABL S M (OCR corruption)" },
  celtiberis: { lemma: "Celtiberi, Celtiberorum", en: "the Celtiberians (warlike people of central Spain; Cicero's example of war to the death)", grammar: "N ABL P M (proper name)" },
  chremes: { lemma: "Chremes, Chremetis", en: "Chremes (old man in Terence's Heauton Timorumenos: 'humani nihil a me alienum puto')", grammar: "N NOM S M (proper name, Greek loanword)" },
  citcturque: { lemma: "cito, citare, citavi, citatus", en: "and is roused/stirred (OCR corruption, probably citaturque)", grammar: "V PRES PASSIVE IND 3 S + TACKON (-que = and) (OCR corruption)" },
  civibus: { lemma: "civis, civis", en: "citizens, fellow citizens", grammar: "N DAT/ABL P C" },
  cleombrotus: { lemma: "Cleombrotus, Cleombroti", en: "Cleombrotus (Spartan king who, fearing disgrace, fought rashly and was defeated at Leuctra, 371 BC)", grammar: "N NOM S M (proper name)" },
  clytemnestram: { lemma: "Clytemnestra, Clytemnestrae", en: "Clytemnestra (wife and murderer of Agamemnon; title role of Accius' tragedy)", grammar: "N ACC S F (proper name)" },
  confercndi: { lemma: "confero, conferre, contuli, collatus", en: "of comparing, of contributing (OCR error for conferendi)", grammar: "V GERUND GEN (OCR corruption)" },
  consobrinorum: { lemma: "consobrinus, consobrini", en: "of first cousins (children of sisters; in the discussion of degrees of kinship)", grammar: "N GEN P M" },
  cratippum: { lemma: "Cratippus, Cratippi", en: "Cratippus (Peripatetic philosopher at Athens, teacher of Cicero's son Marcus, addressee of De Officiis)", grammar: "N ACC S M (proper name)" },
  cst: { lemma: "sum, esse, fui, futurus", en: "is (OCR error for est)", grammar: "V PRES ACTIVE IND 3 S (OCR corruption)" },
  demetrius: { lemma: "Demetrius, Demetrii", en: "Demetrius (of Phalerum, Peripatetic philosopher and ruler of Athens, orator-statesman)", grammar: "N NOM S M (proper name)" },
  diserepet: { lemma: "discrepo, discrepare, discrepavi", en: "may disagree, be inconsistent (OCR error for discrepet)", grammar: "V PRES ACTIVE SUB 3 S (OCR corruption)" },
  druso: { lemma: "Drusus, Drusi", en: "Drusus (M. Livius Drusus, tribune 91 BC, named among examples of gravitas)", grammar: "N ABL S M (proper name)" },
  dubitasse: { lemma: "dubito, dubitare, dubitavi, dubitatus", en: "to have doubted, hesitated (syncopated dubitavisse)", grammar: "V PERF ACTIVE INF (syncopated)" },
  easdemque: { lemma: "idem, eadem, idem", en: "and the same (women/things)", grammar: "PRON ACC P F + TACKON (-que = and)" },
  effect: { lemma: "efficio, efficere, effeci, effectus", en: "brought about, accomplished (OCR truncation, probably effecit)", grammar: "V PERF ACTIVE IND 3 S (OCR corruption)" },
  enimn: { lemma: "enim", en: "for, indeed (OCR error for enim)", grammar: "CONJ (OCR corruption)" },
  ennii: { lemma: "Ennius, Ennii", en: "of Ennius (Quintus Ennius, father of Roman epic poetry, frequently quoted by Cicero)", grammar: "N GEN S M (proper name)" },
  ennio: { lemma: "Ennius, Ennii", en: "Ennius (Quintus Ennius, father of Roman epic poetry)", grammar: "N DAT/ABL S M (proper name)" },
  ennium: { lemma: "Ennius, Ennii", en: "Ennius (Quintus Ennius, father of Roman epic poetry)", grammar: "N ACC S M (proper name)" },
  epaminonda: { lemma: "Epaminondas, Epaminondae", en: "Epaminondas (Theban general and statesman, victor at Leuctra, pupil of Lysis the Pythagorean)", grammar: "N ABL S M (proper name, Greek declension)" },
  epaminondam: { lemma: "Epaminondas, Epaminondae", en: "Epaminondas (Theban general and statesman, victor at Leuctra)", grammar: "N ACC S M (proper name, Greek declension)" },
  epigonos: { lemma: "Epigoni, Epigonorum", en: "the Epigoni (sons of the Seven against Thebes; title of the tragedy, among stage roles Cicero lists)", grammar: "N ACC P M (proper name, Greek accusative in -os)" },
  exisset: { lemma: "exeo, exire, exii, exitus", en: "had gone out, departed (contracted exiisset)", grammar: "V PLUP ACTIVE SUB 3 S (syncopated)" },
  filerunt: { lemma: "sum, esse, fui, futurus", en: "were, have been (OCR error for fuerunt)", grammar: "V PERF ACTIVE IND 3 P (OCR corruption)" },
  fill: { lemma: "filius, filii", en: "of a son / sons (OCR error for filii)", grammar: "N GEN S M or NOM P M (OCR corruption)" },
  fro: { lemma: "φρόνησις (phronesis)", en: "practical wisdom, prudence (Greek term Cicero renders as prudentia; OCR fragment of φρόνησιν)", grammar: "N ACC S F (Greek loanword, OCR fragment)" },
  gmata: { lemma: "ἀπόφθεγμα (apophthegma)", en: "witty sayings, apophthegms (collected by the elder Cato; OCR fragment of ἀποφθέγματα)", grammar: "N ACC P N (Greek loanword, OCR fragment)" },
  hernicos: { lemma: "Hernici, Hernicorum", en: "the Hernici (Italic people of Latium, old enemies then allies of Rome)", grammar: "N ACC P M (proper name)" },
  hesiodus: { lemma: "Hesiodus, Hesiodi", en: "Hesiod (early Greek didactic poet, quoted on repaying favours with interest)", grammar: "N NOM S M (proper name)" },
  hie: { lemma: "hic, haec, hoc", en: "this (man) (OCR error for hic)", grammar: "PRON NOM S M (OCR corruption)" },
  hine: { lemma: "hinc", en: "from here, hence (OCR error for hinc)", grammar: "ADV (OCR corruption)" },
  histrionibus: { lemma: "histrio, histrionis", en: "actors, stage players", grammar: "N DAT/ABL P M" },
  histrionum: { lemma: "histrio, histrionis", en: "of actors, of stage players", grammar: "N GEN P M" },
  hostibus: { lemma: "hostis, hostis", en: "enemies (of the state)", grammar: "N DAT/ABL P C" },
  il: { lemma: "ille, illa, illud", en: "that (OCR line-break fragment, probably of ille/illi)", grammar: "PRON (OCR fragment)" },
  impetrassent: { lemma: "impetro, impetrare, impetravi, impetratus", en: "had obtained (their request) (syncopated impetravissent)", grammar: "V PLUP ACTIVE SUB 3 P (syncopated)" },
  impudentioren: { lemma: "impudens, impudentis", en: "more shameless (OCR error for impudentiorem)", grammar: "ADJ COMP ACC S C (OCR corruption)" },
  incognitapro: { lemma: "incognitus, -a, -um + pro", en: "unknown things + for/as (two words run together by OCR: 'incognita pro cognitis' — taking the unknown for the known)", grammar: "ADJ ACC P N + PREP (OCR run-together)" },
  intemperantiarn: { lemma: "intemperantia, intemperantiae", en: "intemperance, lack of self-control (OCR error for intemperantiam)", grammar: "N ACC S F (OCR corruption)" },
  isdemque: { lemma: "idem, eadem, idem", en: "and to/by the same (isdem = alternative form of eisdem)", grammar: "PRON DAT/ABL P + TACKON (-que = and)" },
  isocrate: { lemma: "Isocrates, Isocratis", en: "Isocrates (Athenian orator and teacher of rhetoric)", grammar: "N ABL S M (proper name)" },
  iurassetque: { lemma: "iuro, iurare, iuravi, iuratus", en: "and had sworn (syncopated iuravisset)", grammar: "V PLUP ACTIVE SUB 3 S + TACKON (-que = and) (syncopated)" },
  kairi: { lemma: "εὐκαιρία (eukairia)", en: "right timing, seasonableness (Greek term for opportunitas temporum; OCR fragment of εὐκαιρία)", grammar: "N NOM S F (Greek loanword, OCR fragment)" },
  kaqh: { lemma: "καθῆκον (kathekon)", en: "appropriate action, duty (the Greek term Cicero renders as officium; OCR fragment of καθῆκον)", grammar: "N NOM/ACC S N (Greek loanword, OCR fragment)" },
  kato: { lemma: "κατόρθωμα (katorthoma)", en: "perfect right action (Stoic term for perfectum officium; OCR fragment of κατόρθωμα)", grammar: "N NOM/ACC S N (Greek loanword, OCR fragment)" },
  kon: { lemma: "καθῆκον (kathekon)", en: "appropriate action, duty (the Greek term Cicero renders as officium; OCR fragment of καθῆκον)", grammar: "N NOM/ACC S N (Greek loanword, OCR fragment)" },
  lacerarunt: { lemma: "lacero, lacerare, laceravi, laceratus", en: "tore, mangled (syncopated laceraverunt)", grammar: "V PERF ACTIVE IND 3 P (syncopated)" },
  lacessierit: { lemma: "lacesso, lacessere, lacessivi, lacessitus", en: "has/will have provoked, attacked first (contracted lacessiverit)", grammar: "V FUTP ACTIVE IND or PERF SUB 3 S (syncopated)" },
  leuctris: { lemma: "Leuctra, Leuctrorum", en: "at Leuctra (Boeotian battlefield where Epaminondas broke Spartan power, 371 BC)", grammar: "N ABL P N (proper name)" },
  luculli: { lemma: "Lucullus, Luculli", en: "of Lucullus (L. Licinius Lucullus, famed for the magnificence of his houses)", grammar: "N GEN S M (proper name)" },
  lycurgi: { lemma: "Lycurgus, Lycurgi", en: "of Lycurgus (legendary Spartan lawgiver)", grammar: "N GEN S M (proper name)" },
  lysandroque: { lemma: "Lysander, Lysandri", en: "and Lysander (Spartan commander who ended the Peloponnesian War at Aegospotami)", grammar: "N ABL S M (proper name) + TACKON (-que = and)" },
  lysandrum: { lemma: "Lysander, Lysandri", en: "Lysander (Spartan commander who ended the Peloponnesian War at Aegospotami)", grammar: "N ACC S M (proper name)" },
  lysis: { lemma: "Lysis, Lysidis", en: "Lysis (of Tarentum, Pythagorean philosopher, teacher of Epaminondas)", grammar: "N NOM S M (proper name, Greek loanword)" },
  magistratuum: { lemma: "magistratus, magistratus", en: "of magistrates, of public offices", grammar: "N GEN P M" },
  magnanimnos: { lemma: "magnanimus, -a, -um", en: "great-souled, magnanimous (OCR error for magnanimos)", grammar: "ADJ ACC P M (OCR corruption)" },
  magnitude: { lemma: "magnitudo, magnitudinis", en: "greatness, magnitude (OCR error for magnitudo)", grammar: "N NOM S F (OCR corruption)" },
  marathone: { lemma: "Marathon, Marathonis", en: "at Marathon (Athenian victory over the Persians, 490 BC)", grammar: "N ABL S M (proper name)" },
  medumque: { lemma: "Medus, Medi", en: "and Medus (son of Medea, title role of Pacuvius' tragedy, among stage roles Cicero lists)", grammar: "N ACC S M (proper name) + TACKON (-que = and)" },
  melanippam: { lemma: "Melanippa, Melanippae", en: "Melanippe (heroine and title role of Ennius' tragedy)", grammar: "N ACC S F (proper name)" },
  mulieribus: { lemma: "mulier, mulieris", en: "women", grammar: "N DAT/ABL P F" },
  namhoc: { lemma: "nam + hic, haec, hoc", en: "for + this (two words run together by OCR: nam hoc)", grammar: "CONJ + PRON NOM/ACC S N (OCR run-together)" },
  neapolitanis: { lemma: "Neapolitani, Neapolitanorum", en: "the Neapolitans (people of Naples, in the boundary dispute with Nola)", grammar: "N DAT/ABL P M (proper name)" },
  nhsin: { lemma: "φρόνησις (phronesis)", en: "practical wisdom, prudence (Greek term Cicero renders as prudentia; OCR fragment of φρόνησιν)", grammar: "N ACC S F (Greek loanword, OCR fragment)" },
  niihil: { lemma: "nihil", en: "nothing (OCR error for nihil)", grammar: "N NOM/ACC S N INDECL (OCR corruption)" },
  noenum: { lemma: "noenum (archaic = non)", en: "not (archaic negative, in Ennius' lines on Fabius Maximus: 'noenum rumores ponebat ante salutem')", grammar: "ADV (archaic Latin)" },
  nominarunt: { lemma: "nomino, nominare, nominavi, nominatus", en: "named, called (syncopated nominaverunt)", grammar: "V PERF ACTIVE IND 3 P (syncopated)" },
  numantia: { lemma: "Numantia, Numantiae", en: "Numantia (Celtiberian stronghold in Spain, destroyed by Scipio Aemilianus, 133 BC)", grammar: "N NOM/ABL S F (proper name)" },
  numantiam: { lemma: "Numantia, Numantiae", en: "Numantia (Celtiberian stronghold in Spain, destroyed by Scipio Aemilianus, 133 BC)", grammar: "N ACC S F (proper name)" },
  opificesque: { lemma: "opifex, opificis", en: "and craftsmen, workmen (in the discussion of trades and occupations)", grammar: "N NOM P M + TACKON (-que = and)" },
  optutu: { lemma: "obtutus, obtutus (also optutus)", en: "gaze, steady contemplation", grammar: "N ABL S M" },
  oratoribusque: { lemma: "orator, oratoris", en: "and orators, public speakers", grammar: "N DAT/ABL P M + TACKON (-que = and)" },
  ostencit: { lemma: "ostendo, ostendere, ostendi, ostentus", en: "shows, displays (OCR error for ostendit)", grammar: "V PRES ACTIVE IND 3 S (OCR corruption)" },
  panaetio: { lemma: "Panaetius, Panaetii", en: "Panaetius (of Rhodes, Stoic philosopher whose Peri Kathekontos is Cicero's chief source for De Officiis)", grammar: "N DAT/ABL S M (proper name)" },
  panaetius: { lemma: "Panaetius, Panaetii", en: "Panaetius (of Rhodes, Stoic philosopher, Cicero's chief source for De Officiis)", grammar: "N NOM S M (proper name)" },
  peierassent: { lemma: "peiero, peierare, peieravi, peieratus", en: "had sworn falsely, perjured themselves (syncopated peieravissent)", grammar: "V PLUP ACTIVE SUB 3 P (syncopated)" },
  peloponnesiaco: { lemma: "Peloponnesiacus, -a, -um", en: "Peloponnesian (of the war between Athens and Sparta, 431-404 BC)", grammar: "ADJ ABL S N (proper adjective)" },
  periclem: { lemma: "Pericles, Periclis", en: "Pericles (Athenian statesman, leader of Athens at its height)", grammar: "N ACC S M (proper name)" },
  pheraeum: { lemma: "Pheraeus, -a, -um", en: "of Pherae (epithet of Jason, tyrant of Pherae in Thessaly)", grammar: "ADJ ACC S M (proper adjective)" },
  plataeis: { lemma: "Plataeae, Plataearum", en: "at Plataea (Greek victory over the Persians, 479 BC)", grammar: "N ABL P F (proper name)" },
  plautus: { lemma: "Plautus, Plauti", en: "Plautus (Roman comic playwright, cited for elegant humour)", grammar: "N NOM S M (proper name)" },
  poeitae: { lemma: "poeta, poetae", en: "poets / of a poet (OCR error for poetae)", grammar: "N NOM P M or GEN/DAT S M (OCR corruption)" },
  pofqe: { lemma: "ἀπόφθεγμα (apophthegma)", en: "witty sayings, apophthegms (collected by the elder Cato; OCR fragment of ἀποφθέγματα)", grammar: "N ACC P N (Greek loanword, OCR fragment)" },
  pon: { lemma: "τὸ πρέπον (to prepon)", en: "the fitting, what is seemly (Greek term Cicero renders as decorum; OCR fragment of πρέπον)", grammar: "N NOM/ACC S N (Greek loanword, OCR fragment)" },
  popilio: { lemma: "Popilius, Popilii", en: "Popilius (Roman general in whose army the young son of Cato served, in the discharged-soldier anecdote)", grammar: "N ABL S M (proper name)" },
  portitorum: { lemma: "portitor, portitoris", en: "of customs officers, toll collectors (among the trades that incur ill will)", grammar: "N GEN P M" },
  posidonius: { lemma: "Posidonius, Posidonii", en: "Posidonius (of Rhodes, Stoic philosopher, pupil of Panaetius)", grammar: "N NOM S M (proper name)" },
  posit: { lemma: "possum, posse, potui", en: "may be able, can (OCR error for possit)", grammar: "V PRES ACTIVE SUB 3 S (OCR corruption)" },
  pre: { lemma: "τὸ πρέπον (to prepon)", en: "the fitting, what is seemly (Greek term Cicero renders as decorum; OCR fragment of πρέπον)", grammar: "N NOM/ACC S N (Greek loanword, OCR fragment)" },
  prodicus: { lemma: "Prodicus, Prodici", en: "Prodicus (of Ceos, sophist, author of the Choice of Hercules told via Xenophon)", grammar: "N NOM S M (proper name)" },
  pyrrhonis: { lemma: "Pyrrho, Pyrrhonis", en: "of Pyrrho (of Elis, sceptic who denied any scale of value; dismissed by Cicero)", grammar: "N GEN S M (proper name)" },
  pythagoram: { lemma: "Pythagoras, Pythagorae", en: "Pythagoras (philosopher of Samos, founder of the Pythagorean school)", grammar: "N ACC S M (proper name, Greek declension)" },
  pythagoras: { lemma: "Pythagoras, Pythagorae", en: "Pythagoras (philosopher of Samos, founder of the Pythagorean school)", grammar: "N NOM S M (proper name, Greek declension)" },
  pythagoreus: { lemma: "Pythagoreus, -a, -um", en: "Pythagorean, follower of Pythagoras (epithet of Lysis)", grammar: "ADJ NOM S M (proper adjective, Greek loanword)" },
  quisquc: { lemma: "quisque, quaeque, quodque", en: "each, every one (OCR error for quisque)", grammar: "PRON NOM S M (OCR corruption)" },
  quodherculem: { lemma: "quod + Hercules, Herculis", en: "as for the fact that + Hercules (two words run together by OCR: 'quod Herculem', of Prodicus' Choice of Hercules)", grammar: "CONJ + N ACC S M (proper name) (OCR run-together)" },
  regibus: { lemma: "rex, regis", en: "kings", grammar: "N DAT/ABL P M" },
  rmh: { lemma: "ὁρμή (horme)", en: "impulse, appetite (Greek term Cicero renders as appetitus; OCR fragment of ὁρμή/ὁρμήν)", grammar: "N NOM/ACC S F (Greek loanword, OCR fragment)" },
  rnorem: { lemma: "mos, moris", en: "custom, habit (OCR error for morem)", grammar: "N ACC S M (OCR corruption)" },
  rqwma: { lemma: "κατόρθωμα (katorthoma)", en: "perfect right action (Stoic term for perfectum officium; OCR fragment of κατόρθωμα)", grammar: "N NOM/ACC S N (Greek loanword, OCR fragment)" },
  rwna: { lemma: "εἴρων (eiron)", en: "dissembler, self-deprecating ironist (the Greek term behind Socrates' ironia; OCR fragment of εἴρωνα)", grammar: "N ACC S M (Greek loanword, OCR fragment)" },
  salamine: { lemma: "Salamis, Salaminis", en: "at Salamis (island where the Greeks defeated the Persian fleet, 480 BC)", grammar: "N ABL S F (proper name)" },
  salamis: { lemma: "Salamis, Salaminis", en: "Salamis (island where the Greeks defeated the Persian fleet, 480 BC)", grammar: "N NOM S F (proper name)" },
  salmácida: { lemma: "Salmacides, Salmacidae", en: "'son of Salmacis', effeminate weakling (Ennius quotation: 'Salmacida spolia sine sudore et sanguine' — spoils won without sweat or blood)", grammar: "N VOC S M (proper name, Greek patronymic; OCR stray accent)" },
  samnitibus: { lemma: "Samnites, Samnitium", en: "the Samnites (Italic people, Rome's great fourth-century enemies, later allies)", grammar: "N ABL P M (proper name)" },
  servorun: { lemma: "servus, servi", en: "of slaves (OCR error for servorum)", grammar: "N GEN P M (OCR corruption)" },
  sinulatio: { lemma: "simulatio, simulationis", en: "pretence, feigning (OCR error for simulatio)", grammar: "N NOM S F (OCR corruption)" },
  sithominis: { lemma: "sum, esse, fui + homo, hominis", en: "may be + of a man (two words run together by OCR: sit hominis)", grammar: "V PRES ACTIVE SUB 3 S + N GEN S M (OCR run-together)" },
  sobrinorumque: { lemma: "sobrinus, sobrini", en: "and of second cousins (in the discussion of degrees of kinship)", grammar: "N GEN P M + TACKON (-que = and)" },
  sofi: { lemma: "σοφία (sophia)", en: "wisdom (Greek term Cicero renders as sapientia; OCR fragment of σοφία/σοφίαν)", grammar: "N NOM/ACC S F (Greek loanword, OCR fragment)" },
  solonis: { lemma: "Solon, Solonis", en: "of Solon (Athenian lawgiver and one of the Seven Sages)", grammar: "N GEN S M (proper name)" },
  splendidissimisque: { lemma: "splendidus, -a, -um", en: "and most splendid, most distinguished", grammar: "ADJ SUPER DAT/ABL P + TACKON (-que = and)" },
  syracosium: { lemma: "Syracosius, -a, -um", en: "Syracusan, of Syracuse (Greek form of Syracusanus)", grammar: "ADJ ACC S M (proper adjective, Greek loanword)" },
  terentianus: { lemma: "Terentianus, -a, -um", en: "of Terence (the comic playwright; 'ille Terentianus Chremes')", grammar: "ADJ NOM S M (proper adjective)" },
  themistoclem: { lemma: "Themistocles, Themistoclis", en: "Themistocles (Athenian statesman, architect of the victory at Salamis)", grammar: "N ACC S M (proper name)" },
  themistocles: { lemma: "Themistocles, Themistoclis", en: "Themistocles (Athenian statesman, architect of the victory at Salamis)", grammar: "N NOM S M (proper name)" },
  thermopylis: { lemma: "Thermopylae, Thermopylarum", en: "at Thermopylae (pass defended by Leonidas' Spartans against the Persians, 480 BC)", grammar: "N ABL P F (proper name)" },
  timotheus: { lemma: "Timotheus, Timothei", en: "Timotheus (Athenian general, son of Conon)", grammar: "N NOM S M (proper name)" },
  tur: { lemma: "(fragment)", en: "detached passive verb ending -tur (OCR line-break fragment)", grammar: "FRAGMENT (OCR corruption)" },
  utilioresque: { lemma: "utilis, utile", en: "and more useful", grammar: "ADJ COMP NOM/ACC P C + TACKON (-que = and)" },
  volscos: { lemma: "Volsci, Volscorum", en: "the Volsci (Italic people of Latium, early enemies of Rome later admitted to citizenship)", grammar: "N ACC P M (proper name)" },
  xenocratem: { lemma: "Xenocrates, Xenocratis", en: "Xenocrates (of Chalcedon, head of the Academy after Speusippus, famed for gravity of character)", grammar: "N ACC S M (proper name)" },
  xenophontem: { lemma: "Xenophon, Xenophontis", en: "Xenophon (Athenian soldier-historian, pupil of Socrates, source for Prodicus' Choice of Hercules)", grammar: "N ACC S M (proper name)" },
  // Petrarch, Familiares I.7 (contra senes dyaleticos). Trecento orthography
  // (e/ae, ci/ti, ch/h, y for i) and Greek technical vocabulary.
  amenitate: { lemma: "amoenitas, amoenitatis", en: "by the pleasantness, by the charm", grammar: "N ABL S F (medieval spelling of amoenitate)" },
  aristotelici: { lemma: "Aristotelicus, -a, -um", en: "Aristotelian, of Aristotle", grammar: "ADJ GEN S N (proper adjective)" },
  aristotelicos: { lemma: "Aristotelicus, -a, -um", en: "Aristotelians, followers of Aristotle", grammar: "ADJ ACC P M (substantive)" },
  aristotilem: { lemma: "Aristoteles, Aristotelis", en: "Aristotle", grammar: "N ACC S M (proper name; medieval spelling)" },
  aristotiles: { lemma: "Aristoteles, Aristotelis", en: "Aristotle", grammar: "N NOM S M (proper name; medieval spelling)" },
  audieram: { lemma: "audio, audire, audivi, auditus", en: "I had heard", grammar: "V PLUP ACTIVE IND 1 S (syncopated for audiveram)" },
  avinione: { lemma: "Avinio, Avinionis", en: "at Avignon (the papal city where Petrarch dates the letter)", grammar: "N ABL S F (proper name; medieval Latin)" },
  caribdis: { lemma: "Charybdis, Charybdis", en: "Charybdis (the whirlpool of the Sicilian strait)", grammar: "N NOM S F (proper name; medieval spelling)" },
  cyclopas: { lemma: "Cyclops, Cyclopis", en: "the Cyclopes (the giants of Sicily)", grammar: "N ACC P M (Greek proper name)" },
  cyclopum: { lemma: "Cyclops, Cyclopis", en: "of the Cyclopes", grammar: "N GEN P M (Greek proper name)" },
  diverticula: { lemma: "deverticulum, deverticuli", en: "detours, side-turnings (Quintilian on evasive argument)", grammar: "N ACC P N" },
  dyaletica: { lemma: "dialectica, dialecticae", en: "dialectic, logic", grammar: "N NOM S F (medieval spelling of dialectica)" },
  dyaleticam: { lemma: "dialectica, dialecticae", en: "dialectic, logic", grammar: "N ACC S F (medieval spelling)" },
  dyaletice: { lemma: "dialectica, dialecticae", en: "of dialectic, of logic", grammar: "N GEN S F (medieval spelling)" },
  dyaleticis: { lemma: "dialecticus, dialectici", en: "the logicians, the dialecticians", grammar: "N ABL P M (medieval spelling)" },
  dyaletico: { lemma: "dialecticus, -a, -um", en: "dialectical, given to logic-chopping", grammar: "ADJ ABL S M (medieval spelling)" },
  dyaleticorum: { lemma: "dialecticus, dialectici", en: "of the logicians, of the dialecticians", grammar: "N GEN P M (medieval spelling)" },
  dyaleticum: { lemma: "dialecticus, dialectici", en: "a logician, a dialectician", grammar: "N ACC S M (medieval spelling)" },
  dyaleticus: { lemma: "dialecticus, dialectici", en: "a logician, a dialectician", grammar: "N NOM S M (medieval spelling)" },
  dyogenes: { lemma: "Diogenes, Diogenis", en: "Diogenes (the Cynic of Sinope)", grammar: "N NOM S M (proper name; medieval spelling)" },
  dyogeni: { lemma: "Diogenes, Diogenis", en: "to Diogenes, at Diogenes", grammar: "N DAT S M (proper name; medieval spelling)" },
  enchelado: { lemma: "Enceladus, Enceladi", en: "with Enceladus (the giant buried under Etna)", grammar: "N ABL S M (proper name; medieval spelling)" },
  enthimemate: { lemma: "enthymema, enthymematis", en: "with an enthymeme, with an abbreviated syllogism", grammar: "N ABL S N (Greek loanword; medieval spelling)" },
  estas: { lemma: "aestas, aestatis", en: "summer", grammar: "N NOM S F (medieval spelling of aestas)" },
  estatem: { lemma: "aestas, aestatis", en: "summer", grammar: "N ACC S F (medieval spelling of aestatem)" },
  ethnea: { lemma: "Aetnaeus, -a, -um", en: "of Etna, Aetnaean", grammar: "ADJ NOM S F (proper adjective; medieval spelling)" },
  expectasse: { lemma: "exspecto, exspectare, exspectavi, exspectatus", en: "to have waited for, to have expected", grammar: "V PERF ACTIVE INF (syncopated for exspectavisse)" },
  hoccine: { lemma: "hic, haec, hoc", en: "is this the thing...? (emphatic question)", grammar: "PRON NOM S N + TACKON (-ce + -ne)" },
  iv: { lemma: "quattuor", en: "four (Roman numeral IV: 'IV Idus Martias' = 12 March)", grammar: "NUM (Roman numeral)" },
  literati: { lemma: "litteratus, -a, -um", en: "educated, lettered, learned", grammar: "ADJ NOM P M (medieval spelling of litterati)" },
  michi: { lemma: "ego", en: "to me, for me", grammar: "PRON DAT S C (medieval spelling of mihi)" },
  pomponii: { lemma: "Pomponius, Pomponii", en: "of Pomponius (Mela, the Roman geographer)", grammar: "N GEN S M (proper name)" },
  precipue: { lemma: "praecipue", en: "especially, particularly", grammar: "ADV (medieval spelling of praecipue)" },
  qualisqualis: { lemma: "qualisqualis, qualequale", en: "of whatever sort, such as it is", grammar: "ADJ NOM S F (indefinite)" },
  quedam: { lemma: "quidam, quaedam, quoddam", en: "certain, some", grammar: "ADJ NOM P N (medieval spelling of quaedam)" },
  queso: { lemma: "quaeso, quaesere", en: "I beg, please, I ask you", grammar: "V PRES ACTIVE IND 1 S (medieval spelling of quaeso)" },
  quinimo: { lemma: "quin immo", en: "nay rather, on the contrary", grammar: "ADV (two words written as one)" },
  sevientem: { lemma: "saevio, saevire, saevii, saevitus", en: "raging, blazing", grammar: "VPAR PRES ACTIVE ACC S M (medieval spelling of saevientem)" },
  sillogismos: { lemma: "syllogismus, syllogismi", en: "syllogisms", grammar: "N ACC P M (Greek loanword; medieval spelling)" },
  taurominitanii: { lemma: "Tauromenitanus, -a, -um", en: "of Tauromenium, of Taormina", grammar: "ADJ GEN S N (proper adjective; medieval spelling)" },
  trinacriam: { lemma: "Trinacria, Trinacriae", en: "Sicily (the 'three-cornered' island)", grammar: "N ACC S F (proper name)" },
  varronis: { lemma: "Varro, Varronis", en: "of Varro (M. Terentius Varro, the Roman polymath)", grammar: "N GEN S M (proper name)" },
  // Petrarch, De sui ipsius et multorum ignorantia. First: forms the medieval
  // spelling fallback resolves to the WRONG classical word — these must be
  // pinned here, since OVERRIDES is consulted before any rewriting.
  cherilus: { lemma: "Choerilus, Choerili", en: "Choerilus (byword for a wretched poet)", grammar: "N NOM S M (proper name)" },
  chimere: { lemma: "chimaera, chimaerae", en: "of the Chimera (here the device blazoned on a helmet)", grammar: "N GEN S F" },
  dyanas: { lemma: "Diana, Dianae", en: "Dianas", grammar: "N ACC P F (proper name)" },
  eneys: { lemma: "Aeneis, Aeneidos", en: "the Aeneid", grammar: "N NOM S F (proper name; medieval spelling)" },
  eschinis: { lemma: "Aeschines, Aeschinis", en: "of Aeschines (the Athenian orator, rival of Demosthenes)", grammar: "N GEN S M (proper name)" },
  epycuree: { lemma: "Epicureus, -a, -um", en: "Epicurean", grammar: "ADJ GEN S F (medieval spelling)" },
  quecunque: { lemma: "quicumque, quaecumque, quodcumque", en: "whatever, all that", grammar: "PRON ACC P N (medieval spelling)" },
  quelibet: { lemma: "quilibet, quaelibet, quodlibet", en: "any you please, any whatever", grammar: "PRON NOM S F (medieval spelling)" },
  quenam: { lemma: "quisnam, quaenam, quodnam", en: "what then?, which?", grammar: "PRON NOM S F (medieval spelling)" },
  rethor: { lemma: "rhetor, rhetoris", en: "rhetorician, teacher of rhetoric", grammar: "N NOM S M (medieval spelling)" },
  scithiam: { lemma: "Scythia, Scythiae", en: "Scythia", grammar: "N ACC S F (proper name; medieval spelling)" },
  thersiten: { lemma: "Thersites, Thersitae", en: "Thersites (the ugly railer of the Iliad)", grammar: "N ACC S M (proper name)" },
  thersites: { lemma: "Thersites, Thersitae", en: "Thersites (the ugly railer of the Iliad)", grammar: "N NOM S M (proper name)" },
  thimeo: { lemma: "Timaeus, Timaei", en: "in the Timaeus (Plato's dialogue)", grammar: "N ABL S M (proper name; medieval spelling)" },
  thimeum: { lemma: "Timaeus, Timaei", en: "the Timaeus (Plato's dialogue)", grammar: "N ACC S M (proper name; medieval spelling)" },
  ticinum: { lemma: "Ticinum, Ticini", en: "Pavia", grammar: "N ACC S N (proper name)" },
  ydoneos: { lemma: "idoneus, idonea, idoneum", en: "suitable, competent", grammar: "ADJ ACC P M (medieval spelling)" },
  ylen: { lemma: "hyle, hyles", en: "matter, formless matter (Greek hyle)", grammar: "N ACC S F (Greek loanword; medieval spelling)" },
  ylias: { lemma: "Ilias, Iliados", en: "the Iliad", grammar: "N NOM S F (proper name; medieval spelling)" },
  // Then the residue the fallback cannot reach: proper names, Greek technical
  // vocabulary, and words the scribe ran together.
  acutissmum: { lemma: "acutus, acuta, acutum", en: "most acute, sharpest", grammar: "ADJ SUPER ACC S M (scribal slip for acutissimum)" },
  agamenoni: { lemma: "Agamemnon, Agamemnonis", en: "to Agamemnon", grammar: "N DAT S M (proper name; medieval spelling)" },
  amenissimum: { lemma: "amoenus, amoena, amoenum", en: "most delightful", grammar: "ADJ SUPER ACC S M (medieval spelling)" },
  anaxagoram: { lemma: "Anaxagoras, Anaxagorae", en: "Anaxagoras", grammar: "N ACC S M (proper name)" },
  appelare: { lemma: "appello, appellare, appellavi, appellatus", en: "to call, to name", grammar: "V PRES ACTIVE INF (medieval spelling)" },
  archesilas: { lemma: "Arcesilas, Arcesilae", en: "Arcesilaus (head of the Middle Academy)", grammar: "N NOM S M (proper name; medieval spelling)" },
  archimedem: { lemma: "Archimedes, Archimedis", en: "Archimedes", grammar: "N ACC S M (proper name)" },
  argonaute: { lemma: "Argonauta, Argonautae", en: "the Argonauts", grammar: "N NOM P M (proper name; medieval spelling)" },
  arimaspus: { lemma: "Arimaspus, Arimaspi", en: "the Arimaspian (of the one-eyed northern people)", grammar: "N NOM S M (proper name)" },
  aristarcum: { lemma: "Aristarchus, Aristarchi", en: "Aristarchus (the Homeric critic)", grammar: "N ACC S M (proper name; medieval spelling)" },
  aristotelica: { lemma: "Aristotelicus, -a, -um", en: "Aristotelian", grammar: "ADJ ABL S F (proper adjective)" },
  aristotelice: { lemma: "Aristotelice", en: "in Aristotle's manner", grammar: "ADV (proper adjective)" },
  aristotelicum: { lemma: "Aristotelicus, -a, -um", en: "Aristotelian", grammar: "ADJ ACC S M (proper adjective)" },
  aristotelicus: { lemma: "Aristotelicus, -a, -um", en: "Aristotelian", grammar: "ADJ NOM S M (proper adjective)" },
  aristotile: { lemma: "Aristoteles, Aristotelis", en: "Aristotle", grammar: "N ABL S M (proper name; medieval spelling)" },
  aristotili: { lemma: "Aristoteles, Aristotelis", en: "to Aristotle", grammar: "N DAT S M (proper name; medieval spelling)" },
  aristotilis: { lemma: "Aristoteles, Aristotelis", en: "of Aristotle", grammar: "N GEN S M (proper name; medieval spelling)" },
  arquade: { lemma: "Arquada, Arquadae", en: "at Arquà (Petrarch's last home in the Euganean hills)", grammar: "N ABL S F (proper name)" },
  atridem: { lemma: "Atrides, Atridae", en: "the son of Atreus, Agamemnon", grammar: "N ACC S M (patronymic)" },
  autoritas: { lemma: "auctoritas, auctoritatis", en: "authority", grammar: "N NOM S F (medieval spelling of auctoritas)" },
  autoritate: { lemma: "auctoritas, auctoritatis", en: "by authority", grammar: "N ABL S F (medieval spelling)" },
  autoritatis: { lemma: "auctoritas, auctoritatis", en: "of authority", grammar: "N GEN S F (medieval spelling)" },
  averrois: { lemma: "Averrois, Averrois", en: "Averroes (Ibn Rushd, the commentator on Aristotle)", grammar: "N NOM S M (proper name)" },
  babilonios: { lemma: "Babylonius, Babylonii", en: "the Babylonians", grammar: "N ACC P M (proper name; medieval spelling)" },
  barlaam: { lemma: "Barlaam", en: "Barlaam the Calabrian (Petrarch's teacher of Greek)", grammar: "N ACC S M (indeclinable proper name)" },
  calabrum: { lemma: "Calaber, Calabra, Calabrum", en: "Calabrian", grammar: "ADJ ACC S M (proper adjective)" },
  calcidio: { lemma: "Calcidius, Calcidii", en: "Chalcidius (translator of and commentator on the Timaeus)", grammar: "N ABL S M (proper name)" },
  calvastrum: { lemma: "calvaster, calvastra, calvastrum", en: "half-bald", grammar: "ADJ ACC S M" },
  carneadem: { lemma: "Carneades, Carneadis", en: "Carneades (head of the New Academy)", grammar: "N ACC S M (proper name)" },
  censoresque: { lemma: "censor, censoris", en: "and censors", grammar: "N ACC P M + TACKON (-que = and)" },
  cirographo: { lemma: "chirographum, chirographi", en: "in his own handwriting", grammar: "N ABL S N (Greek loanword; medieval spelling)" },
  coetaneos: { lemma: "coaetaneus, coaetanei", en: "contemporaries", grammar: "N ACC P M (medieval spelling)" },
  conscientieque: { lemma: "conscientia, conscientiae", en: "and to conscience", grammar: "N DAT S F + TACKON (medieval spelling)" },
  contradictores: { lemma: "contradictor, contradictoris", en: "contradictors, opponents", grammar: "N ACC P M" },
  cordubensis: { lemma: "Cordubensis, Cordubense", en: "the man of Cordoba (Seneca)", grammar: "ADJ GEN S M (substantive)" },
  crisippam: { lemma: "Chrysippa, Chrysippae", en: "Chrysippa (Zeno's mocking feminine of Chrysippus)", grammar: "N ACC S F (proper name; medieval spelling)" },
  crisippum: { lemma: "Chrysippus, Chrysippi", en: "Chrysippus (the Stoic)", grammar: "N ACC S M (proper name; medieval spelling)" },
  crisippus: { lemma: "Chrysippus, Chrysippi", en: "Chrysippus (the Stoic)", grammar: "N NOM S M (proper name; medieval spelling)" },
  cristianissimum: { lemma: "Christianus, -a, -um", en: "most Christian", grammar: "ADJ SUPER ACC S M (medieval spelling)" },
  cuiuspiam: { lemma: "quispiam, quaepiam, quodpiam", en: "of someone, of some", grammar: "PRON GEN S" },
  cuiusquam: { lemma: "quisquam, quaequam, quicquam", en: "of anyone", grammar: "PRON GEN S" },
  cuntaque: { lemma: "cunctus, cuncta, cunctum", en: "and all things", grammar: "ADJ ACC P N + TACKON (medieval spelling)" },
  democriti: { lemma: "Democritus, Democriti", en: "of Democritus", grammar: "N GEN S M (proper name)" },
  demonicolis: { lemma: "daemonicola, daemonicolae", en: "demon-worshippers", grammar: "N ABL P M (medieval spelling)" },
  demonum: { lemma: "daemon, daemonis", en: "of the demons", grammar: "N GEN P M (medieval spelling)" },
  discipulorum: { lemma: "discipulus, discipuli", en: "of the pupils", grammar: "N GEN P M" },
  dormierunt: { lemma: "dormio, dormire, dormivi, dormitus", en: "they slept", grammar: "V PERF ACTIVE IND 3 P" },
  dyogenem: { lemma: "Diogenes, Diogenis", en: "Diogenes", grammar: "N ACC S M (proper name; medieval spelling)" },
  dyonisios: { lemma: "Dionysius, Dionysii", en: "Dionysuses", grammar: "N ACC P M (proper name; medieval spelling)" },
  egiptiorum: { lemma: "Aegyptius, Aegyptii", en: "of the Egyptians", grammar: "N GEN P M (medieval spelling)" },
  egipto: { lemma: "Aegyptus, Aegypti", en: "from Egypt", grammar: "N ABL S F (medieval spelling)" },
  elicone: { lemma: "Helicon, Heliconis", en: "Helicon (the poets' mountain; here Petrarch's Vaucluse)", grammar: "N ABL S M (medieval spelling)" },
  empedocli: { lemma: "Empedocles, Empedoclis", en: "to Empedocles", grammar: "N DAT S M (proper name)" },
  epycuri: { lemma: "Epicurus, Epicuri", en: "of Epicurus", grammar: "N GEN S M (proper name; medieval spelling)" },
  epycuro: { lemma: "Epicurus, Epicuri", en: "about Epicurus", grammar: "N ABL S M (proper name; medieval spelling)" },
  epycurum: { lemma: "Epicurus, Epicuri", en: "Epicurus", grammar: "N ACC S M (proper name; medieval spelling)" },
  epycurus: { lemma: "Epicurus, Epicuri", en: "Epicurus", grammar: "N NOM S M (proper name; medieval spelling)" },
  esculapios: { lemma: "Aesculapius, Aesculapii", en: "Aesculapiuses", grammar: "N ACC P M (medieval spelling)" },
  ethneorum: { lemma: "Aetnaeus, -a, -um", en: "of Etna", grammar: "ADJ GEN P M (medieval spelling)" },
  euganeos: { lemma: "Euganeus, -a, -um", en: "Euganean (the hills near Padua)", grammar: "ADJ ACC P M (proper adjective)" },
  euphorbium: { lemma: "Euphorbus, Euphorbi", en: "Euphorbus (the Trojan Pythagoras claimed to have been)", grammar: "N ACC S M (proper name)" },
  evangelum: { lemma: "Evangelus, Evangeli", en: "Evangelus (a detractor of Virgil)", grammar: "N ACC S M (proper name)" },
  expositores: { lemma: "expositor, expositoris", en: "expositors, commentators", grammar: "N NOM P M" },
  fedas: { lemma: "foedus, foeda, foedum", en: "foul, ugly", grammar: "ADJ ACC P F (medieval spelling)" },
  flamare: { lemma: "flammo, flammare, flammavi, flammatus", en: "to set alight, to inflame", grammar: "V PRES ACTIVE INF (medieval spelling)" },
  fugitans: { lemma: "fugito, fugitare, fugitavi, fugitatus", en: "shunning, avoiding", grammar: "VPAR PRES ACTIVE NOM S M" },
  galathas: { lemma: "Galatae, Galatarum", en: "the Galatians", grammar: "N ACC P M (medieval spelling)" },
  gophiro: { lemma: "Gobryas, Gobryae", en: "Gobryas (one of the seven Persian conspirators)", grammar: "N ABL S M (proper name; medieval spelling)" },
  gophirus: { lemma: "Gobryas, Gobryae", en: "Gobryas (one of the seven Persian conspirators)", grammar: "N NOM S M (proper name; medieval spelling)" },
  gorgias: { lemma: "Gorgias, Gorgiae", en: "Gorgias (of Leontini, the sophist)", grammar: "N NOM S M (proper name)" },
  hauddubie: { lemma: "haud dubie", en: "beyond doubt", grammar: "ADV (two words written as one)" },
  hermagoras: { lemma: "Hermagoras, Hermagorae", en: "Hermagoras (the rhetorician)", grammar: "N NOM S M (proper name)" },
  hesiodum: { lemma: "Hesiodus, Hesiodi", en: "Hesiod", grammar: "N ACC S M (proper name)" },
  hippias: { lemma: "Hippias, Hippiae", en: "Hippias (the sophist who claimed to know everything)", grammar: "N NOM S M (proper name)" },
  homeri: { lemma: "Homerus, Homeri", en: "of Homer", grammar: "N GEN S M (proper name)" },
  homerica: { lemma: "Homericus, -a, -um", en: "Homeric", grammar: "ADJ NOM S F (proper adjective)" },
  homericos: { lemma: "Homericus, -a, -um", en: "Homeric critics", grammar: "ADJ ACC P M (substantive)" },
  homero: { lemma: "Homerus, Homeri", en: "about Homer", grammar: "N ABL S M (proper name)" },
  homerum: { lemma: "Homerus, Homeri", en: "Homer", grammar: "N ACC S M (proper name)" },
  homerus: { lemma: "Homerus, Homeri", en: "Homer", grammar: "N NOM S M (proper name)" },
  hore: { lemma: "hora, horae", en: "of the hour", grammar: "N GEN S F (medieval spelling)" },
  huiuscemodi: { lemma: "huiuscemodi", en: "of this kind", grammar: "ADJ INDECL" },
  iantandem: { lemma: "iam tandem", en: "now at last", grammar: "ADV (two words written as one)" },
  ieronimum: { lemma: "Hieronymus, Hieronymi", en: "Jerome", grammar: "N ACC S M (proper name; medieval spelling)" },
  ieronimus: { lemma: "Hieronymus, Hieronymi", en: "Jerome", grammar: "N NOM S M (proper name; medieval spelling)" },
  illeso: { lemma: "illaesus, illaesa, illaesum", en: "unhurt, unharmed", grammar: "ADJ ABL S M (medieval spelling)" },
  incuntanter: { lemma: "incunctanter", en: "without hesitation", grammar: "ADV (medieval spelling)" },
  inelaborateque: { lemma: "inelaboratus, -a, -um", en: "and unpolished", grammar: "ADJ NOM P F + TACKON (medieval spelling)" },
  interpretum: { lemma: "interpres, interpretis", en: "of the translators", grammar: "N GEN P M" },
  iosephus: { lemma: "Iosephus, Iosephi", en: "Josephus (the Jewish historian)", grammar: "N NOM S M (proper name)" },
  laberii: { lemma: "Laberius, Laberii", en: "of Laberius (the Roman knight Caesar forced onto the stage)", grammar: "N GEN S M (proper name)" },
  laberio: { lemma: "Laberius, Laberii", en: "to Laberius", grammar: "N DAT S M (proper name)" },
  langoribus: { lemma: "languor, languoris", en: "with sicknesses, with weaknesses", grammar: "N ABL P M (medieval spelling)" },
  ledi: { lemma: "laedo, laedere, laesi, laesus", en: "to be wounded, to be hurt", grammar: "V PRES PASSIVE INF (medieval spelling)" },
  ledoria: { lemma: "ledoria, ledoriae", en: "abuse, insult (Greek loidoria)", grammar: "N NOM S F (Greek loanword)" },
  lelii: { lemma: "Laelius, Laelii", en: "of Laelius (the friend of Scipio)", grammar: "N GEN S M (proper name; medieval spelling)" },
  leontinus: { lemma: "Leontinus, -a, -um", en: "of Leontini", grammar: "ADJ NOM S M (proper adjective)" },
  letiorque: { lemma: "laetus, laeta, laetum", en: "and gladder", grammar: "ADJ COMP NOM S M + TACKON (medieval spelling)" },
  leuntium: { lemma: "Leontium, Leontii", en: "Leontion (the Epicurean woman who wrote against Theophrastus)", grammar: "N ACC S N (proper name; medieval spelling)" },
  levam: { lemma: "laevus, laeva, laevum", en: "left, on the left", grammar: "ADJ ACC S F (medieval spelling)" },
  linx: { lemma: "lynx, lyncis", en: "a lynx", grammar: "N NOM S M (medieval spelling)" },
  luneque: { lemma: "luna, lunae", en: "and of the moon", grammar: "N GEN S F + TACKON" },
  macrobius: { lemma: "Macrobius, Macrobii", en: "Macrobius (commentator on the Dream of Scipio)", grammar: "N NOM S M (proper name)" },
  magnifacio: { lemma: "magnifacio, magnifacere, magnifeci, magnifactus", en: "I set great store by", grammar: "V PRES ACTIVE IND 1 S" },
  maleo: { lemma: "malleus, mallei", en: "with a hammer", grammar: "N ABL S M (medieval spelling)" },
  mediolanum: { lemma: "Mediolanum, Mediolani", en: "Milan", grammar: "N ACC S N (proper name)" },
  mediusfidius: { lemma: "medius fidius", en: "so help me God", grammar: "INTERJ (words written as one)" },
  mellifluum: { lemma: "mellifluus, -a, -um", en: "flowing with honey", grammar: "ADJ ACC S N" },
  memorieque: { lemma: "memoria, memoriae", en: "and to memory", grammar: "N DAT S F + TACKON (medieval spelling)" },
  mestiorque: { lemma: "maestus, maesta, maestum", en: "and more grievous", grammar: "ADJ COMP NOM S M + TACKON (medieval spelling)" },
  methaphisice: { lemma: "Metaphysica, Metaphysicae", en: "of the Metaphysics", grammar: "N GEN S F (medieval spelling)" },
  methapontinos: { lemma: "Metapontinus, Metapontini", en: "the people of Metapontum", grammar: "N ACC P M (medieval spelling)" },
  metrodorus: { lemma: "Metrodorus, Metrodori", en: "Metrodorus (disciple of Epicurus)", grammar: "N NOM S M (proper name)" },
  minervas: { lemma: "Minerva, Minervae", en: "Minervas", grammar: "N ACC P F (proper name)" },
  montempessulanum: { lemma: "Mons Pessulanus", en: "Montpellier", grammar: "N ACC S M (place name written as one word)" },
  mosaica: { lemma: "Mosaicus, -a, -um", en: "Mosaic, of Moses", grammar: "ADJ NOM S F (proper adjective)" },
  mosaicam: { lemma: "Mosaicus, -a, -um", en: "Mosaic, of Moses", grammar: "ADJ ACC S F (proper adjective)" },
  nasonis: { lemma: "Naso, Nasonis", en: "of Naso (Ovid)", grammar: "N GEN S M (proper name)" },
  neapolim: { lemma: "Neapolis, Neapolis", en: "Naples", grammar: "N ACC S F (proper name)" },
  nostreque: { lemma: "noster, nostra, nostrum", en: "and our", grammar: "ADJ GEN S F + TACKON (medieval spelling)" },
  obierat: { lemma: "obeo, obire, obivi, obitus", en: "he had died", grammar: "V PLUP ACTIVE IND 3 S" },
  occeanum: { lemma: "Oceanus, Oceani", en: "the Ocean", grammar: "N ACC S M (medieval spelling)" },
  parisius: { lemma: "Parisius", en: "Paris", grammar: "N NOM S (indeclinable medieval place name)" },
  pataviumque: { lemma: "Patavium, Patavii", en: "and Padua", grammar: "N ACC S N + TACKON" },
  patrocli: { lemma: "Patroclus, Patrocli", en: "of Patroclus", grammar: "N GEN S M (proper name)" },
  pegaseo: { lemma: "Pegaseus, -a, -um", en: "of Pegasus", grammar: "ADJ ABL S M (proper adjective)" },
  perquamminima: { lemma: "perquam + minimus, -a, -um", en: "very small indeed", grammar: "ADV + ADJ NOM S F (two words written as one)" },
  pescennius: { lemma: "Pescennius, Pescennii", en: "Pescennius (Niger, the Roman commander)", grammar: "N NOM S M (proper name)" },
  pessimumque: { lemma: "pessimus, pessima, pessimum", en: "and the worst", grammar: "ADJ ACC S N + TACKON" },
  phariseis: { lemma: "Pharisaeus, Pharisaei", en: "to the Pharisees", grammar: "N DAT P M (medieval spelling)" },
  phenix: { lemma: "phoenix, phoenicis", en: "the phoenix", grammar: "N NOM S M (medieval spelling)" },
  philotete: { lemma: "Philoctetes, Philoctetae", en: "of Philoctetes", grammar: "N GEN S M (proper name; medieval spelling)" },
  pirothoi: { lemma: "Pirithous, Pirithoi", en: "of Pirithous", grammar: "N GEN S M (proper name)" },
  pithagoram: { lemma: "Pythagoras, Pythagorae", en: "Pythagoras", grammar: "N ACC S M (proper name; medieval spelling)" },
  pithagoras: { lemma: "Pythagoras, Pythagorae", en: "Pythagoras", grammar: "N NOM S M (proper name; medieval spelling)" },
  pithagore: { lemma: "Pythagoras, Pythagorae", en: "to Pythagoras", grammar: "N DAT S M (proper name; medieval spelling)" },
  pithagorica: { lemma: "Pythagoricus, -a, -um", en: "Pythagorean", grammar: "ADJ ACC P N (medieval spelling)" },
  pithagorici: { lemma: "Pythagoricus, -a, -um", en: "Pythagoreans", grammar: "ADJ NOM P M (substantive; medieval spelling)" },
  plotinus: { lemma: "Plotinus, Plotini", en: "Plotinus", grammar: "N NOM S M (proper name)" },
  plurinomium: { lemma: "plurinomius, -a, -um", en: "of many names", grammar: "ADJ ACC S M" },
  polipus: { lemma: "polypus, polypi", en: "the octopus", grammar: "N NOM S M (medieval spelling)" },
  porphirius: { lemma: "Porphyrius, Porphyrii", en: "Porphyry", grammar: "N NOM S M (proper name; medieval spelling)" },
  possidonius: { lemma: "Posidonius, Posidonii", en: "Posidonius (the Stoic who built the planetary globe)", grammar: "N NOM S M (proper name; medieval spelling)" },
  predonibus: { lemma: "praedo, praedonis", en: "to the plunderers", grammar: "N DAT P M (medieval spelling)" },
  proceresque: { lemma: "procer, proceris", en: "and the nobles", grammar: "N ACC P M + TACKON" },
  proculdubio: { lemma: "procul dubio", en: "beyond doubt", grammar: "ADV (two words written as one)" },
  promulgarint: { lemma: "promulgo, promulgare, promulgavi, promulgatus", en: "they may have published", grammar: "V PERF ACTIVE SUB 3 P (syncopated)" },
  psalmographo: { lemma: "psalmographus, psalmographi", en: "the psalmist", grammar: "N ABL S M" },
  ptholomeum: { lemma: "Ptolemaeus, Ptolemaei", en: "Ptolemy", grammar: "N ACC S M (proper name; medieval spelling)" },
  quesieris: { lemma: "quaero, quaerere, quaesivi, quaesitus", en: "you should seek", grammar: "V PERF ACTIVE SUB 2 S (syncopated; medieval spelling)" },
  quinetiam: { lemma: "quin etiam", en: "moreover, what is more", grammar: "ADV (two words written as one)" },
  repetiit: { lemma: "repeto, repetere, repetivi, repetitus", en: "he sought again, he made for again", grammar: "V PERF ACTIVE IND 3 S" },
  rethoricam: { lemma: "rhetorica, rhetoricae", en: "rhetoric", grammar: "N ACC S F (medieval spelling)" },
  rethorice: { lemma: "rhetorica, rhetoricae", en: "of rhetoric", grammar: "N GEN S F (medieval spelling)" },
  rethorici: { lemma: "rhetoricus, -a, -um", en: "of the rhetorician", grammar: "ADJ GEN S M (medieval spelling)" },
  roberti: { lemma: "Robertus, Roberti", en: "of Robert (king of Naples, Petrarch's examiner)", grammar: "N GEN S M (proper name)" },
  robertus: { lemma: "Robertus, Roberti", en: "Robert (king of Naples)", grammar: "N NOM S M (proper name)" },
  rodani: { lemma: "Rhodanus, Rhodani", en: "of the Rhône", grammar: "N GEN S M (medieval spelling)" },
  ruphini: { lemma: "Rufinus, Rufini", en: "of Rufinus (Jerome's antagonist)", grammar: "N GEN S M (proper name; medieval spelling)" },
  salustii: { lemma: "Sallustius, Sallustii", en: "of Sallust", grammar: "N GEN S M (proper name; medieval spelling)" },
  salustio: { lemma: "Sallustius, Sallustii", en: "about Sallust", grammar: "N ABL S M (proper name; medieval spelling)" },
  scomma: { lemma: "scomma, scommatis", en: "a gibe, a taunt", grammar: "N NOM S N (Greek loanword)" },
  solertius: { lemma: "sollerter", en: "more skilfully", grammar: "ADV COMP (medieval spelling)" },
  solonem: { lemma: "Solon, Solonis", en: "Solon", grammar: "N ACC S M (proper name)" },
  sonantiora: { lemma: "sonans, sonantis", en: "more resounding", grammar: "ADJ COMP ACC P N" },
  sorgia: { lemma: "Sorgia, Sorgiae", en: "the Sorgue (the spring at Vaucluse)", grammar: "N NOM S F (proper name)" },
  speram: { lemma: "sphaera, sphaerae", en: "a sphere, a globe", grammar: "N ACC S F (medieval spelling)" },
  spere: { lemma: "sphaera, sphaerae", en: "of the sphere", grammar: "N GEN S F (medieval spelling)" },
  speris: { lemma: "sphaera, sphaerae", en: "with the spheres", grammar: "N ABL P F (medieval spelling)" },
  stomacetur: { lemma: "stomachor, stomachari, stomachatus sum", en: "would be sickened, would take offence", grammar: "V PRES DEP SUB 3 S (medieval spelling)" },
  stomaco: { lemma: "stomachus, stomachi", en: "with disgust", grammar: "N ABL S M (medieval spelling)" },
  strepidulus: { lemma: "strepidulus, -a, -um", en: "noisy, clattering", grammar: "ADJ NOM S M" },
  suetonium: { lemma: "Suetonius, Suetonii", en: "Suetonius", grammar: "N ACC S M (proper name)" },
  tedium: { lemma: "taedium, taedii", en: "weariness, tedium", grammar: "N ACC S N (medieval spelling)" },
  tertiumdecimum: { lemma: "tertius decimus", en: "thirteenth", grammar: "NUM ACC S M (two words written as one)" },
  theofrastum: { lemma: "Theophrastus, Theophrasti", en: "Theophrastus", grammar: "N ACC S M (proper name; medieval spelling)" },
  timocrati: { lemma: "Timocrates, Timocratis", en: "to Timocrates", grammar: "N DAT S M (proper name)" },
  tuchidide: { lemma: "Thucydides, Thucydidis", en: "Thucydides", grammar: "N ABL S M (proper name; medieval spelling)" },
  unaqueque: { lemma: "unusquisque, unaquaeque, unumquodque", en: "each single one", grammar: "PRON NOM S F (medieval spelling)" },
  usqueadeo: { lemma: "usque adeo", en: "to such a degree", grammar: "ADV (two words written as one)" },
  usquedum: { lemma: "usque dum", en: "until", grammar: "CONJ (two words written as one)" },
  varro: { lemma: "Varro, Varronis", en: "Varro", grammar: "N NOM S M (proper name)" },
  virgiliana: { lemma: "Vergilianus, -a, -um", en: "Virgilian, of Virgil", grammar: "ADJ NOM S F (proper adjective)" },
  virgilianos: { lemma: "Vergilianus, -a, -um", en: "critics of Virgil", grammar: "ADJ ACC P M (substantive)" },
  virgilii: { lemma: "Vergilius, Vergilii", en: "of Virgil", grammar: "N GEN S M (proper name)" },
  virgilio: { lemma: "Vergilius, Vergilii", en: "about Virgil", grammar: "N ABL S M (proper name)" },
  virtuosum: { lemma: "virtuosus, -a, -um", en: "virtuous", grammar: "ADJ ACC S M (medieval Latin)" },
  xenophon: { lemma: "Xenophon, Xenophontis", en: "Xenophon", grammar: "N NOM S M (proper name)" },
  xenophonte: { lemma: "Xenophon, Xenophontis", en: "Xenophon", grammar: "N ABL S M (proper name)" },
  "xiª": { lemma: "undecimus, undecima, undecimum", en: "eleventh (Roman numeral XI with the ordinal suffix)", grammar: "NUM ABL S F" },
  ysocratis: { lemma: "Isocrates, Isocratis", en: "of Isocrates (the Athenian orator)", grammar: "N GEN S M (medieval spelling)" },
  zoilum: { lemma: "Zoilus, Zoili", en: "Zoilus (the carping critic of Homer)", grammar: "N ACC S M (proper name)" },
  "μετεμψικοσις": { lemma: "μετεμψύχωσις (metempsychosis)", en: "metempsychosis, the transmigration of souls", grammar: "N NOM S F (Greek, as written by Petrarch)" }
};

// Catullus contains many unattested proper names and deliberately archaic
// poetic forms. Keep their reviewed fallback entries beside that import so
// the general Whitaker pipeline remains strict for every other text.
if (fs.existsSync(CATULLUS_OVERRIDES)) {
  Object.assign(OVERRIDES, JSON.parse(fs.readFileSync(CATULLUS_OVERRIDES, "utf8")));
}

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

// Trecento and medieval scribal orthography differs from the classical spelling
// Whitaker's Words indexes. These rewrites are tried, in combination, only after
// a direct lookup has failed; a candidate is accepted solely when Whitaker
// resolves it, and the resulting entry records the classical form it came from.
// Proper names and genuine ambiguities are NOT handled here — they stay in
// OVERRIDES, which is consulted first and therefore always wins.
const MEDIEVAL_RESOLVED = new Map();
const MEDIEVAL_SPELLINGS = [
  [/^pre/, "prae"],           // precipue -> praecipue
  [/^y/, "hy"],               // yperbole -> hyperbole
  [/^e/, "ae"],               // eternitas -> aeternitas
  [/^ce/, "cae"],             // cecus -> caecus
  [/^he/, "hae"],             // hecne -> haecne
  [/^que/, "quae"],           // querunt -> quaerunt
  [/^exti/, "aesti"],         // extimare -> aestimare
  [/^liter/, "litter"],       // literatus -> litteratus
  [/^comun/, "commun"],       // comunicabilis -> communicabilis
  [/^soli(c)/, "solli$1"],    // solicitus -> sollicitus
  [/nque/, "mque"],           // utranque -> utramque
  [/cunque/, "cumque"],       // ubicunque -> ubicumque
  [/^nanque/, "namque"],
  [/ti/, "ci"],               // suspitio -> suspicio
  [/ci/, "ti"],               // inverse
  [/ch/, "c"],                // archana -> arcana
  [/th/, "t"],                // athomus -> atomus
  [/y/, "i"],                 // ydiota -> idiota
  [/^i/, "y"],                // inverse, for hellenisms
  [/asse$/, "avisse"],        // aberrasse -> aberravisse
  [/asset$/, "avisset"],
  [/assent$/, "avissent"],
  [/arunt$/, "averunt"],      // dictarunt -> dictaverunt
  [/isti$/, "ivisti"],        // audisti -> audivisti
  [/ierim$/, "iverim"],
  [/ierint$/, "iverint"],
  [/ierit$/, "iverit"],
  [/osses$/, "ovisses"],      // nosses -> novisses
  [/osset$/, "ovisset"],
];

function spellingCandidates(word, depth = 3) {
  const seen = new Set([word]);
  let frontier = [word];
  const out = [];
  for (let step = 0; step < depth; step += 1) {
    const next = [];
    for (const form of frontier) {
      for (const [pattern, replacement] of MEDIEVAL_SPELLINGS) {
        if (!pattern.test(form)) continue;
        const candidate = form.replace(pattern, replacement);
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        next.push(candidate);
        out.push(candidate);
      }
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return out;
}

function entryFor(engine, word) {
  if (OVERRIDES[word]) return OVERRIDES[word];
  if (OVERRIDES[normalise(word)]) return OVERRIDES[normalise(word)];
  let analysis = engine.parseWord(word);
  if (!analysis.results.length && !analysis.uniqueResults.length && !analysis.addonResults.length && normalise(word) !== word) {
    analysis = engine.parseWord(normalise(word));
  }
  if (!analysis.results.length && !analysis.uniqueResults.length && !analysis.addonResults.length) {
    for (const candidate of spellingCandidates(normalise(word))) {
      const retry = engine.parseWord(candidate);
      if (retry.results.length || retry.uniqueResults.length || retry.addonResults.length) {
        MEDIEVAL_RESOLVED.set(word, candidate);
        analysis = retry;
        break;
      }
    }
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
    const classical = MEDIEVAL_RESOLVED.get(word);
    if (classical) {
      entries[word] = { ...entries[word], grammar: `${entries[word].grammar} (medieval spelling of ${classical})` };
    }
  } catch {
    unresolved.push(word);
  }
}
if (process.env.REPORT_MEDIEVAL && MEDIEVAL_RESOLVED.size) {
  const rows = [...MEDIEVAL_RESOLVED].map(([from, to]) => `${from} -> ${to} = ${entries[from].lemma}`);
  console.log(`Medieval spellings resolved (${rows.length}), review before committing:\n${rows.join("\n")}`);
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
