'use strict';

/**
 * Pure-ish CLI driver for `bin/hexo-tag-cloud-install.js`. Takes
 * `{argv, cwd, stdout, stderr, fs?}` and returns a Promise<exitCode>.
 * Side effects (filesystem writes, console output) flow only through
 * the injected `fs` and stdout/stderr streams, which makes this module
 * fully unit-testable in-process WITHOUT mutating real `process.argv`,
 * `process.exit`, or the real CWD.
 *
 * Subcommands:
 *   install        (default if first arg is a flag) — see runInstall()
 *   install-skill  added by T5
 *   --help / -h    prints USAGE and exits 0
 *
 * Exit codes (stable contract per spec AC #1):
 *   0 success / dry-run
 *   1 theme detection failure / unknown theme / unknown subcommand
 *   2 modified-managed-block conflict (--force overrides)
 *   3 legacy install detected (manual snippet without markers)
 *   4 write conflict (file missing in append mode, or write failed)
 */

const realFs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const {
  resolveTheme,
  interpolatePartialPath,
  KNOWN_THEMES,
} = require('./theme-heuristics');
const { emitManagedBlock } = require('./partial-emitter');
const { computeApplyAction } = require('./apply-edit');

const USAGE = [
  'Usage: hexo-tag-cloud <subcommand> [flags]',
  '',
  'Subcommands:',
  '  install         (default) install the tag-cloud block into the active hexo theme',
  '  install-skill   copy the Claude skill into ~/.claude/skills/hexo-tag-cloud/',
  '  --help, -h      print this message',
  '',
  'install flags:',
  '  --theme <name>           override theme detection (one of: ' +
    KNOWN_THEMES.join(', ') + ')',
  '  --theme-dir <path>       override theme dir (default: <cwd>/themes/<theme>)',
  '  --apply                  write changes (default: dry-run, prints diff)',
  '  --force                  overwrite a user-edited managed block (use with --apply)',
  '  --canvas-width <px>      canvas width  (default 500)',
  '  --canvas-height <px>     canvas height (default 400)',
  "  --canvas-style <css>     canvas style  (default: 'margin: 0 auto;')",
  '',
  'Exit codes:',
  '  0  success / dry-run with no actionable diff',
  '  1  theme detection failure / unknown theme / unknown subcommand',
  '  2  modified-managed-block conflict (re-run with --force to overwrite)',
  '  3  legacy install detected (remove the manual snippet first)',
  '  4  write conflict (target file or skill target unavailable)',
  '',
].join('\n');

/**
 * @param {object} opts
 * @param {string[]} opts.argv  argv slice (NO node executable, NO bin path)
 * @param {string} opts.cwd
 * @param {NodeJS.WritableStream} opts.stdout
 * @param {NodeJS.WritableStream} opts.stderr
 * @param {typeof import('node:fs')} [opts.fs]  injectable for tests
 * @returns {Promise<number>}
 */
async function runCli(opts) {
  const argv = opts.argv;
  const cwd = opts.cwd;
  const stdout = opts.stdout;
  const stderr = opts.stderr;
  const fsImpl = opts.fs || realFs;

  if (argv.length === 0) {
    stdout.write(USAGE);
    return 0;
  }
  const first = argv[0];
  if (first === '--help' || first === '-h') {
    stdout.write(USAGE);
    return 0;
  }

  // Subcommand routing: if first arg is a flag (`--foo`), treat as `install`.
  const isFlag = first.startsWith('-');
  const sub = isFlag ? 'install' : first;
  const subArgs = isFlag ? argv : argv.slice(1);

  if (sub === 'install') {
    return runInstall(subArgs, { cwd, stdout, stderr, fs: fsImpl });
  }
  // install-skill is wired by T5; for T4, return 1 with a hint.
  stderr.write('unknown subcommand: ' + sub + '\n');
  stderr.write(USAGE);
  return 1;
}

async function runInstall(argv, ctx) {
  const cwd = ctx.cwd;
  const stderr = ctx.stderr;
  const fsImpl = ctx.fs;

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        theme: { type: 'string' },
        'theme-dir': { type: 'string' },
        apply: { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        'canvas-width': { type: 'string' },
        'canvas-height': { type: 'string' },
        'canvas-style': { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (e) {
    stderr.write('argument parse error: ' + e.message + '\n');
    return 1;
  }
  const flags = parsed.values;

  // 1. Theme
  let themeName = flags.theme;
  if (!themeName) {
    const detected = detectThemeFromConfig(cwd, fsImpl);
    if (detected.error) {
      stderr.write(detected.error + '\n');
      return 1;
    }
    themeName = detected.theme;
  }

  const recipe = resolveTheme(themeName);
  if (!recipe) {
    stderr.write(
      "unknown theme '" + themeName + "'; known: " + KNOWN_THEMES.join(', ') + '.\n' +
      'Pass --theme generic to use the standalone fallback.\n',
    );
    return 1;
  }

  // 2. Theme dir
  const themeDir = flags['theme-dir'] || path.join(cwd, 'themes', themeName);

  // 3. Target file path. Recipes always store partialPath with a
  // "themes/<theme>/" prefix (enforced by theme-heuristics tests); we
  // strip the prefix here so --theme-dir can override the root.
  const partialRel = interpolatePartialPath(recipe, themeName);
  const themePrefix = 'themes/' + themeName + '/';
  const inThemePath = partialRel.slice(themePrefix.length);
  const targetPath = path.join(themeDir, inThemePath);

  // 4. New block
  const newBlock = emitManagedBlock(recipe, {
    canvasWidth: flags['canvas-width'],
    canvasHeight: flags['canvas-height'],
    canvasStyle: flags['canvas-style'],
  });

  // 5. Read existing content (handle missing file)
  let existingContent = '';
  let fileExisted = false;
  try {
    existingContent = fsImpl.readFileSync(targetPath, 'utf8');
    fileExisted = true;
  } catch (e) {
    if (e.code !== 'ENOENT') {
      stderr.write('failed to read ' + targetPath + ': ' + e.message + '\n');
      return 4;
    }
  }

  if (!fileExisted && recipe.insertionMode !== 'standalone') {
    stderr.write(
      'expected partial at ' + targetPath + ', not found.\n' +
      'Pass --theme-dir <path> to point at your active theme directory, ' +
      'or --theme generic for a standalone install.\n',
    );
    return 4;
  }

  // 6. Decide
  const action = !fileExisted
    ? { kind: 'insert', newContent: newBlock }
    : computeApplyAction({
      existingContent,
      newBlock,
      recipe,
      force: flags.force,
    });

  return commitOrDiff(action, targetPath, flags.apply, ctx);
}

function commitOrDiff(action, targetPath, apply, ctx) {
  const stdout = ctx.stdout;
  const stderr = ctx.stderr;
  const fsImpl = ctx.fs;

  if (action.kind === 'noop') {
    stdout.write(action.message + '\n');
    return 0;
  }
  if (action.kind === 'conflict') {
    stdout.write(action.diff + '\n');
    stderr.write('\nrun with --apply --force to overwrite the user-edited block.\n');
    return action.exitCode;
  }
  if (action.kind === 'legacy') {
    stderr.write(action.message + '\n');
    return action.exitCode;
  }
  // insert | force-replace
  if (!apply) {
    stdout.write(
      '[dry-run] would write ' + action.newContent.length +
      ' bytes to ' + targetPath + '\n',
    );
    stdout.write('(re-run with --apply to write)\n');
    return 0;
  }
  try {
    fsImpl.mkdirSync(path.dirname(targetPath), { recursive: true });
    fsImpl.writeFileSync(targetPath, action.newContent, 'utf8');
  } catch (e) {
    stderr.write('failed to write ' + targetPath + ': ' + e.message + '\n');
    return 4;
  }
  stdout.write('\u2713 wrote tag-cloud managed block to ' + targetPath + '\n');
  return 0;
}

function detectThemeFromConfig(cwd, fsImpl) {
  const configPath = path.join(cwd, '_config.yml');
  let raw;
  try {
    raw = fsImpl.readFileSync(configPath, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      return {
        error: 'no _config.yml found at ' + configPath +
          '; pass --theme <name> or run from a hexo site root.',
      };
    }
    return { error: 'failed to read ' + configPath + ': ' + e.message };
  }
  return parseThemeFromYaml(raw);
}

function parseThemeFromYaml(raw, opts) {
  // Prefer js-yaml (already a transitive dep via hexo) for full coverage of
  // quoted scalars + comments + anchors. Fall back to a narrow regex if the
  // dep ever disappears upstream. Both paths reject nested-mapping `theme:`.
  // `opts.loader` is injectable for tests; pass null to force regex fallback.
  const yaml = opts && 'loader' in opts ? opts.loader : tryLoadYaml();

  if (yaml) {
    try {
      const parsed = yaml.load(raw);
      if (parsed && typeof parsed === 'object') {
        const t = parsed.theme;
        if (typeof t === 'string' && t.length > 0) return { theme: t };
        if (t && typeof t === 'object') {
          return {
            error: 'complex theme config (nested mapping under `theme:`); ' +
              'pass --theme <name>.',
          };
        }
      }
      return { error: 'no `theme:` field in _config.yml; pass --theme <name>.' };
    } catch (e) {
      return { error: 'failed to parse _config.yml as YAML: ' + e.message };
    }
  }
  return parseThemeFromYamlRegex(raw);
}

function tryLoadYaml() {
  try {
    return require('js-yaml');
  /* c8 ignore start */
  } catch (_e) {
    return null;
  }
  /* c8 ignore stop */
}

function parseThemeFromYamlRegex(raw) {
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^theme:\s*(.*)$/);
    if (!m) continue;
    let value = m[1];
    const hashIdx = value.indexOf('#');
    if (hashIdx !== -1) value = value.slice(0, hashIdx);
    value = value.trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    if (value.length === 0) {
      // theme: followed by indented children → nested mapping
      return {
        error: 'complex theme config (nested mapping under `theme:`); ' +
          'pass --theme <name>.',
      };
    }
    return { theme: value };
  }
  return { error: 'no `theme:` field in _config.yml; pass --theme <name>.' };
}

module.exports = {
  runCli,
  runInstall,
  parseThemeFromYaml,
  parseThemeFromYamlRegex,
  detectThemeFromConfig,
  USAGE,
};
