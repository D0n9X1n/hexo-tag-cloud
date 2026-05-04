'use strict';

// Verify the npm tarball ships exactly the files we intend to publish.
//
// Used by `.github/workflows/release.yml` and runnable locally via
// `npm run verify-pack`. Spawns `npm pack --dry-run --json --ignore-scripts`
// itself; --ignore-scripts is mandatory (defense in depth against any
// future `prepack` lifecycle hook that might call this script back).
//
// Hard requirements:
//   * Every entry of REQUIRED_PATHS is present.
//   * Every shipped path matches ALLOWED_EXACT or starts with one of
//     ALLOWED_PREFIXES.
//   * Anything else is forbidden (tests/, docs/, demo/, wiki/, coverage/,
//     .eslintrc.js, .gitignore, etc.).
//
// Exits 0 on pass with a one-line summary; exits non-zero with explicit
// MISSING/FORBIDDEN sections on stderr otherwise.

const { spawnSync } = require('child_process');
const path = require('path');

const ALLOWED_EXACT = Object.freeze([
  'index.js',
  'package.json',
  'LICENSE',
  'README.md',
  'README.ZH.md',
]);

const ALLOWED_PREFIXES = Object.freeze(['lib/', 'bin/', 'skills/']);

const REQUIRED_PATHS = Object.freeze([
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
]);

function parseNpmPackOutput(json) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    throw new Error('verify-pack: npm pack output is not valid JSON: ' + err.message);
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0] ||
      !Array.isArray(parsed[0].files)) {
    throw new Error('verify-pack: unexpected npm pack shape; first 200 chars: ' +
      json.slice(0, 200));
  }
  return parsed[0].files.map(function (f) { return f.path; }).sort();
}

function classifyPaths(paths, opts) {
  var allowedExact = new Set(opts.allowedExact);
  var allowedPrefixes = opts.allowedPrefixes;
  var required = opts.requiredPaths;
  var present = new Set(paths);

  var missing = required.filter(function (p) { return !present.has(p); });

  var forbidden = paths.filter(function (p) {
    if (allowedExact.has(p)) return false;
    for (var i = 0; i < allowedPrefixes.length; i += 1) {
      if (p.indexOf(allowedPrefixes[i]) === 0) return false;
    }
    return true;
  });

  return { missing: missing, forbidden: forbidden };
}

function runNpmPack(opts) {
  var cwd = opts && opts.cwd ? opts.cwd : process.cwd();
  var npmCmd = opts && opts.npmCmd ? opts.npmCmd : 'npm';
  var result = spawnSync(npmCmd, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: cwd,
    encoding: 'utf8',
  });
  if (result.error) {
    throw new Error('verify-pack: failed to spawn ' + npmCmd + ': ' + result.error.message);
  }
  if (result.status !== 0) {
    throw new Error('verify-pack: ' + npmCmd +
      ' pack --dry-run exited ' + result.status +
      '; stderr: ' + (result.stderr || '').trim());
  }
  return parseNpmPackOutput(result.stdout);
}

function runCli(argv, opts) {
  var stdout = opts && opts.stdout ? opts.stdout : process.stdout;
  var stderr = opts && opts.stderr ? opts.stderr : process.stderr;
  var exit = opts && opts.exit ? opts.exit : process.exit;
  /* c8 ignore next */
  var runner = opts && opts.runner ? opts.runner : runNpmPack;
  var cwd = opts && opts.cwd ? opts.cwd : process.cwd();

  var paths;
  try {
    paths = runner({ cwd: cwd });
  } catch (err) {
    stderr.write(err.message + '\n');
    return exit(2);
  }

  var report = classifyPaths(paths, {
    allowedExact: ALLOWED_EXACT,
    allowedPrefixes: ALLOWED_PREFIXES,
    requiredPaths: REQUIRED_PATHS,
  });

  if (report.missing.length === 0 && report.forbidden.length === 0) {
    stdout.write('verify-pack OK: ' + paths.length + ' files in tarball.\n');
    return exit(0);
  }

  if (report.missing.length > 0) {
    stderr.write('MISSING (required but absent from tarball):\n');
    report.missing.forEach(function (p) { stderr.write('  - ' + p + '\n'); });
  }
  if (report.forbidden.length > 0) {
    stderr.write('FORBIDDEN (present in tarball but outside allow-list):\n');
    report.forbidden.forEach(function (p) { stderr.write('  - ' + p + '\n'); });
  }
  return exit(1);
}

module.exports = {
  ALLOWED_EXACT: ALLOWED_EXACT,
  ALLOWED_PREFIXES: ALLOWED_PREFIXES,
  REQUIRED_PATHS: REQUIRED_PATHS,
  parseNpmPackOutput: parseNpmPackOutput,
  classifyPaths: classifyPaths,
  runNpmPack: runNpmPack,
  runCli: runCli,
};

/* c8 ignore start */
if (require.main === module) {
  runCli(process.argv.slice(2), { cwd: path.resolve(__dirname, '..') });
}
/* c8 ignore stop */
