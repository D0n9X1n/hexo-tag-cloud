'use strict';

// Unit tests for index.js — the v3 hexo plugin entry point.
//
// v3 contract:
//   `module.exports = function(hexo) { hexo.extend.filter.register(...) }`
//
// We stub `hexo-fs` and `hexo-log` via `require.cache` injection (Node 18+
// compatible, no experimental flags). Then we load index.js once,
// invoke the exported factory with a fake hexo instance per test case,
// fire the captured filter, and assert on captured side effects.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(REPO_ROOT, 'index.js');

const SNAPSHOT_DEFAULT = path.join(
  __dirname, '__snapshots__', 'tagcloud.default.js');

// --- shared per-case state -----------------------------------------------

let captured;

function resetCaptures() {
  captured = {
    copyFile: [],
    writeFile: [],
    log: { info: [], warn: [], error: [], debug: [] },
  };
}

function stubModule(name, exports) {
  const id = require.resolve(name);
  require.cache[id] = {
    id, filename: id, loaded: true, exports,
    children: [], paths: [], parent: null,
  };
}

function clearIndexCache() {
  delete require.cache[require.resolve(INDEX_PATH)];
  delete require.cache[require.resolve(path.join(REPO_ROOT, 'lib', 'options.js'))];
  delete require.cache[require.resolve(path.join(REPO_ROOT, 'lib', 'render.js'))];
}

function makeHexoFsStub() {
  return {
    copyFile:  (src, dest) => { captured.copyFile.push({ src, dest }); },
    writeFile: (dest, content) => { captured.writeFile.push({ dest, content }); },
  };
}

function makeHexoLogStub() {
  return function makeLogger() {
    return {
      info:  (msg) => { captured.log.info.push(msg); },
      warn:  (msg) => { captured.log.warn.push(msg); },
      error: (msg) => { captured.log.error.push(msg); },
      debug: (msg) => { captured.log.debug.push(msg); },
    };
  };
}

function makeFakeHexo(opts) {
  const tagCloudCfg = opts && opts.tag_cloud;
  const config = (tagCloudCfg === undefined)
    ? {}
    : { tag_cloud: tagCloudCfg };
  const filters = [];
  return {
    base_dir:   '/site',
    public_dir: '/site/public',
    config,
    extend: {
      filter: {
        register: (name, fn) => filters.push({ name, fn }),
      },
    },
    _filters: filters,
  };
}

function loadAndFire(opts) {
  resetCaptures();
  stubModule('hexo-fs', makeHexoFsStub());
  stubModule('hexo-log', makeHexoLogStub());
  clearIndexCache();

  const factory = require(INDEX_PATH);
  assert.equal(typeof factory, 'function',
    'index.js must export `function(hexo) { ... }` directly');

  const fakeHexo = makeFakeHexo(opts);
  factory(fakeHexo);

  assert.equal(fakeHexo._filters.length, 1,
    'expected exactly one filter registration');
  assert.equal(fakeHexo._filters[0].name, 'after_generate');

  fakeHexo._filters[0].fn({ sentinel: true });
  return { captured, fakeHexo };
}

function assertFileWrites() {
  assert.equal(captured.copyFile.length, 1, 'copyFile called once');
  assert.deepEqual(captured.copyFile[0], {
    src: '/site/node_modules/hexo-tag-cloud/lib/tagcanvas.js',
    dest: '/site/public/js/tagcanvas.js',
  });
  assert.equal(captured.writeFile.length, 1, 'writeFile called once');
  assert.equal(captured.writeFile[0].dest, '/site/public/js/tagcloud.js');
}

function getWrittenJs() {
  return captured.writeFile[0].content;
}

// --- contract tests ------------------------------------------------------

test('exports a factory; does NOT touch global.hexo', () => {
  // Sanity: index.js must not crash when global.hexo is undefined
  // (the v2 implementation crashed at require-time without it).
  delete global.hexo;
  resetCaptures();
  stubModule('hexo-fs', makeHexoFsStub());
  stubModule('hexo-log', makeHexoLogStub());
  clearIndexCache();
  const factory = require(INDEX_PATH);
  assert.equal(typeof factory, 'function');
  assert.equal(captured.copyFile.length, 0, 'no side effects at require time');
});

test('factory registers exactly one after_generate filter', () => {
  const { fakeHexo } = loadAndFire({});
  assert.equal(fakeHexo._filters.length, 1);
  assert.equal(fakeHexo._filters[0].name, 'after_generate');
});

test('filter writes correct file paths', () => {
  loadAndFire({});
  assertFileWrites();
});

test('filter logs start and end messages', () => {
  loadAndFire({});
  assert.deepEqual(captured.log.info, [
    '---- START COPYING TAG CLOUD FILES ----',
    '---- END COPYING TAG CLOUD FILES ----',
  ]);
});

// --- behavioural matrix --------------------------------------------------

test('default config (no tag_cloud) → defaults flow through', () => {
  loadAndFire({});
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textColour = "#333";/);
  assert.match(js, /TagCanvas\.textHeight = 15;/);
  assert.match(js, /TagCanvas\.outlineColour = "#E2E1C1";/);
  assert.match(js, /TagCanvas\.maxSpeed = 0\.03;/);
  assert.match(js, /TagCanvas\.freezeActive = true;/);
  assert.match(js, /Noto Sans CJK SC/, 'CJK fallback is in default font');
});

test('empty tag_cloud {} → defaults', () => {
  loadAndFire({ tag_cloud: {} });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textColour = "#333";/);
});

test('user textFont (single family) → CJK fallback appended', () => {
  loadAndFire({ tag_cloud: { textFont: 'Trebuchet MS' } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = "Trebuchet MS, .*Noto Sans CJK SC.*";/);
});

test('user textFont (multi-family) → passes through unchanged', () => {
  loadAndFire({ tag_cloud: { textFont: 'Trebuchet MS, sans-serif' } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = "Trebuchet MS, sans-serif";/);
});

test('all six knobs together', () => {
  loadAndFire({ tag_cloud: {
    textFont:        'Comic Sans MS, sans-serif',
    textColor:       '#abcdef',
    textHeight:      25,
    outlineColor:    '#fedcba',
    maxSpeed:        0.07,
    pauseOnSelected: true,
  } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = "Comic Sans MS, sans-serif";/);
  assert.match(js, /TagCanvas\.textColour = "#abcdef";/);
  assert.match(js, /TagCanvas\.textHeight = 25;/);
  assert.match(js, /TagCanvas\.outlineColour = "#fedcba";/);
  assert.match(js, /TagCanvas\.maxSpeed = 0\.07;/);
  assert.match(js, /TagCanvas\.freezeActive = true;/);
});

test('pauseOnSelected: false → freezeActive = false (regression for A defaulting bug)', () => {
  loadAndFire({ tag_cloud: { pauseOnSelected: false } });
  assert.match(getWrittenJs(), /TagCanvas\.freezeActive = false;/);
});

test('textHeight: 0 → emits literal 0 (regression for `||` defaulting)', () => {
  loadAndFire({ tag_cloud: { textHeight: 0 } });
  assert.match(getWrittenJs(), /TagCanvas\.textHeight = 0;/);
});

// --- bug 1 regression (e2e via the full pipeline) -----------------------

test('bug 1 regression: textFont with $& survives the full pipeline', () => {
  loadAndFire({ tag_cloud: { textFont: 'My$&Font' } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = "My\$&Font, .*Noto Sans CJK SC.*";/);
  assert.ok(!js.includes('${textFont}'),
    'no template marker should leak through');
});

// --- snapshot lock -------------------------------------------------------

test('snapshot — default-config tagcloud.js bytes are stable', () => {
  loadAndFire({});
  const actual = getWrittenJs();
  if (!fs.existsSync(SNAPSHOT_DEFAULT) || process.env.UPDATE_SNAPSHOTS) {
    fs.mkdirSync(path.dirname(SNAPSHOT_DEFAULT), { recursive: true });
    fs.writeFileSync(SNAPSHOT_DEFAULT, actual);
  }
  const expected = fs.readFileSync(SNAPSHOT_DEFAULT, 'utf8');
  assert.equal(actual, expected,
    'tagcloud.js default-config bytes drifted vs snapshot. ' +
    'Regenerate intentionally with UPDATE_SNAPSHOTS=1.');
});

// --- hexo loader auto-register branch ------------------------------------

test('auto-registers when loaded with `hexo` set as a free variable', () => {
  // Hexo's plugin loader (hexo/dist/hexo/index.js, loadPlugin) wraps
  // the source as `(function(exports, require, module, __filename,
  // __dirname, hexo){ … })` and supplies the live hexo as the 6th
  // arg, so `hexo` is a free variable inside the source. We can't
  // easily replicate the wrapper in-process, but the typeof guard
  // ALSO accepts a `global.hexo` (which would resolve through the
  // global lookup chain in the wrapper-less case). Setting it before
  // loading proves the guard branch fires the registration.
  resetCaptures();
  stubModule('hexo-fs', makeHexoFsStub());
  stubModule('hexo-log', makeHexoLogStub());
  clearIndexCache();

  const fakeHexo = makeFakeHexo({});
  global.hexo = fakeHexo;
  try {
    require(INDEX_PATH);
    assert.equal(fakeHexo._filters.length, 1,
      'auto-register must fire one after_generate filter when hexo is in scope');
    assert.equal(fakeHexo._filters[0].name, 'after_generate');
  } finally {
    delete global.hexo;
  }
});
