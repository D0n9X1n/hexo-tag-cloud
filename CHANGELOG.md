# Changelog

All notable changes to **hexo-tag-cloud** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- _Nothing yet._

### Changed
- _Nothing yet._

### Fixed
- _Nothing yet._

### Internal
- _Nothing yet._

---

## [3.0.0] — 2026-05-03

This release is the v2 → v3 lift. The plugin's runtime API surface is
preserved (existing `tag_cloud:` configuration continues to work without code
changes), but the project itself has been rebuilt around modern engineering
practices: TDD with 100% c8 coverage, Playwright end-to-end tests, lint, GH
Actions CI, OIDC trusted publishing, an AI-assisted installer CLI, a bundled
Claude skill, and a deployable demo. The major-version bump reflects the
expanded public surface (new CLI entry-point + skill bundle) and the
foundational refactor across the entire codebase.

### Added
- **`npx hexo-tag-cloud install`** CLI for one-command theme installation.
  Detects landscape, NexT, Butterfly, Icarus, Fluid, and falls back to a
  generic recipe; writes a managed block (`<!-- hexo-tag-cloud BEGIN/END -->`)
  to the theme's sidebar partial. Defaults to a dry-run that prints the
  unified diff and exits 0; pass `--apply` to write the change. Other
  flags: `--force` (overwrite a user-edited managed block, used with
  `--apply`) and `--theme <name>` (pin a theme heuristic).
- **`npx hexo-tag-cloud install-skill`** subcommand that copies the bundled
  Claude skill to a target directory.
- **Bundled Claude skill** at `skills/hexo-tag-cloud/` with `SKILL.md`,
  `scripts/detect-theme.js`, and `scripts/inspect-partials.js`. The skill
  always invokes the CLI in dry-run first and shows the unified diff before
  applying any change.
- **Theme heuristics module** (`lib/installer/theme-heuristics.js`) with
  per-theme partial detection rules.
- **Demo site** at `demo/` — minimal Hexo site with landscape theme and
  posts using ASCII, CJK, Cyrillic, and HTML-special tags. Auto-deployed to
  GitHub Pages after every passing test run on `master`.
- **In-repo wiki seed** at `wiki/`: `Home`, `Installation`, `Customization`,
  `Troubleshooting`, `AI-Skill-Usage`, `Contributing`. Mirror to the GitHub
  wiki is a documented post-release task.
- **Migration guide** at `docs/migration-2.x-to-3.x.md` covering the upgrade
  path for v2.1.x users.
- **AI-assisted install** sections in `README.md` and `README.ZH.md`.
- **Landscape-bare test fixture** at `tests/fixtures/landscape-bare/` for
  installer end-to-end testing without vendoring upstream landscape.
- **GitHub Actions workflows**: `release.yml` (npm trusted publishing via
  OIDC + `--provenance`, version-tag and CHANGELOG verification, demo
  `file:..` ban, full test, tarball verification), `publish-gh-packages.yml`
  (mirror to GitHub Packages as `@d0n9x1n/hexo-tag-cloud` with idempotency
  guard), `deploy-demo.yml` (workflow_run after Tests on master, with
  stale-deploy guard).
- **Tarball verifier** at `build/verify-pack.js` — asserts the exact set of
  files that ship in the published tarball, blocking accidental shipping of
  tests, docs, demo, wiki, or coverage artefacts. Wired as
  `npm run verify-pack` and into `release.yml`.

### Changed
- **Internal refactor** of the render pipeline. `index.js` is now a factory
  function that auto-registers with hexo; the rendering logic is extracted
  into pure modules at `lib/options.js` and `lib/render.js`.
- **Non-ASCII tag handling** — CJK, Cyrillic, and HTML-special characters in
  tag names now render correctly through the full pipeline. The bundled
  TagCanvas runtime in `lib/tagcanvas.js` is unchanged from upstream; the
  fix landed in the render module's text-emit path.
- **Configuration loading** moved into `lib/options.js` with a documented
  schema and explicit defaults; behaviour is byte-compatible with v2.1.x.

### Fixed
- HTML-escape regression with numeric character references (`&#NN;`) in tag
  names, originally reported in upstream issue #39.
- Tag-cloud canvas no longer renders empty when posts contain
  non-Latin-script tags.

### Internal
- TDD foundation: ESLint, c8 coverage with a 100% statements/branches/
  functions/lines gate (configured in `package.json`), Mocha for unit and
  integration tests under `tests/server/`, and Playwright for end-to-end
  browser tests under `tests/e2e/`.
- 219+ server-side tests across `index.js`, `lib/options.js`, `lib/render.js`,
  the `lib/installer/` modules, `bin/hexo-tag-cloud-install.js`, and
  `build/verify-pack.js`.
- 10 end-to-end Playwright specs (3 smoke + 7 installer cases).
- `tests/server/release.test.js` locks v3.0.0's release contracts (version,
  CHANGELOG, files[], scripts, workflow files, demo, wiki).
- Documentation tests at `tests/docs.test.js` keep the README sections in
  sync with the CLI surface.
- `.github/workflows/test.yml` runs lint, server tests, and end-to-end tests
  on every push and pull request.

---

## [2.1.2] — 2018-09-25

Last release of the MikeCoder lineage. See git history at
[`caddef0`](https://github.com/D0n9X1n/hexo-tag-cloud/commit/caddef0)
for the original release notes.

[Unreleased]: https://github.com/D0n9X1n/hexo-tag-cloud/compare/v3.0.0...HEAD
[3.0.0]: https://github.com/D0n9X1n/hexo-tag-cloud/compare/v2.1.2...v3.0.0
[2.1.2]: https://github.com/D0n9X1n/hexo-tag-cloud/releases/tag/v2.1.2
