# Troubleshooting

## Canvas is blank

**Symptom:** the canvas frame appears in your sidebar but no tags rotate
inside it.

**Likely causes:**

1. **Missing `<%- tagcloud() %>` inside the canvas.** TagCanvas reads its
   input from `<a>` elements inside (or referenced by) the canvas. The
   AI-assisted installer emits a managed block; if you wrote the partial
   manually, double-check the snippet matches the EJS / Swig examples in
   [Installation](Installation.md).

2. **No tags exist.** `site.tags.length === 0` if no posts have any
   `tags:` front-matter. Add `tags: [demo, hexo]` to a post's front-matter
   and rebuild.

3. **Hexo built before the plugin filter ran.** Run `npx hexo clean` and
   then `npx hexo generate`. `public/js/tagcloud.js` and
   `public/js/tagcanvas.js` should both exist after generate.

4. **CSP blocks inline scripts.** Some site hosts (e.g., GitHub Pages
   with custom CSP via `<meta>`) reject loading `js/tagcloud.js`. Confirm
   the path is correct (use `url_for('/js/tagcloud.js')` not `/js/tagcloud.js`
   if your `_config.yml` `root` is not `/`).

## CJK / Cyrillic / non-ASCII tags

**Symptom:** clicking a CJK tag (e.g. 中文) gives a 404, or the tag's
glyph renders as boxes/tofu.

**v3.0.0 fixes both:**

- **Routing:** the plugin now writes anchor `href`s using
  `encodeURIComponent` per path segment, producing valid percent-encoded
  URLs like `/tags/%E4%B8%AD%E6%96%87/`. Prior versions emitted raw bytes,
  which broke on Pages and many CDNs.

- **Rendering:** the default `textFont` stack now starts with a CJK fallback
  family (`'Hiragino Sans GB', 'Microsoft YaHei'`). If your tags still render
  as tofu, your visitor's browser doesn't have any of these families
  installed. Override with a self-hosted font:

  ```yaml
  tag_cloud:
    textFont: "'Noto Sans CJK SC', sans-serif"
  ```

  And include a `@font-face` declaration in your theme CSS pointing at a
  self-hosted Noto Sans CJK woff2.

## HTML-special characters in tags

**Symptom:** a tag named `C++` or `&` shows up double-escaped (e.g. `C&amp;&amp;`)
or breaks the canvas.

**v3.0.0 fixes this:** anchor text is escaped exactly once, then emitted
into the canvas. Prior versions either double-escaped (rendering literal
`&amp;`) or under-escaped (allowing `<script>` injection). The
`tests/server/render.test.js` suite asserts: ASCII passthrough, single-pass
escape of `<&>"'`, and round-trip through `tagcloud()`.

If you still see `&amp;` literals, check that you haven't manually wrapped
`<%- tagcloud() %>` in `<%= ... %>` (which double-escapes in EJS). Use
`<%- ... %>` (raw) only.

## Theme not detected

**Symptom:** `npx hexo-tag-cloud install` exits 1 with
`Error: could not detect theme`.

**Cause:** the CLI parses `_config.yml` and looks for a `theme:` key. If
your theme is set at runtime (e.g., `--theme` flag) or via a non-standard
location, the CLI gives up.

**Fix:**

```bash
npx hexo-tag-cloud install --apply --theme <name>
# or, for npm-installed themes:
npx hexo-tag-cloud install --apply --theme-dir node_modules/hexo-theme-<name>
```

## Managed block conflict

**Symptom:** running `npx hexo-tag-cloud install --apply` exits 2 with
"managed block was modified by hand".

**Cause:** you (or another tool) edited the contents between the
`<!-- hexo-tag-cloud:begin -->` and `<!-- hexo-tag-cloud:end -->` markers.
The CLI refuses to silently overwrite hand edits.

**Fix:** either accept the upstream version (`--force`):

```bash
npx hexo-tag-cloud install --apply --force
```

or move your custom edits *outside* the managed block (above `:begin` or
below `:end`). The CLI never touches anything outside the markers.

## Legacy 2.x install detected

**Symptom:** `npx hexo-tag-cloud install` exits 3 with "legacy
hand-installed snippet detected".

**Cause:** your sidebar partial still has the unmanaged 2.x snippet
(scripts + canvas with no `<!-- hexo-tag-cloud:* -->` markers around it).

**Fix:** remove the old block manually, then re-run `--apply`. The CLI
will write a fresh managed block. (See
[Migration: 2.x → 3.x](../docs/migration-2.x-to-3.x.md) for the full
upgrade flow.)

## Want more help?

Search [open issues](https://github.com/D0n9X1n/hexo-tag-cloud/issues), then
file a new one with:

- your theme + Hexo version (`npx hexo version`)
- your `_config.yml` `tag_cloud:` block
- the contents of your sidebar partial (`<!-- begin -->` block included)
- a screenshot of the broken canvas
