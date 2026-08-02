import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const modulePath = new URL('../pagination.js', import.meta.url);

function loadPagination() {
  const context = vm.createContext({ globalThis: {} });
  vm.runInContext(fs.readFileSync(modulePath, 'utf8'), context, {
    filename: 'pagination.js',
  });
  return context.globalThis.ClassicsPagination;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('exposes the exact tablet query and persistence key', () => {
  const policy = loadPagination();

  assert.equal(
    policy.TABLET_QUERY,
    '(any-pointer: coarse) and (min-width: 768px) and (max-width: 1366px)',
  );
  assert.equal(policy.MODE_KEY, 'classics_reader_mode_v1');
});

test('reads only valid persisted modes and tolerates storage failures', () => {
  const policy = loadPagination();
  assert.equal(policy.getPersistedMode({ getItem: () => 'paged' }), 'paged');
  assert.equal(policy.getPersistedMode({ getItem: () => 'continuous' }), 'continuous');
  assert.equal(policy.getPersistedMode({ getItem: () => 'other' }), null);
  assert.equal(policy.getPersistedMode({ getItem: () => { throw new Error('blocked'); } }), null);
  assert.equal(policy.getPersistedMode(null), null);
});

test('uses a valid persisted mode before the platform default', () => {
  const policy = loadPagination();
  assert.equal(policy.getEffectiveMode({ persistedMode: 'continuous', tabletCapable: true }), 'continuous');
  assert.equal(policy.getEffectiveMode({ persistedMode: 'paged', tabletCapable: false }), 'paged');
  assert.equal(policy.getEffectiveMode({ persistedMode: null, tabletCapable: true }), 'paged');
  assert.equal(policy.getEffectiveMode({ persistedMode: 'unknown', tabletCapable: false }), 'continuous');
});

test('packs blocks in order, retaining exact fits and isolating oversized blocks', () => {
  const policy = loadPagination();
  assert.deepEqual(plain(policy.packBlocks([30, 70, 20, 140, 40, 60], 100)), [
    [0, 1], [2], [3], [4, 5],
  ]);
});

test('uses one fallback page for valid block indexes when page height is invalid', () => {
  const policy = loadPagination();
  assert.deepEqual(plain(policy.packBlocks([10, -1, 20, Number.NaN], 0)), [[0, 2]]);
  assert.deepEqual(plain(policy.packBlocks([], -1)), []);
});

test('finds the semantic page for a line index and clamps outside the range', () => {
  const policy = loadPagination();
  const pages = [[0, 1, 2], [3, 4], [5, 6]];

  assert.equal(policy.pageForLineIndex(pages, 4), 1);
  assert.equal(policy.pageForLineIndex(pages, -1), 0);
  assert.equal(policy.pageForLineIndex(pages, 99), 2);
  assert.equal(policy.pageForLineIndex([], 4), 0);
});

test('uses 28 percent edge zones for taps', () => {
  const policy = loadPagination();
  assert.equal(policy.tapDirection(27.9, 100), -1);
  assert.equal(policy.tapDirection(28, 100), 0);
  assert.equal(policy.tapDirection(72, 100), 0);
  assert.equal(policy.tapDirection(72.1, 100), 1);
  assert.equal(policy.tapDirection(10, 0), 0);
});

test('suppresses tap navigation for interactive targets and reader annotations', () => {
  const policy = loadPagination();
  const selectorCalls = [];
  const interactive = {
    closest(selector) {
      selectorCalls.push(selector);
      return selector.includes('.reader-word') ? {} : null;
    },
  };

  assert.equal(policy.isInteractiveTarget(interactive), true);
  assert.match(selectorCalls[0], /a/);
  assert.match(selectorCalls[0], /\[contenteditable\]/);
  assert.match(selectorCalls[0], /\.reader-word/);
  assert.equal(policy.isInteractiveTarget({ closest: () => null }), false);
  assert.equal(policy.isInteractiveTarget({}), false);
});

test('chooses page and chapter navigation correctly at every boundary', () => {
  const policy = loadPagination();
  const decide = (direction, pageIndex, totalPages, chapterIndex, totalChapters) => policy.navigationDecision({
    direction, pageIndex, totalPages, chapterIndex, totalChapters,
  });

  assert.equal(decide(-1, 1, 3, 1, 3), 'previous-page');
  assert.equal(decide(1, 1, 3, 1, 3), 'next-page');
  assert.equal(decide(-1, 0, 3, 1, 3), 'previous-chapter');
  assert.equal(decide(1, 2, 3, 1, 3), 'next-chapter');
  assert.equal(decide(-1, 0, 3, 0, 3), 'none');
  assert.equal(decide(1, 2, 3, 2, 3), 'none');
  assert.equal(decide(0, 1, 3, 1, 3), 'none');
});
