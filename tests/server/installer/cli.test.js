'use strict';

/**
 * Unit tests for `lib/installer/cli.js` driven in-process via runCli().
 * No mutation of real process.argv / process.exit / cwd. Filesystem
 * effects are scoped to per-test tmpdirs (real fs; no mocks needed
 * because the cli accepts an injectable fs but defaults to node:fs).
 *
 * A separate `bin.test.js` exercises the actual `bin/hexo-tag-cloud-
 * install.js` shim via child_process.spawnSync to prove the
 * inter-tool boundary works (per B's loader-discovery lesson).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const cli = require('../../../lib/installer/cli');
const { runCli } = cli;

// ---------- helpers ------------------------------------------------------

function makeStreams() {
  const stdoutChunks = [];
  const stderrChunks = [];
  return {
    stdout: { write: function (s) { stdoutChunks.push(String(s)); return true; } },
    stderr: { write: function (s) { stderrChunks.push(String(s)); return true; } },
    out: function () { return stdoutChunks.join(''); },
    err: function () { return stderrChunks.join(''); },
  };
}

function mkSite(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'htc-' + name + '-'));
}

function writeFile(p, contents) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents, 'utf8');
}

// ---------- USAGE / help -------------------------------------------------

test('runCli: no args → prints USAGE, exit 0', async () => {
  const s = makeStreams();
  const code = await runCli({ argv: [], cwd: '/', stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 0);
  assert.match(s.out(), /Usage: hexo-tag-cloud/);
  assert.equal(s.err(), '');
});

test('runCli: --help → prints USAGE, exit 0', async () => {
  const s = makeStreams();
  const code = await runCli({ argv: ['--help'], cwd: '/', stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 0);
  assert.match(s.out(), /Usage: hexo-tag-cloud/);
});

test('runCli: -h → prints USAGE, exit 0', async () => {
  const s = makeStreams();
  const code = await runCli({ argv: ['-h'], cwd: '/', stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 0);
  assert.match(s.out(), /Usage: hexo-tag-cloud/);
});

test('runCli: unknown subcommand → exit 1, USAGE on stderr', async () => {
  const s = makeStreams();
  const code = await runCli({ argv: ['frobnicate'], cwd: '/', stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 1);
  assert.match(s.err(), /unknown subcommand: frobnicate/);
  assert.match(s.err(), /Usage: hexo-tag-cloud/);
});

// ---------- argv routing -------------------------------------------------

test('runCli: first arg is a flag → routes to install', async () => {
  // `--apply` against an empty cwd → install path tries to detect theme → exit 1
  const cwd = mkSite('flag-route');
  const s = makeStreams();
  const code = await runCli({ argv: ['--apply'], cwd, stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 1, 'no _config.yml → theme detection failure → exit 1');
  assert.match(s.err(), /no _config\.yml found/);
});

// ---------- argument parsing errors --------------------------------------

test('install: bad flag → exit 1 with parse error', async () => {
  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--bogus'],
    cwd: '/',
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 1);
  assert.match(s.err(), /argument parse error/);
});

// ---------- theme detection (yaml parsing) -------------------------------

test('install: missing _config.yml → exit 1, "no _config.yml" message', async () => {
  const cwd = mkSite('no-config');
  const s = makeStreams();
  const code = await runCli({ argv: ['install'], cwd, stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 1);
  assert.match(s.err(), /no _config\.yml found/);
});

test('install: _config.yml with no theme: field → exit 1', async () => {
  const cwd = mkSite('no-theme');
  writeFile(path.join(cwd, '_config.yml'), 'title: My Site\nlanguage: en\n');
  const s = makeStreams();
  const code = await runCli({ argv: ['install'], cwd, stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 1);
  assert.match(s.err(), /no `theme:` field/);
});

test('install: --theme overrides config detection', async () => {
  const cwd = mkSite('theme-override');
  writeFile(path.join(cwd, '_config.yml'), 'theme: nonexistent-theme\n');
  // Use --theme generic to avoid actually needing partial files
  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--theme', 'generic'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  // generic + standalone + no existing file → dry-run insert path → exit 0
  assert.equal(code, 0);
  assert.match(s.out(), /\[dry-run\] would write/);
});

test('install: unknown theme name → exit 1', async () => {
  const cwd = mkSite('unknown-theme');
  writeFile(path.join(cwd, '_config.yml'), 'theme: my-fancy-theme\n');
  const s = makeStreams();
  const code = await runCli({ argv: ['install'], cwd, stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 1);
  assert.match(s.err(), /unknown theme 'my-fancy-theme'/);
});

// ---------- happy path: dry-run + apply ----------------------------------

test('install landscape: existing partial + dry-run → exit 0, no write', async () => {
  const cwd = mkSite('landscape-dry');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>existing widget</aside>\n');

  const s = makeStreams();
  const code = await runCli({ argv: ['install'], cwd, stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 0);
  assert.match(s.out(), /\[dry-run\] would write/);
  // file was NOT mutated
  const after = fs.readFileSync(partialPath, 'utf8');
  assert.equal(after, '<aside>existing widget</aside>\n');
});

test('install landscape: --apply writes the file', async () => {
  const cwd = mkSite('landscape-apply');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>existing widget</aside>\n');

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);
  assert.match(s.out(), /wrote tag-cloud managed block/);
  const after = fs.readFileSync(partialPath, 'utf8');
  assert.match(after, /<aside>existing widget<\/aside>/);
  assert.match(after, /<!-- hexo-tag-cloud:begin -->/);
  assert.match(after, /<canvas id="resCanvas"/);
});

// ---------- exit codes 2 / 3 / 4 ----------------------------------------

test('install: re-run after --apply is a no-op (idempotent), exit 0', async () => {
  const cwd = mkSite('idempotent');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>x</aside>\n');

  // first apply
  let s = makeStreams();
  let code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);

  // second apply: no-op
  s = makeStreams();
  code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);
  assert.match(s.out(), /already up-to-date/);
});

test('install: edited managed block → exit 2 with conflict diff', async () => {
  const cwd = mkSite('conflict');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');

  // apply first
  await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: { write: function () { return true; } },
    stderr: { write: function () { return true; } },
    fs: fs,
  });
  // pre-fill
  writeFile(partialPath, '<aside>x</aside>\n');
  await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: { write: function () { return true; } },
    stderr: { write: function () { return true; } },
  });

  // user edits
  let body = fs.readFileSync(partialPath, 'utf8');
  body = body.replace('width="500"', 'width="999"');
  fs.writeFileSync(partialPath, body, 'utf8');

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 2);
  assert.match(s.out(), /^---/m);
  assert.match(s.out(), /-.*width="999"/);
  assert.match(s.out(), /\+.*width="500"/);
  assert.match(s.err(), /run with --apply --force/);
});

test('install --apply --force: overwrites edited managed block, exit 0', async () => {
  const cwd = mkSite('force');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>x</aside>\n');

  // initial install
  await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: { write: function () { return true; } },
    stderr: { write: function () { return true; } },
  });
  // user edit
  let body = fs.readFileSync(partialPath, 'utf8');
  body = body.replace('width="500"', 'width="999"');
  fs.writeFileSync(partialPath, body, 'utf8');

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--apply', '--force'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);
  const after = fs.readFileSync(partialPath, 'utf8');
  assert.match(after, /width="500"/);
  assert.equal(after.indexOf('width="999"'), -1);
});

test('install: legacy install detected → exit 3', async () => {
  const cwd = mkSite('legacy');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath,
    '<canvas id="resCanvas" width="500" height="400"></canvas>\n' +
    '<script src="/js/tagcanvas.js"></script>\n' +
    '<script src="/js/tagcloud.js"></script>\n',
  );

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 3);
  assert.match(s.err(), /legacy hexo-tag-cloud install/);
});

test('install: missing partial file (append-mode theme) → exit 4', async () => {
  const cwd = mkSite('missing-partial');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  // do NOT create the partial

  const s = makeStreams();
  const code = await runCli({ argv: ['install'], cwd, stdout: s.stdout, stderr: s.stderr });
  assert.equal(code, 4);
  assert.match(s.err(), /expected partial at .*sidebar\.ejs, not found/);
});

test('install --theme generic: standalone mode writes new file', async () => {
  const cwd = mkSite('standalone');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--theme', 'generic', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);
  const partialPath = path.join(cwd, 'themes/generic/layout/_partial/tagcloud-partial.ejs');
  assert.ok(fs.existsSync(partialPath));
});

// ---------- --theme-dir override -----------------------------------------

test('install --theme-dir: writes to overridden dir', async () => {
  const cwd = mkSite('theme-dir');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const altThemeDir = path.join(cwd, 'custom-theme-location');
  writeFile(path.join(altThemeDir, 'layout/_partial/sidebar.ejs'), '<aside>alt</aside>\n');

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--theme-dir', altThemeDir, '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);
  const after = fs.readFileSync(
    path.join(altThemeDir, 'layout/_partial/sidebar.ejs'),
    'utf8',
  );
  assert.match(after, /<aside>alt<\/aside>/);
  assert.match(after, /<canvas id="resCanvas"/);
});

// ---------- canvas option overrides --------------------------------------

test('install: --canvas-width / --canvas-height / --canvas-style flow into block', async () => {
  const cwd = mkSite('canvas-opts');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  writeFile(path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs'), '');

  const s = makeStreams();
  const code = await runCli({
    argv: [
      'install', '--apply',
      '--canvas-width', '800',
      '--canvas-height', '600',
      '--canvas-style', 'background: #abc;',
    ],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
  });
  assert.equal(code, 0);
  const after = fs.readFileSync(
    path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs'),
    'utf8',
  );
  assert.match(after, /width="800"/);
  assert.match(after, /height="600"/);
  assert.match(after, /background: #abc;/);
});

// ---------- read failure (non-ENOENT) gives exit 4 ----------------------

test('install: read failure (not ENOENT) → exit 4', async () => {
  const cwd = mkSite('read-fail');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  // Inject an fs that throws an EACCES on the partial read
  const fakeFs = Object.create(fs);
  fakeFs.readFileSync = function (p, enc) {
    if (p === partialPath) {
      const err = new Error('permission denied');
      err.code = 'EACCES';
      throw err;
    }
    return fs.readFileSync(p, enc);
  };

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
    fs: fakeFs,
  });
  assert.equal(code, 4);
  assert.match(s.err(), /failed to read .*permission denied/);
});

test('install: write failure → exit 4', async () => {
  const cwd = mkSite('write-fail');
  writeFile(path.join(cwd, '_config.yml'), 'theme: landscape\n');
  const partialPath = path.join(cwd, 'themes/landscape/layout/_partial/sidebar.ejs');
  writeFile(partialPath, '<aside>x</aside>\n');

  const fakeFs = Object.create(fs);
  fakeFs.writeFileSync = function () {
    const err = new Error('disk full');
    err.code = 'ENOSPC';
    throw err;
  };
  fakeFs.mkdirSync = function () { /* noop */ };

  const s = makeStreams();
  const code = await runCli({
    argv: ['install', '--apply'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
    fs: fakeFs,
  });
  assert.equal(code, 4);
  assert.match(s.err(), /failed to write .*disk full/);
});

// ---------- _config.yml read failure (non-ENOENT) ------------------------

test('install: _config.yml read failure (non-ENOENT) → exit 1', async () => {
  const cwd = mkSite('config-read-fail');
  const fakeFs = Object.create(fs);
  fakeFs.readFileSync = function () {
    const err = new Error('permission denied');
    err.code = 'EACCES';
    throw err;
  };
  const s = makeStreams();
  const code = await runCli({
    argv: ['install'],
    cwd,
    stdout: s.stdout,
    stderr: s.stderr,
    fs: fakeFs,
  });
  assert.equal(code, 1);
  assert.match(s.err(), /failed to read .*_config\.yml.*permission denied/);
});

// ---------- parseThemeFromYaml / parseThemeFromYamlRegex ----------------

test('parseThemeFromYaml: simple "theme: landscape"', () => {
  assert.deepEqual(cli.parseThemeFromYaml('theme: landscape\n'), { theme: 'landscape' });
});

test('parseThemeFromYaml: quoted "theme: \\"next\\""', () => {
  assert.deepEqual(cli.parseThemeFromYaml('theme: "next"\n'), { theme: 'next' });
});

test('parseThemeFromYaml: with trailing inline comment', () => {
  assert.deepEqual(
    cli.parseThemeFromYaml('theme: landscape  # the default\n'),
    { theme: 'landscape' },
  );
});

test('parseThemeFromYaml: missing theme field', () => {
  const r = cli.parseThemeFromYaml('title: My Site\n');
  assert.match(r.error, /no `theme:` field/);
});

test('parseThemeFromYaml: nested mapping under theme: → error', () => {
  const r = cli.parseThemeFromYaml('theme:\n  name: butterfly\n  type: dark\n');
  assert.match(r.error, /complex theme config/);
});

test('parseThemeFromYaml: invalid YAML → error', () => {
  const r = cli.parseThemeFromYaml('theme: [unterminated\n');
  // js-yaml will throw; our parser catches it
  assert.ok(r.error,
    'invalid YAML must produce an error (either parse error or no theme field)');
});

test('parseThemeFromYaml: opts.loader=null forces regex fallback path', () => {
  // Exercises the `if (yaml)` false branch + the trailing
  // `return parseThemeFromYamlRegex(raw)` line. Without this injection the
  // branch is environment-dependent and unreachable in CI where js-yaml
  // exists transitively via hexo.
  const r = cli.parseThemeFromYaml('theme: landscape\n', { loader: null });
  assert.deepEqual(r, { theme: 'landscape' });
});

test('parseThemeFromYaml: opts.loader=null with nested mapping → error from regex fallback', () => {
  const r = cli.parseThemeFromYaml('theme:\n  name: x\n', { loader: null });
  assert.match(r.error, /complex theme config/);
});

test('parseThemeFromYamlRegex: same simple cases as the YAML path', () => {
  assert.deepEqual(cli.parseThemeFromYamlRegex('theme: landscape\n'), { theme: 'landscape' });
  assert.deepEqual(cli.parseThemeFromYamlRegex("theme: 'icarus'\n"), { theme: 'icarus' });
  assert.deepEqual(
    cli.parseThemeFromYamlRegex('theme: fluid # comment\n'),
    { theme: 'fluid' },
  );
});

test('parseThemeFromYamlRegex: nested mapping → error', () => {
  const r = cli.parseThemeFromYamlRegex('theme:\n  name: butterfly\n');
  assert.match(r.error, /complex theme config/);
});

test('parseThemeFromYamlRegex: missing theme: → error', () => {
  const r = cli.parseThemeFromYamlRegex('title: foo\n');
  assert.match(r.error, /no `theme:` field/);
});

test('parseThemeFromYamlRegex: opens with " but does not close → leave the quote intact (edge case)', () => {
  const r = cli.parseThemeFromYamlRegex('theme: "unclosed\n');
  assert.deepEqual(r, { theme: '"unclosed' });
});

test('parseThemeFromYamlRegex: opens with \' but does not close → leave the quote intact', () => {
  const r = cli.parseThemeFromYamlRegex("theme: 'unclosed\n");
  assert.deepEqual(r, { theme: "'unclosed" });
});

test('parseThemeFromYamlRegex: ends with " but does not open → leave intact', () => {
  const r = cli.parseThemeFromYamlRegex('theme: trailing"\n');
  assert.deepEqual(r, { theme: 'trailing"' });
});

test('parseThemeFromYamlRegex: lone " (length 1) → not stripped (length>=2 guard)', () => {
  const r = cli.parseThemeFromYamlRegex('theme: "\n');
  assert.deepEqual(r, { theme: '"' });
});

// ---------- USAGE export -------------------------------------------------

test('USAGE export: contains all known themes + all 5 exit codes', () => {
  const u = cli.USAGE;
  for (const t of ['landscape', 'next', 'butterfly', 'icarus', 'fluid', 'generic']) {
    assert.ok(u.indexOf(t) !== -1, 'USAGE missing theme: ' + t);
  }
  for (const code of ['0  success', '1  theme', '2  modified', '3  legacy', '4  write']) {
    assert.ok(u.indexOf(code) !== -1, 'USAGE missing exit-code line: ' + code);
  }
});
