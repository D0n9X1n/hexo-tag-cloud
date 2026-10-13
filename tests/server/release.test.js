'use strict';

// Locks the contracts established by sub-project D ("v3.0.0 release").
// This is a contract-checker, NOT a coverage source — it asserts the shape
// of the tarball, the workflow files, the migration guide,
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

test('package.json: version is valid semver (bumped per release, never pinned) (#52)', () => {
  assert.match(PKG.version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/);
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

test('no CHANGELOG file: GitHub Release notes are the changelog (#55)', () => {
  assert.ok(!exists('CHANGELOG.md'));
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
  assert.match(body, /['"]v\[0-9\]\+\.\[0-9\]\+\.\[0-9\]\+\*['"]/);
  assert.match(body, /--provenance/);
  assert.match(body, /id-token:\s*write/);
  assert.match(body, /verify-pack/);
});

test('release workflow: gates on exact master CI and publishes notes with issues + commits', () => {
  const body = read('.github/workflows/release.yml');
  // Top-level token is read-only; write is granted per job.
  assert.match(body, /^permissions:\n {2}contents: read$/m);
  assert.match(body, /merge-base --is-ancestor "\$GITHUB_SHA" refs\/remotes\/origin\/master/);
  assert.match(body, /workflows\/test\.yml\/runs\?branch=master/);
  assert.match(body, /scripts\/release-notes\.sh/);
  assert.match(body, /scripts\/test-release-notes\.sh/);
  assert.match(body, /softprops\/action-gh-release@[0-9a-f]{40}/);
  assert.match(body, /issues: read/);
  // Every third-party action is pinned to a full commit SHA.
  for (const m of body.matchAll(/uses:\s*(\S+)/g)) {
    assert.match(m[1], /@[0-9a-f]{40}$/, 'unpinned action: ' + m[1]);
  }
});

test('release tooling scripts are tracked and executable', () => {
  for (const f of ['scripts/release-notes.sh', 'scripts/release-issues.py',
                   'scripts/test-release-notes.sh', 'scripts/publish-wiki.sh',
                   'scripts/test-wiki-publish.sh']) {
    assert.ok(exists(f), f + ' must exist');
    assert.ok(fs.statSync(path.join(ROOT, f)).mode & 0o111, f + ' must be executable');
  }
});

test('GitHub Packages mirror is a gated job in release.yml, not a standalone workflow (#53)', () => {
  assert.ok(!exists('.github/workflows/publish-gh-packages.yml'));
  const body = read('.github/workflows/release.yml');
  assert.match(body, /publish-github-packages:[\s\S]*needs: \[publish-npm\]/);
  assert.match(body, /npm\.pkg\.github\.com/);
  assert.match(body, /packages:\s*write/);
  assert.match(body, /npm view "@d0n9x1n\/hexo-tag-cloud@/);
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

test('README.md links to the wiki, GitHub Releases, and the migration guide', () => {
  const body = read('README.md');
  assert.match(body, /\.\/wiki\/Home\.md|\(\.\/wiki\//);
  assert.match(body, /github\.com\/D0n9X1n\/hexo-tag-cloud\/releases/);
  assert.match(body, /docs\/migration-2\.x-to-3\.x\.md/);
});

test('README.ZH.md links to the wiki, GitHub Releases, and the migration guide', () => {
  const body = read('README.ZH.md');
  assert.match(body, /\.\/wiki\/Home\.md|\(\.\/wiki\//);
  assert.match(body, /github\.com\/D0n9X1n\/hexo-tag-cloud\/releases/);
  assert.match(body, /docs\/migration-2\.x-to-3\.x\.md/);
});
