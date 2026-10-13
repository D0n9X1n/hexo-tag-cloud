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
 *   inspect        JSON report an agent (or a human) uses to pick a target
 *   install-skill  copy the bundled agent skill — see install-skill.js
 *   --help / -h    prints USAGE and exits 0
 *
 * Exit codes (stable contract):
 *   0 success / dry-run
 *   1 theme detection failure / unsupported theme or engine / bad arguments
 *   2 modified-managed-block conflict (--force overrides)
 *   3 legacy install detected (manual snippet without markers)
 *   4 target file missing or unreadable/unwritable
 */

const realFs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');
const yaml = require('js-yaml');

const {
  resolveTheme,
  customRecipe,
  engineForFile,
  KNOWN_THEMES,
} = require('./theme-heuristics');
const { emitManagedBlock } = require('./partial-emitter');
const { computeApplyAction } = require('./apply-edit');

const USAGE = [
  'Usage: hexo-tag-cloud <subcommand> [flags]',
  '',
  'Subcommands:',
  '  install         (default) insert the tag-cloud block into a theme template',
  '  inspect         print JSON: active theme, its directory, and candidate templates',
  '  install-skill   copy the agent skill into ~/.claude/skills/hexo-tag-cloud/',
  '  --help, -h      print this message',
  '',
  'install flags:',
  '  --theme <name>           override detection from _config.yml',
  '                           (built-in recipes: ' + KNOWN_THEMES.join(', ') + ')',
  '  --theme-dir <path>       theme directory (default: themes/<name>, then',
  '                           node_modules/hexo-theme-<name>)',
  '  --target <file>          any .ejs/.njk/.swig/.pug template, relative to the',
  '                           theme dir — works for every theme',
  "  --before <text>          insert before the last line containing <text>",
  '                           (default: append; e.g. --before "</aside>")',
  '  --apply                  write changes (default: dry-run, prints diff)',
  '  --force                  overwrite a user-edited managed block (use with --apply)',
  '  --canvas-width <px>      canvas width  (default 250)',
  '  --canvas-height <px>     canvas height (default 250)',
  "  --canvas-style <css>     canvas style  (default: 'width: 100%;')",
  '',
  'No template edits at all (any theme, including JSX themes such as Icarus):',
  '  set `tag_cloud: { inject: true }` in _config.yml.',
  '',
  'Exit codes:',
  '  0  success / dry-run',
  '  1  theme detection failure / unsupported theme or engine / bad arguments',
  '  2  modified-managed-block conflict (re-run with --force to overwrite)',
  '  3  legacy install detected (remove the manual snippet first)',
  '  4  target file missing or unreadable/unwritable',
  '',
].join('\n');

const INJECT_HINT =
  'For a no-edit install that works with every theme, add to _config.yml:\n' +
  '  tag_cloud:\n' +
  '    inject: true\n';

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
  const ctx = {
    cwd: opts.cwd,
    stdout: opts.stdout,
    stderr: opts.stderr,
    fs: opts.fs || realFs,
  };

  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    ctx.stdout.write(USAGE);
    return 0;
  }

  // Subcommand routing: if first arg is a flag (`--foo`), treat as `install`.
  const isFlag = argv[0].startsWith('-');
  const sub = isFlag ? 'install' : argv[0];
  const subArgs = isFlag ? argv : argv.slice(1);

  if (sub === 'install') return runInstall(subArgs, ctx);
  if (sub === 'inspect') return runInspect(subArgs, ctx);
  if (sub === 'install-skill') {
    const { runInstallSkill } = require('./install-skill');
    return runInstallSkill(subArgs, ctx);
  }
  ctx.stderr.write('unknown subcommand: ' + sub + '\n');
  ctx.stderr.write(USAGE);
  return 1;
}

async function runInstall(argv, ctx) {
  const { cwd, stderr } = ctx;
  const fsImpl = ctx.fs;

  let flags;
  try {
    flags = parseArgs({
      args: argv,
      options: {
        theme: { type: 'string' },
        'theme-dir': { type: 'string' },
        target: { type: 'string' },
        before: { type: 'string' },
        apply: { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
        'canvas-width': { type: 'string' },
        'canvas-height': { type: 'string' },
        'canvas-style': { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    }).values;
  } catch (e) {
    stderr.write('argument parse error: ' + e.message + '\n');
    return 1;
  }

  const site = readSiteConfig(cwd, fsImpl);
  const theme = locateTheme(cwd, flags, site, fsImpl);
  if (theme.error) {
    stderr.write(theme.error + '\n');
    return 1;
  }

  // 1. Recipe: explicit --target wins; otherwise the theme's built-in recipe.
  let recipe;
  if (flags.target) {
    recipe = customRecipe(flags.target, flags.before);
    if (!recipe) {
      stderr.write(
        "unsupported template engine for '" + flags.target + "'; " +
        'the installer writes .ejs, .njk, .swig, .pug and .jade templates.\n' +
        INJECT_HINT,
      );
      return 1;
    }
  } else {
    recipe = resolveTheme(theme.name);
    if (!recipe) {
      stderr.write(
        "no built-in recipe for theme '" + theme.name + "' (built-in: " +
        KNOWN_THEMES.join(', ') + ').\n' +
        'Run `npx hexo-tag-cloud inspect` to list candidate templates, then\n' +
        '  npx hexo-tag-cloud install --target <file> [--before "</aside>"]\n' +
        INJECT_HINT,
      );
      return 1;
    }
    if (flags.before !== undefined) recipe = customRecipe(recipe.file, flags.before);
  }

  const targetPath = path.resolve(theme.dir, recipe.file);

  if (!site.pluginInstalled) {
    stderr.write(
      'warning: hexo-tag-cloud is not a dependency in ' + path.join(cwd, 'package.json') +
      '; Hexo will not generate the scripts. Run `npm install hexo-tag-cloud --save`.\n',
    );
  }
  if (theme.inNodeModules) {
    stderr.write(
      'warning: ' + theme.dir + ' is inside node_modules; reinstalling the theme ' +
      'discards this edit. Consider `tag_cloud.inject: true` instead.\n',
    );
  }

  // 2. New block
  const newBlock = emitManagedBlock(recipe, {
    canvasWidth: flags['canvas-width'],
    canvasHeight: flags['canvas-height'],
    canvasStyle: flags['canvas-style'],
  });

  // 3. Existing content — the target must exist; the installer never
  // creates templates a theme does not include.
  let existingContent;
  try {
    existingContent = fsImpl.readFileSync(targetPath, 'utf8');
  } catch (e) {
    stderr.write(
      (e.code === 'ENOENT'
        ? 'expected template at ' + targetPath + ', not found.\n'
        : 'failed to read ' + targetPath + ': ' + e.message + '\n') +
      'Pass --theme-dir <path> or --target <file>; ' +
      'run `npx hexo-tag-cloud inspect` for candidates.\n',
    );
    return 4;
  }

  // 4. Decide
  const action = computeApplyAction({
    existingContent,
    newBlock,
    recipe,
    force: flags.force,
  });
  return commitOrDiff(action, targetPath, flags.apply, ctx);
}

function commitOrDiff(action, targetPath, apply, ctx) {
  const { stdout, stderr } = ctx;
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
  stdout.write('--- ' + targetPath + '\n' + action.diff + '\n');
  if (!apply) {
    stdout.write('[dry-run] would write ' + targetPath + '\n');
    stdout.write('(re-run with --apply to write)\n');
    return 0;
  }
  try {
    fsImpl.writeFileSync(targetPath, action.newContent, 'utf8');
  } catch (e) {
    stderr.write('failed to write ' + targetPath + ': ' + e.message + '\n');
    return 4;
  }
  stdout.write('✓ wrote tag-cloud managed block to ' + targetPath + '\n');
  stdout.write('Next: hexo clean && hexo generate\n');
  return 0;
}

// --- inspect ----------------------------------------------------------------

const TEMPLATE_EXTS = new Set(['.ejs', '.njk', '.swig', '.nunjucks', '.pug', '.jade', '.jsx']);
const MAX_DEPTH = 5;
const MAX_CANDIDATES = 20;

async function runInspect(argv, ctx) {
  const { cwd, stdout, stderr } = ctx;
  const fsImpl = ctx.fs;
  let flags;
  try {
    flags = parseArgs({
      args: argv,
      options: { theme: { type: 'string' }, 'theme-dir': { type: 'string' } },
      strict: true,
      allowPositionals: false,
    }).values;
  } catch (e) {
    stderr.write('argument parse error: ' + e.message + '\n');
    return 1;
  }
  const site = readSiteConfig(cwd, fsImpl);
  const theme = locateTheme(cwd, flags, site, fsImpl);
  if (theme.error) {
    stderr.write(theme.error + '\n');
    return 1;
  }
  const recipe = resolveTheme(theme.name);
  const candidates = [];
  walkTemplates(fsImpl, path.join(theme.dir, 'layout'), 'layout', 0, candidates);
  candidates.sort(function (a, b) { return b.score - a.score || a.path.localeCompare(b.path); });

  const report = {
    siteRoot: cwd,
    configFound: site.found,
    pluginInstalled: site.pluginInstalled,
    injectEnabled: site.injectEnabled,
    theme: theme.name,
    themeDir: theme.dir,
    themeDirExists: isDir(fsImpl, theme.dir),
    themeInNodeModules: theme.inNodeModules,
    builtInRecipe: recipe ? { file: recipe.file, engine: recipe.engine, before: recipe.before } : null,
    candidates: candidates.slice(0, MAX_CANDIDATES),
  };
  stdout.write(JSON.stringify(report, null, 2) + '\n');
  return 0;
}

/**
 * Rank templates by how likely they are to be a sidebar/widget the cloud
 * belongs in. `writable: false` marks engines the installer cannot edit.
 */
function walkTemplates(fsImpl, absDir, relDir, depth, out) {
  let entries;
  try {
    entries = fsImpl.readdirSync(absDir, { withFileTypes: true });
  } catch (_e) {
    return;
  }
  for (const ent of entries) {
    const abs = path.join(absDir, ent.name);
    const rel = relDir + '/' + ent.name;
    if (ent.isDirectory()) {
      if (depth < MAX_DEPTH) walkTemplates(fsImpl, abs, rel, depth + 1, out);
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    if (!ent.isFile() || !TEMPLATE_EXTS.has(ext)) continue;
    const content = fsImpl.readFileSync(abs, 'utf8');
    out.push({
      path: rel,
      engine: engineForFile(rel) || ext.slice(1),
      writable: engineForFile(rel) !== null,
      score: scoreTemplate(rel, content),
      hasAsideClose: content.includes('</aside>'),
      hasManagedBlock: content.includes('hexo-tag-cloud:begin'),
    });
  }
}

function scoreTemplate(rel, content) {
  const p = rel.toLowerCase();
  let score = 0;
  if (/sidebar|aside/.test(p)) score += 5;
  if (/widget|card/.test(p)) score += 3;
  if (/tag/.test(p)) score += 3;
  if (/_partial|partials|includes|_macro|_widget/.test(p)) score += 1;
  if (content.includes('</aside>')) score += 3;
  if (/tagcloud\(|list_tags\(|cloudTags\(/.test(content)) score += 2;
  if (content.includes('hexo-tag-cloud:begin')) score += 10;
  return score;
}

// --- site + theme discovery -------------------------------------------------

/**
 * Parsed `_config.yml` facts. A missing or broken config is reported by
 * `locateTheme` only when the theme actually has to be detected.
 */
function readSiteConfig(cwd, fsImpl) {
  const result = { found: false, config: null, error: null, pluginInstalled: false, injectEnabled: false };
  const configPath = path.join(cwd, '_config.yml');
  try {
    const parsed = yaml.load(fsImpl.readFileSync(configPath, 'utf8'));
    result.found = true;
    result.config = (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    result.error = e.code === 'ENOENT'
      ? 'no _config.yml found at ' + configPath + '; pass --theme <name> or run from a hexo site root.'
      : 'failed to read _config.yml: ' + e.message;
  }
  const tagCloud = result.config && result.config.tag_cloud;
  result.injectEnabled = Boolean(tagCloud && (tagCloud.inject === true || tagCloud.inject === 'true'));
  try {
    const pkg = JSON.parse(fsImpl.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    result.pluginInstalled = Object.prototype.hasOwnProperty.call(deps, 'hexo-tag-cloud');
  } catch (_e) {
    result.pluginInstalled = false;
  }
  return result;
}

/**
 * Theme name + directory. `--theme-dir` wins; otherwise `themes/<name>`,
 * then the npm-installed `node_modules/hexo-theme-<name>`.
 */
function locateTheme(cwd, flags, site, fsImpl) {
  let name = flags.theme;
  if (!name) {
    if (site.error) return { error: site.error };
    const t = site.config.theme;
    if (typeof t !== 'string' || t.length === 0) {
      return {
        error: (t && typeof t === 'object')
          ? 'complex theme config (nested mapping under `theme:`); pass --theme <name>.'
          : 'no `theme:` field in _config.yml; pass --theme <name>.',
      };
    }
    name = t;
  }
  if (flags['theme-dir']) {
    const dir = path.resolve(cwd, flags['theme-dir']);
    return { name, dir, inNodeModules: dir.split(path.sep).includes('node_modules') };
  }
  const local = path.join(cwd, 'themes', name);
  const npm = path.join(cwd, 'node_modules', 'hexo-theme-' + name);
  if (!isDir(fsImpl, local) && isDir(fsImpl, npm)) {
    return { name, dir: npm, inNodeModules: true };
  }
  return { name, dir: local, inNodeModules: false };
}

function isDir(fsImpl, p) {
  try {
    return fsImpl.statSync(p).isDirectory();
  } catch (_e) {
    return false;
  }
}

module.exports = {
  runCli,
  runInstall,
  runInspect,
  readSiteConfig,
  locateTheme,
  scoreTemplate,
  USAGE,
};
