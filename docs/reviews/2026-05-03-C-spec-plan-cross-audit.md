# Sub-project C — spec + plan cross-audit record

PM model: `claude-opus-4.7-xhigh`. Auditor model: `gpt-5.5`. Auditor agent type:
`rubber-duck`, `mode=sync`. Per the user's 2-model-agreement override of the
hard human-approval gates.

## Spec gate

Spec: `docs/specs/2026-05-03-C-ai-skill-design.md` (805 words, ≤1000 cap).

| Round | Verdict | Finding (one-clue mode) | Resolution |
|---|---|---|---|
| R1 | IMPORTANT | AC #3 didn't specify managed-block conflict policy → silent user-edit data-loss risk. | Rewrote AC #3 with a deterministic decision tree: byte-match → no-op; user-modified → diff + exit 2 + `--force` hint; legacy install (no markers + canvas/script triple) → exit 3 + `--migrate` hint. Word count 940. |
| R2 | IMPORTANT | AC #3 mentioned `--force` and `--migrate` but AC #1 didn't enumerate them; `--migrate` was deferred in out-of-scope, creating contract mismatch. | AC #1 now enumerates `--force`, `--theme-dir`, exit codes 1-4. AC #3 changed legacy message to "remove the existing block manually before re-running". AC #8 added cases (d) edited-block + `--apply` exits 2, (e) `--apply --force` overwrites. Out-of-scope `--migrate` line clarified. Trimmed to 860 words. |
| R3 | PASS | All 4 amendments verified. | Spec gate cleared. |

Brainstorm: `docs/notes/2026-05-03-C-brainstorm.md`. Shape decision: hybrid
(1+4) — Claude Skill `SKILL.md` + helper scripts bundled in npm wrapping a
deterministic `npx hexo-tag-cloud install` CLI. Brainstorm-R1 IMPORTANT
finding: "Claude Skill bundled in npm assumes Claude Code auto-discovery
that current repo state does not provide." Folded into spec AC #6 as the
`install-skill` subcommand contract.

## Plan gate

Plan: `docs/plans/2026-05-03-C-ai-skill-plan.md` (175 lines, ≤500 cap).

| Round | Verdict | Finding | Resolution |
|---|---|---|---|
| R1 | CRITICAL | T6 invented YAML frontmatter for SKILL.md with `version: 3.0.0`, drifting from spec AC #5 (markdown-section convention) and into D's version-bump territory. | Rewrote T6: plain markdown sections matching AC #5's heading order verbatim; explicit "NO YAML frontmatter" + "NO version string"; skill-distribution.test.js adds 2 negative tests asserting absence of `---` frontmatter and `^version:` line. |
| R2 | IMPORTANT | T7/T8 install-and-serve path for the new `landscape-bare` fixture was underspecified — AC #8(b) could either fail on missing deps or accidentally serve the existing `hexo-site` fixture. | T8 case (b) now lists 6 numbered steps (copy-to-tmpdir → ensureFixtureInstalled → installer --apply → generateSite({cwd}) → serveSite({root}) → page.goto + assertions). Pre-install owned by the spec, NOT by a separate `pretest:e2e` script. |
| R3 | IMPORTANT | (1) CRLF normalization site-of-record was unclear — risk of unintended CRLF→LF conversion on `force-replace`. (2) T7 helper-extension wording redundant — `ensureFixtureInstalled` already accepts arbitrary absolute paths and `generateSite({cwd})` already exists. | (1) T3 now spells out: comparison normalizes EOL; emission re-emits with the existing file's dominant EOL; new tests assert CRLF input → CRLF output on insert AND force-replace. T4 step 6 reads as-is; T3 owns EOL handling. (2) T7 reworded to clarify no helper-signature change required; T9 simplified to add targeted README-presence assertions to docs.test.js (no length retune). |

PM judged R3 (IMPORTANT, non-blocking) as worth addressing rather than
deferring; both fixes landed in-place. Plan gate cleared.

## Audit cost telemetry (sub-project C, gates 2+3)

- Brainstorm: 1 dispatch
- Spec: 3 dispatches (R1 IMPORTANT → R2 IMPORTANT → R3 PASS)
- Plan: 3 dispatches (R1 CRITICAL → R2 IMPORTANT → R3 IMPORTANT)
- **Subtotal: 7 dispatches.**

Cumulative across A+B+C-so-far: 22 + 3 (R2+R3 plan) = **25 dispatches**.

## Lessons rolled forward to C implementation

- B's loader-discovery rule applies: T8 case (b) MUST exercise the installer
  against the real `hexo generate` consumer, not just a fake.
- AC #5 SKILL.md format (markdown sections, no frontmatter, no version) is
  pinned. T10's final cross-audit will verify the manifest matches.
- CRLF preservation has a live test contract — T3 must not regress it.
- All inter-tool boundaries (CLI args, exit codes, theme detection,
  `_config.yml` parsing) require live consumer exercise before T10 dispatch.
