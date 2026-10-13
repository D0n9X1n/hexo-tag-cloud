'use strict';

// Unit tests for lib/installer/partial-emitter.js. Every engine's block
// must render tagcloud() INSIDE the canvas and load scripts via url_for
// (#44), so a successful install never yields an empty cloud.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  emitManagedBlock,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_STYLE,
} = require('../../../lib/installer/partial-emitter');
const { resolveTheme, customRecipe } = require('../../../lib/installer/theme-heuristics');

const EJS = resolveTheme('landscape');
const NJK = resolveTheme('next');
const PUG = resolveTheme('butterfly');

test('defaults: 250 x 250, width: 100%', () => {
  assert.equal(DEFAULT_CANVAS_WIDTH, 250);
  assert.equal(DEFAULT_CANVAS_HEIGHT, 250);
  assert.equal(DEFAULT_CANVAS_STYLE, 'width: 100%;');
});

test('ejs block: exact output', () => {
  assert.equal(emitManagedBlock(EJS), [
    '<!-- hexo-tag-cloud:begin -->',
    '<% if (site.tags.length) { %>',
    '<div id="myCanvasContainer" class="widget-wrap tagcloud">',
    '  <canvas id="resCanvas" width="250" height="250" style="width: 100%;">',
    '    <%- tagcloud() %>',
    '  </canvas>',
    '</div>',
    '<script src="<%- url_for(\'/js/tagcanvas.js\') %>"></script>',
    '<script src="<%- url_for(\'/js/tagcloud.js\') %>"></script>',
    '<% } %>',
    '<!-- hexo-tag-cloud:end -->',
  ].join('\n'));
});

test('njk block: guarded, tagcloud() | safe inside canvas, url_for scripts', () => {
  const out = emitManagedBlock(NJK);
  const lines = out.split('\n');
  assert.equal(lines[0], '<!-- hexo-tag-cloud:begin -->');
  assert.equal(lines[1], '{% if site.tags.length %}');
  assert.equal(lines[4], '    {{ tagcloud() | safe }}');
  assert.ok(out.includes('<script src="{{ url_for(\'/js/tagcanvas.js\') }}"></script>'));
  assert.ok(out.includes('<script src="{{ url_for(\'/js/tagcloud.js\') }}"></script>'));
  assert.equal(lines[lines.length - 2], '{% endif %}');
  assert.equal(lines[lines.length - 1], '<!-- hexo-tag-cloud:end -->');
});

test('pug block: exact output at column 0 with //- markers', () => {
  assert.equal(emitManagedBlock(PUG), [
    '//- hexo-tag-cloud:begin',
    'if site.tags.length',
    '  #myCanvasContainer.card-widget.tagcloud',
    "    canvas#resCanvas(width='250' height='250' style='width: 100%;')",
    '      != tagcloud()',
    "  script(src=url_for('/js/tagcanvas.js'))",
    "  script(src=url_for('/js/tagcloud.js'))",
    '//- hexo-tag-cloud:end',
  ].join('\n'));
});

test('no engine hard-codes a root-relative /js/ src (sub-path deploys)', () => {
  for (const r of [EJS, NJK, PUG]) {
    const out = emitManagedBlock(r);
    assert.doesNotMatch(out, /src="\/js\//);
    assert.doesNotMatch(out, /src='\/js\//);
    assert.match(out, /tagcloud\(\)/);
    assert.match(out, /myCanvasContainer/);
  }
});

test('custom recipe engines route to the right body (swig → nunjucks, jade → pug)', () => {
  assert.match(emitManagedBlock(customRecipe('a.swig')), /\{\{ tagcloud\(\) \| safe \}\}/);
  assert.match(emitManagedBlock(customRecipe('a.jade')), /!= tagcloud\(\)/);
  assert.match(emitManagedBlock(customRecipe('a.ejs')), /<%- tagcloud\(\) %>/);
});

test('canvas overrides: numbers, numeric strings, rounding, literal 0', () => {
  assert.match(emitManagedBlock(EJS, { canvasWidth: 300, canvasHeight: '180' }),
    /width="300" height="180"/);
  assert.match(emitManagedBlock(EJS, { canvasWidth: 199.6 }), /width="200"/);
  assert.match(emitManagedBlock(EJS, { canvasWidth: 0 }), /width="0"/);
});

test('canvas overrides: empty, null, NaN, negative, Infinity → defaults', () => {
  for (const bad of ['', null, undefined, 'abc', -5, Infinity]) {
    assert.match(emitManagedBlock(EJS, { canvasWidth: bad, canvasHeight: bad }),
      /width="250" height="250"/, String(bad));
  }
});

test('canvas style override passes through and keeps %', () => {
  assert.match(emitManagedBlock(EJS, { canvasStyle: 'margin: 0 auto; width: 90%;' }),
    /style="margin: 0 auto; width: 90%;"/);
  assert.match(emitManagedBlock(EJS, { canvasStyle: null }), /style="width: 100%;"/);
  assert.match(emitManagedBlock(EJS, { canvasStyle: '' }), /style=""/);
});

test('style sanitizer strips attribute breakers and template delimiters for every engine', () => {
  const evil = 'a"b\'c<%= x %>{{ y }}{% z %}#{w}<script>&\\\r\nd';
  for (const r of [EJS, NJK, PUG]) {
    const out = emitManagedBlock(r, { canvasStyle: evil });
    const styleLine = out.split('\n').find((l) => l.includes('resCanvas'));
    const m = /style=["'](.*)["']/.exec(styleLine);
    assert.ok(m, styleLine);
    assert.doesNotMatch(m[1], /[<>"'{}#\\\r\n&]/, r.engine + ': ' + m[1]);
    assert.equal(m[1], 'abc%= x % y % z %wscriptd');
  }
});

test('$-patterns in style are not interpreted as backreferences', () => {
  // `&` is stripped by the sanitizer; every `$` survives literally.
  assert.ok(emitManagedBlock(EJS, { canvasStyle: 'x$&y$1z$$' }).includes('style="x$y$1z$$"'));
});

test('invalid recipe throws', () => {
  assert.throws(() => emitManagedBlock(null), TypeError);
  assert.throws(() => emitManagedBlock({}), TypeError);
});
