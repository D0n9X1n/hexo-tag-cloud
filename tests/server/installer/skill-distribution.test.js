'use strict';

/**
 * Verifies the bundled Claude skill is correctly distributable:
 *   - SKILL.md exists, ≤200 lines, follows the spec-mandated heading
 *     order, and contains no YAML frontmatter / version string.
 *   - package.json `files` array includes bin/ + skills/ + lib/installer/
 *     so `npm pack` ships them.
 *   - package.json `bin` exposes hexo-tag-cloud → the installer entry.
 *   - Helper scripts in skills/hexo-tag-cloud/scripts/ are syntactically
 *     valid (require() them with a no-throw expectation).
 *
 * The version field in SKILL.md is forbidden because version bumps live
 * in package.json (D's responsibility, not C's).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SKILL_MD = path.join(REPO_ROOT, 'skills/hexo-tag-cloud/SKILL.md');
const PKG = require(path.join(REPO_ROOT, 'package.json'));

const REQUIRED_HEADINGS = [
  '# name',
  '## description',
  '## when_to_use',
  '## usage',
  '## examples',
  '## failure_modes',
];

// --- SKILL.md exists + size cap ------------------------------------------

test('SKILL.md exists at the bundled location', () => {
  assert.ok(fs.existsSync(SKILL_MD), 'SKILL.md missing at ' + SKILL_MD);
});

test('SKILL.md is at most 200 lines (spec AC #5 cap)', () => {
  const lines = fs.readFileSync(SKILL_MD, 'utf8').split('\n');
  // strip a possible trailing empty line from the final \n
  const effective = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  assert.ok(effective <= 200,
    'SKILL.md has ' + effective + ' lines (cap 200)');
});

// --- heading order + presence -------------------------------------------

test('SKILL.md contains all 6 required headings in spec-mandated order', () => {
  const lines = fs.readFileSync(SKILL_MD, 'utf8').split('\n');
  const headings = lines.filter((l) => /^#+\s/.test(l));
  // Filter to only the top-level/level-2 headings for ordering check
  const required = headings.filter((h) => REQUIRED_HEADINGS.indexOf(h.trim()) !== -1);
  assert.deepEqual(required, REQUIRED_HEADINGS,
    'heading order mismatch — got ' + JSON.stringify(required));
});

// --- forbid YAML frontmatter --------------------------------------------

test('SKILL.md does NOT start with --- (no YAML frontmatter)', () => {
  const raw = fs.readFileSync(SKILL_MD, 'utf8');
  assert.ok(!raw.startsWith('---'),
    'SKILL.md must not have YAML frontmatter (spec AC #5)');
});

test('SKILL.md does NOT contain a version: line (D owns version bumps)', () => {
  const raw = fs.readFileSync(SKILL_MD, 'utf8');
  const lines = raw.split('\n');
  for (const line of lines) {
    assert.ok(!/^\s*version\s*:/i.test(line),
      'SKILL.md contains a version line; remove it (sub-project D bumps in package.json): ' + line);
  }
});

// --- package.json files[] -----------------------------------------------

test('package.json files[] contains bin/, skills/, and lib/', () => {
  assert.ok(Array.isArray(PKG.files), 'package.json missing files[]');
  for (const required of ['bin/', 'skills/', 'lib/']) {
    assert.ok(PKG.files.indexOf(required) !== -1,
      'package.json files[] missing required entry: ' + required +
      '; got ' + JSON.stringify(PKG.files));
  }
});

// --- package.json bin ---------------------------------------------------

test('package.json exposes bin: hexo-tag-cloud → bin/hexo-tag-cloud-install.js', () => {
  assert.ok(PKG.bin, 'package.json missing bin field');
  assert.equal(PKG.bin['hexo-tag-cloud'], 'bin/hexo-tag-cloud-install.js');
});

test('bin entry actually exists on disk', () => {
  const binPath = path.join(REPO_ROOT, PKG.bin['hexo-tag-cloud']);
  assert.ok(fs.existsSync(binPath), 'bin entry not found: ' + binPath);
});

test('bin entry has a node shebang', () => {
  const binPath = path.join(REPO_ROOT, PKG.bin['hexo-tag-cloud']);
  const first = fs.readFileSync(binPath, 'utf8').split('\n')[0];
  assert.match(first, /^#!\/usr\/bin\/env node$/);
});

// --- helper scripts: syntactic validity ---------------------------------

test('skills/hexo-tag-cloud/scripts/detect-theme.js is requireable (no syntax errors)', () => {
  const p = path.join(REPO_ROOT, 'skills/hexo-tag-cloud/scripts/detect-theme.js');
  assert.ok(fs.existsSync(p));
  // require() will throw on syntax errors. The script's main() only runs
  // when require.main === module, so requiring it is safe.
  let mod;
  assert.doesNotThrow(() => { mod = require(p); });
  assert.equal(typeof mod.main, 'function');
});

test('skills/hexo-tag-cloud/scripts/inspect-partials.js is requireable', () => {
  const p = path.join(REPO_ROOT, 'skills/hexo-tag-cloud/scripts/inspect-partials.js');
  assert.ok(fs.existsSync(p));
  let mod;
  assert.doesNotThrow(() => { mod = require(p); });
  assert.equal(typeof mod.main, 'function');
});

// --- bundled vs. source consistency -------------------------------------

test('SKILL.md mentions the canonical CLI invocation `npx hexo-tag-cloud install`', () => {
  const raw = fs.readFileSync(SKILL_MD, 'utf8');
  assert.match(raw, /npx hexo-tag-cloud install/,
    'SKILL.md should document the npx invocation');
});

test('SKILL.md mentions all 5 named themes + generic fallback', () => {
  const raw = fs.readFileSync(SKILL_MD, 'utf8');
  for (const t of ['landscape', 'next', 'butterfly', 'icarus', 'fluid', 'generic']) {
    assert.match(raw, new RegExp('\\b' + t + '\\b'),
      'SKILL.md should mention theme: ' + t);
  }
});

test('SKILL.md documents all 5 exit codes (0/1/2/3/4)', () => {
  const raw = fs.readFileSync(SKILL_MD, 'utf8');
  for (const code of ['Exit 0', 'Exit 1', 'Exit 2', 'Exit 3', 'Exit 4']) {
    assert.match(raw, new RegExp(code),
      'SKILL.md missing failure-mode entry: ' + code);
  }
});
