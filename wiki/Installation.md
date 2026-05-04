# Installation

Two install paths: an automated one-shot CLI (recommended) and a per-theme
manual walkthrough (use this if you want to inspect every byte yourself or
your theme is unsupported).

## Prerequisites

- Node.js ≥ 18
- Hexo ≥ 5
- A working Hexo site (i.e., `_config.yml` exists, `themes/<your-theme>/`
  exists)

## 1. Add the package

```bash
npm install hexo-tag-cloud@^3 --save
```

This installs the plugin and registers the `after_generate` filter that
emits `public/js/tagcloud.js` and `public/js/tagcanvas.js` on every build.

## 2. AI-assisted install (recommended)

From the Hexo site root:

```bash
# Dry-run: prints the diff that WOULD be written; does NOT touch any file.
npx hexo-tag-cloud install

# Apply: writes the managed <!-- hexo-tag-cloud:begin/end --> block
# into your active theme's sidebar/widget partial.
npx hexo-tag-cloud install --apply
```

The CLI auto-detects your theme from `_config.yml` and picks the right
template engine (ejs, swig/nunjucks, pug). Re-running on an unchanged
managed block is a no-op (`exit 0`); editing the block by hand and re-running
without `--force` exits 2 and prints a diff.

### Per-theme target paths

| theme | target file |
|---|---|
| landscape | `themes/landscape/layout/_partial/sidebar.ejs` |
| next | `themes/next/layout/_macro/sidebar.swig` (or `.njk`) |
| butterfly | `themes/butterfly/layout/includes/widget/index.pug` |
| icarus | `themes/icarus/layout/widget/tagcloud.jsx` |
| fluid | `themes/fluid/layout/_partial/sidebar.ejs` |
| generic | first matching `themes/<name>/layout/_partial/sidebar.{ejs,njk,swig,pug}` |

Use `--theme <name>` to override detection; `--theme-dir <path>` for
npm-installed themes (`hexo-theme-<name>`).

## 3. `tag_cloud` config block (optional)

Add to your site's `_config.yml`. The six supported keys (case-sensitive):

```yaml
tag_cloud:
  textFont:        "Helvetica"   # single family → CJK fallback auto-appended
  textColor:       "#333"
  textHeight:      15
  outlineColor:    "#E2E1C1"
  maxSpeed:        0.03
  pauseOnSelected: true           # freezes rotation under the cursor
```

Defaults are applied for any key you omit. See
[Customization](Customization.md) for a full reference, the CJK
font-fallback rules, and recipes (dark theme, self-hosted Noto, etc.).

## 4. Manual install (for unsupported themes)

If your theme isn't in the matrix above and the `generic` fallback doesn't
match, paste the following snippet into your sidebar partial and adjust paths:

### EJS (most themes)

```ejs
<% if (site.tags.length) { %>
  <script type="text/javascript" charset="utf-8" src="<%- url_for('/js/tagcloud.js') %>"></script>
  <script type="text/javascript" charset="utf-8" src="<%- url_for('/js/tagcanvas.js') %>"></script>
  <div class="widget-wrap">
    <h3 class="widget-title">Tag Cloud</h3>
    <div id="myCanvasContainer" class="widget tagcloud">
      <canvas width="250" height="250" id="resCanvas" style="width:100%">
        <%- tagcloud() %>
      </canvas>
    </div>
  </div>
<% } %>
```

### Swig / Nunjucks (next theme)

```swig
{% if site.tags.length %}
  <script type="text/javascript" charset="utf-8" src="{{ url_for('/js/tagcloud.js') }}"></script>
  <script type="text/javascript" charset="utf-8" src="{{ url_for('/js/tagcanvas.js') }}"></script>
  <div class="widget-wrap">
    <h3 class="widget-title">Tag Cloud</h3>
    <div id="myCanvasContainer" class="widget tagcloud">
      <canvas width="250" height="250" id="resCanvas" style="width:100%">
        {{ tagcloud() }}
      </canvas>
    </div>
  </div>
{% endif %}
```

The `<%- tagcloud() %>` (or `{{ tagcloud() }}`) call emits the anchor list
TagCanvas reads as input; without it the cloud has nothing to render.

## 5. Build

```bash
npx hexo clean && npx hexo generate
```

Confirm `public/js/tagcloud.js` and `public/js/tagcanvas.js` exist, and that
your sidebar HTML contains a `<canvas id="resCanvas">` with `<a>` tags
inside it.

## What's next

- Tweak appearance: see [Customization](Customization.md).
- Cloud is blank or partial: see [Troubleshooting](Troubleshooting.md).
- Coming from 2.x: see [Migration: 2.x → 3.x](../docs/migration-2.x-to-3.x.md).
