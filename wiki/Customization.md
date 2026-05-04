# Customization

Every key under `tag_cloud:` in your site's `_config.yml` is passed through
to TagCanvas. The plugin merges your overrides on top of opinionated
defaults (CJK-friendly font stack, gentle drift speed, mild shadow).

## Full reference

| key | default | type | description |
|---|---|---|---|
| `textFont` | `"Helvetica, 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"` | string | font stack; quote families with spaces |
| `textColour` | `"#333"` | CSS color | tag text color |
| `textHeight` | `26` | px | tag text size |
| `outlineColour` | `"#E2E1C1"` | CSS color | outline drawn around the active tag |
| `outlineMethod` | `"block"` | enum | one of `block`, `colour`, `outline`, `classic`, `none` |
| `outlineThickness` | `2` | px | outline line width |
| `maxSpeed` | `0.04` | float | upper bound on rotation speed |
| `minSpeed` | `0` | float | lower bound on rotation speed |
| `decel` | `0.95` | float (0–1) | inertia decay per frame |
| `reverse` | `true` | boolean | reverse direction of tag-cloud rotation |
| `freezeActive` | `true` | boolean | freeze rotation when the cursor hovers a tag |
| `freezeDecel` | `0.5` | float | decel applied during freeze |
| `depth` | `0.92` | float (0–1) | perceived depth; smaller = flatter |
| `minBrightness` | `0.2` | float (0–1) | minimum tag brightness in the back |
| `pulsateTo` | `0.6` | float (0–1) | brightness oscillation for inactive tags |
| `pulsateTime` | `3` | seconds | full pulsation cycle |
| `initial` | `[0.1, -0.1]` | `[x, y]` floats | initial rotation vector |
| `hideTags` | `false` | boolean | hide tags facing away |
| `shadow` | `"#ccf"` | CSS color | tag shadow color |
| `shadowBlur` | `3` | px | shadow blur radius |
| `shadowOffset` | `[0, 0]` | `[x, y]` px | shadow offset |
| `weight` | `false` | boolean | scale tag size by post count |
| `weightMode` | `"size"` | enum | `size` or `colour` (when `weight: true`) |
| `weightFrom` | `null` | string | data attribute for weight (defaults to anchor frequency) |
| `weightSize` | `1` | float | weight scaling factor |
| `weightSizeMin` | `null` | px | minimum weighted size |
| `weightSizeMax` | `null` | px | maximum weighted size |
| `imageScale` | `null` | float | scale for image tags (n/a for text) |
| `imagePosition` | `null` | enum | `top`, `bottom`, `left`, `right`, `centre` |
| `fadeIn` | `1000` | ms | fade-in duration on first load |
| `clickToFront` | `600` | ms | animation when clicking a back-facing tag |
| `lock` | `false` | `false`/`x`/`y`/`xy` | lock rotation axis |
| `wheelZoom` | `true` | boolean | mouse-wheel zoom |
| `noSelect` | `true` | boolean | disable text selection over the canvas |

If a key isn't in this table, TagCanvas may still understand it — refer to
the [TagCanvas options reference](https://www.goat1000.com/tagcanvas-config.php)
and add the key under `tag_cloud:` in `_config.yml`. The plugin doesn't
validate keys; unknown keys are forwarded to TagCanvas as-is.

## Canvas size

The canvas dimensions live in your theme partial, not `_config.yml`:

```html
<canvas width="250" height="250" id="resCanvas" style="width:100%"></canvas>
```

Or pass them through the AI-assisted install:

```bash
npx hexo-tag-cloud install --apply --canvas-width 500 --canvas-height 400
```

## Recipes

### Solid dark theme

```yaml
tag_cloud:
  textColour: "#fff"
  outlineColour: "transparent"
  shadow: "rgba(0,0,0,0.4)"
  shadowBlur: 8
  outlineMethod: none
```

### Slow + classy

```yaml
tag_cloud:
  maxSpeed: 0.02
  decel: 0.99
  pulsateTo: 0.85
  fadeIn: 2000
```

### Weighted by post count

```yaml
tag_cloud:
  weight: true
  weightMode: size
  weightSizeMin: 14
  weightSizeMax: 36
```

(Requires `<%- tagcloud() %>` output to include weights — Hexo's built-in
helper does, by default.)

### Static (no rotation)

```yaml
tag_cloud:
  maxSpeed: 0
  initial: [0, 0]
  lock: xy
```

## ESM-friendly setup

If your build pipeline is ESM-strict, `tagcloud.js` is a vanilla
side-effect script (no `import/export`) and `tagcanvas.js` is the upstream
TagCanvas IIFE. Both are emitted under `public/js/` and need to be loaded
via `<script src="...">` (not `import`). The `tag_cloud` config block does
not require any extra ESM wiring.
