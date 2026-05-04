# Sub-project D — design: v3.0.0 release

**Date:** 2026-05-03 | **PM:** `claude-opus-4.7-xhigh`
**Audit basis:** 2-model agreement (gate #2 substitute per user override)
**Word budget:** ≤1000

## Goal

Cut **v3.0.0** as an industry-grade open-source release: CHANGELOG, demo, wiki, npm trusted-publish workflow, GitHub Packages mirror, Pages-deployed demo, tarball verification, version bump, docs polish. Zero new runtime API; the bump is justified by C's CLI + skill (new public surface) + B's foundational refactor.

## Background and shape

Inherits sibling repo `hexo-blog-encrypt`'s release infra (`build/verify-pack.js`, `release.yml`, `publish-gh-packages.yml`, `deploy-demo.yml`). Brainstorm at `docs/notes/2026-05-03-D-brainstorm.md`. No esbuild needed — `lib/tagcanvas.js` is vendored byte-identical and ships as-is. Decomposed into 8 tasks (T1-T8); single feature-branch commit per task; integrated cross-audit (T8) is the C-style final gate.

## Acceptance criteria

1. **CHANGELOG.md** at repo root, [keep-a-changelog](https://keepachangelog.com/) format. Heading `## [3.0.0] — YYYY-MM-DD` (literal en-dash + ISO date) lists Added (CLI install + install-skill, Claude skill bundle, theme heuristics for landscape/next/butterfly/icarus/fluid/generic, install fixture, AI-assisted install README section); Changed (refactor of internal modules, non-ASCII tag handling fix); Fixed (HTML-escape regression with `&#NN;` from upstream issue #39); Internal (TDD foundation, c8 100% gate, Playwright E2E, GH Actions). Plus `## [Unreleased]` heading at top.

2. **Migration doc** at `docs/migration-2.x-to-3.x.md` (≤200 lines): no breaking API changes; users on 2.1.x continue to work without code changes; new features are opt-in via the CLI; explicit upgrade command (`npm install hexo-tag-cloud@^3`); two-line one-shot adoption (`npx hexo-tag-cloud install --apply`).

3. **Demo site** at `demo/` directory: minimal hexo site using stock landscape theme + posts with ASCII, CJK, Cyrillic, and HTML-special tags. `demo/package.json` references `hexo-tag-cloud` via `"file:.."` for local dev. Demo's `themes/landscape/layout/_partial/sidebar.ejs` is pre-installed with the managed-block (so the demo doesn't depend on a successful runtime install). The demo builds via `cd demo && npm install && npx hexo generate`.

4. **GH workflows** ported from sibling, all under `.github/workflows/`:
   - `release.yml` — on tag `v*`: setup-node 20, npm@^11, install, verify package.json version matches tag, verify CHANGELOG dated entry, verify demo isn't `file:..`, run `npm test`, `node build/verify-pack.js`, then `npm publish --provenance` via OIDC trusted publishing.
   - `publish-gh-packages.yml` — mirror to GitHub Packages as `@d0n9x1n/hexo-tag-cloud`. Idempotent (skip if version already exists). `workflow_dispatch` for manual backfill.
   - `deploy-demo.yml` — `workflow_run` after Tests passes on master → install root + demo → `cd demo && npx hexo generate` → publish `demo/public/` to GH Pages. Stale-deploy guard (skip if `head_sha != origin/master HEAD`). `workflow_dispatch` for manual.

5. **build/verify-pack.js** — pure CLI script that spawns `npm pack --dry-run --json --ignore-scripts` and asserts the tarball contains exactly: `index.js`, `package.json`, `LICENSE`, `README.md`, `README.ZH.md`, every file under `lib/` (incl. `lib/installer/*.js`, `lib/tagcanvas.js`, `lib/options.js`, `lib/render.js`), every file under `bin/`, every file under `skills/hexo-tag-cloud/`. Block any file outside the allow-list (no `tests/`, `docs/`, `demo/`, `wiki/`, `coverage/`, `.eslintrc.js`, `.gitignore`). Exits 0 on pass; non-zero with explicit missing/forbidden paths on stderr. The `--ignore-scripts` flag is mandatory: it prevents npm from running lifecycle hooks during the dry-run (defense in depth against a future `prepack` ever calling `verify-pack`). Wired as `npm run verify-pack` AND invoked by `release.yml`.

6. **`build/` un-gitignored** — replace `.gitignore` line 29 (`build/` from Xcode template) with explicit Xcode-relevant patterns OR a `!build/verify-pack.js` re-include. Verified by `release.test.js` asserting `build/verify-pack.js` is tracked.

7. **package.json updates** — `version` bumped to `3.0.0`. New scripts: `verify-pack` (runs `node build/verify-pack.js`) and `prepublishOnly` (runs `npm run verify-pack` so `npm publish` fails-fast). **NOT `prepack`**: `npm pack` runs `prepack`, and `verify-pack.js` itself spawns `npm pack --dry-run`, so `prepack: verify-pack` would recurse. `prepublishOnly` runs only on `npm publish`, never `npm pack`; combined with AC #5's `--ignore-scripts`, the loop is broken at both ends. `files[]` unchanged from C.

8. **README badges + links refresh** — both READMEs replace stale Scrutinizer badges with: GH Actions Tests status, npm version, npm downloads, license. Add a "Demo" link to GH Pages and a "Wiki" / "CHANGELOG" link below the badges. Existing fork-of-MikeCoder attribution preserved.

9. **Wiki seed** at `wiki/` directory (in-repo; the GitHub wiki tab points at this directory; manual mirror to `<repo>.wiki.git` is a documented post-release task, NOT in scope here): `Home.md`, `Installation.md` (per-theme manual + AI-assisted), `Customization.md`, `Troubleshooting.md`, `AI-Skill-Usage.md`, `Contributing.md`. Each ≤300 lines.

10. **`tests/server/release.test.js`** — locks D's contracts: package.json version is `3.0.0`; CHANGELOG has `## [3.0.0] — YYYY-MM-DD` entry (regex match); CHANGELOG has `## [Unreleased]` heading; `files[]` contains `index.js`, `lib/`, `bin/`, `skills/`; `verify-pack.js` exists, is requireable, and `node build/verify-pack.js` exits 0 against the live `npm pack --dry-run --json`; `release.yml`, `publish-gh-packages.yml`, `deploy-demo.yml` exist and contain expected `name:` + tag-trigger structure; `demo/package.json` references `hexo-tag-cloud` (either `file:..` or semver, both acceptable in tests; release.yml is the gatekeeper for the `file:..` ban at tag time); migration doc exists at `docs/migration-2.x-to-3.x.md`; wiki dir contains the 6 expected pages.

11. **Coverage** — `test:server` `--include` extends to `build/`; `verify-pack.js` carries 100% c8 coverage via direct in-process tests (mocking `npm pack` output, NOT spawning npm). `release.test.js` smoke-runs `node build/verify-pack.js` once for the integration check (subprocess coverage via `NODE_V8_COVERAGE`).

## Out of scope (deferred)

- Codecov integration (LCOV is generated; CI artifact upload suffices).
- E2E sharding (10 specs total; defer until 25+).
- Auto-push to GitHub wiki repo (manual mirror; documented in `wiki/Home.md`).
- Visual-regression matrix for the demo (defer to v3.1.x).
- Localised migration doc (English only).
- `build/build.js` + `build/prepare.js` (no transpile / bundle step needed).
- Codeql or other security workflows.
- v3.0.0-beta release candidate cycle (single-shot release).

## Risks + mitigations

- **`.gitignore build/` line 29** is a footgun: any commit attempting to add `build/` files is silently dropped. T6 fixes this BEFORE T5 commits `build/verify-pack.js`. Plan ordering enforces.
- **OIDC trusted publishing on npmjs.com is one-time manual setup** — out of diff. Documented in `release.yml` header comment + migration doc.
- **`prepack` would recurse into `verify-pack.js`** (auditor finding, round 1): `npm pack` runs `prepack`. Spec AC #7 uses `prepublishOnly` (publish-only, never `npm pack`-triggered); AC #5 also forces `--ignore-scripts` on the internal `npm pack --dry-run`. Both ends of the loop broken.
- **`demo/package.json file:..` revert before tag** — manual pre-release step; `release.yml` enforces with a hard fail.
- **D plan-audit churn budget** — 3 fix cycles (matches A/B/C cap).
