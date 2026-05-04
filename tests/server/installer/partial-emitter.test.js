'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { emitManagedBlock, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT } =
  require('../../../lib/installer/partial-emitter');
const { resolveTheme } = require('../../../lib/installer/theme-heuristics');

// --- happy paths ---------------------------------------------------------

test('emitManagedBlock(landscape): HTML body wrapped in HTML markers', () => {
  const out = emitManagedBlock(resolveTheme('landscape'));
  assert.match(out, /^<!-- hexo-tag-cloud:begin -->\n/);
  assert.match(out, /\n<!-- hexo-tag-cloud:end -->$/);
  assert.match(out, /<canvas id="resCanvas"/);
  assert.match(out, /width="500"/);
  assert.match(out, /height="400"/);
  assert.match(out, /style="margin: 0 auto;"/);
  assert.match(out, /<script src="\/js\/tagcanvas\.js"><\/script>/);
  assert.match(out, /<script src="\/js\/tagcloud\.js"><\/script>/);
});

test('emitManagedBlock(next): swig recipe — same HTML body, HTML markers', () => {
  const out = emitManagedBlock(resolveTheme('next'));
  assert.match(out, /^<!-- hexo-tag-cloud:begin -->\n/);
  assert.match(out, /<canvas id="resCanvas"/);
});

test('emitManagedBlock(butterfly): pug body wrapped in pug markers', () => {
  const out = emitManagedBlock(resolveTheme('butterfly'));
  assert.match(out, /^\/\/- hexo-tag-cloud:begin\n/);
  assert.match(out, /\n\/\/- hexo-tag-cloud:end$/);
  assert.match(out, /canvas#resCanvas\(width=500 height=400 style='margin: 0 auto;'\)/);
  assert.match(out, /script\(src='\/js\/tagcanvas\.js'\)/);
  assert.match(out, /script\(src='\/js\/tagcloud\.js'\)/);
  assert.equal(out.indexOf('<canvas'), -1, 'pug body must NOT contain HTML <canvas>');
});

test('emitManagedBlock(icarus): ejs recipe', () => {
  const out = emitManagedBlock(resolveTheme('icarus'));
  assert.match(out, /<canvas id="resCanvas"/);
  assert.match(out, /^<!-- hexo-tag-cloud:begin -->/);
});

test('emitManagedBlock(fluid): ejs recipe', () => {
  const out = emitManagedBlock(resolveTheme('fluid'));
  assert.match(out, /<canvas id="resCanvas"/);
});

test('emitManagedBlock(generic): standalone-mode recipe still emits a valid HTML block', () => {
  const out = emitManagedBlock(resolveTheme('generic'));
  assert.match(out, /<canvas id="resCanvas"/);
  assert.match(out, /^<!-- hexo-tag-cloud:begin -->/);
});

// --- snapshot lock (byte stability) --------------------------------------

const LANDSCAPE_DEFAULT_SNAPSHOT = [
  '<!-- hexo-tag-cloud:begin -->',
  '<canvas id="resCanvas" width="500" height="400" style="margin: 0 auto;"></canvas>',
  '<script src="/js/tagcanvas.js"></script>',
  '<script src="/js/tagcloud.js"></script>',
  '<!-- hexo-tag-cloud:end -->',
].join('\n');

test('emitManagedBlock(landscape) is byte-stable (snapshot lock)', () => {
  const out = emitManagedBlock(resolveTheme('landscape'));
  assert.equal(out, LANDSCAPE_DEFAULT_SNAPSHOT,
    'emitted block diverged from snapshot — adjust deliberately and update this lock');
});

const BUTTERFLY_DEFAULT_SNAPSHOT = [
  '//- hexo-tag-cloud:begin',
  "canvas#resCanvas(width=500 height=400 style='margin: 0 auto;')",
  "script(src='/js/tagcanvas.js')",
  "script(src='/js/tagcloud.js')",
  '//- hexo-tag-cloud:end',
].join('\n');

test('emitManagedBlock(butterfly) is byte-stable (snapshot lock)', () => {
  const out = emitManagedBlock(resolveTheme('butterfly'));
  assert.equal(out, BUTTERFLY_DEFAULT_SNAPSHOT);
});

// --- option overrides ----------------------------------------------------

test('canvasWidth / canvasHeight / canvasStyle overrides take effect', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), {
    canvasWidth: 800,
    canvasHeight: 600,
    canvasStyle: 'background: #000;',
  });
  assert.match(out, /width="800"/);
  assert.match(out, /height="600"/);
  assert.match(out, /style="background: #000;"/);
});

test('canvasWidth: 0 emits literal 0 (regression: no || defaulting)', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasWidth: 0 });
  assert.match(out, /width="0"/,
    'zero-width must survive emission; mirrors B/T2 textHeight=0 fix');
});

test('canvasHeight: 0 emits literal 0', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasHeight: 0 });
  assert.match(out, /height="0"/);
});

test('canvasStyle: empty string is preserved (no fallback)', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasStyle: '' });
  assert.match(out, /style=""/);
});

// --- non-numeric width/height fall back -----------------------------------

test('canvasWidth: "abc" (NaN) falls back to default', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasWidth: 'abc' });
  assert.match(out, new RegExp('width="' + DEFAULT_CANVAS_WIDTH + '"'));
});

test('canvasWidth: numeric string "750" coerces to number', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasWidth: '750' });
  assert.match(out, /width="750"/);
});

// --- escaping ------------------------------------------------------------

test('special-character HTML style: double-quote escapes to &quot;', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), {
    canvasStyle: 'margin: 0; content: "x";',
  });
  assert.match(out, /style="margin: 0; content: &quot;x&quot;;"/);
});

test('HTML style with literal & is escaped to &amp;', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), {
    canvasStyle: 'background-image: url("a&b.png");',
  });
  assert.match(out, /&amp;/);
  // ensure ampersand was escaped EXACTLY once (no double-escape):
  assert.equal((out.match(/&amp;/g) || []).length, 1);
});

test('pug single-quoted style: embedded single-quote is backslash-escaped', () => {
  const out = emitManagedBlock(resolveTheme('butterfly'), {
    canvasStyle: "content: 'x';",
  });
  assert.match(out, /style='content: \\'x\\';'/);
});

test('pug attribute: backslash in style is doubled', () => {
  const out = emitManagedBlock(resolveTheme('butterfly'), {
    canvasStyle: 'a\\b',
  });
  assert.match(out, /style='a\\\\b'/);
});

test('pug attribute: newline in style is collapsed to space (defensive)', () => {
  const out = emitManagedBlock(resolveTheme('butterfly'), {
    canvasStyle: 'a\nb',
  });
  assert.match(out, /style='a b'/);
});

// --- recipe validation ---------------------------------------------------

test('emitManagedBlock(null) throws TypeError', () => {
  assert.throws(() => emitManagedBlock(null), TypeError);
});

test('emitManagedBlock({}) throws TypeError on missing engine', () => {
  assert.throws(() => emitManagedBlock({}), TypeError);
});

// --- regression: $1 / $$ / $& survive in canvasStyle ---------------------

test('regression: canvasStyle containing $1 is round-tripped intact (no .replace surprise)', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasStyle: 'content: "$1";' });
  assert.match(out, /content: &quot;\$1&quot;/);
});

test('regression: canvasStyle containing $& is round-tripped intact', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasStyle: 'content: "$&";' });
  assert.match(out, /content: &quot;\$&amp;&quot;/);
});

// --- canvasStyle null / undefined ----------------------------------------

test('canvasStyle: null falls back to default', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasStyle: null });
  assert.match(out, /style="margin: 0 auto;"/);
});

test('canvasWidth: null falls back to default', () => {
  const out = emitManagedBlock(resolveTheme('landscape'), { canvasWidth: null });
  assert.match(out, new RegExp('width="' + DEFAULT_CANVAS_WIDTH + '"'));
});

// --- options arg omitted entirely ----------------------------------------

test('emitManagedBlock(recipe) with no options arg uses defaults', () => {
  const out = emitManagedBlock(resolveTheme('landscape'));
  assert.match(out, new RegExp('width="' + DEFAULT_CANVAS_WIDTH + '"'));
  assert.match(out, new RegExp('height="' + DEFAULT_CANVAS_HEIGHT + '"'));
});
