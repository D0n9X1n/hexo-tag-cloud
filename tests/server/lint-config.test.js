'use strict';

// Sub-project B's lint-accommodation contract: A added a temporary
// `index.js` override block + a `globals.hexo = 'readonly'` entry to
// keep CI green while A focused on scaffolding. B's refactor of
// `index.js` removed both the dead `Hexo` import and the global
// `hexo` reference, so the accommodations MUST be deleted.
//
// These tests are the auditable proof that B kept its end of the
// contract. Do NOT delete or weaken without re-introducing the
// accommodations alongside.

const test = require('node:test');
const assert = require('node:assert/strict');

const cfg = require('../../.eslintrc.js');

test('no temporary `index.js` override remains in .eslintrc.js', () => {
  const overrides = cfg.overrides || [];
  const stale = overrides.find((o) =>
    Array.isArray(o.files) &&
    o.files.length === 1 &&
    o.files[0] === 'index.js');
  assert.equal(stale, undefined,
    "sub-project B must remove the temporary {files: ['index.js']} override " +
    "block that sub-project A introduced; B's refactor eliminated the " +
    "underlying dead code that needed accommodation.");
});

test('no temporary `global.hexo` declaration remains in .eslintrc.js', () => {
  const globals = cfg.globals || {};
  assert.equal(globals.hexo, undefined,
    'sub-project B must remove the temporary `globals.hexo = "readonly"` ' +
    'entry; B\'s refactor switched index.js to `module.exports = ' +
    'function(hexo)`, so `hexo` is now a parameter, not a global.');
});

test('lint config still ignores the vendored TagCanvas library', () => {
  const ignored = cfg.ignorePatterns || [];
  assert.ok(ignored.includes('lib/tagcanvas.js'),
    'lib/tagcanvas.js MUST remain in ignorePatterns — it is upstream code ' +
    'and v3.0.0 is contracted to leave it byte-identical to TagCanvas v2.9.');
});
