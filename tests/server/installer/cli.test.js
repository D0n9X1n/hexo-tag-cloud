'use strict';

/**
 * Unit tests for `lib/installer/cli.js` driven in-process via runCli().
 * Filesystem effects are scoped to per-test tmpdirs; fs failures are
 * simulated with an injected fs object.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const cli = require('../../../lib/installer/cli');
const { runCli, USAGE, scoreTemplate, readSiteConfig, locateTheme } = cli;

// ---------- helpers ------------------------------------------------------

function makeStreams() {
  const so = [];
  const se = [];
  return {
    stdout: { write: (s) => { so.push(String(s)); return true; } },
    stderr: { write: (s) => { se.push(String(s)); return true; } },
    out: () => so.join(''),
    err: () => se.join(''),
  };
}

function mkSite(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'htc-cli-' + name + '-'));
}

function writeFile(p, contents) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, contents, 'utf8');
}

const SIDEBAR = 'themes/landscape/layout/_partial/sidebar.ejs';

/** Hexo site with the plugin declared and a landscape sidebar. */
function landscapeSite(name, opts) {
  const cwd = mkSite(name);
  writeFile(path.join(cwd, '_config.yml'), (opts && opts.config) || 'theme: landscape\n');
  if (!(opts && opts.noPkg)) {
    writeFile(path.join(cwd, 'package.json'),
      JSON.stringify({ dependencies: { 'hexo-tag-cloud': '^3.1.0' } }));
  }
  writeFile(path.join(cwd, SIDEBAR), '<aside id="sidebar">\n  <p>w</p>\n</aside>\n');
  return cwd;
}

async function run(argv, cwd, fsImpl) {
  const s = makeStreams();
  const code = await runCli({ argv, cwd, stdout: s.stdout, stderr: s.stderr, fs: fsImpl });
  return { code, out: s.out(), err: s.err() };
}

// ---------- routing ------------------------------------------------------

test('no args / --help / -h → USAGE, exit 0', async () => {
  for (const argv of [[], ['--help'], ['-h']]) {
    const r = await run(argv, '/');
    assert.equal(r.code, 0);
    assert.equal(r.out, USAGE);
    assert.equal(r.err, '');
  }
});

test('USAGE documents subcommands, --target/--before, inject mode; no other tools', () => {
  for (const s of ['install', 'inspect', 'install-skill', '--target', '--before', 'inject: true']) {
    assert.ok(USAGE.includes(s), s);
  }
  assert.doesNotMatch(USAGE, /Cursor|Copilot|Codex|Gemini/);
});

test('unknown subcommand → exit 1 + USAGE on stderr', async () => {
  const r = await run(['frobnicate'], '/');
  assert.equal(r.code, 1);
  assert.match(r.err, /unknown subcommand: frobnicate/);
  assert.match(r.err, /Usage:/);
});

test('leading flag routes to install', async () => {
  const cwd = landscapeSite('flag-route');
  const r = await run(['--theme', 'landscape'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /\[dry-run\]/);
});

// ---------- install: argument + detection errors -------------------------

test('install: unknown flag → exit 1 parse error', async () => {
  const r = await run(['install', '--nope'], '/');
  assert.equal(r.code, 1);
  assert.match(r.err, /argument parse error/);
});

test('install: missing _config.yml → exit 1', async () => {
  const r = await run(['install'], mkSite('noconf'));
  assert.equal(r.code, 1);
  assert.match(r.err, /no _config\.yml found/);
});

test('install: unreadable/invalid _config.yml → exit 1', async () => {
  const cwd = mkSite('badyaml');
  writeFile(path.join(cwd, '_config.yml'), 'theme: [unclosed\n');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 1);
  assert.match(r.err, /failed to read _config\.yml/);
});

test('install: no theme field → exit 1', async () => {
  const cwd = mkSite('notheme');
  writeFile(path.join(cwd, '_config.yml'), 'title: x\n');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 1);
  assert.match(r.err, /no `theme:` field/);
});

test('install: empty config document → no theme field', async () => {
  const cwd = mkSite('emptyconf');
  writeFile(path.join(cwd, '_config.yml'), '');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 1);
  assert.match(r.err, /no `theme:` field/);
});

test('install: nested theme mapping → exit 1', async () => {
  const cwd = mkSite('nested');
  writeFile(path.join(cwd, '_config.yml'), 'theme:\n  name: butterfly\n');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 1);
  assert.match(r.err, /complex theme config/);
});

test('install: YAML alias for theme resolves (js-yaml, not regex)', async () => {
  const cwd = landscapeSite('alias', { config: 'pick: &t landscape\ntheme: *t\n' });
  const r = await run(['install'], cwd);
  assert.equal(r.code, 0, r.err);
});

test('install: unknown theme → exit 1 with inspect, --target, and inject hints', async () => {
  const cwd = mkSite('unknown');
  writeFile(path.join(cwd, '_config.yml'), 'theme: icarus\n');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 1);
  assert.match(r.err, /no built-in recipe for theme 'icarus'/);
  assert.match(r.err, /hexo-tag-cloud inspect/);
  assert.match(r.err, /--target/);
  assert.match(r.err, /inject: true/);
});

// ---------- install: happy paths ------------------------------------------

test('install: dry-run prints target, insertion point, block; does not write', async () => {
  const cwd = landscapeSite('dry');
  const before = fs.readFileSync(path.join(cwd, SIDEBAR), 'utf8');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.ok(r.out.includes('--- ' + path.join(cwd, SIDEBAR)));
  assert.match(r.out, /@@ insert before line 3: <\/aside> @@/);
  assert.match(r.out, /\+ {4}<%- tagcloud\(\) %>/);
  assert.match(r.out, /\[dry-run\] would write/);
  assert.equal(r.err, '');
  assert.equal(fs.readFileSync(path.join(cwd, SIDEBAR), 'utf8'), before);
});

test('install --apply writes inside </aside>; re-run is a noop', async () => {
  const cwd = landscapeSite('apply');
  let r = await run(['install', '--apply'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /wrote tag-cloud managed block/);
  assert.match(r.out, /hexo clean && hexo generate/);
  const after = fs.readFileSync(path.join(cwd, SIDEBAR), 'utf8');
  assert.match(after, /<p>w<\/p>\n<!-- hexo-tag-cloud:begin -->[\s\S]*<!-- hexo-tag-cloud:end -->\n<\/aside>\n$/);
  r = await run(['install', '--apply'], cwd);
  assert.equal(r.code, 0);
  assert.match(r.out, /already up-to-date/);
});

test('install: canvas flags flow into the block', async () => {
  const cwd = landscapeSite('canvas');
  const r = await run(['install', '--canvas-width', '300', '--canvas-height', '200',
    '--canvas-style', 'margin: 0 auto;'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /width="300" height="200" style="margin: 0 auto;"/);
});

test('install: edited block → exit 2; --apply --force overwrites', async () => {
  const cwd = landscapeSite('conflict');
  await run(['install', '--apply'], cwd);
  const p = path.join(cwd, SIDEBAR);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace('width="250"', 'width="999"'));
  let r = await run(['install', '--apply'], cwd);
  assert.equal(r.code, 2);
  assert.match(r.out, /^--- before/m);
  assert.match(r.err, /--apply --force/);
  assert.match(fs.readFileSync(p, 'utf8'), /width="999"/);
  r = await run(['install', '--apply', '--force'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(fs.readFileSync(p, 'utf8'), /width="250"/);
});

test('install: legacy snippet → exit 3, file untouched', async () => {
  const cwd = landscapeSite('legacy');
  const p = path.join(cwd, SIDEBAR);
  const legacy = '<aside>\n<canvas id="resCanvas"></canvas>\n<script src="/js/tagcloud.js"></script>\n</aside>\n';
  fs.writeFileSync(p, legacy);
  const r = await run(['install', '--apply'], cwd);
  assert.equal(r.code, 3);
  assert.match(r.err, /legacy hexo-tag-cloud install/);
  assert.equal(fs.readFileSync(p, 'utf8'), legacy);
});

test('install: --before overrides a built-in recipe anchor', async () => {
  const cwd = landscapeSite('before-override');
  fs.writeFileSync(path.join(cwd, SIDEBAR), '<aside>\n<div class="w">\n</div>\n</aside>\n');
  const r = await run(['install', '--before', '</div>'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /insert before line 3: <\/div>/);
});

// ---------- install: --target ---------------------------------------------

test('install --target: any theme, nunjucks engine, anchor insert', async () => {
  const cwd = mkSite('target');
  writeFile(path.join(cwd, '_config.yml'), 'theme: mytheme\n');
  writeFile(path.join(cwd, 'package.json'), JSON.stringify({ devDependencies: { 'hexo-tag-cloud': '*' } }));
  const tpl = path.join(cwd, 'themes/mytheme/layout/partials/aside.njk');
  writeFile(tpl, '<aside>\n</aside>\n');
  const r = await run(['install', '--target', 'layout/partials/aside.njk', '--before', '</aside>', '--apply'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(fs.readFileSync(tpl, 'utf8'), /\{\{ tagcloud\(\) \| safe \}\}\n[\s\S]*\n<\/aside>\n$/);
});

test('install --target .jsx → exit 1 with inject hint', async () => {
  const cwd = landscapeSite('jsx');
  const r = await run(['install', '--target', 'layout/common/widgets.jsx'], cwd);
  assert.equal(r.code, 1);
  assert.match(r.err, /unsupported template engine/);
  assert.match(r.err, /inject: true/);
});

test('install: missing target → exit 4 with inspect hint', async () => {
  const cwd = landscapeSite('missing');
  const r = await run(['install', '--target', 'layout/nope.ejs'], cwd);
  assert.equal(r.code, 4);
  assert.match(r.err, /expected template at .*nope\.ejs, not found/);
  assert.match(r.err, /inspect/);
});

test('install: read error (not ENOENT) → exit 4', async () => {
  const cwd = landscapeSite('readerr');
  const fakeFs = Object.create(fs);
  fakeFs.readFileSync = function (p, enc) {
    if (String(p).endsWith('sidebar.ejs')) { const e = new Error('EACCES nope'); e.code = 'EACCES'; throw e; }
    return fs.readFileSync(p, enc);
  };
  const r = await run(['install'], cwd, fakeFs);
  assert.equal(r.code, 4);
  assert.match(r.err, /failed to read .*sidebar\.ejs: EACCES nope/);
});

test('install --apply: write error → exit 4', async () => {
  const cwd = landscapeSite('writeerr');
  const fakeFs = Object.create(fs);
  fakeFs.writeFileSync = () => { throw new Error('read-only fs'); };
  const r = await run(['install', '--apply'], cwd, fakeFs);
  assert.equal(r.code, 4);
  assert.match(r.err, /failed to write .*read-only fs/);
});

// ---------- install: theme dir discovery + warnings -----------------------

test('install: plugin not in package.json → warning, still succeeds', async () => {
  const cwd = landscapeSite('noplugin', { noPkg: true });
  const r = await run(['install'], cwd);
  assert.equal(r.code, 0);
  assert.match(r.err, /warning: hexo-tag-cloud is not a dependency/);
  assert.match(r.err, /npm install hexo-tag-cloud --save/);
});

test('install: package.json without the plugin → warning', async () => {
  const cwd = landscapeSite('otherdeps');
  writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { hexo: '^7' } }));
  const r = await run(['install'], cwd);
  assert.match(r.err, /not a dependency/);
});

test('install: npm-installed theme found in node_modules/hexo-theme-<name> → warning', async () => {
  const cwd = mkSite('npmtheme');
  writeFile(path.join(cwd, '_config.yml'), 'theme: next\n');
  writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { 'hexo-tag-cloud': '*' } }));
  const tpl = path.join(cwd, 'node_modules/hexo-theme-next/layout/_macro/sidebar.njk');
  writeFile(tpl, '{% macro sidebar() %}\n<aside>\n</aside>\n{% endmacro %}\n');
  const r = await run(['install', '--apply'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, /inside node_modules/);
  assert.match(fs.readFileSync(tpl, 'utf8'), /tagcloud\(\) \| safe[\s\S]*<\/aside>\n\{% endmacro %}/);
});

test('install: local themes/<name> wins over node_modules', async () => {
  const cwd = landscapeSite('localwins');
  writeFile(path.join(cwd, 'node_modules/hexo-theme-landscape/layout/_partial/sidebar.ejs'), '</aside>\n');
  const r = await run(['install'], cwd);
  assert.equal(r.code, 0);
  assert.ok(r.out.includes(path.join(cwd, SIDEBAR)));
});

test('install --theme-dir (relative) + --theme without _config.yml', async () => {
  const cwd = mkSite('themedir');
  writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { 'hexo-tag-cloud': '*' } }));
  writeFile(path.join(cwd, 'custom/fluid-copy/layout/tags.ejs'), '<div>tags</div>\n');
  const r = await run(['install', '--theme', 'fluid', '--theme-dir', 'custom/fluid-copy'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.out, /append at end of file/);
});

test('install --theme-dir inside node_modules → warning', async () => {
  const cwd = mkSite('themedir-nm');
  writeFile(path.join(cwd, 'package.json'), JSON.stringify({ dependencies: { 'hexo-tag-cloud': '*' } }));
  writeFile(path.join(cwd, 'node_modules/x/layout/tags.ejs'), '<div/>\n');
  const r = await run(['install', '--theme', 'fluid', '--theme-dir', 'node_modules/x'], cwd);
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, /inside node_modules/);
});

// ---------- inspect --------------------------------------------------------

test('inspect: JSON report with ranked candidates and writable flags', async () => {
  const cwd = landscapeSite('inspect', { config: 'theme: landscape\ntag_cloud:\n  inject: true\n' });
  writeFile(path.join(cwd, 'themes/landscape/layout/index.ejs'), '<main/>\n');
  writeFile(path.join(cwd, 'themes/landscape/layout/widget/tags.jsx'), 'tagcloud(');
  writeFile(path.join(cwd, 'themes/landscape/layout/notes.txt'), 'x');
  const r = await run(['inspect'], cwd);
  assert.equal(r.code, 0, r.err);
  const j = JSON.parse(r.out);
  assert.equal(j.siteRoot, cwd);
  assert.equal(j.configFound, true);
  assert.equal(j.pluginInstalled, true);
  assert.equal(j.injectEnabled, true);
  assert.equal(j.theme, 'landscape');
  assert.equal(j.themeDir, path.join(cwd, 'themes/landscape'));
  assert.equal(j.themeDirExists, true);
  assert.equal(j.themeInNodeModules, false);
  assert.deepEqual(j.builtInRecipe, { file: 'layout/_partial/sidebar.ejs', engine: 'ejs', before: '</aside>' });
  assert.equal(j.candidates[0].path, 'layout/_partial/sidebar.ejs');
  assert.equal(j.candidates[0].hasAsideClose, true);
  const jsx = j.candidates.find((c) => c.path.endsWith('.jsx'));
  assert.equal(jsx.engine, 'jsx');
  assert.equal(jsx.writable, false);
  assert.ok(!j.candidates.some((c) => c.path.endsWith('.txt')));
});

test('inspect: unknown theme, missing layout dir, string inject flag', async () => {
  const cwd = mkSite('inspect-unknown');
  writeFile(path.join(cwd, '_config.yml'), 'theme: icarus\ntag_cloud:\n  inject: "true"\n');
  const r = await run(['inspect'], cwd);
  assert.equal(r.code, 0);
  const j = JSON.parse(r.out);
  assert.equal(j.builtInRecipe, null);
  assert.equal(j.themeDirExists, false);
  assert.deepEqual(j.candidates, []);
  assert.equal(j.pluginInstalled, false);
  assert.equal(j.injectEnabled, true);
});

test('inspect: ties sort by path; depth limit stops deep recursion; cap at 20', async () => {
  const cwd = landscapeSite('inspect-many');
  const base = path.join(cwd, 'themes/landscape/layout');
  for (let i = 0; i < 25; i++) writeFile(path.join(base, 'p' + String(i).padStart(2, '0') + '.ejs'), '');
  writeFile(path.join(base, 'a/b/c/d/e/f/deep-sidebar.ejs'), '</aside>');
  writeFile(path.join(base, 'a/b/c/d/e/ok-sidebar.ejs'), '');
  const j = JSON.parse((await run(['inspect'], cwd)).out);
  assert.equal(j.candidates.length, 20);
  assert.ok(!j.candidates.some((c) => c.path.includes('deep-sidebar')));
  assert.ok(j.candidates.some((c) => c.path.includes('ok-sidebar')));
  const zeros = j.candidates.filter((c) => c.score === 0).map((c) => c.path);
  assert.deepEqual(zeros, [...zeros].sort());
});

test('inspect: --theme-dir and --theme override detection', async () => {
  const cwd = mkSite('inspect-flags');
  writeFile(path.join(cwd, 'x/layout/side.pug'), 'aside');
  const j = JSON.parse((await run(['inspect', '--theme', 'whatever', '--theme-dir', 'x'], cwd)).out);
  assert.equal(j.theme, 'whatever');
  assert.equal(j.configFound, false);
  assert.equal(j.candidates[0].engine, 'pug');
});

test('inspect: parse error and detection error → exit 1', async () => {
  let r = await run(['inspect', '--bogus'], '/');
  assert.equal(r.code, 1);
  assert.match(r.err, /argument parse error/);
  r = await run(['inspect'], mkSite('inspect-noconf'));
  assert.equal(r.code, 1);
  assert.match(r.err, /no _config\.yml found/);
});

// ---------- helpers exported for reuse ------------------------------------

test('scoreTemplate weights path and content signals', () => {
  assert.equal(scoreTemplate('layout/index.ejs', ''), 0);
  assert.ok(scoreTemplate('layout/_partial/sidebar.ejs', '</aside>') >
    scoreTemplate('layout/_partial/footer.ejs', ''));
  assert.ok(scoreTemplate('layout/x.ejs', '<!-- hexo-tag-cloud:begin -->') >= 10);
  assert.equal(scoreTemplate('layout/widget/card_tags.pug', 'cloudTags('), 3 + 3 + 2);
});

test('readSiteConfig: non-object YAML and broken package.json', () => {
  const cwd = mkSite('rsc');
  writeFile(path.join(cwd, '_config.yml'), '42\n');
  writeFile(path.join(cwd, 'package.json'), '{nope');
  const r = readSiteConfig(cwd, fs);
  assert.equal(r.found, true);
  assert.deepEqual(r.config, {});
  assert.equal(r.pluginInstalled, false);
  assert.equal(r.injectEnabled, false);
});

test('locateTheme: --theme without config skips detection', () => {
  const site = { error: 'boom' };
  const t = locateTheme('/s', { theme: 'x' }, site, fs);
  assert.deepEqual(t, { name: 'x', dir: path.join('/s', 'themes', 'x'), inNodeModules: false });
  assert.deepEqual(locateTheme('/s', {}, site, fs), { error: 'boom' });
});
