# Customization

The `tag_cloud:` block in your site's `_config.yml` controls the cloud's
appearance and, with `inject`, how it gets onto the page.

## Reference

| key | default | type | description |
|---|---|---|---|
| `textFont` | `"Helvetica"` (with v3 CJK fallback stack auto-appended) | string | font stack for tag labels; quote families with spaces |
| `textColor` | `"#333"` | CSS color | tag text color |
| `textHeight` | `15` | px | tag text size |
| `outlineColor` | `"#E2E1C1"` | CSS color | outline drawn around the active tag |
| `maxSpeed` | `0.03` | float | upper bound on rotation speed (0–1 range, smaller = slower) |
| `pauseOnSelected` | `true` | boolean | freeze rotation when the cursor hovers a tag |
| `inject` | `false` | boolean | theme-agnostic mode: add the cloud to every page through Hexo's injector, no template edits (see [Installation → Inject mode](Installation.md#c-inject-mode-no-template-edits)) |
| `mount` | sidebar selectors of common themes | string | inject mode only: comma-separated CSS selectors, tried in order; the first match receives the cloud |

Numbers that are not finite (`textHeight: 20px`) fall back to the default
instead of breaking the cloud; `"true"` / `"false"` strings are accepted for
booleans. Other keys are ignored.

```yaml
# Inject the cloud into a custom container on every page:
tag_cloud:
  inject: true
  mount: '#my-widgets, aside'
```

## CJK font fallback (v3.0.0)

If you supply `textFont` as a single family name (no comma) the plugin
**automatically appends** a cross-platform CJK fallback stack
(`PingFang SC`, `Hiragino Sans GB`, `Microsoft YaHei`, `Source Han Sans CN`,
`Noto Sans CJK SC`, `sans-serif`) so non-Latin glyphs that the primary
font lacks fall through to the next family rather than rendering as `□`.

If you supply a multi-family value (with commas) it is honored verbatim
— this is the escape hatch for users who want full control.

```yaml
# Single family — CJK stack auto-appended:
tag_cloud:
  textFont: "Trebuchet MS"

# Multi-family — passed through unchanged:
tag_cloud:
  textFont: "'Comic Sans MS', sans-serif"
```

## Canvas size

With a managed block, the canvas size lives in the theme template. Set it
at install time with `--canvas-width`, `--canvas-height` and
`--canvas-style` (defaults `250`, `250`, `width: 100%;`), re-running with
`--apply --force` to change it later. Inject mode always uses a 250×250
canvas stretched to the container width.

## Recipes

### Solid dark theme

```yaml
tag_cloud:
  textColor: "#fff"
  outlineColor: "#222"
  textHeight: 18
```

### Slow + steady

```yaml
tag_cloud:
  maxSpeed: 0.01
  pauseOnSelected: true
```

### Self-hosted CJK font

```yaml
tag_cloud:
  textFont: "'Noto Sans CJK SC', sans-serif"
```

(With a `@font-face` declaration in your theme CSS pointing at a
self-hosted Noto Sans CJK woff2 file. The `, sans-serif` suffix
disables the auto-appended fallback stack.)

## ESM-friendly setup

`tagcloud.js` is a vanilla side-effect script (no `import/export`) and
`tagcanvas.js` is the upstream TagCanvas IIFE. Both are emitted under
`public/js/` and need to be loaded via `<script src="...">` (not
`import`). The `tag_cloud` config block does not require any extra ESM
wiring.
