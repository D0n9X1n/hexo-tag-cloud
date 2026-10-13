'use strict';

/**
 * Verifies the bundled Claude Code skill is loadable and distributable (#47):
 *   - SKILL.md starts with YAML frontmatter carrying `name` + `description`
 *     (Claude Code discovers skills by that metadata).
 *   - The skill is self-contained: no helper scripts that would break once
 *     copied to ~/.claude/skills/; every action goes through the CLI.
 *   - It covers every integration path (built-in recipe, --target, inject).
 *   - It is Claude Code only: no other coding tools are mentioned.
 *   - package.json ships bin/ + skills/ + lib/ and exposes the CLI.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const SKILL_DIR = path.join(REPO_ROOT, 'skills/hexo-tag-cloud');
const SKILL_MD = path.join(SKILL_DIR, 'SKILL.md');
const PKG = require(path.join(REPO_ROOT, 'package.json'));

function body() {
  return fs.readFileSync(SKILL_MD, 'utf8');
}

function frontmatter() {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(body());
  assert.ok(m, 'SKILL.md must start with a --- YAML frontmatter block');
  return yaml.load(m[1]);
}

test('SKILL.md exists and is at most 200 lines', () => {
  assert.ok(fs.existsSync(SKILL_MD));
  assert.ok(body().split('\n').length <= 200);
});

test('frontmatter: name is hexo-tag-cloud (lowercase, hyphens)', () => {
  const fm = frontmatter();
  assert.equal(fm.name, 'hexo-tag-cloud');
  assert.match(fm.name, /^[a-z0-9-]{1,64}$/);
});

test('frontmatter: description says what and when, within 1024 chars', () => {
  const { description } = frontmatter();
  assert.equal(typeof description, 'string');
  assert.ok(description.length > 50 && description.length <= 1024, String(description.length));
  assert.match(description, /Hexo/);
  assert.match(description, /Use when/);
});

test('frontmatter carries no version (package.json owns versions)', () => {
  assert.equal(frontmatter().version, undefined);
});

test('skill is self-contained: SKILL.md only, no scripts/ dir', () => {
  assert.deepEqual(fs.readdirSync(SKILL_DIR), ['SKILL.md']);
});

test('covers the whole workflow: install plugin, inspect, recipe, --target, inject, verify', () => {
  const b = body();
  for (const s of [
    'npm install hexo-tag-cloud --save',
    'npx hexo-tag-cloud inspect',
    'npx hexo-tag-cloud install',
    '--target',
    '--before',
    '--apply',
    'inject: true',
    'mount',
    'hexo generate',
  ]) {
    assert.ok(b.includes(s), 'SKILL.md must mention ' + s);
  }
});

test('names the built-in themes and the JSX path', () => {
  const b = body();
  for (const t of ['landscape', 'next', 'butterfly', 'fluid', 'Icarus', 'JSX']) {
    assert.ok(b.includes(t), t);
  }
});

test('documents exit codes 0-4', () => {
  const b = body();
  for (const code of ['**0**', '**1**', '**2**', '**3**', '**4**']) {
    assert.ok(b.includes(code), code);
  }
});

test('requires approval before --apply and forbids unrequested --force', () => {
  const b = body();
  assert.match(b, /Wait for explicit approval/);
  assert.match(b, /Never pass `--force`/);
});

test('Claude Code only: no other coding tools mentioned', () => {
  assert.doesNotMatch(body(), /cursor|copilot|codex|gemini|windsurf|aider/i);
});

// --- package.json distribution -------------------------------------------

test('package.json files[] ships bin/, skills/, and lib/', () => {
  for (const entry of ['bin/', 'skills/', 'lib/']) {
    assert.ok(PKG.files.includes(entry), entry);
  }
});

test('package.json exposes bin: hexo-tag-cloud → bin/hexo-tag-cloud-install.js', () => {
  assert.equal(PKG.bin['hexo-tag-cloud'], 'bin/hexo-tag-cloud-install.js');
});

test('bin entry exists and has a node shebang', () => {
  const p = path.join(REPO_ROOT, PKG.bin['hexo-tag-cloud']);
  assert.ok(fs.existsSync(p));
  assert.match(fs.readFileSync(p, 'utf8'), /^#!\/usr\/bin\/env node/);
});

test('js-yaml is a declared runtime dependency (#51)', () => {
  assert.ok(PKG.dependencies && PKG.dependencies['js-yaml']);
});
