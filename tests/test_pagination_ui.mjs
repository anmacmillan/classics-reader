import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const root = new URL('..', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');
const index = read('index.html');
const app = read('app.js');
const styles = read('styles.css');

test('loads pagination policy before the versioned application and provides a hidden reading-mode button', () => {
  const paginationScript = '<script src="pagination.js?v=20260802-2"></script>';
  const appScript = '<script src="app.js?v=20260802-1"></script>';

  assert.ok(index.includes(paginationScript), 'pagination policy script is loaded');
  assert.ok(index.includes(appScript), 'versioned app script remains unchanged');
  assert.ok(index.indexOf(paginationScript) < index.indexOf(appScript), 'pagination policy precedes app script');
  const controls = index.match(/<div\s+class="header-layout-controls">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(controls, 'header layout controls wrapper is present');
  assert.match(controls, /<button\s+id="theme-btn"/);
  assert.match(controls, /<button\s+id="reading-mode-btn"/);
  assert.match(controls, /<button\s+id="vocabulary-btn"/);
  assert.match(
    index,
    /<button\s+id="reading-mode-btn"\s+class="btn header-reading-mode"\s+aria-label="Reading layout"\s+aria-pressed="true"\s+hidden>\s*Paged\s*<\/button>/,
  );
});

test('initializes the tablet reading-mode controller after theme setup', () => {
  assert.match(app, /currentLineIndex:\s*0/);
  assert.match(app, /readingMode:\s*"continuous"/);
  assert.match(app, /setupTheme\(\);\s*setupReadingMode\(\);\s*renderLibrary\(\);/);
  assert.match(app, /let\s+tabletTouchMedia\s*;/);
  assert.match(app, /function\s+setupReadingMode\s*\(/);
  assert.match(app, /ReaderPagination\.TABLET_TOUCH_QUERY/);
  assert.match(app, /ReaderPagination\.savedMode\(localStorage\)/);
  assert.match(app, /ReaderPagination\.effectiveMode\(/);
  assert.match(app, /ReaderPagination\.persistMode\(localStorage,/);
  assert.match(app, /classList\.toggle\("tablet-touch-reader"/);
  assert.match(app, /classList\.toggle\("paged-reader"/);
  assert.doesNotMatch(app, /function\s+captureReadingAnchor\s*\(\)\s*\{\s*return\s+state\.currentLineIndex;/);
});

test('renders chapter metadata as an intro block and gives each row a semantic line index', () => {
  assert.match(app, /const\s+intro\s*=\s*document\.createElement\("section"\)/);
  assert.match(app, /intro\.className\s*=\s*"chapter-intro"/);
  assert.match(app, /titleRow\.className\s*=\s*"chapter-row-title chapter-banner"/);
  assert.match(app, /kicker\.className\s*=\s*"chapter-kicker"/);
  assert.match(app, /kicker\.textContent\s*=\s*workDisplayTitle\(book\)/);
  assert.match(app, /progress\.className\s*=\s*"chapter-progress"/);
  assert.match(app, /progress\.textContent\s*=\s*`Chapter/);
  assert.match(app, /intro\.appendChild\(titleRow\)/);
  assert.match(app, /intro\.appendChild\(credit\)/);
  assert.match(app, /wrapper\.appendChild\(intro\)/);
  assert.match(app, /row\.dataset\.lineIndex\s*=\s*String\(lineIdx\)/);
});

test('styles the header reading control and paged chapter metadata without leaving hidden tooltips interactive', () => {
  assert.match(styles, /\.header-layout-controls\s*\{[^}]*position:\s*absolute;[^}]*right:\s*16px;[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*gap:\s*8px;/);
  assert.match(styles, /\.header-theme\s*\{[^}]*position:\s*static;/);
  assert.match(styles, /\.header-reading-mode\s*\{[^}]*position:\s*static;/);
  assert.match(styles, /\.header-vocabulary\s*\{[^}]*position:\s*static;/);
  assert.doesNotMatch(styles, /\.header-theme\s*\{[^}]*position:\s*absolute;/);
  assert.doesNotMatch(styles, /\.header-reading-mode\s*\{[^}]*position:\s*absolute;/);
  assert.doesNotMatch(styles, /\.header-vocabulary\s*\{[^}]*position:\s*absolute;/);
  assert.match(styles, /\.chapter-kicker[\s\S]*display:\s*none;/);
  assert.match(styles, /\.chapter-progress[\s\S]*display:\s*none;/);
  assert.match(styles, /body\.paged-reader[\s\S]*\.chapter-kicker[\s\S]*display:\s*(?:block|inline|flex)/);
  assert.match(styles, /body\.paged-reader[\s\S]*\.chapter-progress[\s\S]*display:\s*(?:block|inline|flex)/);
  assert.match(styles, /body\.paged-reader\s+\.chapter-intro\s+\.translation-credit\s*\{[^}]*margin:\s*12px\s+0\s+0;/);
  assert.match(styles, /body\.tablet-touch-reader\s+\.app-header\s*\{[\s\S]*padding:\s*12px\s+320px\s+12px\s+120px;/);
  assert.match(styles, /body\.tablet-touch-reader[\s\S]*\.header-context[\s\S]*max-width:\s*[^;]*38vw/);
  assert.match(styles, /body\.tablet-touch-reader\s+#offline-status\s*\{[\s\S]*display:\s*none;/);
  assert.match(styles, /\.word-tooltip\.hidden\s*\{[\s\S]*pointer-events:\s*none;/);
});

test('composes reader blocks with semantic anchors and pagination policy helpers', () => {
  assert.match(app, /let\s+pendingPageEdge\s*=\s*null\s*;/);
  assert.match(app, /let\s+resizeTimer\s*;/);
  assert.match(app, /function\s+unwrapReaderPages\s*\(\s*wrapper\s*\)/);
  assert.match(app, /function\s+composeReaderPages\s*\(\s*anchorLineIndex\s*=\s*state\.currentLineIndex\s*\)/);
  assert.match(app, /ReaderPagination\.packBlocks\s*\(\s*blocks\s*,\s*pageHeight\s*,\s*measure\s*\)/);
  assert.match(app, /ReaderPagination\.pageIndexForLine\s*\(\s*groups\s*,\s*anchorLineIndex\s*\)/);
  assert.match(app, /function\s+captureReadingAnchor\s*\(\)[\s\S]*?state\.readingMode\s*===\s*["']paged["'][\s\S]*?firstLineOnPage[\s\S]*?\.chunk-row[\s\S]*?getBoundingClientRect\(\)[\s\S]*?state\.currentLineIndex/);
  assert.match(app, /function\s+showPagedPage\s*\(\s*index\s*\)[\s\S]*?\.hidden\s*=[\s\S]*?state\.currentPageIndex[\s\S]*?pane\.scrollTop\s*=\s*0/);
});

test('uses paged overflow rules while allowing only oversized reader pages to scroll', () => {
  assert.match(styles, /body\.paged-reader\s+\.reader-pane\s*\{[^}]*overflow:\s*hidden;/);
  assert.match(styles, /body\.paged-reader\s+\.reader-content\s*\{[^}]*height:\s*100%;/);
  assert.match(styles, /body\.paged-reader\s+#chunks-inner\s*\{[^}]*height:\s*100%;/);
  assert.match(styles, /\.reader-page\s*\{[^}]*width:\s*100%;[^}]*overflow:\s*hidden;/);
  assert.match(styles, /\.reader-page\[hidden\]\s*\{[^}]*display:\s*none;/);
  assert.match(styles, /\.reader-page-oversized\s*\{[^}]*overflow-y:\s*auto;[^}]*-webkit-overflow-scrolling:\s*touch;/);
});

test('falls back from failed paged composition without overwriting the reading preference', () => {
  assert.match(app, /function\s+recalcPages\s*\(\s*\{\s*anchorLineIndex\s*=\s*captureReadingAnchor\(\)\s*\}\s*=\s*\{\}\s*\)/);
  assert.match(app, /try\s*\{\s*composeReaderPages\(anchorLineIndex\);\s*return;\s*\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*?console\.warn\(\s*["']Paged reader unavailable; using continuous layout:/);
  const recalc = app.match(/function\s+recalcPages[\s\S]*?\n\}/)?.[0] || '';
  assert.match(recalc, /state\.readingMode\s*=\s*["']continuous["']/);
  assert.match(recalc, /classList\.remove\(\s*["']paged-reader["']\s*\)/);
  assert.doesNotMatch(recalc, /ReaderPagination\.persistMode/);
});

test('debounces resize composition and retains the semantic anchor captured before reflow', () => {
  assert.match(app, /window\.addEventListener\(\s*["']resize["']\s*,\s*\(\)\s*=>\s*\{[\s\S]*?if\s*\(\s*!isReaderOpen\(\)\s*\)\s*return;[\s\S]*?const\s+anchorLineIndex\s*=\s*captureReadingAnchor\(\);[\s\S]*?clearTimeout\(resizeTimer\);[\s\S]*?resizeTimer\s*=\s*setTimeout\(\s*\(\)\s*=>\s*recalcPages\(\{\s*anchorLineIndex\s*\}\)\s*,\s*120\s*\)/);
});

test('wires touch and keyboard page turns through the pagination policy without overlay zones', () => {
  assert.match(app, /readerPane\.addEventListener\(\s*["']pointerup["']\s*,\s*handleReaderPointerUp\s*\)/);
  assert.match(app, /document\.addEventListener\(\s*["']keydown["']\s*,\s*handleReaderKeydown\s*\)/);
  assert.match(app, /function\s+handleReaderPointerUp\s*\(\s*event\s*\)[\s\S]*?event\.pointerType\s*!==\s*["']touch["'][\s\S]*?ReaderPagination\.isInteractiveTarget\(event\.target\)[\s\S]*?window\.getSelection\?\.\(\)\?\.toString\(\)[\s\S]*?ReaderPagination\.pageTurnDirection\(event\.clientX,\s*rect\.left,\s*rect\.width\)/);
  assert.match(app, /function\s+handleReaderKeydown\s*\(\s*event\s*\)[\s\S]*?event\.altKey\s*\|\|\s*event\.ctrlKey\s*\|\|\s*event\.metaKey[\s\S]*?ReaderPagination\.isInteractiveTarget\(event\.target\)[\s\S]*?event\.key\s*===\s*["']ArrowLeft["'][\s\S]*?event\.preventDefault\(\)/);
  assert.match(app, /function\s+navigatePaged\s*\(\s*direction\s*\)[\s\S]*?ReaderPagination\.navigationDecision\([\s\S]*?pendingPageEdge\s*=\s*decision\.edge[\s\S]*?renderChapter\(\)/);
  assert.match(app, /function\s+prevPage\s*\(\)[\s\S]*?state\.readingMode\s*===\s*["']paged["'][\s\S]*?navigatePaged\(-1\)/);
  assert.match(app, /function\s+nextPage\s*\(\)[\s\S]*?state\.readingMode\s*===\s*["']paged["'][\s\S]*?navigatePaged\(1\)/);
  assert.match(app, /function\s+translatePane\s*\(\)[\s\S]*?state\.readingMode\s*===\s*["']paged["'][\s\S]*?showPagedPage\(state\.currentPageIndex\)/);
  assert.match(app, /function\s+syncPageFromScroll\s*\(\)[\s\S]*?state\.readingMode\s*===\s*["']paged["']\)\s*return;[\s\S]*?const\s+lineIndex\s*=\s*captureReadingAnchor\(\)[\s\S]*?pageIndex\s*===\s*state\.currentPageIndex\s*&&\s*lineIndex\s*===\s*state\.currentLineIndex/);
  assert.match(app, /function\s+selectBook\s*\(\s*idx\s*,\s*chapterIndex\s*,\s*lineIndex\s*=\s*0\s*\)[\s\S]*?state\.currentLineIndex\s*=\s*Number\.isInteger\(lineIndex\)/);
  assert.doesNotMatch(index, /page-turn-zone|page-turn-overlay|reader-page-turn/);
});
