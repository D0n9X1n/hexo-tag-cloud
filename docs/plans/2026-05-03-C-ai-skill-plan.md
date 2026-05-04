# Sub-project C — implementation plan

**Date:** 2026-05-03 | **PM:** `claude-opus-4.7-xhigh`
**Spec:** `docs/specs/2026-05-03-C-ai-skill-design.md` (805 words, R3 PASS)
**Line budget:** ≤500
**Audit basis:** 2-model agreement (gate #3 substitute)

## Overview

Sub-project C delivers a deterministic CLI (`bin/hexo-tag-cloud-install.js`) and a Claude-Skill manifest (`skills/hexo-tag-cloud/SKILL.md`) that lets users install a working hexo tag cloud into any of 5 named themes (landscape, next, butterfly, icarus, fluid) plus a generic fallback. Three pure modules under `lib/installer/` carry the testable logic; the bin file is a thin glue layer with mocked-argv unit tests and full e2e coverage. Idempotency is delivered by managed-block marker comments, with deterministic conflict resolution (`--force` overwrites; legacy installs exit 3; user-edited blocks exit 2 + diff).

Per B's loader-discovery lesson: every inter-tool boundary in C (the `bin` entry, the npm `bin` link, the SKILL.md discovery path, the hexo-fs theme directory walk) MUST be exercised against the real consumer before the integrated audit, not just against unit-test fakes. T8 enforces this.

## Module shape

```
hexo-tag-cloud/
├── bin/
│   └── hexo-tag-cloud-install.js        # T4 + T5 (thin CLI; argv parse → router → installer/skill ops → stdout/exit)
├── lib/installer/
│   ├── theme-heuristics.js              # T1 (pure: name → {partialPath, engine, insertionMode, markerStart, markerEnd})
│   ├── partial-emitter.js               # T2 (pure: opts → managed-block string with engine-specific markers)
│   └── apply-edit.js                    # T3 (pure: existing-file-content + new-block + force? → {action, newContent, diff})
├── skills/hexo-tag-cloud/
│   ├── SKILL.md                         # T6 (≤200 lines, Anthropic skill-manifest convention)
│   └── scripts/
│       ├── detect-theme.js              # T6 (prints {theme, themeDir, engine} JSON)
│       └── inspect-partials.js          # T6 (prints array of candidate partial paths + sizes)
├── tests/
│   ├── server/installer/
│   │   ├── theme-heuristics.test.js     # T1
│   │   ├── partial-emitter.test.js      # T2
│   │   ├── apply-edit.test.js           # T3
│   │   ├── bin.test.js                  # T4 + T5 (mocked argv/stdout/process.exit; subprocess for full-stack)
│   │   └── skill-distribution.test.js   # T6 (asserts package.json files[] + SKILL.md frontmatter shape)
│   ├── e2e/
│   │   └── installer.spec.js            # T8 (cases a-f from AC #8)
│   └── fixtures/
│       └── landscape-bare/              # T7 (landscape-style minimal site WITHOUT pre-installed tag cloud)
└── README.md / README.ZH.md             # T9 ("AI-assisted install" section + Troubleshooting addendum)
```

## Task graph

```
T1  ──┐
T2  ──┼─→ T3 ──┬─→ T4 ─┬─→ T7 ──→ T8 ──→ T10
       │       │       │
       │       │       └─→ T5 ──┐
       │       │                │
       │       │       T6 ──────┴─→ T9
       └───────┘
```

Strict order: T1 + T2 in parallel → T3 → T4 → (T5 || T6 || T7) → T8 → T9 → T10. T6's docs assertion depends on T5's package.json `bin` entry and skill files being staged. T8's e2e depends on T7's fixture. T10 is the integrated audit.

## Tasks

### T1 — `lib/installer/theme-heuristics.js` + tests

Implement a pure function `resolveTheme(themeName) → ThemeRecipe | null` returning a `ThemeRecipe` struct (or `null` for unknown). For named themes, the struct hard-codes:

- `landscape`: `partialPath = "themes/<theme>/layout/_partial/sidebar.ejs"`, `engine = "ejs"`, `insertionMode = "append"`, `markerStart = "<!-- hexo-tag-cloud:begin -->"`, `markerEnd = "<!-- hexo-tag-cloud:end -->"`.
- `next`: `partialPath = "themes/<theme>/layout/_macro/sidebar.swig"`, `engine = "swig"`, markers same as landscape (HTML comments render through swig).
- `butterfly`: `partialPath = "themes/<theme>/layout/includes/widget/recent_comments.pug"` (a stable widget include), `engine = "pug"`, `markerStart = "//- hexo-tag-cloud:begin"`, `markerEnd = "//- hexo-tag-cloud:end"`, `insertionMode = "append"`.
- `icarus`: `partialPath = "themes/<theme>/layout/widget/recent_posts.ejs"`, `engine = "ejs"`, HTML markers.
- `fluid`: `partialPath = "themes/<theme>/layout/_partials/sidebar.ejs"`, `engine = "ejs"`, HTML markers.

Plus `resolveTheme("generic") → ThemeRecipe` returning a fallback that writes a standalone `tagcloud-partial.<engine>` and prints include instructions (`insertionMode = "standalone"`).

Tests (≥10): each named theme returns the right struct; unknown name returns `null`; `generic` returns the fallback with `insertionMode === "standalone"`; partial-path placeholders interpolate the theme name correctly when given a non-default `<theme>` slug; markers are engine-appropriate; struct shape is frozen (Object.isFrozen).

### T2 — `lib/installer/partial-emitter.js` + tests

Pure function `emitManagedBlock(recipe, options) → string` returning the marker-wrapped snippet for the given recipe. The snippet content is:

- ejs/swig: HTML `<canvas id="resCanvas" width="..." height="..." style="..."></canvas><script src="/js/tagcanvas.js"></script><script src="/js/tagcloud.js"></script>` wrapped in `<!-- begin --> ... <!-- end -->`.
- pug: pug-syntax canvas + script tags wrapped in `//- begin ... //- end`.
- nunjucks: same HTML body wrapped in `{# begin #} ... {# end #}`.

Defaults: width=500, height=400, style="margin: 0 auto;". Override via `options.canvasWidth` / `options.canvasHeight` / `options.canvasStyle`.

Tests (≥8): each engine round-trips through emit + simple regex parse and recovers `width`/`height`/`style`; markers are byte-stable (snapshot lock); custom options override; non-string options (`canvasWidth: 0`) emit literal `0` (regression for B's `||` defaulting bug); special-character options (`canvasStyle: 'margin: 0; content: "x";'`) survive intact.

### T3 — `lib/installer/apply-edit.js` + tests

Pure function `computeApplyAction({ existingContent, newBlock, recipe, force }) → ApplyAction`, where `ApplyAction` is one of:

- `{ kind: "insert", newContent }` — file has no markers and no legacy triple → append the new block (insertionMode = "append") or replace whole file (mode = "standalone").
- `{ kind: "noop", message }` — file has markers AND existing block body matches `newBlock` byte-for-byte (after EOL normalization for comparison only — see CRLF rule below).
- `{ kind: "conflict", diff, exitCode: 2 }` — markers found, body differs (after EOL normalization), `force` is false. `diff` is a unified-diff string built from Node built-ins (no `diff` npm dep — implement a minimal Hunt-McIlroy-style splice or just print before/after with line prefixes).
- `{ kind: "force-replace", newContent }` — markers found, body differs, `force === true`.
- `{ kind: "legacy", message, exitCode: 3 }` — no markers but the `id="resCanvas"` + `/js/tagcloud.js` + `/js/tagcanvas.js` triple is present (regex check on the file body).

**EOL handling (site-of-record):** `computeApplyAction` accepts `existingContent` verbatim; it normalizes BOTH sides to `\n` ONLY for the body-comparison step. When emitting `newContent` for `insert` / `force-replace`, the function detects the dominant EOL of `existingContent` (`\r\n` if more than half the line endings are CRLF; else `\n`) and re-emits the managed block + surrounding splice with that EOL. Empty/missing files default to `\n`. Net effect: a CRLF-authored theme partial stays CRLF; an LF-authored partial stays LF; no unintended newline churn.

Tests (≥15): each ApplyAction kind has a positive case + at least one negative; `force` overrides only the conflict case; legacy detection requires ALL THREE strings in the file (one missing = treat as no markers + no legacy = insert); markers are recognised with arbitrary surrounding whitespace; CRLF-vs-LF differences in the existing block don't trigger false conflicts (comparison normalized); CRLF input emits CRLF newContent on insert AND on force-replace (assert byte-for-byte that no `\r` is dropped); LF input emits LF newContent; empty file is "insert"; file containing ONLY markers (no body) → "noop" if newBlock is empty, "conflict" otherwise.

### T4 — `bin/hexo-tag-cloud-install.js` (install command) + tests

Thin entry. Uses `node:util.parseArgs`. Subcommand router: `install` (default) | `install-skill` (T5) | `--help`. For `install`:

1. Resolve theme: `--theme` flag wins; otherwise read `<cwd>/_config.yml` (use `js-yaml` only if already a transitive dep — verify via `require.resolve('js-yaml')` in a try/catch; otherwise hand-parse the `theme:` line with a deliberately narrow regex covering quoted/unquoted scalar values + trailing comments; reject nested-mapping `theme:` blocks with a clear "complex theme config; pass --theme <name>" message).
2. Resolve theme dir: `--theme-dir` flag wins; otherwise `<cwd>/themes/<name>`.
3. Call `resolveTheme(themeName)`. If `null` → exit 1 with "unknown theme '<name>'; pass `--theme generic` to use the standalone fallback."
4. Build target file path from recipe + `--theme-dir`.
5. If file doesn't exist → for `insertionMode === "standalone"`, write the standalone partial; for "append", exit 4 with "expected partial at <path>, not found".
6. Read existing content **as-is** (no upfront normalization; T3's `computeApplyAction` owns EOL handling per the rule above), call `emitManagedBlock`, then `computeApplyAction`.
7. Branch on action: `insert`/`force-replace`/`noop` print success or noop message; `conflict` print diff + exit 2; `legacy` print message + exit 3.
8. Without `--apply`, print the unified diff that WOULD be written and exit 0 (dry-run).

Tests (≥12): mock argv/stdout/stderr/process.exit using a child-process subprocess pattern (NOT global mutation of `process` — that breaks node:test). Use `node:child_process.spawnSync(process.execPath, ['bin/hexo-tag-cloud-install.js', ...args], { cwd: tmpdir })` for each case. Each AC #1 exit code (0/1/2/3/4) gets a positive case; `--help` prints usage and exits 0; `--apply` writes the file (assert via tmpdir read); dry-run does NOT write. YAML parser tests cover: simple `theme: landscape`, `theme: "next"`, `theme: landscape  # comment`, missing `theme:` (exit 1), and nested-mapping `theme:\n  name: butterfly` (exit 1 with the "complex theme config" message). Coverage: c8 wraps the subprocess via `c8 --include=bin/hexo-tag-cloud-install.js node tests/server/installer/bin.test.js`; verify 100/100/100/100.

### T5 — `install-skill` subcommand + tests

Same bin file. Adds `install-skill` subcommand with flags `--target <dir>` (default `~/.claude/skills/hexo-tag-cloud/`), `--dry-run`. Behavior:

1. Resolve target dir; ensure parent exists; if target dir exists and is non-empty AND `--dry-run` is false → exit 4 with "target exists; remove or pass `--target <other-dir>`".
2. Walk `skills/hexo-tag-cloud/` (resolved via `__dirname`) and copy file-by-file. `--dry-run` prints the planned operations to stdout instead.
3. Print final summary: "skill installed at <target>; restart Claude Code to discover."

Tests (≥6): default-target dry-run prints planned ops; explicit `--target /tmp/<rand>/` dry-run + actual run; non-empty target without `--dry-run` exits 4; success path verified by reading the copied SKILL.md from tmpdir.

### T6 — `skills/hexo-tag-cloud/` + skill-distribution test

Create:
- `skills/hexo-tag-cloud/SKILL.md` (≤200 lines, plain markdown, NO YAML frontmatter — per AC #5). Sections in order: `# name` (one line: `hexo-tag-cloud`); `## description` (≤3 lines, one paragraph); `## when_to_use` (bullet list of trigger phrases); `## usage` (the `npx hexo-tag-cloud install` recipe; mandates "always run dry-run first; show the diff to the user; only run `--apply` after explicit user approval"); `## examples` (3 short transcripts); `## failure_modes` (each exit code 1-4 with recovery instruction). NO version string in the manifest — version is D's responsibility (package.json).
- `skills/hexo-tag-cloud/scripts/detect-theme.js`: reads `<cwd>/_config.yml`; prints JSON `{ theme, themeDir, engine }`.
- `skills/hexo-tag-cloud/scripts/inspect-partials.js`: walks `themes/<theme>/layout/` and prints JSON array of `{ path, engine, sizeBytes }` for files matching the recipe extensions.

`tests/server/installer/skill-distribution.test.js` (≥6):
- `skills/hexo-tag-cloud/SKILL.md` exists and ≤200 lines.
- SKILL.md contains all six required headings in spec-mandated order: `# name`, `## description`, `## when_to_use`, `## usage`, `## examples`, `## failure_modes`. Verified by parsing the file line-by-line and matching exact heading text.
- SKILL.md does NOT contain a YAML frontmatter block (asserts the file does not start with `---`) and does NOT hard-code a version string (asserts no line matches `/^\s*version\s*:/i`) — these are out-of-scope for C.
- `package.json` `files` array contains `"bin/"`, `"skills/"`, `"lib/installer/"`.
- `package.json` `bin` exposes `hexo-tag-cloud → bin/hexo-tag-cloud-install.js`.
- Helper scripts are syntactically valid (require() them; assert no throw).

### T7 — `tests/fixtures/landscape-bare/`

Hand-written minimal hexo site mimicking landscape's structure (NOT vendored real landscape — license + bloat reasons). Includes: a stub `_config.yml` with `theme: landscape`; `themes/landscape/_config.yml`; `themes/landscape/layout/_partial/sidebar.ejs` containing a couple of widget blocks but NO tag cloud; `themes/landscape/layout/index.ejs` minimal home layout that includes the sidebar partial; at least one post under `source/_posts/` so `hexo generate` produces a non-empty `index.html`; the `package.json` declares the same hexo + generator deps the existing `tests/fixtures/hexo-site/` does. Path matches README:23-25 documented landscape integration.

`tests/helpers/ensureFixtureInstalled.js` already accepts an arbitrary absolute fixture directory — no signature change. Reuse it for case (b) by passing the tmpdir absolute path. The CLI wrapper `tests/helpers/install-fixture.js` keeps its current default-fixture-only behaviour (used by `pretest:server`); the new e2e spec calls `ensureFixtureInstalled` directly.

### T8 — `tests/e2e/installer.spec.js` + script wiring

6 specs from AC #8 (a) through (f). Cases (a, c, d, e, f) are `child_process.spawnSync` of the bin against a tmpdir-copied fixture (no Playwright browser needed but still under `tests/e2e/installer.spec.js` per spec AC #8). Case (b) is the real-consumer integration:

1. Copy `tests/fixtures/landscape-bare/` to a tmpdir.
2. `ensureFixtureInstalled(tmpdir)` — npm-installs hexo deps + symlinks `hexo-tag-cloud` (helper already supports arbitrary fixture roots; no extension required).
3. Spawn the installer bin against the tmpdir with `--apply`.
4. `generateSite({ cwd: tmpdir })` (helper already accepts `cwd` per `tests/helpers/generateSite.js`).
5. `serveSite({ root: path.join(tmpdir, 'public') })` (helper already accepts `root` per `tests/helpers/serveSite.js`).
6. Playwright `page.goto(servedUrl)` and assert the canvas + a known tag are present.

New `package.json` script `test:e2e:installer` runs Playwright with the same config (chromium needed for case (b)). Fold both into `npm test` via `&&`. CI workflow updates fold installer e2e into the existing `e2e` job. The pre-install of the new fixture is owned by `installer.spec.js` step 2 (above) — NOT by a separate `pretest:e2e` script, so the existing `test:e2e` flow is untouched.

### T9 — README updates

`README.md` and `README.ZH.md` add an "AI-assisted install" section above "How to Use" documenting `npx hexo-tag-cloud install` (recommended) + manual fallback (the existing per-engine instructions remain). Add an `install-skill` paragraph. Existing "How to Use" stays for users without npx-able shells. Extend `tests/docs.test.js` with targeted assertions: README + README.ZH each contain a "## AI-assisted install" heading, the literal `npx hexo-tag-cloud install` invocation, and the `install-skill` subcommand. No length-range retune required (the existing docs.test.js asserts presence, not length).

### T10 — Integration + final cross-audit

Run full `npm test`. Dispatch one `code-review` task subagent on `gpt-5.5` for the integrated diff (range `<C-spec-commit>..HEAD`) in evidenced "show your work" mode (mandatory per audit protocol; A's R1 was rejected for theatrical bare PASS). Address CRITICAL findings (max 3 fix cycles). Write `docs/reviews/2026-05-03-C-final-diff-cross-audit.md` documenting verdict + cumulative cost telemetry. Mark SQL todo `C-ai-skill-theme-insert` as done.

## Risks + mitigations

- **`themes/<name>/` may not exist** for users with theme installed as `hexo-theme-<name>` npm dep (mounted via hexo's theme loader). Mitigation: `--theme-dir` flag (AC #1); if the auto-detected path doesn't exist, exit 1 with the explicit override hint.
- **Plan-audit churn**: budget ≥3 fix cycles. B's plan needed 5; do not assume first draft passes.
- **CRLF on Windows**: AC #3 conflict-detection test (T3) explicitly normalizes line endings. T8 fixture stays LF-only.
- **Coverage gate on bin entry**: T4 uses subprocess with c8 wrapper, NOT in-process require. Verify the c8 reporter understands subprocess coverage (use `c8 --reporter=text node --test tests/server/installer/bin.test.js` and check that bin/ lines appear in the report; fall back to stub-import pattern if not).

## Verification at end of each task

Same protocol as A and B: `npm run lint` exit 0; `npm run test:server` exit 0 with c8 100/100/100/100 across `--include` paths; new e2e specs pass. Snapshot-style locks on emitted partial bodies catch unintentional output drift.
