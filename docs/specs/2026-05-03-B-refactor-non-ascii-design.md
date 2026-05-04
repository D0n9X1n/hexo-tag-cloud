# Sub-project B — Refactor + non-ASCII tag handling

**Date:** 2026-05-03  | **Track:** Complex (sub-project of v3.0.0 overhaul)
**PM:** claude-opus-4.7-xhigh  | **Cross-auditor:** gpt-5.5
**Spec word budget:** ≤1000 words.  Plan budget: ≤500 lines.

## Problem

Current `index.js` is a 130-line monolith with several issues that
sub-project A intentionally deferred:

1. **`String.prototype.replace(string, string)` interprets `$&`, `$$`, `$'`,
   `` $` ``, `$1` in the replacement string as special patterns.**  If a user
   sets `textFont: "My$&Font"` in `_config.yml`, the emitted `tagcloud.js`
   contains `My${textFont}Font` — broken. Same exposure on every knob the
   user can configure.
2. **Default font is bare `'Helvetica'` — has no CJK glyphs.** On systems
   without a CJK font installed (Windows without "Microsoft YaHei", Linux
   without "Noto Sans CJK", etc.) Chinese / Japanese / Korean tags render
   as ☐ tofu boxes on the canvas. Same risk for Cyrillic on stripped Linux
   images.
3. **Upstream issue [MikeCoder#39][i39]** reports tag names with the `+`
   character displaying as `&#43;` on the canvas. Hexo's `tagcloud()` helper
   HTML-escapes special chars; `Element.innerText` decodes them in modern
   browsers, but TagCanvas v2.9 reads `e.innerText || e.textContent` and
   the `||` short-circuit picks `textContent` on some legacy code paths,
   which does NOT decode `&#43;`. Need to ensure the canvas-rendered text
   matches the user's original tag name byte-for-byte.
4. **`var Hexo = require("hexo")` is unused** — A had to add a temporary
   eslint accommodation to keep CI green. B's contract: delete it,
   delete the accommodation.
5. **Implicit `global.hexo`** — the file uses a global instead of the
   module-export `function(hexo) { … }` pattern that hexo plugins should
   use. Untestable without `require.cache` injection (A's workaround).
6. **No JSDoc, no input validation, no separation of concerns.** Hard to
   evolve, hard to test.

[i39]: https://github.com/MikeCoder/hexo-tag-cloud/issues/39

## Goal

Refactor `index.js` to a small set of pure functions registered via the
proper hexo plugin contract; fix the three real bugs (escape, font, entity
decode); and keep every consumer-visible byte stable for default config.

## Scope

### In

- Refactor `index.js` to a 3-layer module:
  1. `lib/options.js`   — pure: input → normalised options
  2. `lib/render.js`    — pure: options → tagcloud.js source string
  3. `index.js`         — the only file that touches `hexo-fs` /
                          `hexo-log` / the hexo runtime.  Registers
                          the `after_generate` filter via
                          `module.exports = function(hexo) { … }` and
                          stops relying on `global.hexo`.
- Fix bug 1: switch `.replace(string, string)` → template literals OR
  `.replace(string, () => value)`.
- Fix bug 2: change the DEFAULT `textFont` to a CJK-safe stack:
  `'Helvetica, Arial, "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans CN", "Noto Sans CJK SC", sans-serif'`
  (single source of truth in `lib/options.js`). User-supplied `textFont`
  is wrapped through the same stack as a fallback if the user's font is
  a single family with no commas.
- Fix bug 3: minimal patch to the `lib/tagcanvas.js` text-acquisition
  path so it always uses `innerText` (which decodes entities) and falls
  back to a manual entity-decode helper when `innerText` returns empty.
  Patch is annotated `// hexo-tag-cloud v3.0.0` so the upstream lineage
  stays visible.
- Delete the temporary eslint accommodation block in `.eslintrc.js`.
- Add `tests/server/lint-config.test.js` asserting the override is gone.
- Expand `tests/server/index.test.js` with cases for: `$&` in textFont,
  `+` in tag name, default font is the CJK stack, `pauseOnSelected: 0`,
  `textHeight: 0`. Maintain c8 100/100/100/100.
- Add `tests/server/options.test.js` and `tests/server/render.test.js`
  for the new pure modules. 100% coverage on each.
- Update `tests/server/__snapshots__/tagcloud.default.js` to reflect the
  new default font stack. Document the snapshot diff in the commit body.
- Extend the e2e smoke spec to assert that the CJK / Cyrillic / `+`
  tags actually render (canvas pixel-count assertion + visual screenshot
  artefact).
- Update `README.md` + `README.ZH.md` "How to Use" to reflect the new
  default font and any changed `_config.yml` keys (none planned). Note
  the `+` fix.

### Out (deferred)

- AI skill (sub-project C).
- Demo site, wiki, CHANGELOG, npm/GH publishing (sub-project D).
- Theme-matrix visual regression (sub-project D).
- TypeScript migration (out of v3.0.0).
- Replacing TagCanvas with a modern alternative (out of v3.0.0; mentioned
  in upstream issue #35 but breaking).

## Non-goals

- No new `_config.yml` knobs.
- No backwards-incompatible changes to the public `_config.yml` shape.
- No change to `lib/tagcanvas.js` beyond the minimal entity-decode patch.

## Acceptance criteria

1. `git diff master..feature/v3-overhaul -- .eslintrc.js` shows the
   temporary `index.js` override block deleted.
2. `tests/server/lint-config.test.js` passes — asserts no
   `{ files: ['index.js'] }` override exists in the lint config.
3. `npm run test:server` passes with **100/100/100/100 c8 coverage on
   `index.js`, `lib/options.js`, AND `lib/render.js`** (`--include`
   covers all three).
4. `npm run test:e2e` passes; the smoke spec asserts the CJK / Cyrillic
   / `+` tags load into TagCanvas (the `taglist` text set is a superset
   of `{"中文", "日本語", "한국어", "Привет", "C++"}`) and the canvas
   renders a non-zero number of opaque pixels.
5. New regression tests:
   - `textFont: "My$&Font"` round-trips intact through `tagcloud.js`.
   - Tag name `C++` produces `+` (not `&#43;`) in the rendered text per
     a TagCanvas DOM probe.
   - Default `textFont` includes at least one CJK family.
6. `npm test` (lint + server + e2e) clean end-to-end on a clean clone.
7. `index.js` registers via `module.exports = function(hexo) { … }`
   and the test harness stops needing `global.hexo`.
8. PM and gpt-5.5 cross-auditor both PASS the integrated B diff.

## Risks & mitigations

- **Snapshot drift breaks anyone who pinned the old defaults.** v3.0.0
  is a major bump → semver-permitted; document in B's commit body and
  in D's CHANGELOG.
- **`lib/tagcanvas.js` patch goes stale vs upstream.** Annotate the
  patch with `// hexo-tag-cloud v3.0.0` markers and capture the original
  bytes in `lib/tagcanvas.js.upstream` for later diff. (Optional — PM
  decides at plan time.)
- **CJK font stack varies by OS.** The fallback chain covers Mac /
  Windows / Linux / common Hexo CI environments. Tests use Playwright
  Chromium which ships Noto CJK; production users on stripped systems
  still need to install a CJK font, but no longer have to KNOW that.

## Decomposition guard

If implementation reveals B is >12 tasks or any single task is
unbounded, PM stops, splits B into B1/B2, and re-runs the spec gate.
The framework forbids open-ended single tasks.
