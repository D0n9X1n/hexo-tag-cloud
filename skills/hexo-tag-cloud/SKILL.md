---
name: hexo-tag-cloud
description: Add, repair, or upgrade the hexo-tag-cloud animated 3D tag cloud in any Hexo blog theme (EJS, Nunjucks/Swig, Pug/Jade, or JSX themes such as Icarus). Use when the user wants a tag cloud in their Hexo site, asks to install hexo-tag-cloud, or says their tag cloud is blank or broke after a theme update. Not for other static-site generators.
---

# hexo-tag-cloud

Put the hexo-tag-cloud canvas into a Hexo site, whatever theme it uses.
The `hexo-tag-cloud` CLI does every file edit: it previews by default,
writes only with `--apply`, and wraps its edit in managed-block markers
so re-runs are idempotent. Never hand-edit templates when the CLI can
do it, and never edit `node_modules/hexo-tag-cloud/lib/tagcanvas.js`.

## Workflow

Run every command from the Hexo site root (the directory with
`_config.yml`). If the user is not in one, ask for the path.

### 1. Make sure the plugin is installed

Read `package.json`. If `hexo-tag-cloud` is not a dependency:

```bash
npm install hexo-tag-cloud --save
```

Without it, Hexo never generates `js/tagcloud.js` and the cloud stays blank.

### 2. Inspect the site

```bash
npx hexo-tag-cloud inspect
```

The JSON report contains `theme`, `themeDir`, `themeInNodeModules`,
`builtInRecipe` (null when the theme has none), `pluginInstalled`,
`injectEnabled`, and `candidates`, which are the theme's templates ranked by
how likely they are to be a sidebar or widget. Each candidate has `path`,
`engine`, `writable`, `hasAsideClose`, and `hasManagedBlock`.

### 3. Choose the integration path

Pick the first path that applies:

| Situation | Path |
|---|---|
| `builtInRecipe` is set (landscape, next, butterfly, fluid) | **A. Built-in recipe** |
| A `writable` candidate is clearly the sidebar/widget area | **B. Explicit target** |
| JSX theme (Icarus), `themeInNodeModules: true`, no writable candidate, or the user wants no template edits | **C. Inject mode** |

If you are unsure which candidate is right, open the top two or three
and show the user what each one renders. Ask before choosing.

**A. Built-in recipe**

```bash
npx hexo-tag-cloud install            # dry run: prints the diff
```

**B. Explicit target** (any `.ejs`, `.njk`, `.swig`, `.pug`, `.jade`)

```bash
npx hexo-tag-cloud install --target layout/_partial/sidebar.ejs --before "</aside>"
```

`--target` is relative to the theme dir. `--before <text>` inserts the
block before the last line that contains `<text>`. Use it to keep the cloud
inside a container (`</aside>`, `</div>` of a widget list). Without it,
the block is appended at the end of the file. For Pug, append (omit `--before`)
unless you have confirmed that the indentation of the anchor line is column 0.

**C. Inject mode** (no template edits; works with every theme)

Add to the site's `_config.yml` (merge into an existing `tag_cloud:` block):

```yaml
tag_cloud:
  inject: true
  # mount: '#sidebar'   # optional CSS selector list; first match wins
```

Hexo's injector then adds the scripts to every page, and the cloud mounts
into the first element that matches `mount`. The default list covers
landscape, NexT, Butterfly, Icarus and Fluid sidebars. If the cloud
appears in the wrong place, ask the user where they want it and set
`mount` to that element's selector. Show the YAML change and get approval
before you write it.

### 4. Preview, approve, apply

For paths A and B:

1. Show the user the dry-run output verbatim, including the target path.
2. Wait for explicit approval.
3. Re-run the same command with `--apply`.

Never pass `--force` unless the user explicitly asks to overwrite a
managed block they edited themselves.

### 5. Verify

```bash
npx hexo clean && npx hexo generate
```

Then confirm that:

- `public/js/tagcloud.js` and `public/js/tagcanvas.js` exist;
- for paths A and B, a generated page contains `id="resCanvas"` with
  `<a` links inside it (`grep -l resCanvas public/index.html`);
- for path C, `public/index.html` loads `js/tagcloud.js`.

Suggest `npx hexo server` so the user can look at the result in a browser.

## Exit codes

- **0**: success or dry run.
- **1**: theme not detected, no built-in recipe, or unsupported engine. Follow
  the printed hint (`inspect`, then `--target`, or inject mode).
- **2**: the managed block exists but was edited by hand. A diff is printed.
  Ask whether to keep the edits (do nothing) or overwrite them (`--apply --force`).
- **3**: a hand-written tag cloud without markers exists. Show it to the
  user. Either they remove it and you re-run, or they keep it and you stop.
  Do not delete it without their approval.
- **4**: the target file is missing or unwritable. Check `--theme-dir` /
  `--target` against the `inspect` output.

## Customization

Appearance lives in `_config.yml` → `tag_cloud:` (`textFont`, `textColor`,
`textHeight`, `outlineColor`, `maxSpeed`, `pauseOnSelected`). Canvas size
for paths A/B: `--canvas-width`, `--canvas-height`, `--canvas-style`.
