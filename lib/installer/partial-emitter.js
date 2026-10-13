'use strict';

/**
 * Pure renderer for the managed tag-cloud block. Given a `ThemeRecipe`
 * (from `theme-heuristics.js`) and optional canvas overrides, returns
 * the marker-wrapped snippet the installer will splice into the user's
 * theme template.
 *
 * Every engine's snippet (#44):
 *   - renders only when the site has tags;
 *   - wraps the canvas in `#myCanvasContainer` (the bootstrap hides it
 *     if TagCanvas fails);
 *   - renders Hexo's `tagcloud()` helper INSIDE the canvas — TagCanvas
 *     reads its links from there; an empty canvas draws nothing;
 *   - loads both scripts through `url_for()`, so sites deployed under a
 *     sub-path (`root: /blog/`) resolve them.
 *
 * No imports. Fully testable in isolation.
 *
 * All values that flow into the output are coerced (`Number`, `String`)
 * and joined by concatenation — never `.replace(string, string)`, which
 * would interpret `$&`/`$$`/`$1` as backreferences. The style is escaped
 * for an HTML attribute AND stripped of template delimiters, so a user
 * value can never open an `<% %>` / `{{ }}` / `#{}` expression.
 */

const DEFAULT_CANVAS_WIDTH = 250;
const DEFAULT_CANVAS_HEIGHT = 250;
const DEFAULT_CANVAS_STYLE = 'width: 100%;';

/**
 * @typedef {object} EmitOptions
 * @property {number} [canvasWidth]
 * @property {number} [canvasHeight]
 * @property {string} [canvasStyle]
 */

/**
 * @param {Readonly<ThemeRecipe>} recipe
 * @param {EmitOptions} [options]
 * @returns {string}
 */
function emitManagedBlock(recipe, options) {
  if (!recipe || typeof recipe.engine !== 'string') {
    throw new TypeError('emitManagedBlock: recipe must include an engine field');
  }
  const opts = options || {};
  const width = pickNumber(opts.canvasWidth, DEFAULT_CANVAS_WIDTH);
  const height = pickNumber(opts.canvasHeight, DEFAULT_CANVAS_HEIGHT);
  const style = escapeStyle(pickString(opts.canvasStyle, DEFAULT_CANVAS_STYLE));

  let body;
  if (recipe.engine === 'pug') body = emitPugBody(width, height, style);
  else if (recipe.engine === 'njk') body = emitNunjucksBody(width, height, style);
  else body = emitEjsBody(width, height, style);

  return recipe.markerStart + '\n' + body + '\n' + recipe.markerEnd;
}

function canvasTag(width, height, style) {
  return '<canvas id="resCanvas" width="' + width + '" height="' + height +
    '" style="' + style + '">';
}

function emitEjsBody(width, height, style) {
  return [
    '<% if (site.tags.length) { %>',
    '<div id="myCanvasContainer" class="widget-wrap tagcloud">',
    '  ' + canvasTag(width, height, style),
    '    <%- tagcloud() %>',
    '  </canvas>',
    '</div>',
    '<script src="<%- url_for(\'/js/tagcanvas.js\') %>"></script>',
    '<script src="<%- url_for(\'/js/tagcloud.js\') %>"></script>',
    '<% } %>',
  ].join('\n');
}

function emitNunjucksBody(width, height, style) {
  // Hexo's nunjucks renderer disables autoescape, but `| safe` keeps the
  // snippet correct for themes that turn it back on.
  return [
    '{% if site.tags.length %}',
    '<div id="myCanvasContainer" class="widget-wrap tagcloud">',
    '  ' + canvasTag(width, height, style),
    '    {{ tagcloud() | safe }}',
    '  </canvas>',
    '</div>',
    '<script src="{{ url_for(\'/js/tagcanvas.js\') }}"></script>',
    '<script src="{{ url_for(\'/js/tagcloud.js\') }}"></script>',
    '{% endif %}',
  ].join('\n');
}

function emitPugBody(width, height, style) {
  // Column 0, so the block is a sibling of the template's top-level nodes.
  // Pug attribute values are JS expressions: single-quoted string literals.
  return [
    'if site.tags.length',
    '  #myCanvasContainer.card-widget.tagcloud',
    '    canvas#resCanvas(width=\'' + width + '\' height=\'' + height +
      '\' style=\'' + style + '\')',
    '      != tagcloud()',
    '  script(src=url_for(\'/js/tagcanvas.js\'))',
    '  script(src=url_for(\'/js/tagcloud.js\'))',
  ].join('\n');
}

function pickNumber(candidate, fallback) {
  // Preserve literal 0 — a `||` default would silently swap it for the
  // fallback. Negative / non-finite sizes fall back.
  if (candidate === undefined || candidate === null || candidate === '') return fallback;
  const coerced = Number(candidate);
  if (!Number.isFinite(coerced) || coerced < 0) return fallback;
  return Math.round(coerced);
}

function pickString(candidate, fallback) {
  if (candidate === undefined || candidate === null) return fallback;
  return String(candidate);
}

function escapeStyle(value) {
  // Drop characters that could close the attribute or start a template
  // expression in any engine (`<% %>`, `{{ }}`, `{% %}`, pug `#{}`/`'`),
  // and newlines that would break pug's single-line attribute.
  return String(value).replace(/[<>"'{}#\\\r\n&]/g, '');
}

module.exports = {
  emitManagedBlock,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_STYLE,
};
