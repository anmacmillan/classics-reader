import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const modulePath = new URL('../pagination.js', import.meta.url);
const source = fs.readFileSync(modulePath, 'utf8');

function loadPagination() {
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: 'pagination.js' });
  assert.equal(vm.runInContext('ReaderPagination === globalThis.ReaderPagination', context), true);
  return vm.runInContext('ReaderPagination', context);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRangeError(error) {
  return error && error.name === 'RangeError';
}

function fakeElement({ tag = 'span', classes = [], attributes = {}, parent = null } = {}) {
  const classSet = new Set(classes);
  const attributeMap = new Map(Object.entries(attributes));
  const element = {
    tagName: tag.toUpperCase(),
    parentElement: parent,
    classList: {
      contains(name) {
        return classSet.has(name);
      },
    },
    getAttribute(name) {
      return attributeMap.has(name) ? attributeMap.get(name) : null;
    },
  };

  element.closest = (selector) => {
    const selectors = selector.split(',').map((part) => part.trim());
    for (let current = element; current; current = current.parentElement) {
      if (selectors.some((part) => matchesSimpleSelector(current, part))) return current;
    }
    return null;
  };

  return element;
}

function matchesSimpleSelector(element, selector) {
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1));
  if (selector.startsWith('#')) return element.getAttribute('id') === selector.slice(1);

  const attribute = selector.match(/^\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]$/);
  if (attribute) {
    const [, name, value] = attribute;
    const actual = element.getAttribute(name);
    return actual !== null && (value === undefined || actual === value);
  }

  return element.tagName.toLowerCase() === selector;
}

test('exposes the stable ReaderPagination API', () => {
  const policy = loadPagination();

  assert.equal(policy.MODE_KEY, 'classics_reader_mode_v1');
  assert.equal(
    policy.TABLET_TOUCH_QUERY,
    '(any-pointer: coarse) and (min-width: 768px) and (max-width: 1366px)',
  );
  assert.equal(Object.isFrozen(policy), true);
});

test('reads known saved modes and forces continuous mode off tablets', () => {
  const policy = loadPagination();

  assert.equal(policy.savedMode({ getItem: () => 'paged' }), 'paged');
  assert.equal(policy.savedMode({ getItem: () => 'continuous' }), 'continuous');
  assert.equal(policy.savedMode({ getItem: () => 'invalid' }), null);
  assert.equal(policy.savedMode({}), null);
  assert.equal(policy.savedMode({ getItem: () => { throw new Error('blocked'); } }), null);
  assert.equal(policy.effectiveMode({ tabletTouch: true, savedMode: 'continuous' }), 'continuous');
  assert.equal(policy.effectiveMode({ tabletTouch: true, savedMode: null }), 'paged');
  assert.equal(policy.effectiveMode({ tabletTouch: false, savedMode: 'paged' }), 'continuous');
});

test('persists valid modes and tolerates unavailable storage', () => {
  const policy = loadPagination();
  const writes = [];
  const storage = { setItem(key, value) { writes.push([key, value]); } };

  assert.equal(policy.persistMode(storage, 'paged'), true);
  assert.deepEqual(writes, [['classics_reader_mode_v1', 'paged']]);
  assert.throws(() => policy.persistMode(storage, 'invalid'), isRangeError);
  assert.equal(policy.persistMode(null, 'continuous'), false);
  assert.equal(policy.persistMode({}, 'continuous'), false);
  assert.equal(policy.persistMode({ setItem: () => { throw new Error('blocked'); } }, 'continuous'), false);
});

test('packs actual blocks in order with exact fits and oversized blocks alone', () => {
  const policy = loadPagination();
  const blocks = [
    { id: 'a', height: 40 },
    { id: 'b', height: 60 },
    { id: 'large', height: 140 },
    { id: 'c', height: 30 },
  ];
  const pages = policy.packBlocks(blocks, 100, (block) => block.height);

  assert.deepEqual(plain(pages.map((page) => page.map((block) => block.id))), [
    ['a', 'b'], ['large'], ['c'],
  ]);
  assert.equal(pages.flat().length, blocks.length);
  blocks.forEach((block, index) => assert.equal(pages.flat()[index], block));
  assert.deepEqual(plain(policy.packBlocks([], 100, () => 1)), [[]]);
});

test('rejects invalid page packing inputs without silently omitting blocks', () => {
  const policy = loadPagination();
  const blocks = [{ height: 10 }, { height: 20 }];

  assert.throws(() => policy.packBlocks(blocks, 0, (block) => block.height), isRangeError);
  assert.throws(() => policy.packBlocks({}, 100, () => 1), isRangeError);
  assert.throws(() => policy.packBlocks(blocks, 100), isRangeError);
  assert.throws(() => policy.packBlocks(blocks, 100, () => -1), isRangeError);
  assert.throws(() => policy.packBlocks(blocks, 100, () => Number.NaN), isRangeError);
});

test('finds a page from semantic line-index datasets and fails safely', () => {
  const policy = loadPagination();
  const pages = [
    [{ dataset: {} }],
    [{ dataset: { lineIndex: '0' } }, { dataset: { lineIndex: '1' } }],
    [{ dataset: { lineIndex: '2' } }],
  ];

  assert.equal(policy.pageIndexForLine(pages, 1), 1);
  assert.equal(policy.pageIndexForLine(pages, 99), 0);
  assert.equal(policy.pageIndexForLine([null, [{}]], 0), 0);
  assert.equal(policy.pageIndexForLine('not pages', 0), 0);
  assert.equal(policy.pageIndexForLine(pages, -1), 0);
});

test('uses relative 28 percent tap zones with a nonzero left offset', () => {
  const policy = loadPagination();

  assert.equal(policy.pageTurnDirection(155, 100, 200), -1);
  assert.equal(policy.pageTurnDirection(156, 100, 200), 0);
  assert.equal(policy.pageTurnDirection(244, 100, 200), 0);
  assert.equal(policy.pageTurnDirection(245, 100, 200), 1);
  assert.equal(policy.pageTurnDirection(Number.NaN, 100, 200), 0);
  assert.equal(policy.pageTurnDirection(150, Number.NaN, 200), 0);
  assert.equal(policy.pageTurnDirection(150, 100, 0), 0);
});

test('suppresses tap navigation for interactive targets and their descendants', () => {
  const policy = loadPagination();
  for (const tag of ['a', 'button', 'input', 'select', 'textarea', 'summary']) {
    assert.equal(policy.isInteractiveTarget(fakeElement({ tag })), true, `direct ${tag}`);
    assert.equal(
      policy.isInteractiveTarget(fakeElement({ parent: fakeElement({ tag }) })),
      true,
      `descendant of ${tag}`,
    );
  }

  assert.equal(
    policy.isInteractiveTarget(fakeElement({ parent: fakeElement({ attributes: { contenteditable: 'true' } }) })),
    true,
  );
  assert.equal(policy.isInteractiveTarget(fakeElement({ classes: ['dict-word'] })), true);
  assert.equal(
    policy.isInteractiveTarget(fakeElement({ parent: fakeElement({ classes: ['reader-word'] }) })),
    true,
  );
  assert.equal(policy.isInteractiveTarget(fakeElement({ attributes: { 'data-reader-word': '' } })), true);
  assert.equal(
    policy.isInteractiveTarget(fakeElement({ parent: fakeElement({ attributes: { id: 'word-tooltip' } }) })),
    true,
  );
  assert.equal(policy.isInteractiveTarget(fakeElement()), false);
  assert.equal(policy.isInteractiveTarget({}), false);
  assert.equal(policy.isInteractiveTarget({ closest: () => { throw new Error('unsupported'); } }), false);
});

test('returns object navigation decisions and rejects malformed state', () => {
  const policy = loadPagination();
  const decide = (direction, pageIndex, totalPages, chapterIndex, chapterCount) => policy.navigationDecision({
    direction, pageIndex, totalPages, chapterIndex, chapterCount,
  });

  assert.deepEqual(plain(decide(1, 0, 3, 1, 4)), { type: 'page', pageIndex: 1 });
  assert.deepEqual(plain(decide(-1, 1, 3, 1, 4)), { type: 'page', pageIndex: 0 });
  assert.deepEqual(plain(decide(1, 2, 3, 1, 4)), { type: 'chapter', chapterIndex: 2, edge: 'first' });
  assert.deepEqual(plain(decide(-1, 0, 3, 1, 4)), { type: 'chapter', chapterIndex: 0, edge: 'last' });
  assert.deepEqual(plain(decide(-1, 0, 3, 0, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(1, 2, 3, 3, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(0, 1, 3, 1, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(1, -1, 3, 1, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(1, 3, 3, 1, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(1, 1, 3, -1, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(1, 1, 3, 4, 4)), { type: 'none' });
  assert.deepEqual(plain(decide(1, 1, 0, 0, 1)), { type: 'none' });
});
