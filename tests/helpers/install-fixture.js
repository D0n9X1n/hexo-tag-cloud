#!/usr/bin/env node
'use strict';

/**
 * CLI wrapper for `ensureFixtureInstalled()`. Wired to the `pretest:server`
 * npm script so the fixture's dependencies are installed once, in a
 * single process, before `node --test` forks per-file subprocesses
 * (which would otherwise race each other on first run).
 */

const path = require('path');
const { ensureFixtureInstalled } = require('./ensureFixtureInstalled');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_FIXTURE = path.join(REPO_ROOT, 'tests', 'fixtures', 'hexo-site');

ensureFixtureInstalled(DEFAULT_FIXTURE).catch((err) => {
  process.stderr.write(`install-fixture failed: ${err && err.message}\n`);
  process.exit(1);
});
