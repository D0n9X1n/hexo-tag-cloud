# Sub-project C — design: AI skill for theme insertion

**Date:** 2026-05-03 | **PM:** `claude-opus-4.7-xhigh`
**Audit basis:** 2-model agreement (gate #2 substitute per user override)
**Word budget:** ≤1000

## Goal

Deliver a deterministic CLI and a Claude-Skill-format AI-friendly wrapper that lets a user install a working hexo tag cloud into their hexo theme with one command (or one prompt to their AI agent), regardless of templating engine. Replaces the README's manual ejs/swig/jade/pug walkthrough.

## Background and shape

Picked shape: **hybrid (1+4)** — Claude Skill (`SKILL.md` + helper scripts) bundled in npm, wrapping a deterministic `bin/hexo-tag-cloud-install.js` CLI. Brainstorm at `docs/notes/2026-05-03-C-brainstorm.md`. The CLI is the durable contract; the skill surfaces it to AI agents. MCP wrapper is out of scope; the CLI works from any agent or shell.

## Acceptance criteria

1. **CLI at `bin/hexo-tag-cloud-install.js`**, exposed via `package.json` `bin`. `npx hexo-tag-cloud install` from a hexo site root prints a unified diff to stdout and exits 0 (dry-run by default). Flags: `--apply` writes; `--force` overwrites a modified managed block (without `--force`, the CLI exits 2 — see AC #3); `--theme <name>` overrides theme detection; `--theme-dir <path>` overrides theme dir; `--help` prints usage. Non-zero exits: 1 (theme-detection failure), 2 (modified-managed-block conflict), 3 (legacy install detected), 4 (write conflict).
2. **Theme heuristics module** at `lib/installer/theme-heuristics.js` ships heuristics for **landscape** (ejs `_widget`/`_partial/sidebar`), **next** (swig `_macro/sidebar`), **butterfly** (pug `includes/widget`), **icarus** (ejs `widget`), **fluid** (ejs `_partials/sidebar`), plus a generic fallback (writes a standalone `tagcloud-partial.<ext>` and prints include instructions). Each heuristic returns `{partialPath, engine, insertionMode, markerStart, markerEnd}`; the apply step is engine-agnostic.
3. **Idempotency by marker comments + conflict-safe re-apply.** Each emitted block is wrapped with `<!-- hexo-tag-cloud:begin -->` / `<!-- hexo-tag-cloud:end -->`, or the engine's equivalent: `//- hexo-tag-cloud:begin` for pug; `{# … #}` for nunjucks; `<!-- … -->` for ejs/swig (rendered HTML). Re-running `--apply`: byte-for-byte body match → no-op + "already installed" message; user-edited body → unified diff + exit 2 + suggest `--force`; legacy install (no markers but `id="resCanvas"` + `/js/tagcloud.js` + `/js/tagcanvas.js` triple present) → exit 3 + "remove the existing block manually before re-running; automated `--migrate` is deferred to a future minor". `--force` (AC #1) is the only override path.
4. **Pure modules + 100% coverage.** `lib/installer/{theme-heuristics,partial-emitter,apply-edit}.js` are pure (no `process.exit`/`console.log`). c8 gate (extending B's `test:server` `--include`) holds 100/100/100/100 across the three modules plus `bin/hexo-tag-cloud-install.js`.
5. **Skill manifest** at `skills/hexo-tag-cloud/SKILL.md` (≤200 lines) follows Anthropic's skill-manifest convention with `# name`, `## description`, `## when_to_use`, `## usage`, `## examples`, `## failure_modes` sections. Helper scripts at `skills/hexo-tag-cloud/scripts/{detect-theme.js,inspect-partials.js}` print machine-readable JSON. SKILL.md mandates "show the diff to the user; only run `--apply` after explicit user approval."
6. **Skill is actually distributable.** (a) `package.json` `files` includes `bin/`, `skills/`, `lib/installer/` so the tarball ships them. (b) `npx hexo-tag-cloud install-skill` copies `skills/hexo-tag-cloud/` into `~/.claude/skills/hexo-tag-cloud/`, with `--target <dir>` override and `--dry-run`. (c) README adds an "AI-assisted install" section documenting both `install` and `install-skill`. (d) A docs test verifies the `files` array contains the three required globs.
7. **Installer fixtures.** A new `tests/fixtures/landscape-bare/` minimal hexo site uses landscape-style partial layout WITHOUT a pre-installed tag cloud, so e2e can prove `--apply` mutates the right file at the right offset. The existing `tests/fixtures/hexo-site/` (already wired manually) remains for B's tests.
8. **E2E coverage** at `tests/e2e/installer.spec.js`: (a) `npx hexo-tag-cloud install` against landscape-bare emits a diff containing both `<canvas id="resCanvas"` and `<script src="/js/tagcloud.js">`; (b) `--apply` writes the file and a subsequent `hexo generate && hexo s` round-trip serves a homepage that includes the canvas; (c) re-running `--apply` is a no-op (idempotency); (d) editing the managed block's body and re-running `--apply` exits 2 with the conflict diff and leaves the file untouched; (e) the same case re-run with `--apply --force` overwrites the user's edit; (f) `install-skill --dry-run --target /tmp/.claude-test/` prints the planned copy operations and exits 0 without touching the filesystem.
9. **No new top-level npm dependencies.** Use Node built-ins (`fs/promises`, `path`, `node:util.parseArgs`) and the already-pinned `hexo-fs`. No new lint config drift; B's accommodations stay deleted; new `installer/` modules pass under the existing rule set.

## Out of scope (deferred)

- MCP server wrapper (future minor; the CLI is the stable contract).
- Copilot CLI Skill format and other agent-runtime-specific skill formats.
- More than the 5 named themes (community PRs welcome; generic fallback covers the rest).
- Localised SKILL.md (English only for v3.0.0).
- `--migrate` from legacy manual installs to managed-block form (the legacy-install detection branch in AC #3 only prints a message and exits 3 — automated migration is deferred to v3.1.x).
- Visual regression beyond "canvas exists in served HTML" (D's demo will add screenshot smoke).
- Auto-publish of the skill to a registry (none exists for SKILL.md yet).

## Risks + mitigations

- **Theme directories vary** (separate npm dep vs `themes/<name>` symlink vs in-tree): heuristics treat `hexo.theme_dir` as the only resolution authority; if missing/null, exit 1 with "couldn't locate active theme — pass --theme-dir <path>". (B's loader-discovery lesson — exercise the real consumer.)
- **SKILL.md auto-discovery is Claude-Code-specific**: README is explicit about the `~/.claude/skills/` path and instructs Cursor/Continue users to point their respective skill loaders at the bundled directory. CLI-only path always works.
- **Plan auditor caught 5 issues for B**: budget ≥3 fix cycles for C's plan; do not assume any first draft passes.
