# Sub-project A — TDD + CI Foundation Parity

**Date:** 2026-05-03
**Track:** Complex (sub-project of v3.0.0 overhaul)
**Author:** PM (claude-opus-4.7-xhigh)
**Status:** awaiting cross-audit

## Purpose

Lift `hexo-tag-cloud`'s engineering harness to parity with sibling
`hexo-blog-encrypt` (lint, unit + e2e tests, 100 % coverage gate, CI on
Node 20)
without changing any runtime behavior of `index.js`. This sub-project is the
rails on which B (refactor + non-ASCII fix), C (AI skill), and D (release)
will run.

## Non-goals (explicit)

- **No** edits to `index.js` runtime logic. Tests must pass against the
  current implementation byte-for-byte. Behavior changes belong in B.
- **No** new features, no demo site, no docs site, no CHANGELOG yet. Those
  belong in D.
- **No** browser bundle / esbuild / `build/build.js`. The current plugin
  generates `lib/tagcloud.js` at hexo-runtime; there is no source bundle.
- **No** release / publish / deploy-demo workflows. D adds them.

## Files touched

Added:
- `.editorconfig`
- `.eslintrc.js` (replaces existing `.eslintrc.json`; sibling-style overrides
  PLUS the lint-accommodation block specified below — required because A
  forbids touching `index.js` while sibling's `extends: 'eslint:recommended'`
  would fire `no-undef` on the `hexo` global and `no-unused-vars` on the
  current `var Hexo = require("hexo")` and the unused `post` callback arg)
- `.eslintignore`
- `tests/server/index.test.js` — unit tests for current `index.js`
- `tests/docs.test.js` — docs-as-tests for `README.md` + `README.ZH.md`
- `tests/e2e/playwright.config.js`
- `tests/e2e/global-setup.js`
- `tests/e2e/fixtures.js`
- `tests/e2e/smoke.spec.js` — single passing E2E
- `tests/helpers/install-fixture.js`
- `tests/helpers/ensureFixtureInstalled.js`
- `tests/helpers/generateSite.js`
- `tests/helpers/serveSite.js`
- `tests/fixtures/hexo-site/{_config.yml,package.json,source/,themes/fixture-theme/}` —
  minimal hexo site with a custom fixture theme that loads `hexo-tag-cloud`
  per the README pattern. Stock landscape is NOT used — its partials don't
  emit the plugin's `<script>` tags, so e2e smoke would fail. Custom
  fixture theme (an ~10-line `layout/index.ejs`) keeps the e2e independent
  of any third-party theme.
- `.github/workflows/test.yml` — copy of sibling shape: lint + server
  (with coverage) + e2e on Node 20. **Single e2e job** (NOT 4-way sharded);
  Playwright fails empty shards and A only ships one smoke spec. Sharding
  re-introduced in D once spec count justifies it.
- `.gitignore` additions: `coverage/`, `tests/e2e/{playwright-report,test-results}/`,
  `tests/fixtures/hexo-site/{node_modules,public,db.json}`

Modified:
- `package.json` — add `engines.node>=18`, `peerDependencies.hexo>=5`, devDeps
  (`eslint@^6`, `c8@^10`, `@playwright/test@^1.45`, `hexo@^7`,
  `hexo-renderer-marked@^7`), scripts (`lint`, `test`, `test:server`,
  `test:e2e`, `test:docs`, `pretest:server`).

Removed:
- `.eslintrc.json` (replaced by `.eslintrc.js` to match sibling pattern and
  enable env overrides for browser vs node code that B will introduce).

## Behavior

1. `npm run lint` — eslint `--ext .js ./` with sibling's overrides pattern;
   ignores `demo/`, `lib/tagcanvas.js` (third-party). Eslint config MUST
   include — to keep current `index.js` byte-for-byte untouched:
   - `globals: { hexo: 'readonly' }` (top-level)
   - `overrides: [{ files: ['index.js'], rules: { 'no-unused-vars': ['error', { args: 'none', varsIgnorePattern: '^Hexo$' }] } }]`
   These exceptions are explicitly **temporary**: sub-project B's refactor
   removes the dead `Hexo` import and the unused `post` arg, after which
   B's spec is required to delete the override and tighten back to sibling
   defaults. A "lint-tightening" must-pass test in B will assert the
   override no longer exists in `.eslintrc.js`.
2. `npm run pretest:server` — runs `tests/helpers/install-fixture.js` once
   to install the fixture site's `node_modules` (idempotent).
3. `npm run test:server` — `c8 --check-coverage --lines=100 --functions=100
   --branches=100 --statements=100 --include=index.js node --test
   tests/server/*.test.js tests/docs.test.js`.
4. `npm run test:e2e` — installs fixture deps, runs `playwright install
   --with-deps chromium`, then `playwright test --config
   tests/e2e/playwright.config.js`.
5. `npm run test:docs` — `node --test tests/docs.test.js` (sub-set of
   test:server, kept callable for fast doc-only iteration).
6. `npm test` — `npm run lint && npm run test:server && npm run test:e2e`.
7. CI workflow `test.yml` — two jobs (`lint-and-server`, `e2e`); e2e
   single job (NOT sharded — A has one smoke spec; D re-introduces a
   `[1,2,3,4]` matrix once the spec count justifies it); uploads coverage
   and on-failure Playwright report.
8. `index.js` is exercised by mocking `global.hexo`, capturing
   `hexo.extend.filter.register` callbacks, then invoking each captured
   callback under stubbed `hexo-fs` to assert correct file paths and content
   for every config branch (default, fully-customized, partial overrides).

## Test approach (must-pass)

- **RED phase first**: every test file lands as a failing commit, then
  config/harness wired in to make it green.
- **Coverage gate is the contract.** `c8` set to 100 % for `index.js`. Any
  uncovered branch fails CI. Coverage gate is the universal hard gate
  enforcing TDD discipline going forward.
- **Must-pass command**: `npm test` exits 0 on a clean clone after `npm
  install`.
- **Equivalence test**: a snapshot test asserts `tagcloud.js` output bytes
  are identical before and after the harness is added (proves no behavior
  drift). Snapshot stored at `tests/server/__snapshots__/tagcloud.default.js`.

## Lint-accommodation contract (binding on B)

A ships with a deliberate, narrowly-scoped lint exception for `index.js`
(see Behavior #1 above). B inherits the obligation to delete it. The
verifying must-pass test that lands in B:

```js
// tests/server/lint-config.test.js (B)
test('A''s temporary index.js lint override has been removed', () => {
  const cfg = require('../../.eslintrc.js');
  const has = (cfg.overrides || []).some(o =>
    Array.isArray(o.files) && o.files.includes('index.js'));
  assert.equal(has, false, 'B must delete A''s temporary index.js override');
});
```

This makes the "narrow exception" auditable rather than load-bearing.

## Risks + mitigations

- **Risk**: tagcanvas.js (third-party, `lib/tagcanvas.js`, ~30 KB minified)
  trips lint. **Mitigation**: `.eslintignore` it.
- **Risk**: 100 % coverage gate on the existing `index.js` may be hard to
  hit because the file's branches depend on `hexo.config.tag_cloud` shape
  (six independent `if` branches). **Mitigation**: the unit test fixture
  table parametrises all 64 (= 2⁶) presence combinations; the runtime
  cost is < 1 s.
- **Risk**: fixture site `node_modules` is heavy. **Mitigation**: gitignored
  + cached in CI by hash of `tests/fixtures/hexo-site/package.json`.
- **Risk**: Playwright browser install slow in dev. **Mitigation**:
  `npm run test:server` does NOT depend on Playwright; devs can iterate
  fast on unit tests alone.

## Done definition

- All 8 must-pass behaviors above verified locally with output pasted to PR.
- CI green on the feature branch.
- Cross-auditor returns PASS.
- Code-review subagent returns PASS or non-CRITICAL.

## Decomposition guard

If the architect's plan exceeds 500 lines or introduces > 15 implementation
tasks, decompose A into A1 (lint + unit + coverage gate) and A2 (e2e + CI),
shipped sequentially.
