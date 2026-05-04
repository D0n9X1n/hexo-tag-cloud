'use strict';

// Locks the contracts established by sub-project D ("v3.0.0 release").
// This is a contract-checker, NOT a coverage source — it asserts the shape
// of the tarball, the workflow files, the CHANGELOG, the migration guide,
// the wiki, and the demo. If any of these regress the suite fails fast.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const PKG = require(path.join(ROOT, 'package.json'));

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

test('package.json: version is 3.0.0', () => {
  assert.equal(PKG.version, '3.0.0');
});

test('package.json: files[] contains the four shipped roots', () => {
  for (const required of ['index.js', 'lib/', 'bin/', 'skills/']) {
    assert.ok(
      PKG.files.includes(required),
      `package.json#files missing required entry: ${required}`
    );
  }
});

test('package.json: scripts.verify-pack is defined', () => {
  assert.equal(PKG.scripts['verify-pack'], 'node build/verify-pack.js');
});

test('package.json: scripts.prepublishOnly runs verify-pack (NOT prepack to avoid recursion)', () => {
  assert.equal(PKG.scripts.prepublishOnly, 'npm run verify-pack');
  assert.equal(
    PKG.scripts.prepack,
    undefined,
    'prepack must NOT run verify-pack: npm pack invokes prepack, which would recurse into npm pack'
  );
});

test('package.json: bin shim points at the install CLI', () => {
  assert.equal(PKG.bin['hexo-tag-cloud'], 'bin/hexo-tag-cloud-install.js');
});

test('CHANGELOG.md exists and has the [Unreleased] + dated [3.0.0] headings', () => {
  const body = read('CHANGELOG.md');
  assert.match(body, /^## \[Unreleased\]$/m);
  assert.match(body, /^## \[3\.0\.0\] — \d{4}-\d{2}-\d{2}$/m);
});

test('docs/migration-2.x-to-3.x.md exists and is non-trivial', () => {
  const body = read('docs/migration-2.x-to-3.x.md');
  assert.ok(body.length > 1000, 'migration guide is suspiciously short');
  assert.match(body, /managed.block/i);
});

test('build/verify-pack.js is tracked in git (not gitignored)', () => {
  assert.ok(exists('build/verify-pack.js'));
  // git check-ignore exits 0 if the path IS ignored; 1 if it is NOT ignored.
  // We want exit 1 (file is tracked).
  const result = spawnSync('git', ['check-ignore', '-q', 'build/verify-pack.js'], {
    cwd: ROOT,
  });
  assert.equal(
    result.status,
    1,
    'build/verify-pack.js must NOT be gitignored (would not ship in tarball)'
  );
});

test('build/verify-pack.js: subprocess invocation exits 0 on a clean tree', () => {
  // Sanity: end-to-end run of the verifier as a CLI. The unit tests in
  // tests/server/build/verify-pack.test.js cover branch coverage; this
  // one asserts the bin shim resolves and the tarball is currently valid.
  const out = execFileSync('node', ['build/verify-pack.js'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.match(out, /OK|verified|pass/i);
});

test('release workflow: triggers on v* tags and uses OIDC + verify-pack', () => {
  assert.ok(exists('.github/workflows/release.yml'));
  const body = read('.github/workflows/release.yml');
  assert.match(body, /tags:/);
  assert.match(body, /['"]v\*['"]/);
  assert.match(body, /--provenance/);
  assert.match(body, /id-token:\s*write/);
  assert.match(body, /verify-pack/);
});

test('publish-gh-packages workflow: registers GH Packages mirror with idempotency', () => {
  assert.ok(exists('.github/workflows/publish-gh-packages.yml'));
  const body = read('.github/workflows/publish-gh-packages.yml');
  assert.match(body, /npm\.pkg\.github\.com/);
  assert.match(body, /workflow_run|workflow_dispatch/);
  assert.match(body, /packages:\s*write/);
  // Idempotency check uses npm view to skip if the version is already published.
  assert.match(body, /npm\s+view/);
});

test('deploy-demo workflow: uses workflow_run + Pages deploy + stale guard', () => {
  assert.ok(exists('.github/workflows/deploy-demo.yml'));
  const body = read('.github/workflows/deploy-demo.yml');
  assert.match(body, /workflow_run/);
  assert.match(body, /pages:\s*write/);
  assert.match(body, /deploy-pages/);
  // Stale-deploy guard: the body must reference origin/master + head_sha
  // freshness comparison (sibling design pattern).
  assert.match(body, /origin\/master/);
  assert.match(body, /head_sha/);
});

test('demo/package.json exists and references the plugin (file:.. for local dev)', () => {
  assert.ok(exists('demo/package.json'));
  const demoPkg = JSON.parse(read('demo/package.json'));
  assert.ok(demoPkg.dependencies['hexo-tag-cloud']);
  // Note: file:.. is correct for the master branch; release.yml rejects it
  // at tag time. The release workflow check is the right guard for that.
});

test('demo/themes/landscape/layout/_partial/sidebar.ejs has the managed block markers', () => {
  const sidebar = read('demo/themes/landscape/layout/_partial/sidebar.ejs');
  assert.match(sidebar, /<!--\s*hexo-tag-cloud BEGIN\s*-->/);
  assert.match(sidebar, /<!--\s*hexo-tag-cloud END\s*-->/);
  // The body must call the helper that emits anchor list TagCanvas reads.
  assert.match(sidebar, /tagcloud\(\)/);
});

test('wiki/ has the six expected pages', () => {
  for (const page of [
    'Home.md',
    'Installation.md',
    'Customization.md',
    'Troubleshooting.md',
    'AI-Skill-Usage.md',
    'Contributing.md',
  ]) {
    assert.ok(exists(`wiki/${page}`), `wiki/${page} missing`);
  }
});

test('README.md badges: stale Scrutinizer badges removed; Tests + npm + license badges present', () => {
  const body = read('README.md');
  assert.doesNotMatch(body, /scrutinizer-ci\.com/);
  assert.match(body, /actions\/workflows\/test\.yml\/badge\.svg/);
  assert.match(body, /img\.shields\.io\/npm\/v\/hexo-tag-cloud/);
  assert.match(body, /img\.shields\.io\/npm\/dm\/hexo-tag-cloud/);
  assert.match(body, /img\.shields\.io\/npm\/l\/hexo-tag-cloud/);
});

test('README.ZH.md badges: parity with English README', () => {
  const body = read('README.ZH.md');
  assert.doesNotMatch(body, /scrutinizer-ci\.com/);
  assert.match(body, /actions\/workflows\/test\.yml\/badge\.svg/);
  assert.match(body, /img\.shields\.io\/npm\/v\/hexo-tag-cloud/);
  assert.match(body, /img\.shields\.io\/npm\/dm\/hexo-tag-cloud/);
  assert.match(body, /img\.shields\.io\/npm\/l\/hexo-tag-cloud/);
});

test('README.md has Wiki + Changelog sections linking to the in-repo docs', () => {
  const body = read('README.md');
  assert.match(body, /\.\/wiki\/Home\.md|\(\.\/wiki\//);
  assert.match(body, /CHANGELOG\.md/);
  assert.match(body, /docs\/migration-2\.x-to-3\.x\.md/);
});

test('README.ZH.md has Wiki + Changelog sections linking to the in-repo docs', () => {
  const body = read('README.ZH.md');
  assert.match(body, /\.\/wiki\/Home\.md|\(\.\/wiki\//);
  assert.match(body, /CHANGELOG\.md/);
  assert.match(body, /docs\/migration-2\.x-to-3\.x\.md/);
});
