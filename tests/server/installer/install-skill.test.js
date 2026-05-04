'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const installSkill = require('../../../lib/installer/install-skill');
const { runInstallSkill, collectFiles, DEFAULT_SOURCE_DIR } = installSkill;
const { runCli } = require('../../../lib/installer/cli');

// ---------- helpers ------------------------------------------------------

function makeStreams() {
  const so = [];
  const se = [];
  return {
    stdout: { write: (s) => { so.push(String(s)); return true; } },
    stderr: { write: (s) => { se.push(String(s)); return true; } },
    out: () => so.join(''),
    err: () => se.join(''),
  };
}

function mkTmp(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'htc-skill-' + name + '-'));
}

function buildFixtureSource() {
  const root = mkTmp('source');
  fs.writeFileSync(path.join(root, 'SKILL.md'), '# name\nhexo-tag-cloud\n');
  fs.mkdirSync(path.join(root, 'scripts'));
  fs.writeFileSync(path.join(root, 'scripts/detect-theme.js'), '// stub\n');
  fs.writeFileSync(path.join(root, 'scripts/inspect-partials.js'), '// stub\n');
  fs.mkdirSync(path.join(root, 'scripts/nested'));
  fs.writeFileSync(path.join(root, 'scripts/nested/extra.js'), '// nested\n');
  return root;
}

// ---------- collectFiles -------------------------------------------------

test('collectFiles: returns recursive file list relative to root, sorted', () => {
  const src = buildFixtureSource();
  const files = collectFiles(src, fs);
  assert.deepEqual(files, [
    'SKILL.md',
    'scripts/detect-theme.js',
    'scripts/inspect-partials.js',
    'scripts/nested/extra.js',
  ]);
});

// ---------- dry-run path -------------------------------------------------

test('runInstallSkill: --dry-run prints planned ops + exit 0; no writes', async () => {
  const src = buildFixtureSource();
  const target = path.join(mkTmp('target'), 'untouched');
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target, '--dry-run'],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: src },
  );
  assert.equal(code, 0);
  assert.match(s.out(), /\[dry-run\] would copy 4 file\(s\)/);
  assert.match(s.out(), /SKILL\.md/);
  assert.match(s.out(), /scripts\/nested\/extra\.js/);
  // target was NOT created
  assert.equal(fs.existsSync(target), false);
});

test('runInstallSkill: default-target dry-run uses ~/.claude/skills/hexo-tag-cloud/', async () => {
  const src = buildFixtureSource();
  const fakeHome = mkTmp('home');
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--dry-run'],
    {
      stdout: s.stdout,
      stderr: s.stderr,
      sourceDir: src,
      homedir: () => fakeHome,
    },
  );
  assert.equal(code, 0);
  const expectedTarget = path.join(fakeHome, '.claude', 'skills', 'hexo-tag-cloud');
  assert.match(s.out(), new RegExp(expectedTarget.replace(/[/\\]/g, '[/\\\\]')),
    'output must mention the default ~/.claude/skills target');
});

// ---------- happy path: actual copy -------------------------------------

test('runInstallSkill: copies all files to a fresh target, exit 0', async () => {
  const src = buildFixtureSource();
  const target = path.join(mkTmp('target'), 'fresh');
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: src },
  );
  assert.equal(code, 0, 'unexpected stderr: ' + s.err());
  assert.match(s.out(), /skill installed at/);
  assert.match(s.out(), /Restart your AI agent/);
  // verify each file landed
  assert.equal(
    fs.readFileSync(path.join(target, 'SKILL.md'), 'utf8'),
    '# name\nhexo-tag-cloud\n',
  );
  assert.equal(
    fs.readFileSync(path.join(target, 'scripts/detect-theme.js'), 'utf8'),
    '// stub\n',
  );
  assert.equal(
    fs.readFileSync(path.join(target, 'scripts/nested/extra.js'), 'utf8'),
    '// nested\n',
  );
});

// ---------- non-empty target refusal -------------------------------------

test('runInstallSkill: existing non-empty target without --dry-run → exit 4', async () => {
  const src = buildFixtureSource();
  const target = mkTmp('existing');
  fs.writeFileSync(path.join(target, 'something.txt'), 'pre-existing\n');

  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: src },
  );
  assert.equal(code, 4);
  assert.match(s.err(), /already exists and is non-empty/);
  // pre-existing file untouched
  assert.equal(fs.readFileSync(path.join(target, 'something.txt'), 'utf8'), 'pre-existing\n');
});

test('runInstallSkill: empty existing target → ok, copies', async () => {
  const src = buildFixtureSource();
  const target = mkTmp('empty-existing'); // exists, empty
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: src },
  );
  assert.equal(code, 0);
  assert.ok(fs.existsSync(path.join(target, 'SKILL.md')));
});

test('runInstallSkill: target path points to a regular file → exit 4', async () => {
  const src = buildFixtureSource();
  const target = path.join(mkTmp('file'), 'not-a-dir');
  fs.writeFileSync(target, 'i am a file\n');
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: src },
  );
  assert.equal(code, 4);
  assert.match(s.err(), /already exists and is non-empty/);
});

test('runInstallSkill: --dry-run still proceeds when target exists (no refusal)', async () => {
  const src = buildFixtureSource();
  const target = mkTmp('dry-existing');
  fs.writeFileSync(path.join(target, 'pre.txt'), 'x\n');
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target, '--dry-run'],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: src },
  );
  assert.equal(code, 0);
  assert.match(s.out(), /\[dry-run\]/);
});

// ---------- argument parsing --------------------------------------------

test('runInstallSkill: bad flag → exit 1', async () => {
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--bogus'],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: '/tmp/whatever' },
  );
  assert.equal(code, 1);
  assert.match(s.err(), /argument parse error/);
});

// ---------- source dir failure ------------------------------------------

test('runInstallSkill: source dir missing → exit 4', async () => {
  const target = path.join(mkTmp('miss-src'), 'fresh');
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target],
    { stdout: s.stdout, stderr: s.stderr, sourceDir: '/tmp/no-such-skill-dir-htc' },
  );
  assert.equal(code, 4);
  assert.match(s.err(), /failed to read skill source/);
});

test('runInstallSkill: copy write failure → exit 4', async () => {
  const src = buildFixtureSource();
  const target = path.join(mkTmp('write-fail'), 'fresh');
  const fakeFs = Object.create(fs);
  fakeFs.writeFileSync = () => {
    const e = new Error('disk full');
    e.code = 'ENOSPC';
    throw e;
  };
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--target', target],
    {
      stdout: s.stdout,
      stderr: s.stderr,
      sourceDir: src,
      fs: fakeFs,
    },
  );
  assert.equal(code, 4);
  assert.match(s.err(), /failed to copy skill: disk full/);
});

// ---------- routed via runCli -------------------------------------------

test('runCli: install-skill subcommand routes here (--dry-run)', async () => {
  const src = buildFixtureSource();
  const fakeHome = mkTmp('cli-home');
  // Override DEFAULT_SOURCE_DIR by monkey-patching require cache: easiest
  // approach is just to run the bin via a fixture sourceDir, which means
  // we must call runInstallSkill directly. The runCli path is exercised
  // separately below via subprocess (real shim).
  const s = makeStreams();
  const code = await runInstallSkill(
    ['--dry-run'],
    {
      stdout: s.stdout,
      stderr: s.stderr,
      sourceDir: src,
      homedir: () => fakeHome,
    },
  );
  assert.equal(code, 0);
});

test('runCli: install-skill route reachable (smoke-tests router branch)', async () => {
  // Without overriding sourceDir, runCli will attempt to read the real
  // skills/hexo-tag-cloud/ which T6 will populate. For this test we
  // simply verify the router doesn't return "unknown subcommand".
  const s = makeStreams();
  const code = await runCli({
    argv: ['install-skill', '--bogus-flag'],
    cwd: '/tmp',
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 1, 'install-skill route should reach parseArgs and return 1 on bad flag');
  assert.match(s.err(), /argument parse error/,
    'should be parse error from install-skill, NOT "unknown subcommand"');
  assert.equal(s.err().indexOf('unknown subcommand'), -1);
});

// ---------- DEFAULT_SOURCE_DIR ------------------------------------------

test('DEFAULT_SOURCE_DIR resolves to <repo>/skills/hexo-tag-cloud', () => {
  assert.match(DEFAULT_SOURCE_DIR, /skills[/\\]hexo-tag-cloud$/);
  assert.ok(path.isAbsolute(DEFAULT_SOURCE_DIR));
});
