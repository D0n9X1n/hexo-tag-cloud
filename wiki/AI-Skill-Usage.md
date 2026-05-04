# AI-Skill Usage

`hexo-tag-cloud` ships with a [Claude Skill](https://docs.anthropic.com/en/docs/agents/skills)
under `skills/hexo-tag-cloud/`. The skill teaches any agent runtime that
scans `~/.claude/skills/` (Claude Code, Claude Desktop, Cursor's Claude
backend, custom Anthropic API agents) how to safely insert the tag cloud
into any Hexo theme — always dry-running first, only applying after
explicit user approval.

## Install the skill

```bash
# After `npm install hexo-tag-cloud@^3` in your Hexo site:
mkdir -p ~/.claude/skills
cp -r node_modules/hexo-tag-cloud/skills/hexo-tag-cloud ~/.claude/skills/
```

Restart your agent runtime to pick up the new skill.

## Invoke from an agent prompt

```
Please add a tag cloud to my Hexo site at ~/blog using the
hexo-tag-cloud skill. Show me the dry-run diff first, then apply.
```

The agent will:

1. Read `~/.claude/skills/hexo-tag-cloud/SKILL.md` for instructions.
2. `cd ~/blog`.
3. Run `npx hexo-tag-cloud install` (dry-run) and present the diff.
4. Pause for your approval.
5. On approval, run `npx hexo-tag-cloud install --apply`.
6. Run `npx hexo generate` and verify `public/js/tagcloud.js` exists.

The skill does **not** auto-apply without your confirmation. The CLI it
wraps is fully deterministic — you can run the same commands yourself
without the skill.

## CLI vs skill: which one?

| | CLI (`npx hexo-tag-cloud install`) | Claude skill |
|---|---|---|
| works in shell | ✅ | ❌ (agent-only) |
| works in CI | ✅ | ❌ |
| dry-run by default | ✅ | ✅ (skill enforces) |
| approval gate | manual (`--apply`) | agent asks user |
| theme auto-detect | ✅ | ✅ (delegates to CLI) |
| recoverable from conflict | ✅ (`--force`) | ✅ (skill explains) |

**Recommendation:** use the CLI directly for repeatable scripts and CI;
use the skill when you want an agent to walk through edge cases (theme not
detected, managed-block conflict, etc.) interactively.

## Managed-block markers

The skill always inserts (and only ever modifies) the block between:

```
<!-- hexo-tag-cloud:begin -->
...
<!-- hexo-tag-cloud:end -->
```

Anything outside those markers is preserved byte-for-byte. The skill (and
the CLI) refuses to overwrite a hand-modified managed block; you must pass
`--force` or move your edits outside the markers. See
[Troubleshooting → Managed block conflict](Troubleshooting.md#managed-block-conflict).

## Known limitations

- The skill is currently Claude-specific. An MCP server variant is on the
  roadmap; track [issue #TBD](https://github.com/D0n9X1n/hexo-tag-cloud/issues).
- The skill is bundled in the npm tarball under `skills/`. If you install
  via `npm pack` or vendor the source tree, the skill is included. If you
  prefer a manual copy, fetch the directory from GitHub at
  `https://github.com/D0n9X1n/hexo-tag-cloud/tree/master/skills/hexo-tag-cloud`.
