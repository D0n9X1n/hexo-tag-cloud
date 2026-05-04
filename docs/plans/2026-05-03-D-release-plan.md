# Sub-project D — implementation plan: v3.0.0 release

**Date:** 2026-05-03 | **PM:** `claude-opus-4.7-xhigh`
**Audit basis:** 2-model agreement (gate #3 substitute per user override)
**Spec:** `docs/specs/2026-05-03-D-release-design.md` (993 words, gate #2 PASS)
**Branch:** `feature/v3-overhaul`
**Cap:** ≤500 lines

## Task graph

```
T1 (CHANGELOG)        ─┐
T2 (migration doc)    ─┤
T3 (.gitignore fix)   ─┼─→ T4 (build/verify-pack.js + tests)
                       │           │
                       │           ↓
                       │   T5 (release.yml)
                       │           │
                       │           ├─→ T6 (publish-gh-packages.yml)
                       │           │
T1+T2+T3+T4+T5         │           ↓
                       └──→ T7 (demo/) ─→ T8 (deploy-demo.yml)
                                              │
                                              ↓
                                    T9 (wiki/, README badges, package.json bump,
                                        release.test.js)
                                              │
                                              ↓
                                    T10 (final cross-audit on D diff)
                                              │
                                              ↓
                                T11 (final integrated cross-audit
                                      across A+B+C+D = tech-lead substitute)
                                              │
                                              ↓
                                T12 (open the PR with cost telemetry)
```

T1, T2, T3 are independent and can be committed in any order; T4 depends on T3
(otherwise the new `build/verify-pack.js` would be silently gitignored). T5
depends on T4 (release.yml shells out to `verify-pack.js`). T6 depends on T5
(publish-gh-packages.yml mirrors the same publish pipeline). T7 depends on T1+T4
(demo deps install needs files[]; CHANGELOG presence is asserted by T9 tests).
T8 depends on T7. T9 wraps everything up. T10 is D's internal final audit. T11
is the four-sub-project tech-lead substitute. T12 opens the PR.

---

## T1 — CHANGELOG.md

**Goal:** Add a keep-a-changelog `CHANGELOG.md` at repo root with `[Unreleased]`
+ `[3.0.0] — YYYY-MM-DD` entries.

**Files created:**
- `CHANGELOG.md`

**Content:**
- `## [Unreleased]` (empty subsections placeholder)
- `## [3.0.0] — 2026-05-03` with subsections:
  - **Added:** install CLI (`npx hexo-tag-cloud install`), `install-skill`
    subcommand, Claude skill bundle (`skills/hexo-tag-cloud/`), theme
    heuristics for landscape/next/butterfly/icarus/fluid/generic, install
    fixture (`tests/fixtures/landscape-bare/`), AI-assisted install README
    sections (`README.md` + `README.ZH.md`), demo site, in-repo wiki seed,
    GH Pages demo deploy.
  - **Changed:** internal refactor of render pipeline; non-ASCII tag handling
    (CJK, Cyrillic, HTML-escape regression with `&#NN;` from upstream issue
    #39).
  - **Fixed:** non-ASCII tag rendering in TagCanvas; HTML-escape contract.
  - **Internal:** TDD foundation (lint + 100% c8 + Playwright E2E + GH
    Actions); 219+ server tests, 7 installer e2e specs, 3 smoke e2e specs.

**Tests:** Asserted via T9's `release.test.js` (existence + regex match for
`## [3.0.0]` heading + ISO-date format + `## [Unreleased]` heading). Not
asserted in this task; just hand-write content.

**Commit:** `docs(D/T1): add CHANGELOG.md with v3.0.0 entry`

---

## T2 — Migration doc

**Goal:** Create `docs/migration-2.x-to-3.x.md` documenting the upgrade path
for users on 2.1.x.

**Files created:**
- `docs/migration-2.x-to-3.x.md` (≤200 lines)

**Sections:**
1. **TL;DR** — `npm install hexo-tag-cloud@^3` + `npx hexo-tag-cloud install
   --apply`. No code changes needed.
2. **What's new** — pointer to CHANGELOG.
3. **Breaking changes** — none at runtime API. Major bump justified by new
   public CLI + skill surface and the foundational refactor.
4. **Manual install path still works** — link to the README's classical
   `<canvas id="resCanvas">` snippet.
5. **Managed-block markers** — explanation of `<!-- hexo-tag-cloud BEGIN -->`
   / `<!-- hexo-tag-cloud END -->` and what `--force` does.
6. **AI-assisted install** — link to README + SKILL.md + wiki page.
7. **Reporting issues** — link to GH issues with the v3.0.0 label.

**Tests:** Existence asserted by T9's `release.test.js`.

**Commit:** `docs(D/T2): add 2.x-to-3.x migration guide`

---

## T3 — `.gitignore` fix

**Goal:** Allow `build/` to be tracked.

**Files modified:**
- `.gitignore` line 29 — replace `build/` with **explicit Xcode-specific
  patterns** (per round-1 auditor recommendation): leave `*.pbxuser`,
  `xcuserdata`, `*.xccheckout` etc. but DROP the bare `build/` line.

**Tests:** None at this stage. T9's `release.test.js` will assert
`build/verify-pack.js` is tracked.

**Commit:** `chore(D/T3): un-gitignore build/ (was Xcode template carryover)`

---

## T4 — `build/verify-pack.js` + 100% coverage tests

**Goal:** Implement the tarball verifier per spec AC #5.

**Files created:**
- `build/verify-pack.js`
- `tests/server/build/verify-pack.test.js`

**Module shape (`build/verify-pack.js`):**
- `parseNpmPackOutput(json)` — parse `npm pack --dry-run --json` output (an
  array with one entry; `entries.files[].path` are the relative tarball
  paths).
- `classifyPaths(paths, { allowedExact, allowedPrefixes, requiredPaths })` —
  return `{ missing: [...], forbidden: [...] }`.
- `runNpmPack({ cwd, npmCmd })` — spawn `npm pack --dry-run --json
  --ignore-scripts` (the `--ignore-scripts` is mandatory; AC #5).
- `runCli(argv, { cwd, stdout, stderr, exit, runner })` — orchestrator.
  `runner` defaults to `runNpmPack` for testability.
- `ALLOWED_EXACT = ['index.js', 'package.json', 'LICENSE', 'README.md',
  'README.ZH.md']`
- `ALLOWED_PREFIXES = ['lib/', 'bin/', 'skills/']`
- `REQUIRED_PATHS = [...ALLOWED_EXACT, 'lib/options.js', 'lib/render.js',
  'lib/tagcanvas.js', 'lib/installer/cli.js', 'lib/installer/apply-edit.js',
  'lib/installer/partial-emitter.js', 'lib/installer/theme-heuristics.js',
  'lib/installer/install-skill.js', 'bin/hexo-tag-cloud-install.js',
  'skills/hexo-tag-cloud/SKILL.md']`
- Bin-shim guard: `if (require.main === module) { ... runCli(...) ... }` to
  keep tests in-process.

**Tests:** target 100% c8 across statements/branches/functions/lines.
- parseNpmPackOutput: valid JSON; empty JSON; malformed JSON throws.
- classifyPaths: all-good case; missing required; forbidden file present;
  forbidden + missing together; empty input.
- runNpmPack: spawn-success returns parsed; spawn-fail throws with stderr;
  invalid-JSON output throws.
- runCli: success path prints "verify-pack OK ..."; missing files prints
  "MISSING:" + non-zero exit; forbidden files prints "FORBIDDEN:" + non-zero
  exit; both at once prints both sections.
- Per-test: inject a fake `runner` that returns canned `npm pack` output;
  assert stdout/stderr + exit code.
- **Universe lock-in (AC #5 contract):** explicit assertions that
  `ALLOWED_EXACT` exactly equals the spec set (`index.js`, `package.json`,
  `LICENSE`, `README.md`, `README.ZH.md`); `ALLOWED_PREFIXES` exactly equals
  `['lib/', 'bin/', 'skills/']`; `REQUIRED_PATHS` exactly equals every
  spec-required file (`lib/options.js`, `lib/render.js`, `lib/tagcanvas.js`,
  `lib/installer/cli.js`, `lib/installer/apply-edit.js`,
  `lib/installer/partial-emitter.js`, `lib/installer/theme-heuristics.js`,
  `lib/installer/install-skill.js`, `bin/hexo-tag-cloud-install.js`,
  `skills/hexo-tag-cloud/SKILL.md`). T9's subprocess smoke is the integration
  check.

**`package.json` script:** `"verify-pack": "node build/verify-pack.js"` (added
in T9 alongside the version bump to keep the package.json edit atomic).

**Coverage extension:** `package.json`'s `test:server` `--include` list adds
`build/` (added in T9; until then the c8 gate would fail when this file
lands without being included). **Strict ordering:** T4 commits the source +
unit tests under a temporary "lint passes; unit tests pass; full
`test:server` deferred to T9" exception. Document in commit message.

**Wait — that breaks the always-green gate.** Alternative: T4 ALSO adds
`build/` to the `--include` in this same commit. Cleaner. Adopted.

**Revised plan:** T4's package.json delta = add `--include=build/` to
test:server, AND add `verify-pack` script. T9 does NOT touch `--include`.

**Commit:** `feat(D/T4): build/verify-pack.js + 100% coverage tests`

---

## T5 — `.github/workflows/release.yml`

**Goal:** Port from sibling. Tag `v*` → npm trusted publish via OIDC.

**Files created:**
- `.github/workflows/release.yml`

**Pre-flight steps (before npm publish):**
1. `actions/checkout@v4`
2. `actions/setup-node@v4` with `node-version: 20.x` and
   `registry-url: 'https://registry.npmjs.org'`
3. `npm install -g npm@^11` (required for OIDC trusted publishing)
4. `npm install --no-audit --no-fund`
5. **Version-tag match check:** `node -e` script comparing
   `process.env.GITHUB_REF.replace(/^refs\/tags\/v/, '')` to
   `require('./package.json').version`. Hard-fail if mismatch.
6. **CHANGELOG dated-entry check:** grep for `^## \[3\.0\.0\] —
   2[0-9]{3}-[0-9]{2}-[0-9]{2}$` (or general `^## \[<version>\] — \d{4}` for
   any release).
7. **Demo `file:..` revert check:** grep `demo/package.json` for
   `"hexo-tag-cloud": "file:.."` and hard-fail if found.
8. `cd tests/fixtures/hexo-site && npm install && cd ../../..`
9. `cd tests/fixtures/landscape-bare && npm install && cd ../../..`
10. `npx playwright install --with-deps chromium`
11. `npm test` (full lint + server + e2e)
12. `node build/verify-pack.js`
13. `npm publish --provenance --access public` (OIDC; no NPM_TOKEN)

**Permissions:** `id-token: write`, `contents: read`.

**Tests:** T9 asserts file exists + contains `name:`, `on: push.tags: ['v*']`,
`npm publish --provenance`, `node build/verify-pack.js`, `id-token: write`.

**Header comment:** Document the one-time npmjs.com OIDC setup user must do.

**Commit:** `ci(D/T5): release.yml with OIDC trusted publishing + verify-pack`

---

## T6 — `.github/workflows/publish-gh-packages.yml`

**Goal:** Mirror to GH Packages as `@d0n9x1n/hexo-tag-cloud`.

**Files created:**
- `.github/workflows/publish-gh-packages.yml`

**Triggers:**
- `workflow_run: workflows: [Release], types: [completed]` — auto-mirror after
  npm release.
- `workflow_dispatch:` with `tag` input — manual backfill.

**Steps:**
1. `actions/checkout@v4` with `ref: ${{ github.event.workflow_run.head_sha
   || inputs.tag }}`
2. `actions/setup-node@v4` with `registry-url:
   'https://npm.pkg.github.com'` and `scope: '@d0n9x1n'`.
3. `npm install --no-audit --no-fund`
4. **Idempotency check:** `npm view @d0n9x1n/hexo-tag-cloud@<version>
   --registry=https://npm.pkg.github.com` — exit 0 with skip message if
   already published.
5. **Patch package.json name:** `node -e` script that rewrites `"name":
   "hexo-tag-cloud"` → `"name": "@d0n9x1n/hexo-tag-cloud"`. Done in-process,
   not committed.
6. `npm publish --registry=https://npm.pkg.github.com` with
   `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`.

**Permissions:** `packages: write`, `contents: read`.

**Tests:** T9 asserts file exists + contains `npm.pkg.github.com`,
`workflow_run`, `workflow_dispatch`, `packages: write`, idempotency check.

**Commit:** `ci(D/T6): publish-gh-packages.yml with idempotency guard`

---

## T7 — `demo/` site

**Goal:** Minimal hexo site demonstrating the plugin with non-ASCII tags.

**Files created (under `demo/`):**
- `package.json` — references `"hexo-tag-cloud": "file:.."`; deps mirror
  `tests/fixtures/hexo-site/package.json` (hexo + landscape + index/archive/
  tag/category generators).
- `_config.yml` — `theme: landscape`, base URL set to GH Pages URL
  placeholder (`https://d0n9x1n.github.io/hexo-tag-cloud/`).
- `themes/landscape/_config.yml` — minimal sidebar config.
- `themes/landscape/layout/_partial/sidebar.ejs` — **pre-installed managed
  block** (canvas + scripts wrapped in `<!-- hexo-tag-cloud BEGIN -->` /
  `<!-- hexo-tag-cloud END -->`). Per spec AC #3, this decouples the demo
  from runtime install correctness.
- `source/_posts/welcome.md` — ASCII tags only (`hexo`, `tag-cloud`).
- `source/_posts/cjk-tags.md` — CJK tags (`日本語`, `中文`, `한국어`).
- `source/_posts/cyrillic.md` — Cyrillic tags (`Русский`, `Кириллица`).
- `source/_posts/html-special.md` — Tags with HTML-special characters (`C++`,
  `&amp; ampersand`).
- `.gitignore` — local `node_modules`, `public/`, `db.json`.
- `README.md` — short pointer to repo root + how to run locally.

**Tests:** T9 asserts `demo/package.json` exists and references
`hexo-tag-cloud` (either `file:..` or semver `^3`). T9 also asserts
`demo/themes/landscape/layout/_partial/sidebar.ejs` contains the managed-block
markers.

**Commit:** `feat(D/T7): demo/ site with non-ASCII tag posts`

---

## T8 — `.github/workflows/deploy-demo.yml`

**Goal:** Auto-deploy `demo/public/` to GH Pages after Tests pass on master.

**Files created:**
- `.github/workflows/deploy-demo.yml`

**Triggers:**
- `workflow_run: workflows: [Tests], types: [completed], branches: [master]`
- `workflow_dispatch:` for manual deploy

**Pre-flight gate:**
- Skip if `event.workflow_run.conclusion != 'success'`
- **Stale-deploy guard:** `git fetch origin master && [ "$(git rev-parse
  origin/master)" = "${{ github.event.workflow_run.head_sha }}" ]` — skip
  with message if master moved past the run that triggered.

**Steps:**
1. checkout, setup-node 20
2. `npm install --no-audit --no-fund` at root
3. `cd demo && npm install --no-audit --no-fund`
4. `cd demo && npx hexo generate`
5. `actions/configure-pages@v5`
6. `actions/upload-pages-artifact@v3` with `path: demo/public`
7. `actions/deploy-pages@v4`

**Permissions:** `pages: write`, `id-token: write`, `contents: read`.

**Concurrency:** group `pages`, cancel-in-progress.

**Tests:** T9 asserts file exists + contains `workflow_run`, `pages: write`,
`actions/deploy-pages`, stale-deploy guard.

**Commit:** `ci(D/T8): deploy-demo.yml with stale-deploy guard`

---

## T9 — Wrap-up: wiki/, README badges, package.json bump, release.test.js

**Goal:** Final D deliverables in one commit (logical unit:
"v3.0.0 surface bump").

**Files created (`wiki/`):**
- `wiki/Home.md` — landing page (overview, links to Installation,
  Customization, Troubleshooting, AI-Skill-Usage, Contributing). Note the
  manual mirror to `<repo>.wiki.git` policy.
- `wiki/Installation.md` — per-theme manual install + AI-assisted install via
  `npx hexo-tag-cloud install`.
- `wiki/Customization.md` — `tag_cloud` config block (font, colors, sizes,
  rotation, ESM-friendly setup), TagCanvas options pass-through.
- `wiki/Troubleshooting.md` — common issues: tags not appearing, blank
  canvas, theme partial not detected, CJK rendering.
- `wiki/AI-Skill-Usage.md` — invoking the Claude skill from
  `skills/hexo-tag-cloud/`; CLI dry-run vs apply flow; managed-block markers.
- `wiki/Contributing.md` — branch policy, conventional commits, TDD gate
  (`npm test` + 100% c8), how to run e2e locally.

**Files modified:**
- `README.md`:
  - Replace stale Scrutinizer badges (lines ~4-5) with: GH Actions Tests
    badge, npm version, npm downloads, license.
  - Add `## Demo` section with link to GH Pages URL.
  - Add `## Wiki` section with link to `wiki/Home.md`.
  - Add `## Changelog` link to `CHANGELOG.md`.
- `README.ZH.md`: parity with same edits.
- `package.json`:
  - `version`: `2.1.2` → `3.0.0`.
  - Add `scripts.prepublishOnly`: `npm run verify-pack`.

**Files created:**
- `tests/server/release.test.js` — locks D's contracts:
  - package.json `version === '3.0.0'`.
  - `files[]` contains `index.js`, `lib/`, `bin/`, `skills/`.
  - `scripts.verify-pack` and `scripts.prepublishOnly` exist; latter is
    `npm run verify-pack`.
  - CHANGELOG.md exists, contains `^## \[Unreleased\]$` and
    `^## \[3\.0\.0\] — 2[0-9]{3}-[0-9]{2}-[0-9]{2}$`.
  - `docs/migration-2.x-to-3.x.md` exists.
  - `build/verify-pack.js` is tracked (use `git ls-files` or simple `fs.existsSync`
    + assert NOT git-ignored via `git check-ignore`). Subprocess invocation:
    `node build/verify-pack.js` exits 0.
  - `.github/workflows/release.yml` exists, contains `tags:`, `'v*'`,
    `--provenance`, `id-token: write`, `verify-pack`.
  - `.github/workflows/publish-gh-packages.yml` exists, contains
    `npm.pkg.github.com`, `workflow_run`, `packages: write`, idempotency.
  - `.github/workflows/deploy-demo.yml` exists, contains `workflow_run`,
    `pages: write`, `deploy-pages`, stale-deploy guard.
  - `demo/package.json` exists and references `hexo-tag-cloud`.
  - `demo/themes/landscape/layout/_partial/sidebar.ejs` contains the
    managed-block markers.
  - `wiki/` contains 6 expected files.
  - README badges no longer reference `scrutinizer-ci.com`.
  - README and README.ZH contain GH Actions / npm badges.

**Coverage:** `release.test.js` is a contract-checker, not a coverage source.
The `build/verify-pack.js` 100% c8 gate is satisfied by T4's unit tests; the
release.test.js subprocess invocation is for end-to-end correctness, not
coverage. Confirm `c8` `--include` already covers `build/` (added in T4); no
edits to `package.json` test scripts here.

**Commit:** `feat(D/T9): v3.0.0 wrap-up - wiki, README badges, version bump,
release.test.js`

---

## T10 — D-internal final cross-audit

**Goal:** Cross-audit the D diff range
(`commit-before-T1..HEAD-after-T9`).

**Dispatch:** `task agent_type=code-review model=gpt-5.5 mode=sync` with
explicit per-AC evidence requirement (verbose "show your work" protocol,
NOT bare PASS).

**On CRITICAL/IMPORTANT:** apply ≤3 fix loops; if still failing, escalate
back to user. Otherwise PASS unblocks T11.

**Artifact:** `docs/reviews/2026-05-03-D-final-diff-cross-audit.md` recording
both rounds + cumulative cost telemetry.

**Commit:** `docs(D/T10): D final diff cross-audit (PASS)`

---

## T11 — Tech-lead substitute: integrated A+B+C+D cross-audit

**Goal:** Final gate substitute for the original gate #6 (Tech Lead approval
on combined diff). Audit `master..feature/v3-overhaul` end-to-end.

**Dispatch:** `task agent_type=code-review model=gpt-5.5 mode=sync` with the
combined-diff scope and explicit instructions to:
1. Verify each sub-project's specs (A, B, C, D) against the final shipped
   code.
2. Verify all four sub-projects compose: no contract drift between A's CI
   gates, B's refactored modules, C's CLI, D's release surface.
3. Verify cumulative `npm test` passes (PM runs locally and reports tail in
   the dispatch).
4. Verify the PR is ready (single feature branch, clean linear history of
   commits per task, no fixup/WIP commits).

**On any finding:** apply ≤3 fix loops. Escalate on persistence.

**Artifact:** `docs/reviews/2026-05-04-final-tech-lead-substitute.md`
recording the combined audit + final cost telemetry summary.

**Commit:** `docs(D/T11): final tech-lead substitute audit (PASS)`

---

## T12 — Open the PR

**Goal:** `feature/v3-overhaul → master` PR with:
- Title: `feat: v3.0.0 — TDD foundation, refactor, AI skill, release infra`
- Body sections:
  - Overview (4 sub-projects, what each contributes)
  - Acceptance criteria checklist (all 4 spec docs linked)
  - Verification (test counts + coverage + e2e)
  - Cross-audit summary (A+B+C+D rounds)
  - Cost telemetry (final number; ~33-40 dispatches expected)
  - Manual maintainer steps (npmjs.com OIDC trusted-publisher setup, GH
    Pages enable, GitHub wiki manual mirror)
  - Closes/related issues (#39 if confirmed)

**Push:** `git push -u origin feature/v3-overhaul`.
**Create:** `gh pr create --base master --head feature/v3-overhaul ...`.
**Co-authored-by trailer:** Yes, on the PR body footer per global instruction.

**No commit** — this task closes the sub-project, not a code change.

---

## Verification gates (between tasks)

After EACH of T1-T9: `npm run lint` + `npm run test:server` (must stay 100%
c8) + (T7+T8 only) `npm test` for the e2e path.

If a task breaks the c8 100% gate, fix before commit. No "I'll come back to
it" left in the tree.

---

## Rollback strategy

D commits land on the feature branch. Any T1-T9 commit is `git revert`-able
in isolation thanks to the dependency layout. If T10 or T11 cross-audit
fails terminally (3 cycles exhausted), PM escalates to user with audit
record + recommended scope cuts.

---

## Cost telemetry (D budget)

Estimated dispatches: spec gate 2 (1 CRITICAL → fix → PASS), plan gate 2-3
(this plan + audit + ≤2 fix cycles), mid-task tactical 0-2, T10 D-internal
final 1-2, T11 tech-lead substitute 1-3 (largest scope).

**D estimate:** 7-12 dispatches. **Combined PR total:** ~34-39.
