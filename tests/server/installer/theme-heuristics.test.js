'use strict';

// Unit tests for lib/installer/theme-heuristics.js — built-in recipes
// track current upstream layouts (#46); any other template goes through
// customRecipe(); unsupported engines (JSX) return null.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveTheme,
  engineForFile,
  customRecipe,
  KNOWN_THEMES,
  ENGINE_BY_EXT,
  HTML_MARKER_START,
  HTML_MARKER_END,
  PUG_MARKER_START,
  PUG_MARKER_END,
} = require('../../../lib/installer/theme-heuristics');

test('KNOWN_THEMES lists exactly the four maintained recipes', () => {
  assert.deepEqual([...KNOWN_THEMES].sort(), ['butterfly', 'fluid', 'landscape', 'next']);
  assert.ok(Object.isFrozen(KNOWN_THEMES));
});

test('recipes point at current upstream files with the right engine and anchor', () => {
  const expected = {
    landscape: ['layout/_partial/sidebar.ejs', 'ejs', '</aside>'],
    next: ['layout/_macro/sidebar.njk', 'njk', '</aside>'],
    butterfly: ['layout/includes/widget/card_tags.pug', 'pug', null],
    fluid: ['layout/tags.ejs', 'ejs', null],
  };
  for (const [name, [file, engine, before]] of Object.entries(expected)) {
    const r = resolveTheme(name);
    assert.equal(r.name, name);
    assert.equal(r.file, file);
    assert.equal(r.engine, engine);
    assert.equal(r.before, before);
    assert.ok(Object.isFrozen(r), name + ' recipe must be frozen');
  }
});

test('HTML engines use HTML markers; pug uses unbuffered //- markers', () => {
  for (const name of ['landscape', 'next', 'fluid']) {
    const r = resolveTheme(name);
    assert.equal(r.markerStart, HTML_MARKER_START);
    assert.equal(r.markerEnd, HTML_MARKER_END);
  }
  const b = resolveTheme('butterfly');
  assert.equal(b.markerStart, PUG_MARKER_START);
  assert.equal(b.markerEnd, PUG_MARKER_END);
  assert.ok(PUG_MARKER_START.startsWith('//-'));
  assert.equal(HTML_MARKER_START, '<!-- hexo-tag-cloud:begin -->');
  assert.equal(HTML_MARKER_END, '<!-- hexo-tag-cloud:end -->');
});

test('resolveTheme: unknown, removed, empty, non-string, and prototype keys → null', () => {
  for (const v of ['icarus', 'generic', 'nope', '', undefined, null, 42, 'constructor', 'toString', '__proto__']) {
    assert.equal(resolveTheme(v), null, String(v));
  }
});

test('engineForFile maps extensions case-insensitively', () => {
  assert.equal(engineForFile('a/b.ejs'), 'ejs');
  assert.equal(engineForFile('a/b.NJK'), 'njk');
  assert.equal(engineForFile('x.swig'), 'njk');
  assert.equal(engineForFile('x.nunjucks'), 'njk');
  assert.equal(engineForFile('x.pug'), 'pug');
  assert.equal(engineForFile('x.jade'), 'pug');
  assert.ok(Object.isFrozen(ENGINE_BY_EXT));
});

test('engineForFile: JSX, unknown, extensionless, dotted dirs, prototype keys → null', () => {
  assert.equal(engineForFile('layout/common/widgets.jsx'), null);
  assert.equal(engineForFile('x.html'), null);
  assert.equal(engineForFile('Makefile'), null);
  assert.equal(engineForFile('dir.ejs/file'), null);
  assert.equal(engineForFile('x.constructor'), null);
  assert.equal(engineForFile(undefined), null);
});

test('customRecipe builds a frozen recipe for writable engines', () => {
  const r = customRecipe('layout/_partial/aside.njk', '</div>');
  assert.deepEqual({ ...r }, {
    name: 'custom',
    file: 'layout/_partial/aside.njk',
    engine: 'njk',
    before: '</div>',
    markerStart: HTML_MARKER_START,
    markerEnd: HTML_MARKER_END,
  });
  assert.ok(Object.isFrozen(r));
  const p = customRecipe('layout/w.pug');
  assert.equal(p.before, null);
  assert.equal(p.markerStart, PUG_MARKER_START);
  assert.equal(customRecipe('x.ejs', '').before, null);
});

test('customRecipe returns null for unsupported engines', () => {
  assert.equal(customRecipe('layout/widget/profile.jsx', '</aside>'), null);
});
