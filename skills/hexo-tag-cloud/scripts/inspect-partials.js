#!/usr/bin/env node
'use strict';

/**
 * Helper script for the hexo-tag-cloud Claude skill. Walks
 * <cwd>/themes/<theme>/layout/ and prints a JSON array of candidate
 * partial files (matching ejs/swig/pug/njk extensions) that the
 * installer might target. Useful for the agent to display to the
 * user when --theme-dir is needed.
 *
 * Usage: inspect-partials.js [--theme <name>] [--theme-dir <path>]
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseArgs } = require('node:util');

const cli = require('../../../lib/installer/cli');

const PARTIAL_EXTS = new Set(['.ejs', '.swig', '.pug', '.njk', '.jade']);

function main() {
  const cwd = process.cwd();
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        theme: { type: 'string' },
        'theme-dir': { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
  } catch (e) {
    process.stderr.write('inspect-partials: ' + e.message + '\n');
    process.exit(1);
  }
  const flags = parsed.values;

  let themeName = flags.theme;
  if (!themeName) {
    let raw;
    try {
      raw = fs.readFileSync(path.join(cwd, '_config.yml'), 'utf8');
    } catch (e) {
      process.stderr.write('inspect-partials: cannot read _config.yml: ' + e.message + '\n');
      process.exit(1);
    }
    const result = cli.parseThemeFromYaml(raw);
    if (result.error) {
      process.stderr.write('inspect-partials: ' + result.error + '\n');
      process.exit(1);
    }
    themeName = result.theme;
  }
  const themeDir = flags['theme-dir'] || path.join(cwd, 'themes', themeName);
  const layoutDir = path.join(themeDir, 'layout');

  if (!fs.existsSync(layoutDir)) {
    process.stderr.write(
      'inspect-partials: layout dir not found: ' + layoutDir + '\n',
    );
    process.exit(1);
  }

  const partials = [];
  walk(layoutDir, layoutDir, partials);
  process.stdout.write(JSON.stringify(partials, null, 2) + '\n');
}

function walk(absRoot, relPrefix, out) {
  const entries = fs.readdirSync(relPrefix, { withFileTypes: true });
  for (const ent of entries) {
    const child = path.join(relPrefix, ent.name);
    if (ent.isDirectory()) {
      walk(absRoot, child, out);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name).toLowerCase();
      if (!PARTIAL_EXTS.has(ext)) continue;
      const stat = fs.statSync(child);
      out.push({
        path: path.relative(absRoot, child),
        engine: ext.slice(1),
        sizeBytes: stat.size,
      });
    }
  }
}

/* c8 ignore start */
if (require.main === module) {
  main();
}
/* c8 ignore stop */

module.exports = { main };
