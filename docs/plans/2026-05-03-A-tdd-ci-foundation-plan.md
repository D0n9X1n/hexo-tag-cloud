# Sub-project A — Implementation Plan

**Spec:** `docs/specs/2026-05-03-A-tdd-ci-foundation-design.md`
**Branch:** `feature/v3-overhaul`
**Status:** awaiting cross-audit (gate #3)
**Author:** PM (claude-opus-4.7-xhigh) — architect role merged into PM
because spec is already plan-shaped and work is largely mechanical.

## Sequence rationale

`T2` (package.json + npm install) MUST come first — every subsequent task
needs eslint, c8, hexo, or @playwright/test installed. After that, three
threads are independent:

```
        ┌── α: T5 (unit) → T6 (docs)
T2 ─ T1 ┤
        ├── β: T3 (fixture) → T4 (helpers) → T7 (e2e specs)
        └── γ: T8 (CI) + T9 (.gitignore)
                                              ↓
                                       T10 → T11 (integrate + verify)
```

PM executes directly (no dev subagent dispatches) — each task is small,
mechanical, sibling-parallel. Cost target: 1 cross-audit dispatch on plan,
1 code-review dispatch on the integrated diff before declaring A done.

Per-task verification command is the hard gate at every step. No "done"
without paste-able output.

---

## T1 — Lint + editorconfig

**Files:**
- ADD `.editorconfig` (sibling-byte-equivalent)
- ADD `.eslintignore` (lines: `demo/`, `lib/tagcanvas.js`, `tests/fixtures/hexo-site/node_modules/`, `tests/fixtures/hexo-site/public/`, `coverage/`)
- ADD `.eslintrc.js` (sibling pattern + accommodation block)
- DELETE `.eslintrc.json`

**Eslint config exact shape:**
```js
module.exports = {
  env: { browser: true, commonjs: true, es6: true, node: true },
  extends: 'eslint:recommended',
  parserOptions: { ecmaVersion: 2020 },
  globals: { hexo: 'readonly' },
  ignorePatterns: ['demo/', 'lib/tagcanvas.js', 'coverage/',
                   'tests/fixtures/hexo-site/node_modules/',
                   'tests/fixtures/hexo-site/public/'],
  overrides: [
    {
      files: ['index.js'],
      rules: { 'no-unused-vars':
        ['error', { args: 'none', varsIgnorePattern: '^Hexo$' }] },
    },
    {
      files: ['src/server/**/*.js', 'build/**/*.js', 'tests/**/*.js'],
      env: { browser: false, commonjs: true, es6: true, node: true },
    },
  ],
};
```
*(`src/browser` override deferred to B — none yet.)*

**Verification:** `npx eslint --ext .js ./` → exit 0. Paste output.

---

## T2 — package.json + lockfile refresh

**Files:** modify `package.json`. Run `npm install` to refresh
`package-lock.json`.

**Required additions:**
- `"engines": { "node": ">=18" }`
- `"peerDependencies": { "hexo": ">=5" }`
- `"files": ["index.js", "lib/"]` (locks tarball contents — no fixtures
  shipped)
- `"devDependencies"`:
  - `"eslint": "^6.2.2"` (sibling pin)
  - `"c8": "^10"`
  - `"@playwright/test": "^1.45"`
  - `"hexo": "^7"`
  - `"hexo-renderer-marked": "^7"`
  - `"hexo-renderer-ejs": "^2"` (for landscape-style fixture themes if used)
- `"scripts"`:
  - `"lint": "eslint --ext .js ./"`
  - `"pretest:server": "node tests/helpers/install-fixture.js"`
  - `"test:server": "c8 --reporter=text --reporter=lcov --include=index.js --check-coverage --lines=100 --functions=100 --branches=100 --statements=100 node --test tests/server/*.test.js tests/docs.test.js"`
  - `"test:docs": "node --test tests/docs.test.js"`
  - `"test:e2e": "cd tests/fixtures/hexo-site && (test -d node_modules || npm install --no-audit --no-fund) && cd ../../.. && playwright install --with-deps chromium && playwright test --config tests/e2e/playwright.config.js"`
  - `"test": "npm run lint && npm run test:server && npm run test:e2e"`

**Preserve:** `name`, `version` (still 2.1.2 — D bumps to 3.0.0),
`description`, `keywords`, `license`, `main`, `repository`, `bugs`,
`maintainers`, existing prod `dependencies` (`hexo-fs`, `hexo-log`).

**Update:** `author` from `"mike"` to `"D0n9X1n"` (this is D0n9X1n's fork,
matches sibling); `bugs.url` to `D0n9X1n/hexo-tag-cloud`; `repository.url`
similar.

**Verification:** `npm install --no-audit --no-fund` → exit 0; `cat
package.json | jq '.scripts'` shows all 6 scripts.

---

## T3 — Fixture hexo site

**Path:** `tests/fixtures/hexo-site/`

**Files:**
- `_config.yml` — minimal site (`title`, `url: http://localhost`, `tag_dir: tags`, `permalink: :title/`, `theme: fixture-theme`, `tag_cloud:` block with all six knobs explicitly set so coverage hits the customize branches in `index.js`).
- `package.json` — `"hexo-tag-cloud": "file:../../.."`, `hexo@^7`, `hexo-renderer-ejs@^2`, `hexo-renderer-marked@^7`. Marked `private: true`. *(Stock landscape is NOT used — see T3 theme rationale.)*
- `source/_posts/hello-world.md` — ASCII tags `[a, b, c]`.
- `source/_posts/cjk-tags.md` — CJK tags `[中文, 日本語, 한국어]` and Cyrillic `[Привет]`. *Lands in A but only loaded by the e2e site build; B's tests will assert on the rendered output.*
- `themes/fixture-theme/_config.yml` — empty.
- `themes/fixture-theme/layout/index.ejs` — minimal page that wires the
  plugin scripts as the README documents:
  ```ejs
  <!doctype html><html><head><title><%= config.title %></title></head>
  <body>
    <% if (site.tags.length) { %>
      <script type="text/javascript" src="<%- url_for('/js/tagcloud.js') %>"></script>
      <script type="text/javascript" src="<%- url_for('/js/tagcanvas.js') %>"></script>
      <div id="myCanvasContainer">
        <canvas id="resCanvas" width="250" height="250"><%- tagcloud() %></canvas>
      </div>
    <% } %>
  </body></html>
  ```
  *Rationale (per round-2 cross-audit): stock landscape's partials do not
  load `tagcloud.js`/`tagcanvas.js` — the README tells users to patch
  the theme. A custom fixture theme is the only way the e2e smoke can
  assert the plugin's intended HTML wiring without us editing
  `node_modules/hexo-theme-landscape` at test time (anti-pattern).*

**Verification:** `cd tests/fixtures/hexo-site && npm install --no-audit --no-fund && npx hexo clean && npx hexo generate` → `public/index.html` exists AND contains `<script ... src="/js/tagcloud.js">`; `public/js/tagcloud.js` exists; `public/js/tagcanvas.js` exists.

---

## T4 — Test helpers

**Path:** `tests/helpers/`

**Files (adapted from sibling):**
- `ensureFixtureInstalled.js` — same as sibling: idempotent `npm install` in fixture dir.
- `install-fixture.js` — CLI wrapper for `pretest:server`.
- `generateSite.js` — `hexo clean && hexo generate` against fixture, returns `public/` path.
- `serveSite.js` — small static HTTP server (sibling style, used by Playwright `global-setup.js`).

**Verification:** `node tests/helpers/install-fixture.js` → no error, fixture `node_modules/` populated.

---

## T5 — Unit tests + 100 % coverage

**Path:** `tests/server/index.test.js`

**Mocking strategy (Node-18-compatible, no experimental flags):**
1. **Pre-populate `require.cache`** with stubbed `hexo-fs` BEFORE the first
   `require('../../index.js')`, capturing every `copyFile` / `writeFile`
   call. Pattern:
   ```js
   const calls = { copyFile: [], writeFile: [] };
   const stubFs = {
     copyFile: (...a) => calls.copyFile.push(a),
     writeFile: (...a) => calls.writeFile.push(a),
   };
   require.cache[require.resolve('hexo-fs')] = {
     id: require.resolve('hexo-fs'), filename: require.resolve('hexo-fs'),
     loaded: true, exports: stubFs,
   };
   ```
2. Set `global.hexo = makeFakeHexo(config)` returning a stub with
   `extend.filter.register`, `base_dir`, `public_dir`, and `config`. The
   `register` stub captures the callback.
3. **Force a fresh load** of `index.js` per test case:
   `delete require.cache[require.resolve('../../index.js')];
   require('../../index.js');`
4. Invoke the captured callback with a sentinel `post` arg.
5. Assert: `copyFile` called once with `lib/tagcanvas.js` →
   `public/js/tagcanvas.js`; `writeFile` called once with
   `public/js/tagcloud.js` and content matching expected per-config snapshot.

`require.cache` injection is the long-standing CJS test pattern; works on
every supported Node (18+), zero flags. Avoids `node:test`'s `mock.module()`
which is Node-22-stable / Node-20-flag-gated.

**Test table** — minimum coverage set: 1 row for default (no `tag_cloud`
key) + 6 rows each setting exactly one knob (covers each `if` branch's
TRUE arm; FALSE arms covered by the default row) + 1 row with all 6 set
together (defence-in-depth, surfaces interactions in `.replace()`
sequencing) + 1 row with `pauseOnSelected: false` (covers the
`!= undefined` branch's FALSE→`pauseOnSelected = false` path explicitly,
which is distinct from `tag_cloud.pauseOnSelected` undefined). **9 cases
total**, < 1 s runtime, hits 100 % branches.

**Snapshot file:** `tests/server/__snapshots__/tagcloud.default.js` — exact byte content of `tagcloud.js` for default config. Test reads it and asserts equal. Snapshot is COMMITTED in the same commit as the test.

**Verification:** `npx c8 --include=index.js --check-coverage --lines=100 --functions=100 --branches=100 --statements=100 node --test tests/server/index.test.js` → exit 0. Paste coverage table.

---

## T6 — Docs-as-tests (light)

**Path:** `tests/docs.test.js`

**Assertions (all must hold against current `README.md`):**
- File exists.
- Contains `## How to Use` (or `## How To Use`).
- Mentions `tag_cloud` config block.
- Links to repo issues page.
- `README.ZH.md` exists and references `tag_cloud`.

D will expand this to enforce a fuller docs contract. A keeps it minimal
to not block on D's README rewrite.

**Verification:** `node --test tests/docs.test.js` → exit 0.

---

## T7 — E2E harness

**Path:** `tests/e2e/`

**Files:**
- `playwright.config.js` — sibling pattern: `testDir: '.'`, chromium project, sharded-friendly, `globalSetup: './global-setup.js'`, html report under `playwright-report/`, results under `test-results/`.
- `global-setup.js` — calls `ensureFixtureInstalled` + `generateSite` + `serveSite`; writes baseURL to `process.env.E2E_BASE_URL`.
- `fixtures.js` — Playwright `test.extend` providing `baseURL`.
- `smoke.spec.js` — opens `/`, asserts:
  1. response 200,
  2. `<script src*="/js/tagcloud.js">` and `<script src*="/js/tagcanvas.js">` both present in HTML,
  3. `tagcloud.js` HTTP fetch returns 200 with `TagCanvas.Start('resCanvas')` substring.

**Verification:** `npx playwright install chromium && npx playwright test --config tests/e2e/playwright.config.js` → exit 0.

---

## T8 — CI workflow

**Path:** `.github/workflows/test.yml`

Two jobs:
1. `lint-and-server` — Node 20, npm cache, `npm install`, fixture install, `npm run lint`, `npm run test:server`, upload `coverage/` artifact.
2. `e2e` — single job (NOT sharded yet — A has one smoke spec; per round-2
   audit, sharding empty workers fails). Playwright cache, fixture deps,
   `playwright install`, `playwright test --config tests/e2e/playwright.config.js`.
   Upload `playwright-report/` and `test-results/` on failure. **D**
   re-introduces the 4-shard matrix once there are enough specs to
   justify it.

**Verification:** `gh workflow run --ref feature/v3-overhaul Tests` after push, OR (locally) `act -j lint-and-server` if user has `act`. Otherwise: visual diff against sibling's `test.yml` shape + `npm test` clean locally is the proxy.

---

## T9 — `.gitignore`

Add:
```
coverage/
tests/e2e/playwright-report/
tests/e2e/test-results/
tests/fixtures/hexo-site/node_modules/
tests/fixtures/hexo-site/public/
tests/fixtures/hexo-site/db.json
tests/fixtures/hexo-site/package-lock.json
```

**Verification:** `git status --short` shows none of the above as untracked
after a fixture build.

---

## T10 — Wiring + sanity

- Confirm `pretest:server` runs `install-fixture.js` cleanly on a clean clone.
- Confirm `npm test` runs lint → server → e2e in one pass.

---

## T11 — Final integration + commit cadence

Each task above lands as a SEPARATE commit on `feature/v3-overhaul` so that
the diff is bisectable and the cross-auditor's QA pass at the end can
review per-commit if it wants to.

After T11: dispatch ONE `code-review` subagent on `gpt-5.5` (different
family from PM) with the FULL `git diff master..feature/v3-overhaul` for
this sub-project, in **one-clue mode**. PASS = A is done; CRITICAL =
fix loop (max 3 cycles); IMPORTANT = PM judges.

## Cost telemetry (recorded at the end of A)

Format mirrors framework requirement; PM will append at A's completion.
