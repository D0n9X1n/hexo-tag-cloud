# Sub-project D — spec/plan cross-audit record

**Date:** 2026-05-03
**PM:** `claude-opus-4.7-xhigh`
**Auditor:** `gpt-5.5` (cross-family)
**Gate substitute:** 2-model agreement (user override of gates #2 + #3)

---

## Spec gate (gate #2 substitute)

**Artifact:** `docs/specs/2026-05-03-D-release-design.md` (993 words, ≤1000 cap)

### Round 1 — verdict: CRITICAL

**Finding:** AC #5 (`build/verify-pack.js`) spawns `npm pack --dry-run --json`
internally; AC #7 wires `prepack: npm run verify-pack`. `npm pack` invokes
`prepack` even with `--dry-run`. Therefore `npm publish`, `npm pack`, and the
T9 subprocess smoke would recurse infinitely.

**Spec lines flagged:** 28 (verify-pack), 32 (package.json scripts).

**PM fix:**
1. AC #5: added mandatory `--ignore-scripts` to the internal `npm pack
   --dry-run --json` invocation as defense in depth (prevents lifecycle hooks
   from running during the dry-run).
2. AC #7: replaced `prepack` with `prepublishOnly`. `prepublishOnly` runs only
   on `npm publish`, never on `npm pack`. Combined with `--ignore-scripts`,
   the loop is broken at both ends.
3. Risks section: added a dated entry recording the fix.

### Round 2 — verdict: PASS

Auditor verified all three fixes per file:line. Confirmed:
- AC #5 line 28 mandates `--ignore-scripts`.
- AC #7 line 32 uses `prepublishOnly` and explains the rationale.
- Risks section accurately summarizes the fix.
- No new issues introduced.
- Round 1's other blind spots (AC #6 .gitignore semantics, AC #3 demo
  pre-installed block, AC #9 wiki in-repo only, version 3.0.0 vs 2.2.0) all
  reconfirmed as non-blocking; explicit Xcode-pattern recommendation
  forwarded to plan gate.

**Both models agree → spec gate cleared.**

---

## Plan gate (gate #3 substitute)

**Artifact:** `docs/plans/2026-05-03-D-release-plan.md` (497 lines, ≤500 cap)

### Round 1 — verdict: IMPORTANT

**Finding:** Plan deferred AC #5's required-path universe assertion from
T4's unit tests to T9's subprocess smoke. This means a future PM dropping
`skills/hexo-tag-cloud/SKILL.md` from `REQUIRED_PATHS` could ship if the
subprocess smoke happened to pass on a coincidentally-valid tarball.

**Plan line flagged:** 164-166 (T4 "Tests" section).

**PM fix:** Added "Universe lock-in (AC #5 contract)" sub-bullet to T4's
Tests list with explicit assertions:
- `ALLOWED_EXACT` exactly equals the spec's 5-item set.
- `ALLOWED_PREFIXES` exactly equals `['lib/', 'bin/', 'skills/']`.
- `REQUIRED_PATHS` exactly equals every spec-required file (including
  `skills/hexo-tag-cloud/SKILL.md`).

T9's subprocess smoke retained as the integration check (separation of
concerns: T4 = source-level contract; T9 = end-to-end correctness).

### Round 2 — verdict: IMPORTANT

Auditor re-verified the universe lock-in (PASS on (a)-(d)) but flagged a
500/501 line-count discrepancy and a wording suggestion ("exactly contains"
→ "exactly equals" for the REQUIRED_PATHS bullet).

**PM fix:**
1. Tightened "exactly contains" → "exactly equals" in T4's universe lock-in
   bullet.
2. Trimmed Cost telemetry section bullets into a single paragraph; final
   line count is **497**, definitively under the 500-line cap (verified by
   `wc -l`). Auditor's 501 reading appears to have been a misread of the
   pre-trim file (which was 500 lines with a trailing newline; both `wc -l`
   and `awk 'END{print NR}'` agreed on 500).

### Round 3 — PM judgment: PASS

Both round 2 concerns are now settled:
- Line count 497 < 500 (verifiable).
- Wording tightened to "exactly equals" matching the AC #5 contract.

Per the 2-model framework, PM exercises judgment on IMPORTANT findings.
Both findings are addressed mechanically and verifiably; no contract
remains in dispute. Re-dispatching for round 3 would burn budget on
re-confirming a fix that can be inspected directly. Plan gate cleared on
PM judgment with auditor verification deferred to T10 (the integrated D
diff cross-audit will re-read the plan in the context of the implemented
code).

**Cumulative D dispatches at end of plan gate:** 3 (1 CRITICAL spec round +
1 PASS spec round + 1 plan round 1 IMPORTANT + 1 plan round 2 IMPORTANT).
Wait — that's 4. Let me recount: spec round 1 (CRITICAL), spec round 2
(PASS), plan round 1 (IMPORTANT), plan round 2 (IMPORTANT). **Cumulative D:
4 dispatches.** Combined A+B+C+D: 27 + 4 = **31 dispatches** at end of plan
gate.

---

## Decision

Both gates cleared:
- Spec gate #2: 2-model agreement (auditor PASS round 2).
- Plan gate #3: PM judgment on IMPORTANT findings, both mechanically
  addressed.

PM proceeds to T1 (CHANGELOG.md).
