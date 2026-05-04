# Sub-project B — spec + plan cross-audit record

**Date:** 2026-05-03
**Subject:** docs/specs/2026-05-03-B-refactor-non-ascii-design.md
            + docs/plans/2026-05-03-B-refactor-non-ascii-plan.md
**Auditor:** GPT-5.5 (rubber-duck, sync, one-clue mode)
**PM:** Claude Opus 4.7-xhigh

## Spec gate (PASSed after 1 fix cycle)

| Round | Verdict | Finding | PM action |
|---|---|---|---|
| R1 | CRITICAL | AC #4 said `taglist.length === 9` but spec required adding `C++` tag → count would be 10. | Rewrote AC #4 as a SUPERSET assertion: `taglist` text set must be a superset of `{"中文","日本語","한국어","Привет","C++"}`. |
| R2 | PASS | — | — |

## Plan gate (PASSed after 5 fix cycles)

| Round | Verdict | Finding | PM action |
|---|---|---|---|
| R1 | CRITICAL | Plan didn't update package.json's `test:server` `--include` flag → AC #3 (100% coverage on options.js + render.js) could silently pass while ignoring the new files. | Added explicit T8 bullet to extend `--include` to all three files + broaden the test runner glob. |
| R2 | CRITICAL | Plan's `computeOptions()` returned user-supplied `textFont` directly → spec mandates wrapping single-family fonts with the CJK fallback stack; bug 2 would be unfixed for users with `textFont: "Trebuchet MS"`. | Rewrote T1 with `ensureCjkFallback()` helper: empty/non-string → DEFAULT_TEXT_FONT; comma-containing → unchanged; single family → append CJK chain. Added 4 regression tests. |
| R3 | CRITICAL | E2E assertions used `taglist[i].original` but the actual TagCanvas Tag field is `text_original` (lib/tagcanvas.js:1138). `original` belongs to a different inner object (TextSplitter at lib/tagcanvas.js:891). Tests would collect `[undefined, ...]` and fail false. | Switched both call sites in T5/T7 to `text_original`; added inline comment distinguishing the two fields. |
| R4 | CRITICAL | Proposed `GetTagText()` patch on lib/tagcanvas.js would double-decode literal ampersand-bearing labels like `A&copy;B` → `A©B`. Plan's T6 even adds `A&B` and `quote"tag` to the fixture, but no test guards against this regression. | PM ran a live reproduction in fixture (headless Chromium + stock hexo `tagcloud()` + tags `C++`, `A&B`, `quote"tag`, CJK, Cyrillic). All work CORRECTLY in TagCanvas v2.9 with NO patch. Bug 3 is environment-specific (user's plugin chain). REWROTE T5: drop the patch entirely; ship regression tests + a discovery note + a README troubleshooting paragraph. |
| R5 | CRITICAL | Stale references to "patch lib/tagcanvas.js" survived in 4 places (Overview, Module shape, Task graph, Out-of-scope guard) — implementer could re-introduce the rejected patch by following stale instructions. | Scrubbed all 4 stale call sites. Remaining `patch`/`lib/tagcanvas.js` mentions are now ONLY in the T5 "no patch" rationale and the conditional-escalation guard. |
| R6 | PASS | — | — |

## Lesson for C/D and the final tech-lead audit

R4 is the highest-leverage finding of this whole sub-project. The PM's
initial spec described bug 3 from the upstream issue text alone, without
reproduction. The auditor pushed back with "what if it works already?"
which forced a live repro. The repro proved the bug doesn't exist in
our fixture, and the proposed patch would have introduced a regression.

**Discipline for C/D:** before specifying a "fix", reproduce the bug
first OR document why reproduction isn't feasible. The cross-audit
caught one case of "fixing a bug that wasn't reproducible".

## Cost telemetry — sub-project B (spec + plan gates only)

| Phase | Dispatches | Result |
|---|---|---|
| B spec   | 2 (R1 CRITICAL → R2 PASS) | PASS after 1 fix cycle |
| B plan   | 6 (R1-R5 CRITICAL → R6 PASS) | PASS after 5 fix cycles |
| **Total (gates)** | **8** | gates cleared |

Implementation tasks T1-T9 + final integrated B diff cross-audit still
to run; their cost will be tallied in the final B integrated cross-audit
record.
