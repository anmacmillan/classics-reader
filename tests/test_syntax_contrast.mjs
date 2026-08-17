import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const indexHtml = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const makefileSource = fs.readFileSync(new URL("../Makefile", import.meta.url), "utf8");
const serviceWorker = fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const darkPastels = [
  "rgba(96, 165, 250, 0.20)",
  "rgba(74, 222, 128, 0.20)",
  "rgba(250, 204, 21, 0.20)",
  "rgba(244, 114, 182, 0.20)",
  "rgba(167, 139, 250, 0.20)",
  "rgba(34, 211, 238, 0.20)"
];
const lightPastels = ["#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#ede9fe", "#cffafe"];

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
    Blob,
    URL,
    console,
    document,
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

function syntaxPastels(root) {
  return [...root.matchAll(/--syntax-pastel-(\d):\s*([^;]+);/g)]
    .sort(([, left], [, right]) => Number(left) - Number(right))
    .map(([, , value]) => value);
}

test("syntaxPastel assigns agreement groups through a theme variable", () => {
  const value = vm.runInContext('syntaxPastel("odyssey-group")', createRuntime());

  assert.match(value, /^var\(--syntax-pastel-[0-5]\)$/);
});

test("dark theme syntax pastels use translucent tints", () => {
  const darkRoot = stylesSource.slice(
    stylesSource.indexOf(":root {"),
    stylesSource.indexOf(':root[data-theme="light"]')
  );

  assert.deepEqual(syntaxPastels(darkRoot), darkPastels);
});

test("light theme syntax pastels use light hex tints", () => {
  const lightRoot = stylesSource.slice(
    stylesSource.indexOf(':root[data-theme="light"]'),
    stylesSource.indexOf("* {")
  );

  assert.deepEqual(syntaxPastels(lightRoot), lightPastels);
});

test("deployment versions refresh the changed assets", () => {
  const coreAssets = serviceWorker.match(/const CORE = \[([\s\S]*?)\];/)?.[1] || "";

  assert.match(indexHtml, /<link rel="icon" href="icon\.png">/);
  assert.match(indexHtml, /styles\.css\?v=20260802-2/);
  assert.match(indexHtml, /pagination\.js\?v=20260802-2/);
  assert.match(indexHtml, /app\.js\?v=20260802-2/);
  assert.match(serviceWorker, /const CACHE = "classics-reader-v28"/);
  assert.match(coreAssets, /"styles\.css"/);
  assert.match(coreAssets, /"pagination\.js"/);
  assert.match(coreAssets, /"app\.js"/);
  assert.match(coreAssets, /"icon\.png"/);
  assert.match(makefileSource, /\n\tnode --check pagination\.js\n\tnode --check app\.js(?:\n|$)/);
});
