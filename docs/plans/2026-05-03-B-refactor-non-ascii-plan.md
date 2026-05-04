# Sub-project B — Refactor + non-ASCII tag handling — IMPLEMENTATION PLAN

**Spec:** `docs/specs/2026-05-03-B-refactor-non-ascii-design.md` (PASSed
spec gate, 2026-05-03)
**Plan word/line budget:** ≤500 lines
**PM:** claude-opus-4.7-xhigh  | **Cross-auditor:** gpt-5.5

## Overview

Three real bugs to fix + a refactor that makes them fixable:

| # | Bug | Fix surface |
|---|---|---|
| 1 | `.replace(string, string)` interprets `$&` etc. | `lib/render.js` |
| 2 | Default font has no CJK glyphs | `lib/options.js` |
| 3 | TagCanvas reads `&#43;` (HTML-entity) for `C++` | E2E regression test only — TagCanvas v2.9 already correct in our fixture; no patch (see T5 discovery) |

Plus: 3-layer module split (`lib/options.js` + `lib/render.js` + `index.js`),
delete A's lint accommodation, lint-config self-test.

## Module shape

```
index.js                         hexo plugin entry — only file that
                                 touches hexo-fs / hexo-log / hexo runtime
└── module.exports = function(hexo) { ... }
        registers after_generate filter; in the filter:
          - call computeOptions(hexo.config.tag_cloud) → opts
          - call renderTagCloudJs(opts)                → js source
          - copy lib/tagcanvas.js → public/js/
          - write rendered js → public/js/tagcloud.js

lib/options.js
└── computeOptions(rawCfg) → { textFont, textColour, textHeight,
                               outlineColour, maxSpeed, pauseOnSelected }
    pure; defaults applied here; CJK font stack is the textFont default

lib/render.js
└── renderTagCloudJs(opts) → string
    pure; template-literal based; never special-cases input bytes

lib/tagcanvas.js
└── REMAINS BYTE-IDENTICAL TO UPSTREAM TagCanvas v2.9.
    A live repro (T5) showed bug 3 doesn't trigger here; we ship
    regression tests instead.
```

## Task graph (sequential unless noted)

```
T1 (lib/options.js + tests)
   ↓
T2 (lib/render.js + tests)
   ↓
T3 (index.js refactor → uses T1+T2; tests updated)
   ↓                           ↘
T4 (delete eslint accommodation;   T5 (lib/tagcanvas.js DOM regression test
    add lint-config.test.js)            — NO patch; ships e2e + evidence note)
   ↓                           ↙
T6 (fixture: add C++ tag post)
   ↓
T7 (e2e smoke spec extended: CJK/Cyrillic/+ assertions, pixel count)
   ↓
T8 (snapshot regenerated; README + README.ZH "How to Use" updated)
   ↓
T9 (full `npm test` clean end-to-end; final integrated B diff
    cross-audit on gpt-5.5)
```

T4 and T5 are independent of each other; PM may interleave them. T1-T3
are strictly sequential because each depends on the previous module
shape.

---

## T1 — `lib/options.js` + `tests/server/options.test.js`

**Surface:**
- New file `lib/options.js`:
  ```js
  'use strict';
  const CJK_FALLBACK_STACK =
    'Arial, "PingFang SC", "Microsoft YaHei", ' +
    '"Hiragino Sans GB", "Source Han Sans CN", ' +
    '"Noto Sans CJK SC", sans-serif';
  const DEFAULT_TEXT_FONT = 'Helvetica, ' + CJK_FALLBACK_STACK;

  function ensureCjkFallback(font) {
    // If the user supplied a multi-family stack (contains a comma),
    // assume they know what they're doing and don't touch it. If they
    // supplied a single family, append the CJK fallback chain so CJK
    // tags render on systems without their primary font.
    if (typeof font !== 'string' || font.length === 0) return DEFAULT_TEXT_FONT;
    if (font.indexOf(',') >= 0) return font;
    return font + ', ' + CJK_FALLBACK_STACK;
  }

  function computeOptions(rawCfg) {
    const cfg = (rawCfg && typeof rawCfg === 'object') ? rawCfg : {};
    return {
      textFont:        ensureCjkFallback(cfg.textFont),
      textColour:      cfg.textColor       || '#333',
      textHeight:      (cfg.textHeight !== undefined) ? cfg.textHeight : 15,
      outlineColour:   cfg.outlineColor    || '#E2E1C1',
      maxSpeed:        (cfg.maxSpeed   !== undefined) ? cfg.maxSpeed   : 0.03,
      pauseOnSelected: (cfg.pauseOnSelected !== undefined)
                          ? cfg.pauseOnSelected : true,
    };
  }
  module.exports = { computeOptions, ensureCjkFallback,
                     DEFAULT_TEXT_FONT, CJK_FALLBACK_STACK };
  ```
- Tests `tests/server/options.test.js`: 9 cases covering same matrix as
  A's T5 + the following bug-2-regression cases:
  - default `textFont` includes `"Noto Sans CJK SC"` (proxy: at least
    one CJK family).
  - `textFont: "Trebuchet MS"` (single family, no comma) → output
    contains `"Trebuchet MS"` AS THE FIRST FAMILY and includes
    `"Noto Sans CJK SC"` somewhere after it.
  - `textFont: "Trebuchet MS, sans-serif"` (already a stack) →
    passes through unchanged (no double-append of the CJK chain).
  - `textFont: ""` (empty string) → falls back to `DEFAULT_TEXT_FONT`.
  - Edge cases mandated: `textHeight: 0`, `maxSpeed: 0`,
    `pauseOnSelected: false` — all must pass through unchanged
    (the `!== undefined` guard MUST replace A's `||` so falsy-but-
    valid values aren't clobbered by defaults).

**Verification:** `npx c8 --include=lib/options.js --check-coverage
--lines=100 --functions=100 --branches=100 --statements=100 node --test
tests/server/options.test.js` exits 0.

---

## T2 — `lib/render.js` + `tests/server/render.test.js`

**Surface:**
- New file `lib/render.js`:
  ```js
  'use strict';
  function renderTagCloudJs(opts) {
    const { textFont, textColour, textHeight, outlineColour,
            maxSpeed, pauseOnSelected } = opts;
    return `function addLoadEvent(func) {
      var oldonload = window.onload;
      ...
      try {
        TagCanvas.textFont = ${JSON.stringify(textFont)};
        TagCanvas.textColour = ${JSON.stringify(textColour)};
        TagCanvas.textHeight = ${Number(textHeight)};
        TagCanvas.outlineColour = ${JSON.stringify(outlineColour)};
        TagCanvas.maxSpeed = ${Number(maxSpeed)};
        TagCanvas.freezeActive = ${Boolean(pauseOnSelected)};
        ...
        TagCanvas.Start('resCanvas');
      } catch(e) { ... }
    });`;
  }
  module.exports = { renderTagCloudJs };
  ```
  Strings are emitted via `JSON.stringify` (escapes quotes, backslashes,
  unicode, control chars) — eliminates bug 1 by construction. Numbers
  via `Number()`, booleans via `Boolean()`.
- Tests `tests/server/render.test.js`: cases include
  - `textFont: 'My$&Font'` round-trips intact (no `${textFont}` substring
    in output; `'My$&Font'` literal present).
  - `textFont: 'Path \\with\\backslashes'` round-trips intact.
  - `textHeight: 0` emits `TagCanvas.textHeight = 0;`.
  - `pauseOnSelected: false` emits `TagCanvas.freezeActive = false;`.

**Verification:** c8 100/100/100/100 on `lib/render.js`.

---

## T3 — refactor `index.js` to use T1+T2

**Surface:**
- Delete: `var Hexo = require("hexo");`, `var path = require("path");`,
  any unused imports.
- Replace: `hexo.extend.filter.register("after_generate", function(post) { ... })`
  → `module.exports = function(hexo) { hexo.extend.filter.register(...) };`
- Body:
  ```js
  const fs   = require('hexo-fs');
  const log  = require('hexo-log')({ debug: false, silent: false });
  const path = require('path');
  const { computeOptions } = require('./lib/options');
  const { renderTagCloudJs } = require('./lib/render');

  module.exports = function(hexo) {
    hexo.extend.filter.register('after_generate', function() {
      const libPath  = path.join(hexo.base_dir, 'node_modules',
                                 'hexo-tag-cloud', 'lib');
      const srcLib   = path.join(libPath, 'tagcanvas.js');
      const destLib  = path.join(hexo.public_dir, 'js', 'tagcanvas.js');
      const destBoot = path.join(hexo.public_dir, 'js', 'tagcloud.js');

      log.info('---- START COPYING TAG CLOUD FILES ----');
      fs.copyFile(srcLib, destLib);
      const opts = computeOptions(hexo.config.tag_cloud);
      const js   = renderTagCloudJs(opts);
      fs.writeFile(destBoot, js);
      log.info('---- END COPYING TAG CLOUD FILES ----');
    });
  };
  ```
- Update `tests/server/index.test.js`:
  - Stop mutating `global.hexo`.
  - Test pattern: `const factory = require('../../index.js'); factory(fakeHexo);`
  - Capture the registered filter, fire it, assert writes (same
    captures as A).
  - Same 10 cases (default + 6 single knob + 1 all-knobs +
    `pauseOnSelected: false` + snapshot). All assertions must remain
    100% c8 on `index.js`.
- Snapshot: regenerate `tests/server/__snapshots__/tagcloud.default.js`
  (font default changes; document the exact diff in the commit body).
- **Update `package.json`'s `test:server` script** to extend the c8
  `--include` flag from `--include=index.js` to
  `--include=index.js --include=lib/options.js --include=lib/render.js`
  AND change the test runner glob to also pick up the new test files:
  `node --test tests/server/*.test.js tests/docs.test.js`. Without
  this change, AC #3 silently passes with coverage only enforced on
  `index.js`.

**Verification:** c8 100/100/100/100 on `index.js, lib/options.js, lib/render.js`.

---

## T4 — delete A's lint accommodation + lint-config self-test

- `.eslintrc.js`: delete the `overrides: [{ files: ['index.js'], ... }]`
  block AND the `globals: { hexo: 'readonly' }` entry (the new
  `module.exports = function(hexo)` shape makes `hexo` a parameter, no
  longer a global).
- New `tests/server/lint-config.test.js`:
  ```js
  const test = require('node:test');
  const assert = require('node:assert/strict');
  const cfg = require('../../.eslintrc.js');

  test('no temporary index.js override remains', () => {
    const overrides = cfg.overrides || [];
    const idx = overrides.find(o =>
      Array.isArray(o.files) && o.files.length === 1 && o.files[0] === 'index.js');
    assert.equal(idx, undefined,
      'sub-project B must remove the temporary index.js eslint override');
  });
  test('no temporary global.hexo declaration remains', () => {
    const globals = cfg.globals || {};
    assert.equal(globals.hexo, undefined,
      'sub-project B must remove the temporary global.hexo declaration');
  });
  ```

**Verification:** `npm run lint` exit 0; `node --test tests/server/lint-config.test.js` exit 0.

---

## T5 — `lib/tagcanvas.js` regression test (NO PATCH NEEDED)

**Discovery during planning.** A live reproduction in our fixture
(headless Chromium + stock hexo `tagcloud()` helper + tags `C++`,
`A&B`, `quote"tag`, all CJK / Cyrillic) shows that TagCanvas v2.9's
existing `e.innerText || e.textContent` path correctly returns the
decoded literal text for ALL special characters:

| Tag (config)   | TagCanvas `text_original` (observed) |
|----------------|--------------------------------------|
| `C++`          | `"C++"`                              |
| `A&B`          | `"A&B"`                              |
| `quote"tag`    | `"quote\"tag"`                       |
| `中文`         | `"中文"`                             |
| `Привет`       | `"Привет"`                           |

The upstream issue [MikeCoder#39][i39] is therefore environment-specific
(triggered by the user's particular hexo plugin chain double-escaping
entities at render time, NOT by TagCanvas misreading the DOM). A blind
patch to `lib/tagcanvas.js` would risk the *opposite* bug: double-decoding
literal ampersand-bearing labels like `A&copy;B` into `A©B`. (Caught by
GPT-5.5 R3 audit.)

**Decision:** ship REGRESSION TESTS that guard the working behaviour;
do NOT patch `lib/tagcanvas.js`. If a future user reports the issue
repros against our fixture, we have the test infrastructure to add a
narrow, targeted fix.

[i39]: https://github.com/MikeCoder/hexo-tag-cloud/issues/39

**Surface:**
- Add to `tests/e2e/smoke.spec.js` an assertion that the C++ /
  `A&B` / `quote"tag` tags load with `text_original` matching the
  raw config value (covered by T7's superset assertion + an extra
  exact-match block in T7).
- Document the discovery in `docs/notes/2026-05-03-B-T5-no-patch.md`
  (one-paragraph note + the live-repro evidence above) so future
  maintainers don't re-litigate the patch decision.
- Update `README.md` "Troubleshooting" with a one-paragraph note:
  "If your tag names appear with literal `&#NN;` HTML entity codes
  on the canvas, your hexo build chain is double-escaping the tag
  text before TagCanvas reads it. Audit your hexo plugin list for
  any markdown/HTML post-processor that touches `<a>` text content."

**Verification:** the new exact-match assertion in T7's e2e spec
passes; `lib/tagcanvas.js` remains byte-identical to upstream
TagCanvas v2.9.

---

## T6 — fixture: add `C++` tag post

- New file `tests/fixtures/hexo-site/source/_posts/cpp-tag.md`:
  ```yaml
  ---
  title: Special character tags
  date: 2026-05-03 00:00:00
  tags:
    - C++
    - 'A&B'
    - 'quote"tag'
  ---
  Tests upstream issue #39 — `+` (and similar HTML-special chars) must
  render literally on the canvas, not as `&#43;`.
  ```
- Re-run `hexo generate`; commit the new fixture file only (not the
  generated public/).

---

## T7 — e2e smoke spec extension

Add to `tests/e2e/smoke.spec.js`:
```js
test('TagCanvas loads CJK / Cyrillic / HTML-special tags from the DOM',
    async ({ page, siteUrl }) => {
  await page.goto(siteUrl + '/');
  await page.waitForFunction(() =>
    typeof TagCanvas !== 'undefined' && TagCanvas.tc && TagCanvas.tc.resCanvas);
  const result = await page.evaluate(() => {
    const tc = TagCanvas.tc.resCanvas;
    const texts = (tc.taglist || []).map(t => t.text_original);
    const cv = document.getElementById('resCanvas');
    const data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) opaque++;
    return { texts, opaque };
  });
  // Spec AC #4 — superset of expected tags.
  for (const required of ['中文', '日本語', '한국어', 'Привет', 'C++']) {
    expect(result.texts, `missing required tag "${required}"`).toContain(required);
  }
  // Spec AC #5 + T5 regression — HTML-special characters render literally.
  expect(result.texts, 'A&B (literal ampersand) must be present').toContain('A&B');
  expect(result.texts, 'quote"tag (literal double-quote) must be present').toContain('quote"tag');
  expect(result.opaque, 'canvas must render opaque pixels').toBeGreaterThan(100);
});
```

**Verification:** `npm run test:e2e` exits 0 with this spec passing.

---

## T8 — snapshot + README updates

- Regenerate `tests/server/__snapshots__/tagcloud.default.js` via
  `UPDATE_SNAPSHOTS=1 node --test tests/server/index.test.js`.
- Commit body: paste the diff of the snapshot (will show the new font
  default + the JSON-stringify-quoted shape).
- README.md / README.ZH.md: update the `_config.yml` example's
  `textFont` line to reflect the new CJK-safe default. Add a one-line
  "v3.0.0: HTML-special characters in tag names (e.g. `C++`) now
  render correctly on the canvas." note in the changelog snippet at
  the bottom of the "How to Use" section.

**Verification:** `npm run test:server` exit 0 (snapshot test passes
against the regenerated bytes).

---

## T9 — integration + final cross-audit

1. `npm test` clean end-to-end on a fresh `git worktree` checkout of
   the branch. Paste output (or summary).
2. Dispatch ONE `code-review` task subagent on `gpt-5.5` with the
   FULL `git diff` for sub-project B's commits, in one-clue mode + the
   "show your work" evidenced-audit protocol used for A's final gate.
3. PASS = B done. CRITICAL = fix loop (max 3). IMPORTANT = PM judges.

Commit final state with cost-telemetry footer.

## Out of scope (decomposition guard)

T5 ships a DOM regression test only (no `lib/tagcanvas.js` patch — see
the T5 discovery section for the reasoning). If implementation surfaces
a real reproduction of bug 3 against our fixture, PM stops, files a
follow-up note, and adds a narrowly-targeted patch with a guard test
covering the double-decode risk identified in the GPT-5.5 R4 audit
(literal `A&copy;B` must NOT decode to `A©B`). Do NOT chase a
TagCanvas refactor — that's an explicit non-goal of v3.0.0.
