# Cross-audit — 2026-05-03 — Sub-project A plan

**Auditor:** gpt-5.5 (different family from PM claude-opus-4.7-xhigh)
**Plan:** `docs/plans/2026-05-03-A-tdd-ci-foundation-plan.md`
**Hard gate:** Plan approval (#3) — user-overridden in favor of 2-model agreement.

## Round 1 — CRITICAL

T5 mocking strategy (`node:test`'s `mock.module()`) incompatible with
Node 18 baseline (`engines.node>=18`). Tests cannot run on a clean
clone of any supported Node version without experimental flags.

→ Fix: switch T5 to `require.cache` injection of `hexo-fs` stub +
fresh `delete require.cache[require.resolve('../../index.js')]` per
case. Works on Node 18+, no flags. Test table reduced from 64
combinations to a precise 9 covering all branch arms.

## Round 2 — CRITICAL

Two findings (one-clue rule loosely applied — both real blockers):

1. **T3 + T7**: stock landscape theme partials don't load
   `tagcloud.js`/`tagcanvas.js`. The README explicitly tells users to
   patch their theme. T7's smoke assertion would fail.
   → Fix: ship a custom `themes/fixture-theme/` with explicit
   `layout/index.ejs` that wires the plugin scripts per the README
   pattern. Stock landscape removed from fixture devDeps.

2. **T8**: 4-shard Playwright matrix with one smoke spec. Empty
   shards fail by default.
   → Fix: single e2e job in A. Sharding deferred to D when spec
   count justifies it.

## Round 3 — IMPORTANT

Spec/plan drift: the spec still described "landscape-themed"
fixture and "4-shard Playwright matrix" while the plan was
amended to "custom fixture theme" and "single e2e job". Hard gate
#7 (implementation matches approved spec) at risk.

→ Fix: PM amended the spec to match the plan amendments.

## Round 4 — IMPORTANT

Two more "sharded" references in the spec that round 3 missed
(line 11 Purpose; Behavior #7).

→ Fix: PM scrubbed both.

## Round 5 — PASS

No remaining hard-gate-blocking drift.

## Hard-gate status: CLEARED via 2-model agreement.
