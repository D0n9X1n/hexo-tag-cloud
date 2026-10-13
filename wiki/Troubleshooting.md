# Troubleshooting

**English** · [简体中文](Troubleshooting-zh-CN)

## Canvas is blank

The canvas frame appears, but no tags rotate inside it.

1. **The plugin isn't installed in the site.** `package.json` must list
   `hexo-tag-cloud` (`npm install hexo-tag-cloud --save`). If it doesn't,
   `public/js/tagcloud.js` is never generated. `npx hexo-tag-cloud install`
   prints a warning when the plugin is missing.
2. **Nothing renders inside the canvas.** TagCanvas reads the `<a>` links
   *inside* `<canvas id="resCanvas">`. A hand-written snippet needs
   `<%- tagcloud() %>` (EJS), `{{ tagcloud() | safe }}` (Nunjucks), or
   `!= tagcloud()` (Pug) inside the canvas. Blocks written by the installer
   from v3.1 on include this. Blocks from v3.0 did not, so re-run
   `npx hexo-tag-cloud install --apply --force`.
3. **The site has no tags.** The block only renders when `site.tags.length > 0`.
   Add `tags:` to a post's front-matter.
4. **The build is stale.** Run `npx hexo clean && npx hexo generate`.

## Scripts return 404 on a sub-path site

If `_config.yml` has `root: /blog/`, the scripts must be loaded through
`url_for('/js/tagcloud.js')` rather than a hard-coded `/js/tagcloud.js`.
Managed blocks and inject mode handle this for you. Check any hand-written snippet.

## Inject mode: the cloud is in the wrong place or missing

The cloud mounts into the first element that matches `tag_cloud.mount`. Open
DevTools, find the container you want, and set its selector:

```yaml
tag_cloud:
  inject: true
  mount: '.my-sidebar'
```

If no selector matches, nothing is mounted. A page that already contains a
`#resCanvas` from a managed block is left alone.

## CJK / Cyrillic / non-ASCII tags render as boxes

The canvas draws text with the `textFont` stack. A single-family
`textFont` gets a CJK fallback stack appended automatically (see
[Customization](Customization)). If a visitor has none of those fonts
installed, self-host one and name it explicitly:

```yaml
tag_cloud:
  textFont: "'Noto Sans CJK SC', sans-serif"
```

Tag links are produced by Hexo's own `tagcloud()` helper (paths A and B)
or percent-encoded by the plugin (inject mode). In both cases a link such as
`/tags/中文/` resolves correctly.

## `&#43;` or other entity codes appear on the canvas

Stock Hexo emits entity-encoded link text, which the browser decodes before
TagCanvas reads it. Literal entity codes on the canvas mean a build plugin
re-serialised the HTML and escaped it twice. Asset or HTML post-processor
plugins that run every page through cheerio are the usual cause. Disable them
one at a time to find the culprit.

## Installer exit codes

| code | meaning | fix |
|---|---|---|
| 1 | theme not detected, no built-in recipe, or unsupported engine (`.jsx`) | run `npx hexo-tag-cloud inspect`, then pass `--target <file>`, or use `tag_cloud.inject: true` |
| 2 | managed block edited by hand | keep your edits, or run `--apply --force` |
| 3 | hand-written tag cloud without markers | remove it and re-run, or keep it |
| 4 | target template missing or unwritable | check `--theme-dir` / `--target` against `inspect` |

A nested `theme:` mapping in `_config.yml` can't be auto-detected. Pass
`--theme <name>` instead.

## Still stuck?

Search the [issues](https://github.com/D0n9X1n/hexo-tag-cloud/issues), then
open a new one with:

- `npx hexo version` and your theme name and version
- your `tag_cloud:` block
- `npx hexo-tag-cloud inspect` output
- a screenshot
