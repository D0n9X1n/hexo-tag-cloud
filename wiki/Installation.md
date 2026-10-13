# Installation

Every install starts with the npm package. You then choose how the canvas
gets into your pages. One of the three paths below works for any Hexo theme.

| path | edits theme files? | works with |
|---|---|---|
| [A. Built-in recipe](#a-built-in-recipe) | yes (one managed block) | landscape, NexT, Butterfly, Fluid |
| [B. Any template (`--target`)](#b-any-template---target) | yes (one managed block) | any EJS / Nunjucks / Swig / Pug / Jade theme |
| [C. Inject mode](#c-inject-mode-no-template-edits) | **no** | every theme, including JSX themes (Icarus) and npm-installed themes |

Prefer letting Claude Code do it? Install the [Claude Code skill](AI-Skill-Usage.md).
It runs these same steps and asks for your approval before writing anything.

## Prerequisites

- Node.js ≥ 18
- Hexo ≥ 5
- A Hexo site (a directory that contains `_config.yml`)

## 1. Install the package

```bash
npm install hexo-tag-cloud --save
```

This step is required. The plugin's `after_generate` filter writes
`public/js/tagcanvas.js` and `public/js/tagcloud.js` on every build.
`npx hexo-tag-cloud install` only edits a template. It does **not**
install the plugin, and it prints a warning when the plugin is missing.

## 2. Inspect your site (optional)

```bash
npx hexo-tag-cloud inspect
```

This command prints JSON that includes the active theme, its directory, whether it
lives in `node_modules`, its built-in recipe (if it has one), and the
theme's templates ranked by how likely each is to be a sidebar or widget.

## A. Built-in recipe

```bash
npx hexo-tag-cloud install          # dry run: prints the diff, writes nothing
npx hexo-tag-cloud install --apply  # write it
```

| theme | template (relative to the theme dir) | placement |
|---|---|---|
| landscape | `layout/_partial/sidebar.ejs` | before `</aside>` |
| next | `layout/_macro/sidebar.njk` | before `</aside>` |
| butterfly | `layout/includes/widget/card_tags.pug` | appended |
| fluid | `layout/tags.ejs` (the `/tags/` page) | appended |

The theme is read from `_config.yml`. The installer looks for it in
`themes/<name>` first, then in `node_modules/hexo-theme-<name>`. Use
`--theme <name>` or `--theme-dir <path>` to override either value.

## B. Any template (`--target`)

Choose a template from the `inspect` output:

```bash
npx hexo-tag-cloud install --target layout/_partial/sidebar.ejs --before "</aside>"
npx hexo-tag-cloud install --target layout/_partial/sidebar.ejs --before "</aside>" --apply
```

- `--target` is resolved relative to the theme directory. The engine is
  inferred from the extension (`.ejs`, `.njk`, `.swig`, `.pug`, `.jade`).
- `--before <text>` inserts the block before the **last** line that contains
  `<text>`. Without it, the block is appended to the end of the file.
- The installer never removes or rewrites content outside its markers.

## C. Inject mode (no template edits)

```yaml
# _config.yml
tag_cloud:
  inject: true
  # mount: '#sidebar'   # optional: CSS selectors, comma-separated, first match wins
```

Hexo's [injector](https://hexo.io/api/injector) adds the two scripts to
every page. The tag list (names plus root-aware URLs) is written into
`js/tagcloud.js`, and the cloud mounts into the first element that matches
`mount`. The default selector list covers the landscape, NexT, Butterfly,
Icarus, and Fluid sidebars, then falls back to `aside` and `footer`. If a page
already has a `#resCanvas` from paths A or B, inject mode leaves that page alone.

## What the managed block contains

```ejs
<!-- hexo-tag-cloud:begin -->
<% if (site.tags.length) { %>
<div id="myCanvasContainer" class="widget-wrap tagcloud">
  <canvas id="resCanvas" width="250" height="250" style="width: 100%;">
    <%- tagcloud() %>
  </canvas>
</div>
<script src="<%- url_for('/js/tagcanvas.js') %>"></script>
<script src="<%- url_for('/js/tagcloud.js') %>"></script>
<% } %>
<!-- hexo-tag-cloud:end -->
```

The Nunjucks and Pug blocks are equivalent. `tagcloud()` provides the links
that TagCanvas reads; an empty canvas draws nothing. `url_for()` keeps sites
that are deployed under a sub-path (`root: /blog/`) working. Change the size with
`--canvas-width`, `--canvas-height`, and `--canvas-style`.

## Re-running and upgrading

- If the block is unchanged, re-running exits 0 without writing anything.
- If you edited the block by hand, re-running exits **2** and prints a diff.
  Add `--apply --force` to replace your edits.
- If a hand-written tag cloud without markers exists, re-running exits **3**.
  Remove it, or keep it and skip the installer.

## Build

```bash
npx hexo clean && npx hexo generate
```

After the build, `public/js/tagcloud.js` and `public/js/tagcanvas.js` exist. With paths A and B,
the generated page contains `<canvas id="resCanvas">` with `<a>` links
inside it.

## What's next

- Tweak the appearance: [Customization](Customization.md)
- Fix a blank cloud or other problems: [Troubleshooting](Troubleshooting.md)
- Upgrade from 2.x: [Migration guide](https://github.com/D0n9X1n/hexo-tag-cloud/blob/master/docs/migration-2.x-to-3.x.md)
