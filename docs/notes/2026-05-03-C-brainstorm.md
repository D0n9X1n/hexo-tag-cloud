# Sub-project C — AI-skill brainstorm + shape decision

**Date:** 2026-05-03
**PM:** `claude-opus-4.7-xhigh`
**Decision basis:** 2-model agreement (PM + GPT-5.5 rubber-duck), per the user's override of the user-approval hard gate.

## Problem statement

Today, inserting the hexo tag cloud into a hexo theme requires the user to:
1. Read README's "How to Use" section.
2. Identify whether their theme uses ejs / swig / jade / pug / nunjucks for partials.
3. Manually add a `<canvas id="resCanvas">` element + `<script src="/js/tagcanvas.js">` + `<script src="/js/tagcloud.js">` block to the theme's sidebar partial (or wherever the user wants the cloud to appear).
4. Run `hexo clean && hexo g && hexo s` and visually verify.

The README documents 4 templating engines explicitly; new themes (Next, Icarus, Butterfly, Fluid, Volantis) use a mix. Failures are silent (canvas missing → cloud doesn't appear) and hard to debug without templating knowledge.

The user wants an "AI skill" that automates this. Goal: 1 prompt or 1 command → working tag cloud in any hexo theme.

## Shape options considered

| # | Shape | Distribution | Complexity | Determinism | AI-native |
|---|---|---|---|---|---|
| 1 | Claude Skill (`SKILL.md` + scripts) | Bundled in npm package; auto-discovered by Claude Code via `~/.claude/skills/` | Low | High when delegating to a CLI | ✓ |
| 2 | Copilot CLI Skill | Copilot CLI only | Low | High | partial |
| 3 | MCP server | Universal (Claude Code, Cursor, Continue, etc.) | Medium-high | High | ✓ |
| 4 | Deterministic `npx hexo-tag-cloud install --theme <name>` CLI | Anyone with Node | Low | Total (no AI) | ✗ |
| 5 | Documented prompt template + theme-detection script | Markdown only | Trivial | Low (LLM whim) | ✗ |

## Recommendation: **hybrid (1 + 4)** — Claude Skill wrapping a deterministic CLI

### Architecture

```
hexo-tag-cloud/
├── bin/
│   └── hexo-tag-cloud-install.js      # the deterministic CLI (npx-able)
├── skills/
│   └── hexo-tag-cloud/
│       ├── SKILL.md                   # Anthropic-format skill manifest + instructions
│       └── scripts/
│           ├── detect-theme.js        # prints the active theme name + templating engine
│           └── inspect-partials.js    # lists candidate insertion points
└── lib/
    └── installer/
        ├── theme-heuristics.js        # per-theme insertion points (landscape, next, icarus, butterfly, fluid)
        ├── partial-emitter.js         # emits the right ejs/swig/pug/nunjucks snippet
        └── apply-edit.js              # idempotent file-edit logic with dry-run
```

The CLI is the single source of truth. The skill is a thin markdown wrapper that tells an AI agent: "to install hexo-tag-cloud into the user's theme, run `npx hexo-tag-cloud install`; here are the flags; here are the failure modes."

### Why hybrid (1+4) over the alternatives

- **vs (3) MCP server:** MCP is the right answer for cross-editor capability servers (a database query tool, a github API tool). For a one-shot file-modification routine specific to hexo blog plugin install, MCP's protocol overhead is unjustified. The CLI itself is the durable contract; an MCP wrapper can be added in a future minor version if cross-editor demand materialises.
- **vs (2) Copilot CLI Skill:** Distribution is too narrow. We're publishing to npm; the consumers are hexo bloggers running `hexo s` locally, not Copilot CLI power users specifically.
- **vs (4)-only:** A bare CLI works but doesn't surface the AI-friendly affordance the user explicitly asked for ("AI skill"). The SKILL.md is the cheap layer that turns a CLI into an AI tool.
- **vs (1)-only:** A skill without an underlying deterministic CLI puts the LLM in charge of file editing. Bad for reproducibility, bad for testing, bad for users who don't run AI agents.
- **vs (5):** A prompt template doesn't deliver the user's "skill" framing.

### Acceptance shape (preview)

1. `npx hexo-tag-cloud install` (run from a hexo blog root) detects the theme, picks the right partial, emits the canvas + script block, and writes a unified diff to stdout for review (default = dry-run).
2. `npx hexo-tag-cloud install --apply` actually writes the changes; idempotent (re-running doesn't double-insert).
3. `npx hexo-tag-cloud install --theme <name>` overrides theme detection.
4. The install supports the top 5 themes (landscape, next, icarus, butterfly, fluid) with named heuristics, plus a generic fallback that writes a standalone `tagcloud-partial.ext` file and tells the user how to include it.
5. `skills/hexo-tag-cloud/SKILL.md` follows Anthropic's skill-manifest convention with `name`, `description`, `when_to_use`, and `usage` sections; total ≤ 200 lines.
6. Unit tests for theme-heuristics + apply-edit (idempotency, dry-run, error paths). e2e test that runs the CLI against the fixture site (whose theme is `fixture-theme`, the minimal theme A added).
7. README adds an "AI-assisted install" section covering both the CLI and the skill.
8. No new top-level npm dependencies; use Node built-ins + the already-pinned hexo-fs.

### Out of scope (deferred to D or later)

- MCP server wrapper.
- Copilot CLI Skill format.
- More than 5 named themes (community PRs welcome).
- Localised SKILL.md (English only for v3.0.0).

### Open question for the spec audit

Should the SKILL.md instruct AI agents to ALWAYS run `--apply` after the dry-run, or to surface the diff to the user and wait for confirmation? PM lean: surface diff + wait. Auditor input welcome.
