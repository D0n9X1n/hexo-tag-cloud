'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const verifyPack = require('../../../build/verify-pack');
const {
  ALLOWED_EXACT,
  ALLOWED_PREFIXES,
  REQUIRED_PATHS,
  parseNpmPackOutput,
  classifyPaths,
  runNpmPack,
  runCli,
} = verifyPack;

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

function makeExitCapture() {
  const codes = [];
  return {
    exit: (n) => { codes.push(n); return n; },
    codes: () => codes,
    last: () => codes[codes.length - 1],
  };
}

function packJson(paths) {
  return JSON.stringify([
    { files: paths.map((p) => ({ path: p })) },
  ]);
}

// ---------- AC #5 universe lock-in --------------------------------------

test('verify-pack: ALLOWED_EXACT exactly equals the spec set (5 files)', () => {
  assert.deepEqual([...ALLOWED_EXACT], [
    'index.js',
    'package.json',
    'LICENSE',
    'README.md',
    'README.ZH.md',
  ]);
});

test('verify-pack: ALLOWED_PREFIXES exactly equals the spec set (3 prefixes)', () => {
  assert.deepEqual([...ALLOWED_PREFIXES], ['lib/', 'bin/', 'skills/']);
});

test('verify-pack: REQUIRED_PATHS contains every spec-mandated file', () => {
  const expected = [
    'index.js',
    'package.json',
    'LICENSE',
    'README.md',
    'README.ZH.md',
    'lib/options.js',
    'lib/render.js',
    'lib/tagcanvas.js',
    'lib/installer/cli.js',
    'lib/installer/apply-edit.js',
    'lib/installer/partial-emitter.js',
    'lib/installer/theme-heuristics.js',
    'lib/installer/install-skill.js',
    'bin/hexo-tag-cloud-install.js',
    'skills/hexo-tag-cloud/SKILL.md',
  ];
  // exact equals: same length and same membership in any order
  assert.equal(REQUIRED_PATHS.length, expected.length);
  for (const p of expected) {
    assert.ok(REQUIRED_PATHS.includes(p), 'REQUIRED_PATHS missing ' + p);
  }
});

test('verify-pack: REQUIRED_PATHS includes the Claude SKILL.md (regression guard)', () => {
  assert.ok(REQUIRED_PATHS.includes('skills/hexo-tag-cloud/SKILL.md'));
});

test('verify-pack: ALLOWED_* tuples are immutable (Object.freeze)', () => {
  assert.ok(Object.isFrozen(ALLOWED_EXACT));
  assert.ok(Object.isFrozen(ALLOWED_PREFIXES));
  assert.ok(Object.isFrozen(REQUIRED_PATHS));
});

// ---------- parseNpmPackOutput -----------------------------------------

test('parseNpmPackOutput: returns sorted paths from a one-entry tarball spec', () => {
  const json = packJson(['lib/render.js', 'index.js', 'package.json']);
  assert.deepEqual(parseNpmPackOutput(json), [
    'index.js', 'lib/render.js', 'package.json',
  ]);
});

test('parseNpmPackOutput: empty files array yields empty list', () => {
  const json = JSON.stringify([{ files: [] }]);
  assert.deepEqual(parseNpmPackOutput(json), []);
});

test('parseNpmPackOutput: malformed JSON throws with helpful message', () => {
  assert.throws(() => parseNpmPackOutput('not json{'), /not valid JSON/);
});

test('parseNpmPackOutput: empty array throws "unexpected npm pack shape"', () => {
  assert.throws(() => parseNpmPackOutput('[]'), /unexpected npm pack shape/);
});

test('parseNpmPackOutput: missing files key throws "unexpected npm pack shape"', () => {
  assert.throws(() => parseNpmPackOutput('[{"name":"x"}]'), /unexpected npm pack shape/);
});

test('parseNpmPackOutput: non-array root throws "unexpected npm pack shape"', () => {
  assert.throws(() => parseNpmPackOutput('{"files":[]}'), /unexpected npm pack shape/);
});

// ---------- classifyPaths ----------------------------------------------

const opts = {
  allowedExact: ALLOWED_EXACT,
  allowedPrefixes: ALLOWED_PREFIXES,
  requiredPaths: REQUIRED_PATHS,
};

test('classifyPaths: all-good case returns no missing and no forbidden', () => {
  const report = classifyPaths([...REQUIRED_PATHS], opts);
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.forbidden, []);
});

test('classifyPaths: dropped REQUIRED file shows up as missing', () => {
  const subset = REQUIRED_PATHS.filter((p) => p !== 'skills/hexo-tag-cloud/SKILL.md');
  const report = classifyPaths(subset, opts);
  assert.deepEqual(report.missing, ['skills/hexo-tag-cloud/SKILL.md']);
  assert.deepEqual(report.forbidden, []);
});

test('classifyPaths: forbidden top-level file is flagged', () => {
  const paths = [...REQUIRED_PATHS, '.eslintrc.js'];
  const report = classifyPaths(paths, opts);
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.forbidden, ['.eslintrc.js']);
});

test('classifyPaths: forbidden subdirectory file is flagged', () => {
  const paths = [...REQUIRED_PATHS, 'tests/server/foo.test.js', 'docs/spec.md'];
  const report = classifyPaths(paths, opts);
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.forbidden.sort(), ['docs/spec.md', 'tests/server/foo.test.js']);
});

test('classifyPaths: simultaneously missing + forbidden are reported', () => {
  const subset = REQUIRED_PATHS.filter((p) => p !== 'lib/render.js');
  const report = classifyPaths([...subset, 'coverage/lcov.info'], opts);
  assert.deepEqual(report.missing, ['lib/render.js']);
  assert.deepEqual(report.forbidden, ['coverage/lcov.info']);
});

test('classifyPaths: empty input flags every required file as missing', () => {
  const report = classifyPaths([], opts);
  assert.equal(report.missing.length, REQUIRED_PATHS.length);
  assert.deepEqual(report.forbidden, []);
});

// ---------- runNpmPack (via injected exec; we still hit the function) --

test('runNpmPack: spawnSync failure is wrapped in a verify-pack error', () => {
  // Use a guaranteed-missing command to trigger spawn failure.
  assert.throws(
    () => runNpmPack({ cwd: process.cwd(), npmCmd: '/no/such/npm-binary-xyz' }),
    /failed to spawn|exited|not valid JSON/,
  );
});

test('runNpmPack: non-zero exit is wrapped in a verify-pack error with stderr', () => {
  // `node -e "process.stderr.write('boom'); process.exit(7)"` simulates a
  // failing npm invocation. node is guaranteed to be on PATH inside our
  // own test runner.
  assert.throws(
    () => runNpmPack({
      cwd: process.cwd(),
      npmCmd: process.execPath,
      // Override args via a custom runner... but runNpmPack hard-codes args.
      // Instead, pretend `node` is npm and let it run with the pack args.
      // node will exit non-zero with "Cannot find module 'pack'" on stderr.
    }),
    /exited|verify-pack:/,
  );
});

test('runNpmPack: non-zero exit branch with empty stderr still produces message', () => {
  // node -e "process.exit(3)" exits non-zero with NO stderr written; covers
  // the (result.stderr || '').trim() falsy short-circuit branch.
  // We pretend node is npm; runNpmPack hard-codes pack args which node
  // ignores, then exits with code 3 (no stderr). The function must throw
  // a verify-pack:* error mentioning the exit code.
  // We stub via a custom shell script written to a tmpfile so we control
  // BOTH exit code AND stderr.
  const fs = require('node:fs');
  const path = require('node:path');
  const os = require('node:os');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-pack-stub-'));
  const stub = path.join(tmp, 'fake-npm');
  fs.writeFileSync(stub, '#!/bin/sh\nexit 7\n', { mode: 0o755 });
  try {
    assert.throws(
      () => runNpmPack({ cwd: process.cwd(), npmCmd: stub }),
      /exited 7/,
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('runCli: respects explicit cwd opt', () => {
  // Covers the truthy branch of `opts && opts.cwd ? opts.cwd : ...`.
  const streams = makeStreams();
  const exit = makeExitCapture();
  let receivedCwd = null;
  const fakeRunner = (runnerOpts) => {
    receivedCwd = runnerOpts.cwd;
    return [...REQUIRED_PATHS];
  };

  runCli([], {
    stdout: streams.stdout,
    stderr: streams.stderr,
    exit: exit.exit,
    runner: fakeRunner,
    cwd: '/tmp/explicit-cwd-probe',
  });

  assert.equal(exit.last(), 0);
  assert.equal(receivedCwd, '/tmp/explicit-cwd-probe');
});

test('runNpmPack: defaults npmCmd and cwd when opts omitted', () => {
  // Just exercise the default-args branches; success/failure of npm itself
  // is not what we are asserting (it may or may not be on PATH in CI).
  // We assert the function returns either a sorted array or throws a
  // verify-pack:-prefixed error.
  let ok = false;
  try {
    const paths = runNpmPack();
    ok = Array.isArray(paths);
  } catch (err) {
    ok = /^verify-pack:/.test(err.message);
  }
  assert.ok(ok, 'runNpmPack with no opts must return array or throw verify-pack:* error');
});

// ---------- runCli ------------------------------------------------------

test('runCli: success path prints "verify-pack OK" with file count and exits 0', () => {
  const streams = makeStreams();
  const exit = makeExitCapture();
  const fakeRunner = () => [...REQUIRED_PATHS];

  runCli([], {
    stdout: streams.stdout,
    stderr: streams.stderr,
    exit: exit.exit,
    runner: fakeRunner,
  });

  assert.equal(exit.last(), 0);
  assert.ok(/verify-pack OK: \d+ files in tarball\./.test(streams.out()));
  assert.equal(streams.err(), '');
});

test('runCli: missing required file prints MISSING block and exits 1', () => {
  const streams = makeStreams();
  const exit = makeExitCapture();
  const fakeRunner = () => REQUIRED_PATHS.filter((p) => p !== 'lib/render.js');

  runCli([], {
    stdout: streams.stdout,
    stderr: streams.stderr,
    exit: exit.exit,
    runner: fakeRunner,
  });

  assert.equal(exit.last(), 1);
  assert.ok(/MISSING/.test(streams.err()));
  assert.ok(/lib\/render\.js/.test(streams.err()));
  assert.equal(streams.out(), '');
});

test('runCli: forbidden file prints FORBIDDEN block and exits 1', () => {
  const streams = makeStreams();
  const exit = makeExitCapture();
  const fakeRunner = () => [...REQUIRED_PATHS, '.gitignore'];

  runCli([], {
    stdout: streams.stdout,
    stderr: streams.stderr,
    exit: exit.exit,
    runner: fakeRunner,
  });

  assert.equal(exit.last(), 1);
  assert.ok(/FORBIDDEN/.test(streams.err()));
  assert.ok(/\.gitignore/.test(streams.err()));
  assert.equal(streams.out(), '');
});

test('runCli: simultaneously missing + forbidden prints both sections', () => {
  const streams = makeStreams();
  const exit = makeExitCapture();
  const subset = REQUIRED_PATHS.filter((p) => p !== 'lib/options.js');
  const fakeRunner = () => [...subset, 'docs/spec.md'];

  runCli([], {
    stdout: streams.stdout,
    stderr: streams.stderr,
    exit: exit.exit,
    runner: fakeRunner,
  });

  assert.equal(exit.last(), 1);
  assert.ok(/MISSING/.test(streams.err()));
  assert.ok(/lib\/options\.js/.test(streams.err()));
  assert.ok(/FORBIDDEN/.test(streams.err()));
  assert.ok(/docs\/spec\.md/.test(streams.err()));
});

test('runCli: runner throwing prints message to stderr and exits 2', () => {
  const streams = makeStreams();
  const exit = makeExitCapture();
  const fakeRunner = () => { throw new Error('verify-pack: simulated failure'); };

  runCli([], {
    stdout: streams.stdout,
    stderr: streams.stderr,
    exit: exit.exit,
    runner: fakeRunner,
  });

  assert.equal(exit.last(), 2);
  assert.ok(/verify-pack: simulated failure/.test(streams.err()));
});

test('runCli: defaults stdout/stderr/exit/runner when opts omitted', () => {
  // Spy on process methods to avoid actually exiting / writing.
  const originalExit = process.exit;
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;
  const codes = [];
  let outBuf = '';
  let errBuf = '';
  // eslint-disable-next-line no-unused-vars
  process.exit = (n) => { codes.push(n); return n; };
  process.stdout.write = (s) => { outBuf += String(s); return true; };
  process.stderr.write = (s) => { errBuf += String(s); return true; };
  try {
    // Use a runner that throws so we exercise the default exit/stderr path
    // without actually invoking npm. Pass only `runner`; everything else
    // defaults.
    runCli([], { runner: () => { throw new Error('verify-pack: probe'); } });
    assert.equal(codes[codes.length - 1], 2);
    assert.ok(/verify-pack: probe/.test(errBuf));
    assert.equal(outBuf, '');
  } finally {
    process.exit = originalExit;
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
});
