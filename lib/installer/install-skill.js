'use strict';

/**
 * `install-skill` subcommand: copies the bundled
 * `skills/hexo-tag-cloud/` directory tree into a target dir (default
 * `~/.claude/skills/hexo-tag-cloud/`), where Claude Code discovers it
 * as a personal skill.
 *
 * Pure-ish: like the install subcommand, side effects flow only
 * through the injected `fs`, stdout, and stderr. `os.homedir()` is
 * read at call time but is itself injectable via `opts.homedir`.
 *
 * Exit codes:
 *   0 success or dry-run
 *   1 argument parse error
 *   4 target dir already exists with files (refuse without --force)
 */

const realFs = require('node:fs');
const realPath = require('node:path');
const realOs = require('node:os');
const { parseArgs } = require('node:util');

// Source dir is `skills/hexo-tag-cloud/` resolved relative to THIS file.
// Three levels up from lib/installer/install-skill.js → repo root → /skills/.
const DEFAULT_SOURCE_DIR = realPath.resolve(
  __dirname, '..', '..', 'skills', 'hexo-tag-cloud',
);

async function runInstallSkill(argv, ctx) {
  const stdout = ctx.stdout;
  const stderr = ctx.stderr;
  const fsImpl = ctx.fs || realFs;
  const homedirFn = ctx.homedir || realOs.homedir;
  const sourceDir = ctx.sourceDir || DEFAULT_SOURCE_DIR;

  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      options: {
        target: { type: 'string' },
        'dry-run': { type: 'boolean', default: false },
        force: { type: 'boolean', default: false },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (e) {
    stderr.write('argument parse error: ' + e.message + '\n');
    return 1;
  }
  const flags = parsed.values;
  const target = flags.target ||
    realPath.join(homedirFn(), '.claude', 'skills', 'hexo-tag-cloud');
  const dryRun = Boolean(flags['dry-run']);

  // Refuse to overwrite a non-empty target unless dry-run or --force.
  const force = Boolean(flags.force);
  if (!dryRun && !force && targetIsNonEmpty(target, fsImpl)) {
    stderr.write(
      'target ' + target + ' already exists and is non-empty.\n' +
      'Pass --force to replace it with this version of the skill, ' +
      '--target <other-dir>, or --dry-run to preview.\n',
    );
    return 4;
  }

  let entries;
  try {
    entries = collectFiles(sourceDir, fsImpl);
  } catch (e) {
    stderr.write('failed to read skill source ' + sourceDir + ': ' + e.message + '\n');
    return 4;
  }

  if (dryRun) {
    stdout.write('[dry-run] would copy ' + entries.length +
      ' file(s) from ' + sourceDir + ' to ' + target + ':\n');
    for (const rel of entries) {
      stdout.write('  ' + rel + '\n');
    }
    stdout.write('(re-run without --dry-run to copy)\n');
    return 0;
  }

  try {
    // --force replaces the whole directory so files removed upstream
    // (e.g. the pre-3.1 helper scripts) do not linger.
    if (force) fsImpl.rmSync(target, { recursive: true, force: true });
    fsImpl.mkdirSync(target, { recursive: true });
    for (const rel of entries) {
      const src = realPath.join(sourceDir, rel);
      const dst = realPath.join(target, rel);
      fsImpl.mkdirSync(realPath.dirname(dst), { recursive: true });
      const buf = fsImpl.readFileSync(src);
      fsImpl.writeFileSync(dst, buf);
    }
  } catch (e) {
    stderr.write('failed to copy skill: ' + e.message + '\n');
    return 4;
  }
  stdout.write('\u2713 skill installed at ' + target + '\n');
  stdout.write('Start a new Claude Code session (or run /skills) to pick it up.\n');
  return 0;
}

function targetIsNonEmpty(target, fsImpl) {
  try {
    const stat = fsImpl.statSync(target);
    if (!stat.isDirectory()) return true;
    const contents = fsImpl.readdirSync(target);
    return contents.length > 0;
  } catch (e) {
    if (e.code === 'ENOENT') return false;
    /* c8 ignore next 2 */
    throw e;
  }
}

/**
 * Walk `dir` recursively and return file paths relative to `dir`.
 * Sorted for deterministic output.
 */
function collectFiles(dir, fsImpl) {
  const out = [];
  walkInto(dir, '', fsImpl, out);
  out.sort();
  return out;
}

function walkInto(absRoot, relPrefix, fsImpl, out) {
  const entries = fsImpl.readdirSync(realPath.join(absRoot, relPrefix), {
    withFileTypes: true,
  });
  for (const ent of entries) {
    const childRel = relPrefix === '' ? ent.name : relPrefix + '/' + ent.name;
    if (ent.isDirectory()) {
      walkInto(absRoot, childRel, fsImpl, out);
    } else if (ent.isFile()) {
      out.push(childRel);
    }
  }
}

module.exports = {
  runInstallSkill,
  collectFiles,
  DEFAULT_SOURCE_DIR,
};
