import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const root = new URL('..', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach((value) => this.values.add(value)); }
  remove(...values) { values.forEach((value) => this.values.delete(value)); }
  contains(value) { return this.values.has(value); }
  toggle(value, force) {
    const enabled = force === undefined ? !this.contains(value) : Boolean(force);
    if (enabled) this.add(value); else this.remove(value);
    return enabled;
  }
  set(value) { this.values = new Set(String(value).split(/\s+/).filter(Boolean)); }
  toString() { return [...this.values].join(' '); }
}

function selectorMatches(node, selector) {
  const id = selector.match(/#([\w-]+)/)?.[1];
  const className = selector.match(/\.([\w-]+)/)?.[1];
  const lineIndex = selector.match(/\[data-line-index(?:="([^"]+)")?\]/);
  return (!id || node.id === id) &&
    (!className || node.classList.contains(className)) &&
    (!lineIndex || (lineIndex[1] === undefined || node.dataset.lineIndex === lineIndex[1]));
}

function descendants(node) {
  return node.children.flatMap((child) => [child, ...descendants(child)]);
}

class FakeNode {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.parentNode = null;
    this.classList = new FakeClassList();
    this.dataset = {};
    this.style = {};
    this._hidden = false;
    this.hiddenWrites = 0;
    this.attributes = {};
    this.id = '';
    this.scrollTop = 0;
    this.clientHeight = 0;
    this.scrollHeight = 0;
    this.computedStyle = { marginTop: '0px', marginBottom: '0px', paddingTop: '0px', paddingBottom: '0px' };
    this.rect = { top: 0, bottom: 0, height: 0 };
    this.rectCalls = 0;
  }
  get className() { return this.classList.toString(); }
  set className(value) { this.classList.set(value); }
  get hidden() { return this._hidden; }
  set hidden(value) { this.hiddenWrites += 1; this._hidden = Boolean(value); }
  get firstChild() { return this.children[0] || null; }
  appendChild(child) {
    if (child.isFragment) {
      while (child.firstChild) this.appendChild(child.firstChild);
      return child;
    }
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  replaceChildren(...children) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    children.forEach((child) => this.appendChild(child));
  }
  querySelectorAll(selector) {
    const direct = selector.split(/\s*>\s*/);
    if (direct.length === 2) {
      return [this, ...descendants(this)]
        .filter((node) => selectorMatches(node, direct[0]))
        .flatMap((node) => node.children.filter((child) => selectorMatches(child, direct[1])));
    }
    return descendants(this).filter((node) => selectorMatches(node, selector.split(/\s+/).at(-1)));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getBoundingClientRect() { this.rectCalls += 1; return this.rect; }
}

class FakeFragment extends FakeNode {
  constructor() { super('#fragment'); this.isFragment = true; }
}

function createHarness({ readerPagination } = {}) {
  const body = new FakeNode('body');
  const warnings = [];
  const document = {
    body,
    createElement: (tagName) => new FakeNode(tagName),
    createDocumentFragment: () => new FakeFragment(),
    addEventListener() {},
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    getElementById(id) { return descendants(body).find((node) => node.id === id) || null; },
  };
  const context = vm.createContext({
    console: { warn(...args) { warnings.push(args); }, log() {} },
    document,
    window: { getComputedStyle: (node) => node.computedStyle, addEventListener() {}, matchMedia() { return null; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    setTimeout,
    clearTimeout,
    ...(readerPagination ? { ReaderPagination: readerPagination } : {}),
  });
  if (!readerPagination) vm.runInContext(read('pagination.js'), context);
  vm.runInContext(`${read('app.js')}\nglobalThis.__paginationApi = { state, unwrapReaderPages, outerBlockHeight, usablePageHeight, firstLineOnPage, captureReadingAnchor, showPagedPage, composeReaderPages, recalcPages, getPendingPageEdge: () => pendingPageEdge, setPendingPageEdge: (value) => { pendingPageEdge = value; }, setTabletTouchMedia: (value) => { tabletTouchMedia = value; } };`, context);
  return { ...context.__paginationApi, context, document, body, warnings };
}

function reader(harness, { paneHeight = 100, contentHeight = 800 } = {}) {
  const pane = new FakeNode('main');
  pane.className = 'reader-pane';
  pane.clientHeight = paneHeight;
  pane.rect = { top: 0, bottom: paneHeight, height: paneHeight };
  const content = new FakeNode('article');
  content.className = 'reader-content';
  content.scrollHeight = contentHeight;
  const wrapper = new FakeNode('div');
  wrapper.id = 'chunks-inner';
  const indicator = new FakeNode('span');
  indicator.id = 'page-indicator';
  harness.body.append(pane, content, indicator);
  content.appendChild(wrapper);
  return { pane, content, wrapper, indicator };
}

function block(name, { height = 20, lineIndex, marginTop = 0, marginBottom = 0, top = 0 } = {}) {
  const node = new FakeNode('div');
  node.id = name;
  if (lineIndex !== undefined) {
    node.className = 'chunk-row';
    node.dataset.lineIndex = String(lineIndex);
  }
  node.rect = { top, bottom: top + height, height };
  node.computedStyle.marginTop = `${marginTop}px`;
  node.computedStyle.marginBottom = `${marginBottom}px`;
  return node;
}

test('unwrapReaderPages restores block order and is idempotent', () => {
  const { unwrapReaderPages } = createHarness();
  const wrapper = new FakeNode('div');
  const first = new FakeNode('section'); first.className = 'reader-page';
  const second = new FakeNode('section'); second.className = 'reader-page';
  const a = block('a'); const b = block('b'); const c = block('c');
  const interleaved = block('interleaved');
  first.append(a, b); second.appendChild(c); wrapper.append(first, interleaved, second);

  unwrapReaderPages(wrapper);
  assert.deepEqual(wrapper.children.map((node) => node.id), ['a', 'b', 'interleaved', 'c']);
  unwrapReaderPages(wrapper);
  assert.deepEqual(wrapper.children.map((node) => node.id), ['a', 'b', 'interleaved', 'c']);
});

test('measures outer block margins and usable pane padding', () => {
  const { outerBlockHeight, usablePageHeight } = createHarness();
  const node = block('block', { height: 40, marginTop: 3, marginBottom: 7 });
  const pane = new FakeNode('main');
  pane.clientHeight = 200;
  pane.computedStyle.paddingTop = '16px';
  pane.computedStyle.paddingBottom = '24px';
  assert.equal(outerBlockHeight(node), 50);
  assert.equal(usablePageHeight(pane), 160);
});

test('captures semantic anchors from visible paged and continuous content', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness);
  const first = new FakeNode('section'); first.className = 'reader-page';
  const second = new FakeNode('section'); second.className = 'reader-page'; second.hidden = true;
  first.appendChild(block('one', { lineIndex: 4, top: 10 }));
  second.appendChild(block('two', { lineIndex: 9, top: 10 }));
  wrapper.append(first, second);
  harness.state.readingMode = 'paged';
  assert.equal(harness.captureReadingAnchor(), 4);

  harness.state.readingMode = 'continuous';
  harness.unwrapReaderPages(wrapper);
  wrapper.children[0].rect = { top: -50, bottom: -10, height: 40 };
  wrapper.children[1].rect = { top: -5, bottom: 30, height: 35 };
  assert.equal(harness.captureReadingAnchor(), 9);
  assert.equal(pane.scrollTop, 0);
});

test('showPagedPage clamps page selection, hides siblings, and resets pane scroll', () => {
  const harness = createHarness();
  const { pane, wrapper, indicator } = reader(harness);
  const first = new FakeNode('section'); first.className = 'reader-page'; first.appendChild(block('one', { lineIndex: 2 }));
  const second = new FakeNode('section'); second.className = 'reader-page'; second.appendChild(block('two', { lineIndex: 8 }));
  wrapper.append(first, second);
  pane.scrollTop = 99;
  harness.state.totalPages = 2;
  harness.showPagedPage(99);
  assert.equal(harness.state.currentPageIndex, 1);
  assert.equal(harness.state.currentLineIndex, 8);
  assert.equal(first.hidden, true);
  assert.equal(second.hidden, false);
  assert.equal(pane.scrollTop, 0);
  assert.equal(indicator.textContent, '2 / 2');
});

test('composeReaderPages preserves block identity/order, measures once, and honors pending edges', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100 });
  pane.computedStyle.paddingTop = '10px';
  pane.computedStyle.paddingBottom = '10px';
  const a = block('a', { height: 30, lineIndex: 0 });
  const b = block('b', { height: 50, lineIndex: 1 });
  const c = block('c', { height: 100, lineIndex: 2 });
  wrapper.append(a, b, c);
  harness.state.readingMode = 'paged';
  harness.setPendingPageEdge('last');
  harness.composeReaderPages(0);
  const pages = wrapper.children;
  assert.deepEqual(pages.flatMap((page) => page.children).map((node) => node.id), ['a', 'b', 'c']);
  assert.equal(pages.flatMap((page) => page.children)[0], a);
  assert.deepEqual([a.rectCalls, b.rectCalls, c.rectCalls], [1, 1, 1]);
  assert.equal(pages.at(-1).hidden, false);
  assert.equal(pages.at(-1).classList.contains('reader-page-oversized'), true);
  assert.equal(harness.getPendingPageEdge(), null);
  harness.setPendingPageEdge('first');
  harness.composeReaderPages(2);
  assert.equal(wrapper.children[0].hidden, false);
  assert.equal(harness.getPendingPageEdge(), null);
});

test('composeReaderPages uses real line lookup and creates indexed fixed-height sections', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100 });
  pane.computedStyle.paddingTop = '10px';
  pane.computedStyle.paddingBottom = '10px';
  const a = block('a', { height: 30, lineIndex: 0 });
  const b = block('b', { height: 50, lineIndex: 1 });
  const c = block('c', { height: 100, lineIndex: 2 });
  wrapper.append(a, b, c);
  harness.state.readingMode = 'paged';
  harness.setPendingPageEdge(null);

  harness.composeReaderPages(2);

  assert.equal(harness.context.ReaderPagination.pageIndexForLine(wrapper.children.map((page) => page.children), 2), 1);
  assert.equal(harness.state.currentPageIndex, 1);
  assert.equal(harness.state.totalPages, 2);
  assert.deepEqual(wrapper.children.map((page) => page.tagName), ['section', 'section']);
  assert.deepEqual(wrapper.children.map((page) => page.dataset.pageIndex), ['0', '1']);
  assert.deepEqual(wrapper.children.map((page) => page.style.height), ['80px', '80px']);
  assert.equal(wrapper.children[1].hidden, false);
});

test('continuous recalc restores a valid anchor and derives page state from scroll position', () => {
  const harness = createHarness();
  const { pane, wrapper, indicator } = reader(harness, { paneHeight: 100, contentHeight: 800 });
  const row = block('line-four', { lineIndex: 4, top: 230, height: 30 });
  wrapper.rect = { top: 0, bottom: 800, height: 800 };
  wrapper.appendChild(row);
  harness.state.readingMode = 'continuous';
  harness.state.currentPageIndex = 0;
  harness.recalcPages({ anchorLineIndex: 4 });
  assert.equal(pane.scrollTop, 230);
  assert.equal(harness.state.currentPageIndex, 2);
  assert.equal(harness.state.currentLineIndex, 4);
  assert.equal(indicator.textContent, '3 / 8');
});

test('continuous recalc preserves safe state for invalid or nonexistent anchors', () => {
  const harness = createHarness();
  const { pane, wrapper, indicator } = reader(harness, { paneHeight: 100, contentHeight: 800 });
  wrapper.rect = { top: 0, bottom: 800, height: 800 };
  wrapper.appendChild(block('line-four', { lineIndex: 4, top: 230, height: 30 }));
  pane.scrollTop = 850;
  harness.state.readingMode = 'continuous';
  harness.state.currentLineIndex = 4;
  harness.recalcPages({ anchorLineIndex: -1 });
  assert.equal(pane.scrollTop, 700);
  assert.equal(harness.state.currentLineIndex, 4);
  assert.equal(harness.state.currentPageIndex, 7);
  assert.equal(indicator.textContent, '8 / 8');
  harness.recalcPages({ anchorLineIndex: 99 });
  assert.equal(harness.state.currentLineIndex, 4);
});

test('continuous recalc replaces invalid line state with a visible row or zero', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  wrapper.rect = { top: 0, bottom: 300, height: 300 };
  wrapper.appendChild(block('visible-line', { lineIndex: 6, top: 20, height: 30 }));
  harness.state.readingMode = 'continuous';
  harness.state.currentLineIndex = -5;

  harness.recalcPages({ anchorLineIndex: -1 });
  assert.equal(harness.state.currentLineIndex, 6);

  wrapper.replaceChildren();
  harness.state.currentLineIndex = -9;
  harness.recalcPages({ anchorLineIndex: 99 });
  assert.equal(harness.state.currentLineIndex, 0);
});

test('paged composition failure only changes runtime layout state', () => {
  let persisted = false;
  const harness = createHarness({
    readerPagination: {
      TABLET_TOUCH_QUERY: '',
      packBlocks() { throw new Error('measure failed'); },
      persistMode() { persisted = true; },
    },
  });
  const { wrapper } = reader(harness);
  wrapper.appendChild(block('line', { lineIndex: 0 }));
  const modeButton = new FakeNode('button');
  modeButton.id = 'reading-mode-btn';
  harness.body.appendChild(modeButton);
  harness.state.readingMode = 'paged';
  harness.body.classList.add('paged-reader');
  harness.setTabletTouchMedia({ matches: true });
  harness.recalcPages({ anchorLineIndex: 0 });
  assert.equal(harness.state.readingMode, 'continuous');
  assert.equal(harness.body.classList.contains('paged-reader'), false);
  assert.equal(persisted, false);
  assert.deepEqual(harness.warnings[0]?.slice(0, 1), ['Paged reader unavailable; using continuous layout:']);
  assert.equal(harness.warnings.length, 1);
  assert.equal(modeButton.hiddenWrites, 1);
  assert.equal(modeButton.hidden, false);
  assert.equal(modeButton.textContent, 'Continuous');
  assert.equal(modeButton.attributes['aria-pressed'], 'false');
});

test('recalcPages safely ignores absent and zero-height reader panes', () => {
  const absent = createHarness();
  assert.doesNotThrow(() => absent.recalcPages({ anchorLineIndex: 0 }));
  const zero = createHarness();
  const { pane } = reader(zero, { paneHeight: 0 });
  zero.state.currentLineIndex = 3;
  zero.recalcPages({ anchorLineIndex: 0 });
  assert.equal(pane.scrollTop, 0);
  assert.equal(zero.state.currentLineIndex, 3);
});
