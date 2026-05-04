'use strict';

/**
 * Subprocess tests for `bin/hexo-tag-cloud-install.js`. Proves the
 * inter-tool boundary (shebang, argv slice, exit code propagation,
 * stdout/stderr) actually works against the real Node runtime — per
 * B's loader-discovery lesson (unit tests in cli.test.js can pass
 * while the bin shim silently no-ops).
 *
 * Coverage of the bin shim itself is gathered by c8's NODE_V8_COVERAGE
 * env-var inheritance: c8 wraps `node --test`, which spawns these
 * subprocesses; the subprocesses inherit NODE_V8_COVERAGE; their v8
 * coverage is written to that dir; c8 collects all of it.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const BIN = path.join(REPO_ROOT, 'bin/hexo-tag-cloud-install.js');

function runBin(args, opts) {
  return spawnSync(process.execPath, [BIN].concat(args || []), {
    cwd: (opts && opts.cwd) || REPO_ROOT,
    encoding: 'utf8',
    env: process.env,  // inherits NODE_V8_COVERAGE for c8
  });
}

function mkSite(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'htc-bin-' + name + '-'));
}

function writeFile(p, contents) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents, 'utf8');
}

test('bin: --help exits 0 and prints USAGE', () => {
  const r = runBin(['--help']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: hexo-tag-cloud/);
  assert.equal(r.stderr, '');
});

test('bin: no args exits 0 and prints USAGE', () => {
  const r = runBin([]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /Usage: hexo-tag-cloud/);
});

test('bin: unknown subcommand exits 1', () => {
  const r = runBin(['frobnicate']);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /unknown subcommand: frobnicate/);
});

test('bin: install --apply against a real fixture writes the file (real-consumer integration)', () => {
  const cwd = mkSite('apply');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>w</aside>\n');

  const r = runBin(['install', '--apply'], { cwd });
  assert.equal(r.status, 0, 'unexpected stderr: ' + r.stderr);
  assert.match(r.stdout, /wrote tag-cloud managed block/);
  const after = fs.readFileSync(partialPath, 'utf8');
  assert.match(after, /<canvas id="resCanvas"/);
  assert.match(after, /<!-- hexo-tag-cloud:begin -->/);
  assert.match(after, /<!-- hexo-tag-cloud:end -->/);
});

test('bin: dry-run does not write', () => {
  const cwd = mkSite('dry');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>w</aside>\n');

  const r = runBin(['install'], { cwd });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\[dry-run\]/);
  const after = fs.readFileSync(partialPath, 'utf8');
  assert.equal(after, '<aside>w</aside>\n');
});

test('bin: missing _config.yml exits 1', () => {
  const cwd = mkSite('no-config');
  const r = runBin(['install'], { cwd });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no _config\.yml found/);
});

test('bin: conflict exit 2 propagates', () => {
  const cwd = mkSite('conflict');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>w</aside>\n');

  let r = runBin(['install', '--apply'], { cwd });
  assert.equal(r.status, 0);
  // user edit
  let body = fs.readFileSync(partialPath, 'utf8');
  body = body.replace('width="500"', 'width="999"');
  fs.writeFileSync(partialPath, body, 'utf8');

  r = runBin(['install', '--apply'], { cwd });
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^---/m);
});

test('bin: legacy install exit 3 propagates', () => {
  const cwd = mkSite('legacy');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  writeFile(path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs'),
    '<canvas id="resCanvas"></canvas>\n' +
    '<script src="/js/tagcanvas.js"></script>\n' +
    '<script src="/js/tagcloud.js"></script>\n',
  );

  const r = runBin(['install'], { cwd });
  assert.equal(r.status, 3);
});

test('bin: missing partial exit 4 propagates', () => {
  const cwd = mkSite('missing');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');

  const r = runBin(['install'], { cwd });
  assert.equal(r.status, 4);
});
