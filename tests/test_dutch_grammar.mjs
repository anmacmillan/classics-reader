import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

function createRuntime(extra = {}) {
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
      body: { classList: { add() {}, remove() {}, contains() { return false; } } }
    },
    fetch() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
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

test("Whitaker's Words codes read in Dutch school terms", () => {
  const runtime = createRuntime();
  const cases = {
    "V 3 1 PRES PASSIVE IND 2 S": "ww. · indicatief praesens passief · 2e persoon enkelvoud",
    "N 1 1 ACC S F": "zn. · 1e declinatie · accusatief enkelvoud vrouwelijk",
    "N 3 1 NOM S N": "zn. · 3e declinatie · nominatief enkelvoud onzijdig",
    "VPAR 3 1 NOM S N FUT PASSIVE PPL": "gerundivum · nominatief enkelvoud onzijdig",
    "VPAR 3 1 ACC P M PERF PASSIVE PPL": "participium perfectum passief · accusatief meervoud mannelijk",
    "PREP ABL": "vz. + ablatief",
    "N 9 9 X X N proper name": "zn. · onzijdig · eigennaam",
    "PRON 1 0 NOM S F + TACKON": "vnw. · nominatief enkelvoud vrouwelijk + aanhangsel",
    "N 2 1 GEN S M (medieval spelling of foo)": "zn. · 2e declinatie · genitief enkelvoud mannelijk · (medieval spelling of foo)"
  };
  for (const [code, dutch] of Object.entries(cases)) {
    runtime.code = code;
    assert.equal(run(runtime, 'dutchGrammar(code, "latin")'), dutch, code);
  }
});

test("Greek treebank tags read in Dutch", () => {
  const runtime = createRuntime();
  runtime.tags = "verb 3rd sg aor ind act";
  assert.equal(run(runtime, 'dutchGrammar(tags, "greek")'), "ww. 3e persoon enkelvoud aoristus indicatief actief");
});

test("other languages keep their grammar line as written", () => {
  const runtime = createRuntime();
  assert.equal(run(runtime, 'dutchGrammar("v., past", "danish")'), "v., past");
});

test("parser relations become valentiegrammatica terms", () => {
  const runtime = createRuntime();
  const cases = [
    ["nsubj", "Case=Nom|Number=Sing", "onderwerp"],
    ["obj", "Case=Acc", "lijdend voorwerp"],
    ["iobj", "Case=Dat", "meewerkend voorwerp"],
    ["obl", "Case=Abl|Number=Plur", "bijwoordelijke bepaling (ablatief)"],
    ["nmod", "Case=Gen", "bijvoeglijke bepaling (genitief)"],
    ["root", "Mood=Ind|Tense=Pres|VerbForm=Fin", "gezegde (persoonsvorm)"],
    ["nsubj", "Case=Acc|Number=Sing", "onderwerp van de infinitiefzin (a.c.i.)"],
    ["ccomp", "VerbForm=Inf|Tense=Pres", "infinitiefzin (a.c.i.)"],
    ["obl:agent", "Case=Abl", "bijwoordelijke bepaling met rol handelende persoon"]
  ];
  for (const [role, morph, dutch] of cases) {
    runtime.role = role;
    runtime.morph = morph;
    assert.equal(run(runtime, "syntaxRoleNl(role, morph)"), dutch, `${role} ${morph}`);
  }
});

test("Latin tense and aspect combine into the school tense names", () => {
  const runtime = createRuntime();
  const cases = {
    "Aspect=Imp|Mood=Ind|Tense=Past|VerbForm=Fin": "imperfectum",
    "Aspect=Perf|Mood=Ind|Tense=Past|VerbForm=Fin": "perfectum",
    "Aspect=Perf|Mood=Ind|Tense=Fut|VerbForm=Fin": "futurum exactum",
    "Aspect=Perf|Mood=Sub|Tense=Pqp|VerbForm=Fin": "plusquamperfectum"
  };
  for (const [morph, tense] of Object.entries(cases)) {
    runtime.morph = morph;
    assert.ok(run(runtime, 'syntaxMorphNl(morph, "latin")').includes(tense), morph);
  }
});

test("core vocabulary ranks forms and falls back to its Dutch gloss", () => {
  const runtime = createRuntime({
    CORE_VOCAB: {
      latin: { size: 2, target: 800, words: [[2, "sum esse fuī", "be", "zijn"], [269, "ventus -ī m.", "wind", "wind"]], forms: { est: 2, venti: 269 } }
    },
    LATIN_DICT: { venti: { lemma: "ventus, venti", en: "wind", grammar: "N 2 1 GEN S M" } }
  });
  assert.equal(run(runtime, 'coreRankFor("Venti,", "latin")'), 269);
  assert.equal(run(runtime, 'coreRankFor("puella", "latin")'), null);
  assert.equal(run(runtime, 'coreRankFor("est", "greek")'), null);
  const html = run(runtime, 'renderInteractiveLine("venti", "latin")');
  assert.match(html, /data-core-rank="269"/);
  assert.match(html, /data-nl="wind"/);
});
