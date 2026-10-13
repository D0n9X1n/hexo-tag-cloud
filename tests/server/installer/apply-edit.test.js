'use strict';

// Unit tests for lib/installer/apply-edit.js. Unmanaged content is never
// replaced (#45); new blocks go before the last anchor line or are appended;
// legacy detection covers HTML (any quoting) and pug syntax (#51).

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeApplyAction,
  NOOP_MESSAGE,
  LEGACY_CANVAS,
  LEGACY_SCRIPT,
  renderUnifiedDiff,
} = require('../../../lib/installer/apply-edit');
const { resolveTheme, customRecipe } = require('../../../lib/installer/theme-heuristics');
const { emitManagedBlock } = require('../../../lib/installer/partial-emitter');

const landscape = resolveTheme('landscape');   // before: </aside>
const fluid = resolveTheme('fluid');           // append
const butterfly = resolveTheme('butterfly');   // pug, append

const BLOCK = emitManagedBlock(landscape);
const BLOCK_PUG = emitManagedBlock(butterfly);

function act(existingContent, recipe, extra) {
  return computeApplyAction(Object.assign({
    existingContent,
    newBlock: emitManagedBlock(recipe || landscape),
    recipe: recipe || landscape,
  }, extra));
}

// --- insert ---------------------------------------------------------------

test('insert before the LAST line containing the anchor, preserving everything', () => {
  const before = '<aside id="sidebar">\n  <aside>nested</aside>\n  <p>w</p>\n</aside>\n<footer/>\n';
  const r = act(before);
  assert.equal(r.kind, 'insert');
  assert.equal(r.newContent,
    '<aside id="sidebar">\n  <aside>nested</aside>\n  <p>w</p>\n' + BLOCK + '\n</aside>\n<footer/>\n');
  assert.match(r.diff, /^@@ insert before line 4: <\/aside> @@\n/);
  for (const line of BLOCK.split('\n')) assert.ok(r.diff.includes('+' + line));
});

test('anchor on the first line inserts at offset 0', () => {
  const r = act('</aside>');
  assert.equal(r.newContent, BLOCK + '\n</aside>');
  assert.match(r.diff, /insert before line 1: <\/aside>/);
});

test('anchor missing → append (never drops content)', () => {
  const r = act('<div>no sidebar</div>\n');
  assert.equal(r.kind, 'insert');
  assert.equal(r.newContent, '<div>no sidebar</div>\n\n' + BLOCK + '\n');
  assert.match(r.diff, /^@@ append at end of file @@/);
});

test('no anchor in recipe → append; adds missing trailing newline', () => {
  const r = act('<div>tags page</div>', fluid);
  assert.equal(r.newContent, '<div>tags page</div>\n\n' + emitManagedBlock(fluid) + '\n');
});

test('empty file → block + newline', () => {
  const r = act('', fluid);
  assert.equal(r.newContent, emitManagedBlock(fluid) + '\n');
});

test('non-string existingContent is treated as empty', () => {
  const r = act(undefined, fluid);
  assert.equal(r.newContent, emitManagedBlock(fluid) + '\n');
});

test('custom recipe with empty anchor appends', () => {
  const recipe = customRecipe('a.ejs', '');
  const r = act('x\n', recipe);
  assert.match(r.diff, /append at end of file/);
});

test('pug block appended at column 0 to an existing pug widget', () => {
  const existing = 'if theme.aside.card_tags.enable\n  .card-widget\n';
  const r = act(existing, butterfly);
  assert.equal(r.newContent, existing + '\n' + BLOCK_PUG + '\n');
});

test('$-patterns in existing content survive the splice', () => {
  const existing = '<p>$& $1 $$</p>\n</aside>\n';
  const r = act(existing);
  assert.ok(r.newContent.startsWith('<p>$& $1 $$</p>\n'));
});

// --- EOL handling ----------------------------------------------------------

test('CRLF file: inserted block uses CRLF', () => {
  const r = act('<aside>\r\n<p>w</p>\r\n</aside>\r\n');
  assert.equal(r.newContent,
    '<aside>\r\n<p>w</p>\r\n' + BLOCK.split('\n').join('\r\n') + '\r\n</aside>\r\n');
});

test('mixed EOLs pick the dominant one (LF wins ties)', () => {
  const r = act('a\r\nb\nc\n', fluid);
  assert.ok(!r.newContent.includes(emitManagedBlock(fluid).split('\n').join('\r\n')));
});

// --- existing managed block -------------------------------------------------

test('noop when the managed block is identical (CRLF-insensitive)', () => {
  const existing = '<aside>\r\n' + BLOCK.split('\n').join('\r\n') + '\r\n</aside>\r\n';
  const r = act(existing);
  assert.deepEqual(r, { kind: 'noop', message: NOOP_MESSAGE });
});

test('edited managed block → conflict exit 2 with diff; file content untouched', () => {
  const edited = BLOCK.replace('width="250"', 'width="999"');
  const r = act('<aside>\n' + edited + '\n</aside>\n');
  assert.equal(r.kind, 'conflict');
  assert.equal(r.exitCode, 2);
  assert.match(r.diff, /^--- before\n\+\+\+ after\n/);
  assert.match(r.diff, /-.*width="999"/);
  assert.match(r.diff, /\+.*width="250"/);
  assert.equal(r.newContent, undefined);
});

test('--force replaces only the managed block, keeping CRLF and surroundings', () => {
  const edited = BLOCK.replace('width="250"', 'width="999"').split('\n').join('\r\n');
  const existing = 'top\r\n' + edited + '\r\nbottom\r\n';
  const r = act(existing, landscape, { force: true });
  assert.equal(r.kind, 'force-replace');
  assert.equal(r.newContent, 'top\r\n' + BLOCK.split('\n').join('\r\n') + '\r\nbottom\r\n');
  assert.match(r.diff, /width="999"/);
});

test('start marker without end marker is not a managed block (insert)', () => {
  const r = act('<!-- hexo-tag-cloud:begin -->\n</aside>\n');
  assert.equal(r.kind, 'insert');
});

// --- legacy detection -----------------------------------------------------

test('legacy: HTML double-quoted id + tagcloud.js', () => {
  const r = act('<canvas id="resCanvas"></canvas>\n<script src="/js/tagcloud.js"></script>\n</aside>\n');
  assert.equal(r.kind, 'legacy');
  assert.equal(r.exitCode, 3);
  assert.match(r.message, /legacy hexo-tag-cloud install/);
});

test('legacy: single-quoted id and url_for() script', () => {
  const r = act("<canvas id='resCanvas'></canvas>\n<script src=\"<%- url_for('/js/tagcanvas.js') %>\"></script>\n");
  assert.equal(r.kind, 'legacy');
});

test('legacy: pug canvas#resCanvas', () => {
  const r = act("canvas#resCanvas(width='200')\nscript(src='/js/tagcloud.js')\n", butterfly);
  assert.equal(r.kind, 'legacy');
});

test('not legacy: canvas without plugin script, or script without canvas', () => {
  assert.equal(act('<canvas id="resCanvas"></canvas>\n</aside>\n').kind, 'insert');
  assert.equal(act('<script src="/js/tagcloud.js"></script>\n</aside>\n').kind, 'insert');
  assert.ok(LEGACY_CANVAS.test('id = "resCanvas"'));
  assert.ok(LEGACY_SCRIPT.test('js/tagcanvas.js'));
});

// --- argument validation --------------------------------------------------

test('throws on bad arguments', () => {
  assert.throws(() => computeApplyAction(), TypeError);
  assert.throws(() => computeApplyAction('x'), TypeError);
  assert.throws(() => computeApplyAction({ existingContent: '', newBlock: '', recipe: landscape }), TypeError);
  assert.throws(() => computeApplyAction({ existingContent: '', newBlock: 1, recipe: landscape }), TypeError);
  assert.throws(() => computeApplyAction({ existingContent: '', newBlock: BLOCK, recipe: null }), TypeError);
  assert.throws(() => computeApplyAction({ existingContent: '', newBlock: BLOCK, recipe: { markerStart: 'x' } }), TypeError);
});

// --- renderUnifiedDiff ----------------------------------------------------

test('renderUnifiedDiff prefixes every line', () => {
  assert.equal(renderUnifiedDiff('a', 'b', 'x\ny', 'z'), '--- a\n+++ b\n-x\n-y\n+z');
});
