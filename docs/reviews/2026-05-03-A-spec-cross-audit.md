# Cross-audit — 2026-05-03 — Sub-project A spec

**Auditor:** gpt-5.5 (different family from PM claude-opus-4.7-xhigh)
**Spec:** `docs/specs/2026-05-03-A-tdd-ci-foundation-design.md`
**Hard gate:** Spec approval (#2) — user-overridden in favor of 2-model agreement.

## Round 1 — CRITICAL

`extends: 'eslint:recommended'` (sibling pattern) fires on current `index.js`
without amendment:
- `index.js:25` — `Hexo` unused (no-unused-vars)
- `index.js:31` — `hexo` undeclared global (no-undef)
- `index.js:31` — `post` arg unused (no-unused-vars)

→ Spec contradicts itself: forbids edits to `index.js` AND mandates
`eslint:recommended`. Must-pass `npm test` cannot pass.

## PM amendment

Added explicit ESLint accommodation:
- `globals: { hexo: 'readonly' }` (top level)
- `overrides: [{ files: ['index.js'], rules: { 'no-unused-vars':
  ['error', { args: 'none', varsIgnorePattern: '^Hexo$' }] } }]`

Plus a "Lint-accommodation contract" section: B is required to land a
must-pass test asserting the override has been removed.

## Round 2 — PASS

Verified the rule shape against ESLint v6.8.0; `index.js` exits lint-clean.
B-side tightening contract is auditable. No CRITICAL or IMPORTANT finding.

## Hard-gate status: CLEARED via 2-model agreement.
