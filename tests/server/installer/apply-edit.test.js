'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { computeApplyAction, NOOP_MESSAGE } =
  require('../../../lib/installer/apply-edit');
const { resolveTheme } = require('../../../lib/installer/theme-heuristics');
const { emitManagedBlock } = require('../../../lib/installer/partial-emitter');

const landscape = resolveTheme('landscape');
const butterfly = resolveTheme('butterfly');
const generic = resolveTheme('generic');

const NEW_BLOCK = emitManagedBlock(landscape);
const NEW_BLOCK_PUG = emitManagedBlock(butterfly);

// --- insert ---------------------------------------------------------------

test('insert: empty file → kind=insert; newContent === newBlock', () => {
  const result = computeApplyAction({
    existingContent: '',
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
  assert.equal(result.newContent, NEW_BLOCK);
});

test('insert: existing partial without markers/legacy → block is appended after a blank line', () => {
  const existing = '<aside>existing widget</aside>\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
  assert.ok(result.newContent.startsWith(existing),
    'must preserve existing content prefix');
  assert.ok(result.newContent.endsWith(NEW_BLOCK),
    'newBlock must be at the end');
  assert.match(result.newContent, /\n<!-- hexo-tag-cloud:begin -->/,
    'block must be separated from existing content by at least one newline');
});

test('insert: existing content without trailing newline gets one before the block', () => {
  const existing = '<aside>no trailing newline</aside>';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
  assert.ok(result.newContent.indexOf('</aside>\n\n<!-- hexo-tag-cloud:begin -->') !== -1);
});

test('insert: standalone-mode (generic) → newContent is JUST the block', () => {
  const block = emitManagedBlock(generic);
  const result = computeApplyAction({
    existingContent: '',
    newBlock: block,
    recipe: generic,
  });
  assert.equal(result.kind, 'insert');
  assert.equal(result.newContent, block);
});

// --- noop -----------------------------------------------------------------

test('noop: file already contains an exact-match managed block', () => {
  const result = computeApplyAction({
    existingContent: '<aside>x</aside>\n\n' + NEW_BLOCK + '\n',
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'noop');
  assert.equal(result.message, NOOP_MESSAGE);
});

test('noop: byte-match check normalizes line endings (CRLF existing vs LF new)', () => {
  const crlfBlock = NEW_BLOCK.split('\n').join('\r\n');
  const result = computeApplyAction({
    existingContent: '<aside>x</aside>\r\n\r\n' + crlfBlock + '\r\n',
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'noop',
    'CRLF-vs-LF in the existing block must not trigger a false conflict');
});

// --- conflict -------------------------------------------------------------

test('conflict: existing managed block has user edits, force=false → kind=conflict, exitCode=2', () => {
  const userEdited = NEW_BLOCK.replace('width="500"', 'width="999"');
  const result = computeApplyAction({
    existingContent: '<aside>x</aside>\n\n' + userEdited + '\n',
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'conflict');
  assert.equal(result.exitCode, 2);
  assert.match(result.diff, /^---/m);
  assert.match(result.diff, /^\+\+\+/m);
  assert.match(result.diff, /-.*width="999"/);
  assert.match(result.diff, /\+.*width="500"/);
});

test('conflict: file containing ONLY markers (no body) → conflict (newBlock has body)', () => {
  const onlyMarkers = '<!-- hexo-tag-cloud:begin -->\n<!-- hexo-tag-cloud:end -->';
  const result = computeApplyAction({
    existingContent: onlyMarkers,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'conflict');
  assert.equal(result.exitCode, 2);
});

test('conflict: file containing ONLY markers + newBlock = ONLY markers → noop', () => {
  const onlyMarkers = '<!-- hexo-tag-cloud:begin -->\n<!-- hexo-tag-cloud:end -->';
  const result = computeApplyAction({
    existingContent: onlyMarkers,
    newBlock: onlyMarkers,
    recipe: landscape,
  });
  assert.equal(result.kind, 'noop');
});

// --- force-replace --------------------------------------------------------

test('force-replace: user-edited body, force=true → kind=force-replace, file rebuilt', () => {
  const userEdited = NEW_BLOCK.replace('width="500"', 'width="999"');
  const existing = '<aside>x</aside>\n\n' + userEdited + '\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
    force: true,
  });
  assert.equal(result.kind, 'force-replace');
  assert.match(result.newContent, /<aside>x<\/aside>/, 'preserves surrounding content');
  assert.match(result.newContent, /width="500"/, 'replaces user edit with new value');
  assert.equal(result.newContent.indexOf('width="999"'), -1, 'user edit must be gone');
});

test('force-replace does NOT trigger when block is already exact match (still noop)', () => {
  const result = computeApplyAction({
    existingContent: NEW_BLOCK,
    newBlock: NEW_BLOCK,
    recipe: landscape,
    force: true,
  });
  assert.equal(result.kind, 'noop');
});

test('force has no effect on insert path (no existing markers)', () => {
  const result = computeApplyAction({
    existingContent: '<aside>x</aside>\n',
    newBlock: NEW_BLOCK,
    recipe: landscape,
    force: true,
  });
  assert.equal(result.kind, 'insert');
});

// --- legacy ---------------------------------------------------------------

test('legacy: file without markers but with all 3 legacy strings → kind=legacy, exitCode=3', () => {
  const existing =
    '<canvas id="resCanvas" width="500" height="400"></canvas>\n' +
    '<script src="/js/tagcanvas.js"></script>\n' +
    '<script src="/js/tagcloud.js"></script>\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'legacy');
  assert.equal(result.exitCode, 3);
  assert.match(result.message, /legacy/);
  assert.match(result.message, /Remove the existing block manually/);
});

test('legacy detection requires ALL THREE strings: missing tagcloud.js → insert', () => {
  const partial =
    '<canvas id="resCanvas" width="500"></canvas>\n' +
    '<script src="/js/tagcanvas.js"></script>\n';
  const result = computeApplyAction({
    existingContent: partial,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert',
    'one missing string → fall through to insert (not legacy)');
});

test('legacy detection requires ALL THREE: missing id="resCanvas" → insert', () => {
  const partial =
    '<script src="/js/tagcanvas.js"></script>\n' +
    '<script src="/js/tagcloud.js"></script>\n';
  const result = computeApplyAction({
    existingContent: partial,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
});

test('markers take precedence over legacy detection (markers found → never check legacy triple)', () => {
  const both =
    '<canvas id="resCanvas"></canvas>' +
    '<script src="/js/tagcloud.js"></script>' +
    '<script src="/js/tagcanvas.js"></script>\n' +
    NEW_BLOCK;
  const result = computeApplyAction({
    existingContent: both,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'noop',
    'with markers present, behaviour is noop (or conflict) — never legacy');
});

// --- marker recognition with surrounding whitespace ----------------------

test('markers: recognised even with extra leading whitespace on the marker line', () => {
  const existing =
    '<aside>x</aside>\n' +
    '    <!-- hexo-tag-cloud:begin -->\n' +
    '    <canvas id="resCanvas"></canvas>\n' +
    '    <!-- hexo-tag-cloud:end -->\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  // body differs from new block → conflict (not insert): proves markers were found
  assert.equal(result.kind, 'conflict');
});

// --- CRLF write-back preservation ----------------------------------------

test('CRLF write-back: insert into CRLF file → newContent uses \\r\\n', () => {
  const existing = '<aside>line1</aside>\r\n<aside>line2</aside>\r\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
  // every \n in result must be preceded by \r
  const loneLf = result.newContent.match(/(?<!\r)\n/g);
  assert.equal(loneLf, null,
    'CRLF-authored file must remain CRLF after insert; found bare \\n');
});

test('CRLF write-back: force-replace on CRLF file → newContent uses \\r\\n', () => {
  const crlfBlock = NEW_BLOCK.split('\n').join('\r\n');
  const userEdited = crlfBlock.replace('width="500"', 'width="999"');
  const existing = '<aside>x</aside>\r\n\r\n' + userEdited + '\r\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
    force: true,
  });
  assert.equal(result.kind, 'force-replace');
  const loneLf = result.newContent.match(/(?<!\r)\n/g);
  assert.equal(loneLf, null,
    'CRLF-authored file must remain CRLF after force-replace');
  assert.match(result.newContent, /width="500"/);
});

test('LF write-back: LF file stays LF after insert', () => {
  const existing = '<aside>x</aside>\n';
  const result = computeApplyAction({
    existingContent: existing,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
  assert.equal(result.newContent.indexOf('\r'), -1, 'no \\r should appear in LF output');
});

// --- pug recipe ----------------------------------------------------------

test('pug recipe: noop with pug-marker block', () => {
  const result = computeApplyAction({
    existingContent: 'p existing\n\n' + NEW_BLOCK_PUG + '\n',
    newBlock: NEW_BLOCK_PUG,
    recipe: butterfly,
  });
  assert.equal(result.kind, 'noop');
});

test('pug recipe: conflict with edited pug-marker block', () => {
  const userEdited = NEW_BLOCK_PUG.replace('width=500', 'width=999');
  const result = computeApplyAction({
    existingContent: 'p existing\n\n' + userEdited + '\n',
    newBlock: NEW_BLOCK_PUG,
    recipe: butterfly,
  });
  assert.equal(result.kind, 'conflict');
});

// --- argument validation -------------------------------------------------

test('throws on missing args object', () => {
  assert.throws(() => computeApplyAction(null), TypeError);
  assert.throws(() => computeApplyAction(undefined), TypeError);
  assert.throws(() => computeApplyAction('nope'), TypeError);
});

test('throws on missing/empty newBlock', () => {
  assert.throws(() => computeApplyAction({
    existingContent: '',
    newBlock: '',
    recipe: landscape,
  }), TypeError);
  assert.throws(() => computeApplyAction({
    existingContent: '',
    newBlock: undefined,
    recipe: landscape,
  }), TypeError);
});

test('throws on missing recipe', () => {
  assert.throws(() => computeApplyAction({
    existingContent: '',
    newBlock: NEW_BLOCK,
    recipe: null,
  }), TypeError);
  assert.throws(() => computeApplyAction({
    existingContent: '',
    newBlock: NEW_BLOCK,
    recipe: { engine: 'ejs' },  // no markers
  }), TypeError);
});

test('non-string existingContent is treated as empty', () => {
  const result = computeApplyAction({
    existingContent: undefined,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  assert.equal(result.kind, 'insert');
  assert.equal(result.newContent, NEW_BLOCK);
});

// --- unmatched end marker (defensive) ------------------------------------

test('start marker present but end marker missing → fall through to insert (not conflict)', () => {
  const broken = '<!-- hexo-tag-cloud:begin -->\n<canvas></canvas>\n';
  const result = computeApplyAction({
    existingContent: broken,
    newBlock: NEW_BLOCK,
    recipe: landscape,
  });
  // No closing marker → no managed-block span → insert (which appends).
  // This is the intentionally safe choice: don't try to repair a broken
  // marker pair; let the user clean up.
  assert.equal(result.kind, 'insert');
});
