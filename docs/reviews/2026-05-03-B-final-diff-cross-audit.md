# Sub-project B — final integrated-diff cross-audit

**Date:** 2026-05-03
**PM:** `claude-opus-4.7-xhigh`
**Auditor:** `gpt-5.5` (one-clue + evidenced "show your work" mode)
**Diff range:** `3e26acf..HEAD` on `feature/v3-overhaul` (6 commits, 16 files, +919 / −278)
**Verdict:** **PASS** (both models agree → user-approval gate satisfied per the override)

## Hard-contract checklist (from the dispatch)

| # | Contract | Result |
|---|---|---|
| 1 | `lib/tagcanvas.js` byte-identical to upstream v2.9 | PASS — `git diff 3e26acf..HEAD -- lib/tagcanvas.js` empty; only B-era log entries are the 2016 `2.0 beta version` and `add tagcancas lib`. |
| 2 | `index.js` exports a callable factory + typeof-guarded auto-register | PASS — `function registerHexoTagCloud(hexo)` at L45, `module.exports = registerHexoTagCloud` at L63, `if (typeof hexo !== 'undefined')` block at L73 with single `// eslint-disable-next-line no-undef` on L74. |
| 3 | Bug 1 fixed by construction (no `.replace(string, string)`) | PASS — `lib/render.js` uses `JSON.stringify(String(opts.X))` for all string knobs at L31-34; only `.replace` reference is in the explanatory header comment. Regression tests cover `$&`/`$$`/`$1`/backslash/quote/newline. |
| 4 | Bug 2 fixed (CJK fallback default + single-family extension) | PASS — `CJK_FALLBACK_STACK` at L19-22 of `lib/options.js`, `DEFAULT_TEXT_FONT` at L24, `ensureCjkFallback` at L36-40. Tests cover undefined / empty / single / multi families. |
| 5 | Bug 3 ships NO patch on tagcanvas.js; ships regression test instead | PASS — `docs/notes/2026-05-03-B-T5-no-patch.md` documents R4's `A&copy;B` → `A©B` regression risk and the live-repro evidence; e2e probes `text_original` (NOT the wrong `original` field) and asserts `C++` / `A&B` / `quote"tag` literals + CJK/Cyrillic superset + opaque pixel count > 100. |
| 6 | Coverage gate widened to all 3 source files | PASS — `package.json` `test:server` `--include=index.js --include=lib/options.js --include=lib/render.js`; live run shows 100/100/100/100 on all three. |
| 7 | A's lint accommodations deleted | PASS — `.eslintrc.js` has no `globals.hexo` and no `files: ['index.js']` override; `tests/server/lint-config.test.js` asserts both deletions; `npm run lint` exit 0. |
| 8 | E2E full pass (3/3 including B/T7) | PASS — paste in audit body. |
| 9 | No secrets / no abs-path leaks / no out-of-scope drift (no SKILL.md, no release.yml, no build/, no version bump) | PASS — `git diff` grep of secrets/path patterns returns `clean`; package.json version stays `2.1.2`; file list contains only B-scoped paths. |

## Audit cost telemetry (cumulative)

- Sub-project A: 9 dispatches (2 spec + 5 plan + 2 integrated diff)
- Sub-project B gates: 8 dispatches (2 spec + 6 plan)
- Sub-project B integrated diff: **1 dispatch** (this one) — auditor returned an evidenced PASS on the first round, so no fix loop required.
- Cumulative B-only: 9 dispatches.
- Total project so far: **18 dispatches** across 2 sub-projects (A + B).

All audits ran on `gpt-5.5` (different family from PM's `claude-opus-4.7-xhigh`).

## Lessons promoted to project-wide discipline

1. **Loader-shape discoveries are invisible to the plan auditor.** B's plan declared `module.exports = function(hexo)` and the auditor accepted it; only running real `hexo generate` against the new index.js exposed that hexo's plugin loader does not auto-call `module.exports` (see `docs/notes/2026-05-03-B-loader-discovery.md`). For C and D, **any change to an inter-tool boundary (CLI entry, MCP handshake, generator hook, GH-Actions workflow trigger) MUST be exercised against the real consumer before the integrated-diff dispatch.**

2. **One-clue + evidenced mode worked on the first round.** Unlike A's R1 (bare PASS, rejected as theatre), B's R1 returned per-contract tool calls + 3-5 line snippets, so the audit closed in a single dispatch. **Continue mandating the evidence protocol verbatim in C and D's dispatch prompts.**

3. **Plan audit churn is good.** B's plan needed 5 fix cycles vs A's 3; each round caught a real bug (R1 missed package.json `--include`; R2 missed `ensureCjkFallback`; R3 used wrong TagCanvas field name; R4 caught the double-decode regression risk; R5 caught stale references). The user's "skip human interaction" override does NOT mean "rush through audits" — auditor latency is the cheapest cost in the project.

## Next

Sub-project C kicks off — brainstorm the AI-skill shape (Claude Skill SKILL.md + scripts wrapping a deterministic `npx hexo-tag-cloud install --theme <name>` CLI is the recommended hybrid). Then D for the v3.0.0 release (CHANGELOG, demo, wiki, additional GH workflows from the sibling).
