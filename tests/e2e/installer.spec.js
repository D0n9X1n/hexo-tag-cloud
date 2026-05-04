'use strict';

/**
 * Sub-project C — installer E2E (spec AC #8 a–f).
 *
 * Cases (a, c, d, e, f) spawn the bin against a tmpdir-copied
 * landscape-bare fixture; no browser is required for them but they
 * still live under tests/e2e/ per spec AC #8 to keep the install
 * contract tested as one suite.
 *
 * Case (b) is the real-consumer integration path: copies the fixture
 * into a tmpdir, runs `npm install` (idempotent), invokes the bin
 * with `--apply`, then `hexo clean && hexo generate`, serves the
 * resulting `public/` over loopback, and asserts the homepage carries
 * the canvas + the plugin scripts.
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawnSync } = require('node:child_process');

const { test, expect } = require('./fixtures');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const FIXTURE_SRC = path.join(REPO_ROOT, 'tests/fixtures/landscape-bare');
const BIN = path.join(REPO_ROOT, 'bin/hexo-tag-cloud-install.js');

const SIDEBAR_REL = 'themes/landscape/layout/_partial/sidebar.ejs';

// ------------------------------------------------------------------ helpers

/** Recursive directory copy, skipping node_modules + public + db.json. */
function copyFixture(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === 'public' || ent.name === 'db.json') {
      continue;
    }
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyFixture(s, d);
    else if (ent.isFile()) fs.copyFileSync(s, d);
  }
}

function makeTmpFixture(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'htc-installer-' + label + '-'));
  copyFixture(FIXTURE_SRC, dir);
  return dir;
}

function runBin(args, cwd) {
  return spawnSync(process.execPath, [BIN].concat(args), {
    cwd,
    env: process.env,
    encoding: 'utf8',
  });
}

// =================================================================== (a)

test('installer (a): dry-run prints diff containing canvas + tagcloud scripts', () => {
  const tmp = makeTmpFixture('a');
  const r = runBin(['install'], tmp); // explicit subcommand; bare invocation prints USAGE
  expect(r.status, 'expected exit 0; stderr: ' + r.stderr).toBe(0);
  // Dry-run must print a unified diff containing the canvas + plugin
  // script tags so the user (or AI agent) can review BEFORE --apply.
  expect(r.stdout, 'dry-run must include canvas tag in the diff').toContain('<canvas id="resCanvas"');
  expect(r.stdout, 'dry-run must include /js/tagcloud.js in the diff').toContain('/js/tagcloud.js');
  expect(r.stdout, 'dry-run must include /js/tagcanvas.js in the diff').toContain('/js/tagcanvas.js');
  expect(r.stdout, 'dry-run summary should mention target path').toContain(SIDEBAR_REL);
  expect(r.stdout).toMatch(/dry-run.*would write/);

  // Verify the file was NOT mutated
  const before = fs.readFileSync(path.join(FIXTURE_SRC, SIDEBAR_REL), 'utf8');
  const after = fs.readFileSync(path.join(tmp, SIDEBAR_REL), 'utf8');
  expect(after).toBe(before);
});

test('installer (a-bis): `--apply` writes the canvas + script tags into sidebar.ejs', () => {
  const tmp = makeTmpFixture('a-bis');
  const r = runBin(['install', '--apply'], tmp);
  expect(r.status, 'expected exit 0; stderr: ' + r.stderr).toBe(0);
  const after = fs.readFileSync(path.join(tmp, SIDEBAR_REL), 'utf8');
  expect(after).toContain('<canvas id="resCanvas"');
  expect(after).toContain('/js/tagcloud.js');
  expect(after).toContain('/js/tagcanvas.js');
  expect(after).toMatch(/<!-- hexo-tag-cloud:begin -->/);
  expect(after).toMatch(/<!-- hexo-tag-cloud:end -->/);
});

// =================================================================== (c) idempotent

test('installer (c): re-running --apply is a no-op (idempotent)', () => {
  const tmp = makeTmpFixture('c');
  const r1 = runBin(['install', '--apply'], tmp);
  expect(r1.status, 'first apply must succeed; stderr: ' + r1.stderr).toBe(0);
  const after1 = fs.readFileSync(path.join(tmp, SIDEBAR_REL), 'utf8');

  const r2 = runBin(['install', '--apply'], tmp);
  expect(r2.status, 'second apply must succeed; stderr: ' + r2.stderr).toBe(0);
  expect(r2.stdout).toMatch(/already.*up.?to.?date|no changes/i);

  const after2 = fs.readFileSync(path.join(tmp, SIDEBAR_REL), 'utf8');
  expect(after2).toBe(after1);
});

// =================================================================== (d) conflict

test('installer (d): editing the managed block then re-running --apply exits 2', () => {
  const tmp = makeTmpFixture('d');
  const r1 = runBin(['install', '--apply'], tmp);
  expect(r1.status, 'first apply must succeed; stderr: ' + r1.stderr).toBe(0);

  const sidebarPath = path.join(tmp, SIDEBAR_REL);
  let body = fs.readFileSync(sidebarPath, 'utf8');
  // Mutate the canvas width inside the managed block
  body = body.replace('width="500"', 'width="999"');
  expect(body).toContain('width="999"');
  fs.writeFileSync(sidebarPath, body, 'utf8');

  const r2 = runBin(['install', '--apply'], tmp);
  expect(r2.status, 'expected exit 2 on user-edit conflict; stdout: ' + r2.stdout +
    '; stderr: ' + r2.stderr).toBe(2);
  expect(r2.stderr).toMatch(/--force/);

  // File was NOT touched
  const afterConflict = fs.readFileSync(sidebarPath, 'utf8');
  expect(afterConflict).toBe(body);
  expect(afterConflict).toContain('width="999"');
});

// =================================================================== (e) force-replace

test('installer (e): same case re-run with --apply --force overwrites the user edit', () => {
  const tmp = makeTmpFixture('e');
  const r1 = runBin(['install', '--apply'], tmp);
  expect(r1.status).toBe(0);

  const sidebarPath = path.join(tmp, SIDEBAR_REL);
  let body = fs.readFileSync(sidebarPath, 'utf8');
  body = body.replace('width="500"', 'width="999"');
  fs.writeFileSync(sidebarPath, body, 'utf8');

  const r2 = runBin(['install', '--apply', '--force'], tmp);
  expect(r2.status, 'expected --force success; stderr: ' + r2.stderr).toBe(0);
  const afterForce = fs.readFileSync(sidebarPath, 'utf8');
  expect(afterForce).not.toContain('width="999"');
  expect(afterForce).toContain('width="500"');
});

// =================================================================== (f) install-skill dry-run

test('installer (f): install-skill --dry-run --target prints planned ops, exits 0, no fs writes', () => {
  const target = path.join(os.tmpdir(), 'htc-skill-dryrun-' + Date.now());
  // Make sure target does NOT exist
  expect(fs.existsSync(target)).toBe(false);
  const r = runBin(['install-skill', '--dry-run', '--target', target], REPO_ROOT);
  expect(r.status, 'expected exit 0; stderr: ' + r.stderr).toBe(0);
  expect(r.stdout).toMatch(/\[dry-run\] would copy/);
  expect(r.stdout).toContain('SKILL.md');
  expect(fs.existsSync(target), 'dry-run must NOT create the target dir').toBe(false);
});

// =================================================================== (b) full real-consumer integration

test.describe('installer (b) — real-consumer integration', () => {
  test.setTimeout(180000); // npm install + hexo generate + serve + browser

  let tmpDir;
  let serverHandle;

  test.beforeAll(async () => {
    const { ensureFixtureInstalled } = require('../helpers/ensureFixtureInstalled');
    const { generateSite } = require('../helpers/generateSite');
    const { serveSite } = require('../helpers/serveSite');

    tmpDir = makeTmpFixture('b');

    // npm install hexo + plugins into the tmpdir copy
    await ensureFixtureInstalled(tmpDir);

    // Run the installer with --apply
    const r = runBin(['install', '--apply'], tmpDir);
    if (r.status !== 0) {
      throw new Error('installer --apply failed: ' + r.status + '\n' +
        'stdout=' + r.stdout + '\nstderr=' + r.stderr);
    }

    // hexo clean && hexo generate
    const { publicDir } = await generateSite({ cwd: tmpDir });

    // serve the generated public/ over loopback
    serverHandle = await serveSite({ root: publicDir });
  });

  test.afterAll(async () => {
    if (serverHandle && typeof serverHandle.close === 'function') {
      await serverHandle.close();
    }
  });

  test('homepage carries the canvas + plugin scripts after installer --apply', async ({ page }) => {
    const response = await page.goto(serverHandle.url + '/');
    expect(response.status()).toBe(200);
    const html = await page.content();
    expect(html).toMatch(/<canvas[^>]+id="resCanvas"/);
    const scripts = await page.locator('script[src]').evaluateAll(
      (els) => els.map((el) => el.getAttribute('src')));
    expect(scripts.some((s) => /\/js\/tagcloud\.js$/.test(s)),
      'expected /js/tagcloud.js in: ' + JSON.stringify(scripts)).toBe(true);
    expect(scripts.some((s) => /\/js\/tagcanvas\.js$/.test(s)),
      'expected /js/tagcanvas.js in: ' + JSON.stringify(scripts)).toBe(true);
  });
});
