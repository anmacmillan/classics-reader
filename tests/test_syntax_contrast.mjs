import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const stylesSource = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

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

test("syntaxPastel assigns agreement groups through a theme variable", () => {
  const value = vm.runInContext('syntaxPastel("odyssey-group")', createRuntime());

  assert.match(value, /^var\(--syntax-pastel-[0-5]\)$/);
});

test("dark theme syntax pastels use translucent tints", () => {
  const darkRoot = stylesSource.slice(
    stylesSource.indexOf(":root {"),
    stylesSource.indexOf(':root[data-theme="light"]')
  );

  for (let index = 0; index < 6; index++) {
    assert.match(darkRoot, new RegExp(`--syntax-pastel-${index}:\\s*rgba\\(`));
  }
});

test("light theme syntax pastels use light hex tints", () => {
  const lightRoot = stylesSource.slice(
    stylesSource.indexOf(':root[data-theme="light"]'),
    stylesSource.indexOf("* {")
  );

  for (let index = 0; index < 6; index++) {
    assert.match(lightRoot, new RegExp(`--syntax-pastel-${index}:\\s*#[0-9a-fA-F]{6}`));
  }
});
