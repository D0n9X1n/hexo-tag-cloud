# AI-Skill Usage (Claude Code)

**English** · [简体中文](AI-Skill-Usage-zh-CN)

`hexo-tag-cloud` ships a [Claude Code skill](https://code.claude.com/docs/en/skills)
that can add the tag cloud to **any** Hexo theme. The skill runs the same CLI you
would run yourself. It always shows you a dry run first and only applies the
change after you approve it.

## Install

The skill is a single file:
[`skills/hexo-tag-cloud/SKILL.md`](https://github.com/D0n9X1n/hexo-tag-cloud/blob/master/skills/hexo-tag-cloud/SKILL.md).
Copy it to `~/.claude/skills/hexo-tag-cloud/SKILL.md`, or have the CLI copy it from
the npm package:

```bash
npx hexo-tag-cloud install-skill           # first install
npx hexo-tag-cloud install-skill --force   # refresh an older copy
npx hexo-tag-cloud install-skill --dry-run # preview
```

To share it with everyone working on one blog, put it in that repository's
`.claude/skills/hexo-tag-cloud/SKILL.md` instead.

Start a new Claude Code session, or run `/skills`, to load it.

## Use

Open Claude Code in your blog's directory and ask:

```
Add a tag cloud to my Hexo blog.
```

The skill works through these steps:

1. Makes sure `hexo-tag-cloud` is installed in the site (`npm install hexo-tag-cloud --save`).
2. Runs `npx hexo-tag-cloud inspect` to find the theme, its directory (`themes/` or
   `node_modules/hexo-theme-*`), its built-in recipe, and its templates ranked by how
   likely each one is to be the sidebar.
3. Chooses a path:
   - **Built-in recipe**: landscape, NexT, Butterfly, Fluid.
   - **Explicit target**: any `.ejs` / `.njk` / `.swig` / `.pug` / `.jade`
     template, via `--target <file> --before "</aside>"`. If two candidates look
     plausible, it asks you which one to use.
   - **Inject mode**: `tag_cloud.inject: true`, with no template edits. It uses this
     for JSX themes such as Icarus, for themes installed from npm, or when you
     prefer not to edit templates.
4. Shows you the dry-run diff (or the `_config.yml` change) and waits for your approval.
5. Applies the change, runs `hexo clean && hexo generate`, and checks that the
   generated page contains the canvas and its tag links.

The skill never passes `--force` unless you ask it to overwrite a managed block you
edited yourself, and it never deletes a hand-written tag cloud without asking first.

## Managed-block markers

The CLI only creates or modifies content between these markers:

```
<!-- hexo-tag-cloud:begin -->      //- hexo-tag-cloud:begin   (Pug)
...                                 ...
<!-- hexo-tag-cloud:end -->        //- hexo-tag-cloud:end
```

Everything outside them is preserved byte-for-byte. If you edit the block by hand,
the next run exits `2` and shows a diff instead of overwriting your edits. See
[Troubleshooting](Troubleshooting#installer-exit-codes).

## Without the skill

The skill is a thin layer over the CLI, so every step above also works by hand. See
[Installation](Installation).
