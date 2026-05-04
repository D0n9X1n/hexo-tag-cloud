'use strict';

// Docs-as-tests for hexo-tag-cloud. Locks down the README contract so
// future edits can't accidentally remove key sections that users depend
// on.
//
// Sub-project A keeps this lightweight; sub-project D's release work
// expands it to enforce the full bilingual README contract (badges,
// installation, customize, troubleshooting, theme matrix).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

test('README.md exists and exposes the "How to Use" section', () => {
  assert.ok(fs.existsSync(path.join(repoRoot, 'README.md')),
    'README.md must exist at repo root');
  const body = read('README.md');
  assert.match(body, /^##\s+How\s+to\s+Use\s*$/im,
    'README.md must contain a "## How to Use" section');
});

test('README.md documents the tag_cloud config block', () => {
  const body = read('README.md');
  assert.ok(body.includes('tag_cloud'),
    'README.md must reference the `tag_cloud` _config.yml block');
  for (const knob of ['textFont', 'textColor', 'textHeight',
                      'outlineColor', 'maxSpeed', 'pauseOnSelected']) {
    assert.ok(body.includes(knob),
      `README.md must document the "${knob}" tag_cloud option`);
  }
});

test('README.md links to the issues page (D0n9X1n fork)', () => {
  const body = read('README.md');
  assert.match(body,
    /https:\/\/github\.com\/(D0n9X1n|MikeCoder)\/hexo-tag-cloud\/issues/i,
    'README.md must link to the project issues page');
});

test('README.ZH.md exists and references tag_cloud', () => {
  const zhPath = path.join(repoRoot, 'README.ZH.md');
  assert.ok(fs.existsSync(zhPath),
    'README.ZH.md (Chinese README) must exist');
  const body = fs.readFileSync(zhPath, 'utf8');
  assert.ok(body.includes('tag_cloud'),
    'README.ZH.md must reference the `tag_cloud` config block');
});

test('LICENSE is present and is MIT', () => {
  const licensePath = path.join(repoRoot, 'LICENSE');
  assert.ok(fs.existsSync(licensePath), 'LICENSE file must exist');
  const body = fs.readFileSync(licensePath, 'utf8');
  assert.ok(/MIT|Permission is hereby granted/i.test(body),
    'LICENSE must look like MIT');
});

test('package.json declares engines.node>=18 and peerDependencies.hexo>=5', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(typeof pkg.engines, 'object');
  assert.equal(pkg.engines.node, '>=18',
    'package.json#engines.node must be ">=18"');
  assert.equal(typeof pkg.peerDependencies, 'object');
  assert.equal(pkg.peerDependencies.hexo, '>=5',
    'package.json#peerDependencies.hexo must be ">=5"');
});

// --- C/T9: AI-assisted install section in both READMEs --------------

test('README.md exposes the "AI-assisted install" section ABOVE "How to Use"', () => {
  const body = read('README.md');
  assert.match(body, /^##\s+AI-assisted\s+install\s*$/im,
    'README.md must contain a "## AI-assisted install" heading');
  // Order check: AI-assisted install must come BEFORE How to Use
  const aiIdx = body.search(/^##\s+AI-assisted\s+install\s*$/im);
  const howIdx = body.search(/^##\s+How\s+to\s+Use\s*$/im);
  assert.ok(aiIdx >= 0 && howIdx >= 0 && aiIdx < howIdx,
    '"## AI-assisted install" must appear before "## How to Use" ' +
    '(positions: ai=' + aiIdx + ', how=' + howIdx + ')');
});

test('README.md documents the canonical CLI invocations', () => {
  const body = read('README.md');
  assert.ok(body.includes('npx hexo-tag-cloud install'),
    'README.md must show `npx hexo-tag-cloud install` invocation');
  assert.ok(body.includes('install-skill'),
    'README.md must mention the install-skill subcommand');
  assert.ok(body.includes('--apply'),
    'README.md must document the --apply flag');
});

test('README.ZH.md exposes the AI 辅助安装 section ABOVE 如何使用', () => {
  const body = read('README.ZH.md');
  assert.match(body, /^##\s+AI\s*辅助安装\s*$/im,
    'README.ZH.md must contain a "## AI 辅助安装" heading');
  const aiIdx = body.search(/^##\s+AI\s*辅助安装\s*$/im);
  const howIdx = body.search(/^##\s+如何使用\s*$/im);
  assert.ok(aiIdx >= 0 && howIdx >= 0 && aiIdx < howIdx,
    '"## AI 辅助安装" must appear before "## 如何使用" ' +
    '(positions: ai=' + aiIdx + ', how=' + howIdx + ')');
});

test('README.ZH.md documents the canonical CLI invocations', () => {
  const body = read('README.ZH.md');
  assert.ok(body.includes('npx hexo-tag-cloud install'),
    'README.ZH.md must show `npx hexo-tag-cloud install` invocation');
  assert.ok(body.includes('install-skill'),
    'README.ZH.md must mention install-skill');
});
