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
  assert.match(app, /function\s+captureReadingAnchor\s*\(\)\s*\{\s*return\s+state\.currentLineIndex;/);
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
  assert.match(styles, /\.header-reading-mode\s*\{[\s\S]*position:\s*absolute;[\s\S]*right:\s*164px;/);
  assert.match(styles, /\.chapter-kicker[\s\S]*display:\s*none;/);
  assert.match(styles, /\.chapter-progress[\s\S]*display:\s*none;/);
  assert.match(styles, /body\.paged-reader[\s\S]*\.chapter-kicker[\s\S]*display:\s*(?:block|inline|flex)/);
  assert.match(styles, /body\.paged-reader[\s\S]*\.chapter-progress[\s\S]*display:\s*(?:block|inline|flex)/);
  assert.match(styles, /body\.tablet-touch-reader[\s\S]*\.header-context[\s\S]*max-width:\s*[^;]*38vw/);
  assert.match(styles, /\.word-tooltip\.hidden\s*\{[\s\S]*pointer-events:\s*none;/);
});
