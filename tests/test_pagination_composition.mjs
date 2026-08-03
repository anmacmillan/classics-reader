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
    if (this.throwAfterBlockMove && !this.didThrowAfterBlockMove && !child.isFragment) {
      this.didThrowAfterBlockMove = true;
      throw new Error('page assembly failed after block move');
    }
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

function createHarness({ readerPagination, throwAfterBlockMove = false, gistSync = false } = {}) {
  const body = new FakeNode('body');
  const warnings = [];
  const gistPatches = [];
  const document = {
    body,
    createElement: (tagName) => {
      const node = new FakeNode(tagName);
      if (throwAfterBlockMove && tagName === 'section') node.throwAfterBlockMove = true;
      return node;
    },
    createDocumentFragment: () => new FakeFragment(),
    addEventListener() {},
    querySelector(selector) { return body.querySelector(selector); },
    querySelectorAll(selector) { return body.querySelectorAll(selector); },
    getElementById(id) { return descendants(body).find((node) => node.id === id) || null; },
  };
  const storageValues = new Map(gistSync ? [
    ['slovo_gist_id', 'gist-1'],
    ['slovo_github_pat', 'test-token'],
  ] : []);
  const context = vm.createContext({
    console: { warn(...args) { warnings.push(args); }, log() {} },
    document,
    window: { getComputedStyle: (node) => node.computedStyle, addEventListener() {}, matchMedia() { return null; } },
    localStorage: {
      getItem(key) { return storageValues.get(key) ?? null; },
      setItem(key, value) { storageValues.set(key, String(value)); },
    },
    fetch: async (_url, options = {}) => {
      if (options.method === 'PATCH') {
        gistPatches.push(JSON.parse(options.body));
        return { ok: true, status: 200, text: async () => '' };
      }
      return { ok: true, json: async () => ({ files: {} }) };
    },
    setTimeout,
    clearTimeout,
    ...(readerPagination ? { ReaderPagination: readerPagination } : {}),
  });
  if (!readerPagination) vm.runInContext(read('pagination.js'), context);
  vm.runInContext(`${read('app.js')}\nglobalThis.__paginationApi = { state, unwrapReaderPages, outerBlockHeight, usablePageHeight, firstLineOnPage, captureReadingAnchor, showPagedPage, composeReaderPages, recalcPages, syncPageFromScroll, syncProgressToGist, getPendingPageEdge: () => pendingPageEdge, setPendingPageEdge: (value) => { pendingPageEdge = value; }, setTabletTouchMedia: (value) => { tabletTouchMedia = value; } };`, context);
  return { ...context.__paginationApi, context, document, body, warnings, gistPatches };
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

test('continuous anchor ignores rows occluded by reader pane top padding', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness);
  pane.computedStyle.paddingTop = '96px';
  wrapper.append(
    block('occluded-line', { lineIndex: 40, top: -48, height: 116 }),
    block('first-visible-line', { lineIndex: 41, top: 96, height: 116 }),
  );
  harness.state.readingMode = 'continuous';

  assert.equal(harness.captureReadingAnchor(), 41);
});

test('intro-only paged page captures an internal chapter intro anchor', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness);
  const introPage = new FakeNode('section'); introPage.className = 'reader-page';
  const linePage = new FakeNode('section'); linePage.className = 'reader-page'; linePage.hidden = true;
  const intro = block('intro'); intro.className = 'chapter-intro';
  introPage.appendChild(intro);
  linePage.appendChild(block('line-zero', { lineIndex: 0 }));
  wrapper.append(introPage, linePage);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;

  assert.equal(harness.captureReadingAnchor(), 'chapter-intro');
  assert.equal(harness.state.currentLineIndex, 0);
});

test('continuous capture returns intro only when it is unobscured and no row is visible', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness);
  pane.rect = { top: 0, bottom: 100, height: 100 };
  pane.computedStyle.paddingTop = '10px';
  const intro = block('intro', { top: 10, height: 60 }); intro.className = 'chapter-intro';
  const row = block('line-zero', { lineIndex: 0, top: 120, height: 30 });
  wrapper.append(intro, row);
  harness.state.readingMode = 'continuous';

  assert.equal(harness.captureReadingAnchor(), 'chapter-intro');
});

test('footer-only paged page has a distinct internal footer anchor', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness);
  const footerPage = new FakeNode('section'); footerPage.className = 'reader-page';
  const footer = block('footer'); footer.className = 'chapter-complete-footer';
  footerPage.appendChild(footer); wrapper.appendChild(footerPage);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 7;

  assert.equal(harness.captureReadingAnchor(), 'chapter-footer');
  assert.notEqual(harness.captureReadingAnchor(), 'chapter-intro');
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

function appendAnchoredPageFixture(wrapper) {
  const intro = block('intro', { height: 100 });
  const line8 = block('line-8', { height: 30, lineIndex: 8 });
  const line9 = block('line-9', { height: 30, lineIndex: 9 });
  const line10 = block('line-10', { height: 30, lineIndex: 10 });
  const line11 = block('line-11', { height: 30, lineIndex: 11 });
  const blocks = [intro, line8, line9, line10, line11];
  wrapper.append(...blocks);
  return blocks;
}

function appendIntroOnlyPageFixture(wrapper) {
  const intro = block('intro', { height: 80 }); intro.className = 'chapter-intro';
  const line0 = block('line-0', { height: 30, lineIndex: 0 });
  const line1 = block('line-1', { height: 30, lineIndex: 1 });
  wrapper.append(intro, line0, line1);
  return { intro, line0, line1 };
}

function appendFooterOnlyPageFixture(wrapper, { rows = true } = {}) {
  const intro = block('intro', { height: rows ? 20 : 80 }); intro.className = 'chapter-intro';
  const footer = block('footer', { height: 30 }); footer.className = 'chapter-complete-footer';
  const line0 = rows ? block('line-0', { height: 30, lineIndex: 0 }) : null;
  const line1 = rows ? block('line-1', { height: 30, lineIndex: 1 }) : null;
  wrapper.append(...[intro, line0, line1, footer].filter(Boolean));
  return { intro, line0, line1, footer };
}

test('pending last selects a footer-only final page and retains its preceding source line', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  const { footer } = appendFooterOnlyPageFixture(wrapper);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('last');

  harness.composeReaderPages(0);

  assert.equal(harness.state.totalPages, 2);
  assert.equal(harness.state.currentPageIndex, 1);
  assert.equal(wrapper.children[1].querySelector('.chapter-complete-footer'), footer);
  assert.equal(harness.state.currentLineIndex, 1);
});

test('footer anchor recomposes to the footer-only final page', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  const { footer } = appendFooterOnlyPageFixture(wrapper);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('last');
  harness.composeReaderPages(0);
  const anchor = harness.captureReadingAnchor();

  harness.composeReaderPages(anchor);

  const visiblePage = wrapper.children.find((page) => !page.hidden);
  assert.equal(anchor, 'chapter-footer');
  assert.equal(harness.state.currentPageIndex, harness.state.totalPages - 1);
  assert.equal(visiblePage.querySelector('.chapter-complete-footer'), footer);
  assert.equal(harness.state.currentLineIndex, 1);
});

test('footer anchor maps paged to continuous bottom and back to the final paged page', () => {
  const harness = createHarness();
  const { pane, wrapper, indicator } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  const { intro, line0, line1, footer } = appendFooterOnlyPageFixture(wrapper);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('last');
  harness.composeReaderPages(0);
  const pagedAnchor = harness.captureReadingAnchor();

  harness.state.readingMode = 'continuous';
  harness.recalcPages({ anchorLineIndex: pagedAnchor });
  pane.scrollHeight = 300;
  intro.rect = { top: -100, bottom: -80, height: 20 };
  line0.rect = { top: -80, bottom: -50, height: 30 };
  line1.rect = { top: 40, bottom: 70, height: 30 };
  footer.rect = { top: 70, bottom: 100, height: 30 };
  const continuousAnchor = harness.captureReadingAnchor();
  harness.syncPageFromScroll();

  assert.equal(pane.scrollTop, 200);
  assert.equal(harness.state.currentPageIndex, 2);
  assert.equal(indicator.textContent, '3 / 3');
  assert.equal(continuousAnchor, 'chapter-footer');
  assert.equal(harness.state.currentLineIndex, 1);

  harness.state.readingMode = 'paged';
  harness.composeReaderPages(continuousAnchor);
  assert.equal(harness.state.currentPageIndex, harness.state.totalPages - 1);
  assert.equal(wrapper.children.at(-1).querySelector('.chapter-complete-footer'), footer);
  assert.equal(harness.state.currentLineIndex, 1);
});

test('short continuous chapter at the top keeps intro precedence when all content is visible', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 100 });
  const { intro, line0, line1, footer } = appendFooterOnlyPageFixture(wrapper);
  pane.scrollHeight = 100;
  pane.scrollTop = 0;
  intro.rect = { top: 0, bottom: 20, height: 20 };
  line0.rect = { top: 20, bottom: 50, height: 30 };
  line1.rect = { top: 50, bottom: 80, height: 30 };
  footer.rect = { top: 80, bottom: 100, height: 20 };
  harness.state.readingMode = 'continuous';

  assert.equal(harness.captureReadingAnchor(), 'chapter-intro');
  assert.equal(harness.state.currentLineIndex, 0);
});

test('visible footer near but not at continuous bottom keeps the first visible row anchor', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  const { line0, line1, footer } = appendFooterOnlyPageFixture(wrapper);
  pane.scrollHeight = 300;
  pane.scrollTop = 190;
  line0.rect = { top: -10, bottom: 20, height: 30 };
  line1.rect = { top: 20, bottom: 50, height: 30 };
  footer.rect = { top: 70, bottom: 100, height: 30 };
  harness.state.readingMode = 'continuous';

  assert.equal(harness.captureReadingAnchor(), 0);
});

test('footer outside the viewport never overrides a visible row at continuous bottom', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  const { line0, line1, footer } = appendFooterOnlyPageFixture(wrapper);
  pane.scrollHeight = 300;
  pane.scrollTop = 200;
  line0.rect = { top: -10, bottom: 20, height: 30 };
  line1.rect = { top: 20, bottom: 50, height: 30 };
  footer.rect = { top: 120, bottom: 150, height: 30 };
  harness.state.readingMode = 'continuous';

  assert.equal(harness.captureReadingAnchor(), 0);
});

test('footer fallback progress sync persists the numeric last source line', async () => {
  const harness = createHarness({ gistSync: true });
  const { wrapper } = reader(harness, { paneHeight: 100 });
  appendFooterOnlyPageFixture(wrapper);
  harness.state.books = [{ id: 'book', title: 'Book', chapters: [{ title: 'One', lines: ['a', 'b'] }] }];
  harness.state.vocabulary = [];
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('last');
  harness.composeReaderPages(0);

  await harness.syncProgressToGist();

  const saved = JSON.parse(harness.gistPatches.at(-1).files['slovo_progress.json'].content).classics;
  assert.equal(saved.currentLineIndex, 1);
  assert.equal(typeof saved.currentLineIndex, 'number');
  assert.notEqual(saved.currentLineIndex, 'chapter-footer');
});

test('pending edges take precedence over footer and intro anchors', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  appendFooterOnlyPageFixture(wrapper);
  harness.state.readingMode = 'continuous';

  harness.setPendingPageEdge('first');
  harness.recalcPages({ anchorLineIndex: 'chapter-footer' });
  assert.equal(pane.scrollTop, 0);
  assert.equal(harness.state.currentPageIndex, 0);

  harness.setPendingPageEdge('last');
  harness.recalcPages({ anchorLineIndex: 'chapter-intro' });
  assert.equal(pane.scrollTop, 200);
  assert.equal(harness.state.currentPageIndex, 2);
});

test('footer-only positioning is safe for a chapter with no source rows', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 200 });
  const { footer } = appendFooterOnlyPageFixture(wrapper, { rows: false });
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('last');

  harness.composeReaderPages(0);
  const anchor = harness.captureReadingAnchor();
  harness.composeReaderPages(anchor);

  assert.equal(anchor, 'chapter-footer');
  assert.equal(wrapper.children.at(-1).querySelector('.chapter-complete-footer'), footer);
  assert.equal(harness.state.currentLineIndex, 0);
  harness.state.readingMode = 'continuous';
  harness.recalcPages({ anchorLineIndex: anchor });
  assert.equal(pane.scrollTop, 100);
  assert.equal(harness.state.currentLineIndex, 0);
});

test('intro anchor keeps an intro-only page visible across recomposition', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  const { intro } = appendIntroOnlyPageFixture(wrapper);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('first');
  harness.composeReaderPages(0);
  const anchor = harness.captureReadingAnchor();

  harness.composeReaderPages(anchor);

  const visiblePage = wrapper.children.find((page) => !page.hidden);
  assert.equal(anchor, 'chapter-intro');
  assert.equal(harness.state.currentPageIndex, 0);
  assert.equal(visiblePage.children[0], intro);
  assert.equal(visiblePage.querySelector('.chapter-intro'), intro);
  assert.equal(harness.state.currentLineIndex, 0);
});

test('intro anchor maps paged to continuous top and back without entering line state', () => {
  const harness = createHarness();
  const { pane, wrapper, indicator } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  const { intro, line0, line1 } = appendIntroOnlyPageFixture(wrapper);
  harness.state.readingMode = 'paged';
  harness.state.currentLineIndex = 0;
  harness.setPendingPageEdge('first');
  harness.composeReaderPages(0);
  const pagedAnchor = harness.captureReadingAnchor();
  pane.scrollTop = 80;

  harness.state.readingMode = 'continuous';
  harness.recalcPages({ anchorLineIndex: pagedAnchor });
  intro.rect = { top: 0, bottom: 80, height: 80 };
  line0.rect = { top: 120, bottom: 150, height: 30 };
  line1.rect = { top: 150, bottom: 180, height: 30 };
  const continuousAnchor = harness.captureReadingAnchor();
  harness.syncPageFromScroll();

  assert.equal(pane.scrollTop, 0);
  assert.equal(harness.state.currentPageIndex, 0);
  assert.equal(indicator.textContent, '1 / 3');
  assert.equal(continuousAnchor, 'chapter-intro');
  assert.equal(Number.isInteger(harness.state.currentLineIndex), true);
  assert.equal(harness.state.currentLineIndex, 0);

  harness.state.readingMode = 'paged';
  harness.composeReaderPages(continuousAnchor);
  assert.equal(harness.state.currentPageIndex, 0);
  assert.equal(wrapper.children[0].querySelector('.chapter-intro'), intro);
  assert.equal(harness.state.currentLineIndex, 0);
});

test('pending page edges take precedence over the internal intro anchor', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 300 });
  appendIntroOnlyPageFixture(wrapper);
  harness.state.readingMode = 'continuous';

  harness.setPendingPageEdge('last');
  harness.recalcPages({ anchorLineIndex: 'chapter-intro' });
  assert.equal(pane.scrollTop, 200);
  assert.equal(harness.state.currentPageIndex, 2);

  harness.setPendingPageEdge('first');
  harness.recalcPages({ anchorLineIndex: 'chapter-intro' });
  assert.equal(pane.scrollTop, 0);
  assert.equal(harness.state.currentPageIndex, 0);
  assert.equal(harness.state.currentLineIndex, 0);
});

test('later anchor starts its visible page while every block remains ordered and navigable', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  const blocks = appendAnchoredPageFixture(wrapper);
  harness.state.readingMode = 'paged';

  harness.composeReaderPages(9);

  const pages = wrapper.children;
  const visiblePage = pages.find((page) => !page.hidden);
  const composedBlocks = pages.flatMap((page) => page.children);
  assert.equal(harness.firstLineOnPage(visiblePage), 9);
  assert.deepEqual(composedBlocks, blocks);
  assert.equal(new Set(composedBlocks).size, blocks.length);
  assert.equal(harness.state.totalPages, 4);
  assert.equal(harness.state.currentPageIndex, 2);
  assert.deepEqual(pages[1].children, [blocks[1]]);

  harness.showPagedPage(1);
  assert.equal(harness.state.currentLineIndex, 8);
  assert.equal(pages[1].hidden, false);
});

test('anchor zero keeps the chapter intro on the first composed page', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  const intro = block('intro', { height: 30 });
  const line0 = block('line-0', { height: 30, lineIndex: 0 });
  const line1 = block('line-1', { height: 30, lineIndex: 1 });
  wrapper.append(intro, line0, line1);
  harness.state.readingMode = 'paged';

  harness.composeReaderPages(0);

  assert.equal(harness.state.totalPages, 1);
  assert.deepEqual(wrapper.children[0].children, [intro, line0, line1]);
  assert.equal(wrapper.children[0].hidden, false);
  assert.equal(harness.firstLineOnPage(wrapper.children[0]), 0);
});

test('pending chapter edges bypass anchor splitting for first and last landings', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  appendAnchoredPageFixture(wrapper);
  harness.state.readingMode = 'paged';

  harness.setPendingPageEdge('first');
  harness.composeReaderPages(9);
  assert.equal(harness.state.totalPages, 3);
  assert.equal(harness.state.currentPageIndex, 0);
  assert.deepEqual(wrapper.children[1].children.map((node) => node.dataset.lineIndex), ['8', '9', '10']);

  harness.setPendingPageEdge('last');
  harness.composeReaderPages(9);
  assert.equal(harness.state.totalPages, 3);
  assert.equal(harness.state.currentPageIndex, 2);
  assert.deepEqual(wrapper.children[1].children.map((node) => node.dataset.lineIndex), ['8', '9', '10']);
});

test('repeated composition at the same semantic anchor is stable', () => {
  const harness = createHarness();
  const { wrapper } = reader(harness, { paneHeight: 100 });
  appendAnchoredPageFixture(wrapper);
  harness.state.readingMode = 'paged';

  harness.composeReaderPages(9);
  const firstGroups = wrapper.children.map((page) => page.children.map((node) => node.id));
  const firstPageIndex = harness.state.currentPageIndex;
  const firstTotal = harness.state.totalPages;

  harness.composeReaderPages(9);
  const secondGroups = wrapper.children.map((page) => page.children.map((node) => node.id));
  const visiblePage = wrapper.children.find((page) => !page.hidden);
  assert.deepEqual(secondGroups, firstGroups);
  assert.equal(harness.state.currentPageIndex, firstPageIndex);
  assert.equal(harness.state.totalPages, firstTotal);
  assert.equal(harness.firstLineOnPage(visiblePage), 9);
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

test('continuous recalc consumes a pending chapter edge before a line anchor can displace it', () => {
  const harness = createHarness();
  const { pane, wrapper } = reader(harness, { paneHeight: 100, contentHeight: 800 });
  wrapper.rect = { top: 0, bottom: 800, height: 800 };
  wrapper.appendChild(block('line-zero', { lineIndex: 0, top: 230, height: 30 }));
  harness.state.readingMode = 'continuous';

  harness.setPendingPageEdge('first');
  harness.recalcPages({ anchorLineIndex: 0 });
  assert.equal(pane.scrollTop, 0);
  assert.equal(harness.state.currentPageIndex, 0);
  assert.equal(harness.getPendingPageEdge(), null);

  harness.setPendingPageEdge('last');
  harness.recalcPages({ anchorLineIndex: 0 });
  assert.equal(pane.scrollTop, 700);
  assert.equal(harness.state.currentPageIndex, 7);
  assert.equal(harness.getPendingPageEdge(), null);
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

test('paged assembly failure restores every canonical block before continuous fallback', () => {
  let persisted = false;
  const harness = createHarness({
    throwAfterBlockMove: true,
    readerPagination: {
      TABLET_TOUCH_QUERY: '',
      packBlocks(blocks) { return [blocks]; },
      pageIndexForLine() { return 0; },
      persistMode() { persisted = true; },
    },
  });
  const { wrapper } = reader(harness);
  const a = block('a', { lineIndex: 0 });
  const b = block('b', { lineIndex: 1 });
  const c = block('c', { lineIndex: 2 });
  wrapper.append(a, b, c);
  harness.state.readingMode = 'paged';
  harness.body.classList.add('paged-reader');

  harness.recalcPages({ anchorLineIndex: 1 });

  assert.deepEqual(wrapper.children, [a, b, c]);
  assert.deepEqual(wrapper.children.map((node) => node.id), ['a', 'b', 'c']);
  assert.equal(new Set(wrapper.children).size, 3);
  assert.equal(wrapper.querySelector('.reader-page'), null);
  assert.equal(harness.state.readingMode, 'continuous');
  assert.equal(harness.body.classList.contains('paged-reader'), false);
  assert.equal(persisted, false);
});

test('recalcPages safely ignores absent reader DOM', () => {
  const absent = createHarness();
  assert.doesNotThrow(() => absent.recalcPages({ anchorLineIndex: 0 }));
  assert.equal(absent.warnings.length, 0);
});

test('continuous recalc safely ignores a zero-height reader pane', () => {
  const zero = createHarness();
  const { pane } = reader(zero, { paneHeight: 0 });
  zero.state.readingMode = 'continuous';
  zero.state.currentLineIndex = 3;
  zero.state.totalPages = 4;
  zero.recalcPages({ anchorLineIndex: 0 });
  assert.equal(pane.scrollTop, 0);
  assert.equal(zero.state.currentLineIndex, 3);
  assert.equal(zero.state.totalPages, 4);
  assert.equal(zero.warnings.length, 0);
});

test('paged zero-height pane falls back continuously with canonical content and safe page state', () => {
  let persisted = false;
  const harness = createHarness({
    readerPagination: {
      TABLET_TOUCH_QUERY: '',
      persistMode() { persisted = true; },
    },
  });
  const { wrapper, indicator } = reader(harness, { paneHeight: 0 });
  const firstPage = new FakeNode('section'); firstPage.className = 'reader-page';
  const secondPage = new FakeNode('section'); secondPage.className = 'reader-page';
  const a = block('a', { lineIndex: 0 });
  const b = block('b', { lineIndex: 1 });
  const c = block('c', { lineIndex: 2 });
  firstPage.append(a, b); secondPage.appendChild(c); wrapper.append(firstPage, secondPage);
  const modeButton = new FakeNode('button'); modeButton.id = 'reading-mode-btn';
  harness.body.appendChild(modeButton);
  harness.state.readingMode = 'paged';
  harness.state.currentPageIndex = 4;
  harness.state.totalPages = 5;
  harness.body.classList.add('paged-reader');
  harness.setTabletTouchMedia({ matches: true });

  harness.recalcPages({ anchorLineIndex: 1 });

  assert.equal(harness.warnings.length, 1);
  assert.equal(harness.warnings[0][0], 'Paged reader unavailable; using continuous layout:');
  assert.equal(harness.state.readingMode, 'continuous');
  assert.equal(harness.body.classList.contains('paged-reader'), false);
  assert.deepEqual(wrapper.children, [a, b, c]);
  assert.equal(wrapper.querySelector('.reader-page'), null);
  assert.equal(modeButton.hiddenWrites, 1);
  assert.equal(modeButton.textContent, 'Continuous');
  assert.equal(harness.state.currentPageIndex, 0);
  assert.equal(harness.state.totalPages, 1);
  assert.equal(indicator.textContent, '1 / 1');
  assert.equal(persisted, false);
});
