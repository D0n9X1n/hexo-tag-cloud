# Customization

The `tag_cloud:` block in your site's `_config.yml` controls the cloud's
appearance. v3.0.0 supports six keys (mirroring the v2 surface plus a
v3-only CJK font fallback):

## Reference

| key | default | type | description |
|---|---|---|---|
| `textFont` | `"Helvetica"` (with v3 CJK fallback stack auto-appended) | string | font stack for tag labels; quote families with spaces |
| `textColor` | `"#333"` | CSS color | tag text color |
| `textHeight` | `15` | px | tag text size |
| `outlineColor` | `"#E2E1C1"` | CSS color | outline drawn around the active tag |
| `maxSpeed` | `0.03` | float | upper bound on rotation speed (0–1 range, smaller = slower) |
| `pauseOnSelected` | `true` | boolean | freeze rotation when the cursor hovers a tag |

Keys outside this list are silently ignored by `lib/options.js`. The
plugin renders only these six options through to TagCanvas; passing
arbitrary TagCanvas keys via `_config.yml` is on the roadmap for a
future v3.x release (see issue tracker).

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

Canvas width / height live in your theme partial, not `_config.yml`:

```html
<canvas width="250" height="250" id="resCanvas" style="width:100%"></canvas>
```

The AI-assisted installer accepts `--canvas-width` / `--canvas-height`
flags to set these at install time; see
[Installation](Installation.md).

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
