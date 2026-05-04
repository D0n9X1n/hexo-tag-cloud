#!/usr/bin/env node
'use strict';

/**
 * Helper script for the hexo-tag-cloud Claude skill. Reads
 * <cwd>/_config.yml and prints JSON `{ theme, themeDir, engine }`
 * to stdout. Exits 0 on success; non-zero with a stderr message
 * if the site root or theme cannot be detected.
 *
 * The implementation reuses the same parser the install CLI uses,
 * so the skill and the CLI agree on what counts as the active theme.
 */

const fs = require('node:fs');
const path = require('node:path');

const cli = require('../../../lib/installer/cli');
const heuristics = require('../../../lib/installer/theme-heuristics');

function main() {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '_config.yml');
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
    process.stderr.write(
      'detect-theme: cannot read ' + configPath + ': ' + e.message + '\n',
    );
    process.exit(1);
  }
  const result = cli.parseThemeFromYaml(raw);
  if (result.error) {
    process.stderr.write('detect-theme: ' + result.error + '\n');
    process.exit(1);
  }
  const theme = result.theme;
  const recipe = heuristics.resolveTheme(theme);
  const themeDir = path.join(cwd, 'themes', theme);
  const out = {
    theme,
    themeDir,
    engine: recipe ? recipe.engine : 'unknown',
    knownTheme: Boolean(recipe),
  };
  process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

/* c8 ignore start */
if (require.main === module) {
  main();
}
/* c8 ignore stop */

module.exports = { main };
