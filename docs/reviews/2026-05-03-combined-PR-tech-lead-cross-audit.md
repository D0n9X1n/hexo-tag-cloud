# Combined-PR Tech Lead cross-audit — `master..HEAD` (v3.0.0)

**Branch**: `feature/v3-overhaul`
**Range**: `git diff master..HEAD` (43 commits, 109 files, +10570/-160)
**PM**: `claude-opus-4.7-xhigh`
**Cross-auditor**: `gpt-5.5` (different family — same-family self-audit is theater)
**Audit substitutes for**: user-approval gate #6 (Tech Lead final) under
the user's 2-model-agreement override.

## Audit dimensions

1. Implementation matches design spec
2. Tests sufficient and meaningful (TDD bar from `../hexo-blog-encrypt`)
3. User-facing docs accurate and self-consistent
4. Operational risks (CI/CD, release pipeline, demo deploy)
5. Security/compliance (`npm audit --omit=dev --audit-level=high` exit 0,
   no secrets, no PII, no copyleft mixin)

## R1 — initial combined-PR audit on `master..77ccc48`

### Finding 1 — CRITICAL — Dim 5 — production audit failure

`npm audit --omit=dev --audit-level=high` exited 1: 6 vulnerabilities
(1 high, 4 moderate, 1 low) traced to `hexo-fs@0.2.3` pulling in
vulnerable `braces` (high), `chokidar` (moderate), `micromatch`
(moderate). Both `hexo-fs` and `hexo-log` were unjustified runtime deps
— `index.js` only uses two filesystem methods (copyFile, writeFile) and
the logger, both available natively / via `hexo.log`.

**Fix** (commit `187e9c5`):
- `index.js`: drop `require('hexo-fs')` → `require('fs/promises')`
  (the bare specifier — `node:fs/promises` bypasses user
  `require.cache` on Node 20+, breaking test injection). Drop
  `require('hexo-log')` → `(hexo && hexo.log) || console` fallback.
  Filter is now async; uses `mkdir({recursive:true})` defensively
  before copyFile/writeFile so `public/js/` exists.
- `package.json`: remove `dependencies` block entirely (no runtime deps).
- `tests/server/index.test.js`: convert to async; stub `fs/promises`
  via `require.cache` injection; inject `hexo.log` on the fake hexo.
  Two new tests: mkdir-creation and console-fallback when `hexo.log`
  absent.

**Verified**: `npm audit --omit=dev --audit-level=high` exits 0
(0 vulnerabilities); 268/268 tests pass at c8 100/100/100/100.

### Finding 2 — IMPORTANT — Dim 3 — docs claim non-existent `--dry-run` flag

`CHANGELOG.md:39` and `docs/migration-2.x-to-3.x.md:66` documented
`npx hexo-tag-cloud install --dry-run`. The CLI in `lib/installer/cli.js`
only accepts `apply: { type: 'boolean', default: false }` for the
`install` subcommand — bare `install` IS the dry-run; `--apply` writes.
(`install-skill --dry-run` is unaffected — that subcommand really does
support the flag.) Additionally `README.md:80` and `README.ZH.md:75`
still pinned `"hexo-tag-cloud": "2.1.*"` (MikeCoder-era).

**Fix** (commit `187e9c5`):
- CHANGELOG/migration: bare `install` IS dry-run, `--apply` writes.
- README/README.ZH: bumped pin to `"^3.0.0"`.

### Finding 3 — IMPORTANT — Dim 3 — wiki claims TagCanvas key passthrough

`computeOptions()` at `lib/options.js:62-72` only forwards 6 keys to the
emitted `tagcloud.js`: `textFont`, `textColor`, `textHeight`,
`outlineColor`, `maxSpeed`, `pauseOnSelected`. Anything else is silently
ignored. `wiki/Customization.md` advertised a 30-row TagCanvas reference
table (`textColour`, `outlineColour`, `freezeActive`, `depth`,
`pulsateTo`, `outlineMethod`, etc.) and `wiki/Installation.md` showed a
20-key config example using those names.

**Fix** (commit `187e9c5`):
- `wiki/Customization.md`: pared to the actual 6-key surface; recipes
  rewritten using supported keys; broader passthrough noted as v3.x
  roadmap.
- `wiki/Installation.md`: config example reduced to the 6 supported
  keys with a CJK fallback note.

## R2 — re-audit on `master..187e9c5`

### Verdict: IMPORTANT — one residual instance

R1 fixes landed coherently. `npm audit` clean, package.json has no
`dependencies`, async filter works on a real hexo instance,
cache-injection stub works for the bare `fs/promises` specifier as
claimed.

### Finding 4 — IMPORTANT — Dim 3 — demo config silently ignores its own colors

`demo/_config.yml:60` set `textColour: '#0a8eff'`,
`outlineColour: '#e2eaf1'`, `reverse: true`, `depth: 0.8` — same v2/
TagCanvas keys we just removed from the wiki. `lib/options.js` reads
the v3 names (`textColor`, `outlineColor`), so the demo's advertised
colors were silently ignored at generate time and the user-facing
demo fell back to the opinionated `#333` / `#E2E1C1` defaults.

Auditor evidence: `cd demo && npx hexo generate` then
`grep TagCanvas public/js/tagcloud.js` showed `TagCanvas.textColour =
"#333"` instead of the configured `#0a8eff`.

**Fix** (commit `d6fe32e`):
- `demo/_config.yml`: switched to `textColor`/`outlineColor`, dropped
  unsupported `reverse`/`depth`, added `pauseOnSelected: true`.
- Verified: `grep TagCanvas demo/public/js/tagcloud.js` now shows
  `TagCanvas.textColour = "#0a8eff"` and `outlineColour = "#e2eaf1"`
  (the values configured in `demo/_config.yml` flow through correctly;
  TagCanvas keeps the British spelling internally — that's the
  upstream library's API).

## R3 — final re-audit on `master..d6fe32e`

### Verdict: PASS

Auditor (`gpt-5.5`) confirmed:
- R2 fix landed (`demo/_config.yml` uses the v3 keys; demo's advertised
  colors visible in generated `tagcloud.js`).
- Exhaustive search across SKILL.md, scripts, wiki, migration doc,
  README/README.ZH, CHANGELOG, demo posts, test fixtures, and
  installer help text turned up no remaining `install --dry-run`
  reference or stale `textColour`/`outlineColour`/`freezeActive` config
  example.
- `npm run lint` exit 0; `npm run test:server` 268/268 pass at c8
  100/100/100/100; `npm audit --omit=dev --audit-level=high` 0
  vulnerabilities; `node build/verify-pack.js` reports 17 files;
  demo generates 30 files with %-encoded CJK/Cyrillic/HTML-special
  tag URLs.
- Hexo's `after_generate` filter path awaits async filters via
  `execFilter`, so the `fs/promises` migration does not introduce a
  deploy race.

**Audit cycles consumed**: R1 → R2 → R3 = 3 cycles. Within the
per-issue cycle cap (3) and within the plan's 7-12 dispatch budget.

**Tech Lead gate**: PASSED via 2-model agreement.
The PR is ready for `gh pr create`.
