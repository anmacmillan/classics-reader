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
  invitis: { lemma: "invitus, invita, invitum", en: "unwilling; reluctant", grammar: "ADJ ABL P N" },
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
  xenophontem: { lemma: "Xenophon, Xenophontis", en: "Xenophon (Athenian soldier-historian, pupil of Socrates, source for Prodicus' Choice of Hercules)", grammar: "N ACC S M (proper name)" }
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
