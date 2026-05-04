'use strict';

// Unit tests for index.js — the v2 Hexo plugin entry point. Tests run
// in a single process per node --test conventions; we install our
// stubs into require.cache BEFORE the first require('../../index.js')
// and reset between cases by deleting the index.js cache entry.
//
// Mocking strategy (Node 18+, no experimental flags):
//   * stub `hexo-fs`     — capture copyFile / writeFile calls
//   * stub `hexo-log`    — capture log calls
//   * stub `hexo`        — index.js does `var Hexo = require("hexo")`
//                          but never uses it; an empty object suffices
//   * set global.hexo    — provides extend.filter.register, base_dir,
//                          public_dir, config

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const INDEX_PATH = path.join(REPO_ROOT, 'index.js');

const SNAPSHOT_DEFAULT = path.join(
  __dirname, '__snapshots__', 'tagcloud.default.js');

// --- shared per-case state -------------------------------------------------

let captured;
let registeredFilters;

function resetCaptures() {
  captured = {
    copyFile: [],
    writeFile: [],
    log: { info: [], warn: [], error: [], debug: [] },
  };
  registeredFilters = [];
}

function stubModule(name, exports) {
  const id = require.resolve(name);
  require.cache[id] = {
    id, filename: id, loaded: true, exports,
    children: [], paths: [], parent: null,
  };
}

function clearCacheFor(p) {
  const id = require.resolve(p);
  delete require.cache[id];
}

function makeHexoFsStub() {
  return {
    copyFile: (src, dest) => { captured.copyFile.push({ src, dest }); },
    writeFile: (dest, content) => { captured.writeFile.push({ dest, content }); },
  };
}

function makeHexoLogStub() {
  // factory: require("hexo-log")({ debug, silent }) returns a logger
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
  return {
    base_dir: '/site',
    public_dir: '/site/public',
    config,
    extend: {
      filter: {
        register: (name, fn) => { registeredFilters.push({ name, fn }); },
      },
    },
  };
}

function loadPluginAndFire(opts) {
  resetCaptures();
  stubModule('hexo-fs', makeHexoFsStub());
  stubModule('hexo-log', makeHexoLogStub());
  stubModule('hexo', {});
  global.hexo = makeFakeHexo(opts);

  clearCacheFor(INDEX_PATH);
  require(INDEX_PATH);

  // index.js registers exactly one after_generate filter on require.
  assert.equal(registeredFilters.length, 1,
    'expected exactly one filter registration');
  assert.equal(registeredFilters[0].name, 'after_generate');

  // Fire the filter with a sentinel post arg.
  registeredFilters[0].fn({ sentinel: true });

  return { captured, registeredFilters };
}

// --- assertions reused across cases ---------------------------------------

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

// --- T5 case table (9 cases) ----------------------------------------------

test('case 1 — no tag_cloud config (defaults; outer-if false)', () => {
  loadPluginAndFire({});  // no tag_cloud key
  assertFileWrites();
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = 'Helvetica';/);
  assert.match(js, /TagCanvas\.textColour = '#333';/);
  assert.match(js, /TagCanvas\.textHeight = 15;/);
  assert.match(js, /TagCanvas\.outlineColour = '#E2E1C1';/);
  assert.match(js, /TagCanvas\.maxSpeed = 0\.03;/);
  assert.match(js, /TagCanvas\.freezeActive = true;/);
  // log lines
  assert.deepEqual(captured.log.info, [
    '---- START COPYING TAG CLOUD FILES ----',
    '---- END COPYING TAG CLOUD FILES ----',
  ]);
});

test('case 2 — empty tag_cloud {} (outer true, all 6 inner false)', () => {
  loadPluginAndFire({ tag_cloud: {} });
  assertFileWrites();
  const js = getWrittenJs();
  // Same defaults as case 1 because no inner if fires.
  assert.match(js, /TagCanvas\.textFont = 'Helvetica';/);
  assert.match(js, /TagCanvas\.freezeActive = true;/);
});

test('case 3 — only textColor set', () => {
  loadPluginAndFire({ tag_cloud: { textColor: '#abc' } });
  assertFileWrites();
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textColour = '#abc';/);
  assert.match(js, /TagCanvas\.textFont = 'Helvetica';/);  // default
});

test('case 4 — only textFont set', () => {
  loadPluginAndFire({ tag_cloud: { textFont: 'Comic Sans' } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = 'Comic Sans';/);
  assert.match(js, /TagCanvas\.textColour = '#333';/);  // default
});

test('case 5 — only textHeight set', () => {
  loadPluginAndFire({ tag_cloud: { textHeight: 42 } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textHeight = 42;/);
});

test('case 6 — only outlineColor set', () => {
  loadPluginAndFire({ tag_cloud: { outlineColor: '#123' } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.outlineColour = '#123';/);
});

test('case 7 — only maxSpeed set', () => {
  loadPluginAndFire({ tag_cloud: { maxSpeed: 0.5 } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.maxSpeed = 0\.5;/);
});

test('case 8 — only pauseOnSelected set (true)', () => {
  loadPluginAndFire({ tag_cloud: { pauseOnSelected: true } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.freezeActive = true;/);
});

test('case 9 — pauseOnSelected explicitly false (covers != undefined true-branch with falsy value)', () => {
  loadPluginAndFire({ tag_cloud: { pauseOnSelected: false } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.freezeActive = false;/);
});

test('case 10 — all six knobs set together (defence-in-depth: catches .replace() ordering bugs)', () => {
  loadPluginAndFire({ tag_cloud: {
    textFont: 'Trebuchet MS',
    textColor: '#abcdef',
    textHeight: 25,
    outlineColor: '#fedcba',
    maxSpeed: 0.07,
    pauseOnSelected: true,
  } });
  const js = getWrittenJs();
  assert.match(js, /TagCanvas\.textFont = 'Trebuchet MS';/);
  assert.match(js, /TagCanvas\.textColour = '#abcdef';/);
  assert.match(js, /TagCanvas\.textHeight = 25;/);
  assert.match(js, /TagCanvas\.outlineColour = '#fedcba';/);
  assert.match(js, /TagCanvas\.maxSpeed = 0\.07;/);
  assert.match(js, /TagCanvas\.freezeActive = true;/);
});

// --- snapshot test --------------------------------------------------------

test('snapshot — default-config tagcloud.js bytes are stable', () => {
  loadPluginAndFire({});
  const actual = getWrittenJs();

  // Auto-create snapshot on first run; thereafter, lock it.
  if (!fs.existsSync(SNAPSHOT_DEFAULT) || process.env.UPDATE_SNAPSHOTS) {
    fs.mkdirSync(path.dirname(SNAPSHOT_DEFAULT), { recursive: true });
    fs.writeFileSync(SNAPSHOT_DEFAULT, actual);
  }
  const expected = fs.readFileSync(SNAPSHOT_DEFAULT, 'utf8');
  assert.equal(actual, expected,
    'tagcloud.js default-config bytes drifted vs snapshot. ' +
    'If intentional (sub-project B refactor), regenerate with UPDATE_SNAPSHOTS=1.');
});
