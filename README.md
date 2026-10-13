<div align="center">

# hexo-tag-cloud

**An animated 3D tag cloud for [Hexo](https://hexo.io/), powered by [TagCanvas](https://www.goat1000.com/tagcanvas.php).**

### [▶ Live demo](https://d0n9x1n.github.io/hexo-tag-cloud/)

[![Tests](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/test.yml)
[![Release](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/release.yml/badge.svg)](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/release.yml)
[![Demo](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/deploy-demo.yml/badge.svg?branch=master)](https://d0n9x1n.github.io/hexo-tag-cloud/)
[![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)](./CLAUDE.md#rules)
<br>
[![npm version](https://img.shields.io/npm/v/hexo-tag-cloud.svg)](https://www.npmjs.com/package/hexo-tag-cloud)
[![npm downloads](https://img.shields.io/npm/dm/hexo-tag-cloud.svg)](https://www.npmjs.com/package/hexo-tag-cloud)
[![npm provenance](https://img.shields.io/badge/npm-provenance-blue)](https://www.npmjs.com/package/hexo-tag-cloud#provenance)
[![Node](https://img.shields.io/node/v/hexo-tag-cloud.svg)](./package.json)
[![Hexo](https://img.shields.io/badge/hexo-%E2%89%A55-0e83cd)](https://hexo.io/)
[![Claude Code skill](https://img.shields.io/badge/Claude%20Code-skill-d97757)](./skills/hexo-tag-cloud/SKILL.md)
[![License: MIT](https://img.shields.io/npm/l/hexo-tag-cloud.svg)](./LICENSE)

English · [中文](./README.ZH.md)

![hexo-tag-cloud screenshot](./img/example.png)

</div>

## Features

- **Works with any theme.** Built-in recipes cover landscape, NexT, Butterfly and Fluid.
  `--target` handles any EJS, Nunjucks, Swig, Pug or Jade template, and **inject mode**
  needs no template edits at all, which makes it work with JSX themes such as Icarus.
- **Safe installer.** It previews a diff by default and writes only one marker-wrapped block.
  Re-runs are idempotent, and it never overwrites your own edits.
- **Claude Code skill.** [`skills/hexo-tag-cloud/SKILL.md`](./skills/hexo-tag-cloud/SKILL.md) lets
  Claude Code add the cloud to your blog. Claude shows you the diff and waits for your approval before it applies anything.
- **Non-ASCII tags.** A CJK fallback font stack and percent-encoded links handle Chinese,
  Japanese, Korean and Cyrillic tags.
- **Sub-path friendly.** Every URL respects Hexo's `root`, so `/blog/`-style deployments work.

## Quick start

```bash
# 1. Install the plugin. It generates js/tagcanvas.js and js/tagcloud.js on every build.
npm install hexo-tag-cloud --save

# 2. Add the cloud to your theme. The first command previews the change; --apply writes it.
npx hexo-tag-cloud install
npx hexo-tag-cloud install --apply

# 3. Build
npx hexo clean && npx hexo generate
```

If your theme has no built-in recipe, or you'd rather not edit templates, turn on inject mode
instead of step 2:

```yaml
# _config.yml
tag_cloud:
  inject: true
```

## AI-assisted install

Claude Code can install and wire up the tag cloud for you. The skill is a single file,
[`skills/hexo-tag-cloud/SKILL.md`](./skills/hexo-tag-cloud/SKILL.md). Copy it into
`~/.claude/skills/hexo-tag-cloud/`, or let the CLI do it:

```bash
npx hexo-tag-cloud install-skill            # use --force to refresh an older copy
```

Then ask Claude Code to *"add a tag cloud to my Hexo blog"*. The skill checks that the plugin
is installed and runs `npx hexo-tag-cloud inspect` to find your theme and its templates. It
picks a built-in recipe, a `--target` template, or inject mode, shows you the dry-run diff,
and applies it only after you approve. See [AI-Skill-Usage](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/AI-Skill-Usage).

## How to Use

### Install paths

| path | command | edits theme files | works with |
|---|---|---|---|
| Built-in recipe | `npx hexo-tag-cloud install` | one managed block | landscape, NexT, Butterfly, Fluid |
| Any template | `npx hexo-tag-cloud install --target <file> --before "</aside>"` | one managed block | any `.ejs` / `.njk` / `.swig` / `.pug` / `.jade` |
| Inject mode | `tag_cloud.inject: true` in `_config.yml` | none | every theme |

Each install command is a dry run until you add `--apply`. Run `npx hexo-tag-cloud inspect`
to see your theme's directory and its templates, ranked by how likely each one is to be a
sidebar. The [Installation](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Installation) wiki page has the details.

### CLI reference

| flag | default | purpose |
|---|---|---|
| `--theme <name>` | from `_config.yml` | override theme detection |
| `--theme-dir <path>` | `themes/<name>`, then `node_modules/hexo-theme-<name>` | theme directory |
| `--target <file>` | the theme's recipe | any template, relative to the theme directory |
| `--before <text>` | append | insert before the last line containing `<text>` |
| `--apply` | off (dry run) | write the change |
| `--force` | off | replace a managed block you edited by hand |
| `--canvas-width` / `--canvas-height` / `--canvas-style` | `250` / `250` / `width: 100%;` | canvas size |

Exit codes: `0` success or dry run · `1` detection failed, no recipe, or unsupported engine ·
`2` managed block was edited by hand · `3` an existing hand-written snippet was found ·
`4` target file is missing or unwritable.

### Manual snippet

If you write the template yourself, put Hexo's `tagcloud()` **inside** the canvas and load both
scripts through `url_for()`. The EJS version looks like this:

```ejs
<% if (site.tags.length) { %>
<div id="myCanvasContainer" class="widget-wrap tagcloud">
  <canvas id="resCanvas" width="250" height="250" style="width: 100%;">
    <%- tagcloud() %>
  </canvas>
</div>
<script src="<%- url_for('/js/tagcanvas.js') %>"></script>
<script src="<%- url_for('/js/tagcloud.js') %>"></script>
<% } %>
```

## Customize

```yaml
# _config.yml
tag_cloud:
  textFont: 'Trebuchet MS, Helvetica'  # a single family gets a CJK fallback stack appended
  textColor: '#333'
  textHeight: 25
  outlineColor: '#E2E1D1'
  maxSpeed: 0.5                         # 0.01 – 1
  pauseOnSelected: false                # pause rotation while a tag is highlighted
  inject: false                         # true = no template edits (see above)
  # mount: '#sidebar'                   # inject mode: CSS selectors, first match wins
```

See [Customization](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Customization) for every option and some ready-made recipes.

## Documentation

- [Wiki home](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Home): [Installation](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Installation) ·
  [Customization](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Customization) · [Troubleshooting](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Troubleshooting) ·
  [AI-Skill-Usage](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/AI-Skill-Usage) · [Contributing](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Contributing)
- [Migrating from 2.x](https://github.com/D0n9X1n/hexo-tag-cloud/wiki/Migration-v2-to-v3)
- [Releases](https://github.com/D0n9X1n/hexo-tag-cloud/releases): release notes list resolved issues and every commit

## Support

Found a bug or have an idea? Open an issue at
<https://github.com/D0n9X1n/hexo-tag-cloud/issues> and include your `npx hexo version` output,
your theme, your `tag_cloud:` block, and the output of `npx hexo-tag-cloud inspect`.

## License

[MIT](./LICENSE). The tag cloud is drawn by [TagCanvas](https://www.goat1000.com/tagcanvas.php)
by Graham Breach.
