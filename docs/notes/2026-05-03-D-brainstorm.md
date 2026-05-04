# Sub-project D — brainstorm: v3.0.0 release

**Date:** 2026-05-03
**PM:** `claude-opus-4.7-xhigh`
**Audit basis:** 2-model agreement (gate substitution per user override)
**Predecessor sub-projects:** A (TDD/CI) ✓ B (refactor + non-ASCII) ✓ C (AI skill) ✓

## Goal

Cut **v3.0.0** of `hexo-tag-cloud` and ship it as an industry-grade open-source release.

## Scope (in)

1. **CHANGELOG.md** — keep-a-changelog format, dated v3.0.0 entry covering A+B+C work, plus `[Unreleased]` heading at top.
2. **Migration doc** (`docs/migration-2.x-to-3.x.md`) — what changed since 2.1.2, what to do, no breaking runtime API but the version bump is justified by the major surface expansion (CLI + skill) and the foundational refactor.
3. **Demo site** (`demo/`) — minimal hexo site that uses the plugin, generated to GH Pages. Local dev: `hexo-tag-cloud` referenced via `file:..`. For release: `^3.0.0`. Demo includes posts with CJK/Cyrillic/HTML-special tags so the deployed page proves B's non-ASCII fix end-to-end.
4. **Wiki seed** (`wiki/` directory in repo) — README isn't enough for full reference; wiki gets multi-page deep-dive: per-theme installation guides, troubleshooting playbook, AI skill usage, contribution guide. Pushed to the GH wiki via a workflow OR mirrored as `docs/wiki/` for now (wiki-push automation is finicky; default to in-repo `wiki/` directory + README pointer).
5. **build/verify-pack.js** — assert tarball ships exactly `index.js`, `lib/` (incl. `installer/` + `tagcanvas.js`), `bin/`, `skills/`, `package.json`, `LICENSE`, `README*.md`. Block accidental shipping of `tests/`, `docs/`, `demo/`, `wiki/`, `coverage/`. Wired into `release.yml` AND a local `npm run verify-pack` script.
6. **`build/` un-gitignore fix** — the existing `.gitignore` line 29 (`build/`, Xcode template) blocks committing release build scripts. Replace with explicit exclusions OR `!build/` re-include.
7. **`.github/workflows/release.yml`** — port from sibling. Tag `v*` triggers npm trusted-publish via OIDC + `--provenance`; pre-flight: package.json version matches tag, CHANGELOG has dated entry, demo/package.json is NOT `file:..`, full `npm test`, `verify-pack`.
8. **`.github/workflows/publish-gh-packages.yml`** — port from sibling. Mirror to GH Packages as `@d0n9x1n/hexo-tag-cloud`. Idempotent (skip if version already exists).
9. **`.github/workflows/deploy-demo.yml`** — port from sibling. `workflow_run` after Tests passes on master → build demo + deploy to Pages. Stale-deploy guard included.
10. **package.json** — bump to `3.0.0`. Add `prepack` hook → `verify-pack` (locally simulated). Keep `files[]` as `["index.js", "lib/", "bin/", "skills/"]`.
11. **README badges refresh** — current badges are stale Scrutinizer (MikeCoder/hexo-tag-cloud, broken). Replace with: GH Actions Tests status, npm version, npm downloads, code coverage (codecov is heavy; skip), license badge.
12. **README links to demo + wiki + CHANGELOG** — add a "Releases" / "Demo" section.
13. **`tests/server/release.test.js`** — locks D's contracts: package.json version is semver-major ≥ 3, CHANGELOG has v3.0.0 entry with date, files[] includes the 4 expected entries, verify-pack runs cleanly against `npm pack --dry-run --json`. Coverage extends `--include=build/`.
14. **Final tech-lead audit** on combined A+B+C+D diff (gate #6 substitute).
15. **Single PR** opening on `feature/v3-overhaul → master` with cost-telemetry footer.

## Scope (out / deferred)

- Browser bundle (no esbuild needed; `lib/tagcanvas.js` is vendored upstream and ships byte-identical).
- Codecov upload integration (LCOV is generated locally; CI artifact upload is sufficient).
- E2E sharding (currently 10 specs; defer until 25+).
- Wiki push automation (manual `git push` to the wiki repo for now; in-repo `wiki/` is the source of truth).
- Visual-regression matrix for the demo (pixel diffs are noisy; defer to v3.1.x).
- Localised migration doc (English only for v3.0.0).
- Auto-generated API docs via JSDoc/typedoc (the plugin's public API is small enough that hand-written README + wiki suffice).
- `build/build.js` + `build/prepare.js` (no transpile / bundle step needed for this plugin; sibling needs them for the encryption browser bundle).

## Open questions for spec gate

- **Q1: Wiki location** — repo `wiki/` directory only, OR also push to the GitHub wiki via a workflow?
  - Default: in-repo `wiki/` only (zero infra; users see it via the GitHub repo file browser; the wiki tab links back to it).
- **Q2: Demo theme** — landscape (default, exercises the installer's primary recipe) OR a custom theme like fixture-theme?
  - Default: landscape so the demo simultaneously demonstrates the recommended `npx hexo-tag-cloud install` path.
- **Q3: GH Packages publish required for v3.0.0?**
  - Default: yes — sibling has it; parity matters; cost is one workflow file.
- **Q4: Test for `release.yml` itself?**
  - Default: a `release.test.js` lint on the YAML structure (jobs/steps presence) + a lightweight grep-based check. Don't try to actually run it.
- **Q5: README badge layout** — at top of README only, or both READMEs?
  - Default: both READMEs (parity); keep badge style consistent with sibling.

## Risks + mitigations

- **`build/` is gitignored** — must un-gitignore early, before any `build/verify-pack.js` write. Otherwise PM ships a phantom file.
- **`prepack` running `verify-pack` fails on dev `npm install` if `pack.json` is stale** — make `verify-pack.js` self-contained: spawn `npm pack --dry-run --json` itself; don't read a pre-existing pack.json on the local path.
- **CHANGELOG date freezing** — release.yml's CHANGELOG check requires `## [3.0.0] — YYYY-MM-DD`. PM hand-writes the date when cutting the release commit; tests assert presence of the regex but not the specific date.
- **OIDC trusted publishing requires manual npmjs.com configuration** — outside the diff. Document in CHANGELOG / migration doc / release.yml header comment that this is a one-time setup the maintainer does on npmjs.com. Tests can't simulate it.
- **Demo deps + plugin file: ref** — the deploy-demo workflow checks out master, so `file:..` resolves correctly during CI.
- **GitHub wiki page race** — out of scope per Q1.
- **package-lock.json gitignored** (line 5 of `.gitignore`) — sibling does this too; release.yml must use `npm install`, not `npm ci`. Already mirrors sibling.
- **D scope is broad** — decompose into ≤8 tasks; cap each at single-commit. Plan-gate audit will flag if any task is too vague.

## Cost telemetry budget

- Spec gate: 2-3 dispatches (target: 1-2 if first draft is tight).
- Plan gate: 2-3 dispatches.
- Mid-task tactical: 0-2 (only when a task exposes an unexpected blocker).
- Final integrated diff: 1-2.
- Final tech-lead audit on combined A+B+C+D: 1-2.
- **D total:** ~6-12 dispatches. **Combined PR total:** ~33-39.
