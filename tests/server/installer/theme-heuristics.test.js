'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveTheme,
  interpolatePartialPath,
  KNOWN_THEMES,
  HTML_MARKER_START,
  HTML_MARKER_END,
  PUG_MARKER_START,
  PUG_MARKER_END,
} = require('../../../lib/installer/theme-heuristics');

// --- resolveTheme: each named theme ---------------------------------------

test('resolveTheme("landscape") returns the landscape ejs recipe', () => {
  const recipe = resolveTheme('landscape');
  assert.equal(recipe.name, 'landscape');
  assert.equal(recipe.partialPath, 'themes/<theme>/layout/_partial/sidebar.ejs');
  assert.equal(recipe.engine, 'ejs');
  assert.equal(recipe.insertionMode, 'append');
  assert.equal(recipe.markerStart, HTML_MARKER_START);
  assert.equal(recipe.markerEnd, HTML_MARKER_END);
});

test('resolveTheme("next") returns the next swig recipe with HTML markers', () => {
  const recipe = resolveTheme('next');
  assert.equal(recipe.name, 'next');
  assert.equal(recipe.partialPath, 'themes/<theme>/layout/_macro/sidebar.swig');
  assert.equal(recipe.engine, 'swig');
  assert.equal(recipe.insertionMode, 'append');
  assert.equal(recipe.markerStart, HTML_MARKER_START);
  assert.equal(recipe.markerEnd, HTML_MARKER_END);
});

test('resolveTheme("butterfly") returns the butterfly pug recipe with pug markers', () => {
  const recipe = resolveTheme('butterfly');
  assert.equal(recipe.name, 'butterfly');
  assert.equal(recipe.partialPath, 'themes/<theme>/layout/includes/widget/recent_comments.pug');
  assert.equal(recipe.engine, 'pug');
  assert.equal(recipe.insertionMode, 'append');
  assert.equal(recipe.markerStart, PUG_MARKER_START);
  assert.equal(recipe.markerEnd, PUG_MARKER_END);
});

test('resolveTheme("icarus") returns the icarus ejs recipe', () => {
  const recipe = resolveTheme('icarus');
  assert.equal(recipe.name, 'icarus');
  assert.equal(recipe.partialPath, 'themes/<theme>/layout/widget/recent_posts.ejs');
  assert.equal(recipe.engine, 'ejs');
  assert.equal(recipe.insertionMode, 'append');
  assert.equal(recipe.markerStart, HTML_MARKER_START);
});

test('resolveTheme("fluid") returns the fluid ejs recipe', () => {
  const recipe = resolveTheme('fluid');
  assert.equal(recipe.name, 'fluid');
  assert.equal(recipe.partialPath, 'themes/<theme>/layout/_partials/sidebar.ejs');
  assert.equal(recipe.engine, 'ejs');
  assert.equal(recipe.insertionMode, 'append');
});

test('resolveTheme("generic") returns the standalone fallback recipe', () => {
  const recipe = resolveTheme('generic');
  assert.equal(recipe.name, 'generic');
  assert.equal(recipe.engine, 'ejs');
  assert.equal(recipe.insertionMode, 'standalone',
    'generic recipe must use standalone mode (writes a new file, no append)');
  assert.match(recipe.partialPath, /tagcloud-partial\.ejs$/);
  assert.equal(recipe.markerStart, HTML_MARKER_START);
});

// --- resolveTheme: rejection cases ----------------------------------------

test('resolveTheme("unknown-theme") returns null', () => {
  assert.equal(resolveTheme('unknown-theme'), null);
});

test('resolveTheme("") returns null', () => {
  assert.equal(resolveTheme(''), null);
});

test('resolveTheme(undefined) returns null', () => {
  assert.equal(resolveTheme(undefined), null);
});

test('resolveTheme(null) returns null', () => {
  assert.equal(resolveTheme(null), null);
});

test('resolveTheme(42) returns null (non-string input)', () => {
  assert.equal(resolveTheme(42), null);
});

// --- struct immutability --------------------------------------------------

test('every recipe is frozen (Object.isFrozen)', () => {
  for (const name of KNOWN_THEMES) {
    const recipe = resolveTheme(name);
    assert.ok(Object.isFrozen(recipe),
      `recipe for "${name}" must be frozen so callers cannot mutate shared state`);
  }
});

test('cannot reassign recipe fields (silent in non-strict, throws in strict)', () => {
  const recipe = resolveTheme('landscape');
  assert.throws(() => { recipe.engine = 'pug'; }, TypeError,
    'frozen recipe must throw on reassignment in strict mode');
  assert.equal(recipe.engine, 'ejs');
});

// --- KNOWN_THEMES ---------------------------------------------------------

test('KNOWN_THEMES contains exactly the 5 named themes plus generic', () => {
  assert.deepEqual(
    [...KNOWN_THEMES].sort(),
    ['butterfly', 'fluid', 'generic', 'icarus', 'landscape', 'next'],
  );
});

test('KNOWN_THEMES is frozen', () => {
  assert.ok(Object.isFrozen(KNOWN_THEMES));
});

// --- interpolatePartialPath -----------------------------------------------

test('interpolatePartialPath: substitutes <theme> with the supplied slug', () => {
  const recipe = resolveTheme('landscape');
  assert.equal(
    interpolatePartialPath(recipe, 'landscape'),
    'themes/landscape/layout/_partial/sidebar.ejs',
  );
});

test('interpolatePartialPath: works for non-default theme slug (e.g. forked theme)', () => {
  const recipe = resolveTheme('landscape');
  assert.equal(
    interpolatePartialPath(recipe, 'my-fork-of-landscape'),
    'themes/my-fork-of-landscape/layout/_partial/sidebar.ejs',
  );
});

test('interpolatePartialPath: works for pug recipe path', () => {
  const recipe = resolveTheme('butterfly');
  assert.equal(
    interpolatePartialPath(recipe, 'butterfly'),
    'themes/butterfly/layout/includes/widget/recent_comments.pug',
  );
});

test('interpolatePartialPath: handles slug containing characters that look like regex (no $1 surprise)', () => {
  // Defensive: split/join is safe vs the .replace($1) class of bug B fixed in T2.
  const recipe = resolveTheme('landscape');
  const out = interpolatePartialPath(recipe, '$1-theme');
  assert.equal(out, 'themes/$1-theme/layout/_partial/sidebar.ejs',
    '$1 must appear literally; no regex group interpretation');
});

test('interpolatePartialPath: throws TypeError on missing recipe', () => {
  assert.throws(() => interpolatePartialPath(null, 'landscape'), TypeError);
  assert.throws(() => interpolatePartialPath({}, 'landscape'), TypeError);
});

test('interpolatePartialPath: throws TypeError on empty/non-string slug', () => {
  const recipe = resolveTheme('landscape');
  assert.throws(() => interpolatePartialPath(recipe, ''), TypeError);
  assert.throws(() => interpolatePartialPath(recipe, undefined), TypeError);
  assert.throws(() => interpolatePartialPath(recipe, 42), TypeError);
});

// --- marker constants -----------------------------------------------------

test('HTML markers are valid HTML comments', () => {
  assert.ok(HTML_MARKER_START.startsWith('<!--') && HTML_MARKER_START.endsWith('-->'));
  assert.ok(HTML_MARKER_END.startsWith('<!--') && HTML_MARKER_END.endsWith('-->'));
  assert.notEqual(HTML_MARKER_START, HTML_MARKER_END);
});

test('Pug markers are valid pug unbuffered comments (//- prefix, no trailing newline)', () => {
  assert.ok(PUG_MARKER_START.startsWith('//-'));
  assert.ok(PUG_MARKER_END.startsWith('//-'));
  assert.equal(PUG_MARKER_START.indexOf('\n'), -1);
  assert.equal(PUG_MARKER_END.indexOf('\n'), -1);
});
