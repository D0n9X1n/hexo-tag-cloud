'use strict';

/**
 * Pure renderer for the managed tag-cloud block. Given a `ThemeRecipe`
 * (from `theme-heuristics.js`) and optional canvas overrides, returns
 * the marker-wrapped snippet the installer will splice into the user's
 * theme partial.
 *
 * The body content is engine-specific:
 *   - ejs/swig (HTML markers): a `<canvas>` + two `<script>` tags
 *     identical to the README's manual-install snippet.
 *   - pug (//- markers): pug-syntax canvas + script tags, indented at
 *     column 0 so they integrate with whatever indent context the user
 *     splices them into.
 *
 * No imports. Fully testable in isolation.
 *
 * Inherits B/T2's discipline: ALL string values that flow into the
 * emitted output are coerced via `String(...)` and rendered via plain
 * concatenation (no `.replace(string, string)` — which would interpret
 * `$&`/`$$`/`$1` as backreferences). Numbers are coerced via `Number`.
 */

const DEFAULT_CANVAS_WIDTH = 500;
const DEFAULT_CANVAS_HEIGHT = 400;
const DEFAULT_CANVAS_STYLE = 'margin: 0 auto;';

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
  const style = pickString(opts.canvasStyle, DEFAULT_CANVAS_STYLE);

  const body = recipe.engine === 'pug'
    ? emitPugBody(width, height, style)
    : emitHtmlBody(width, height, style);

  return recipe.markerStart + '\n' + body + '\n' + recipe.markerEnd;
}

function emitHtmlBody(width, height, style) {
  // String concatenation deliberately — see file-header note. attribute
  // values escape any embedded `"` so a user-supplied style stays intact.
  return (
    '<canvas id="resCanvas" width="' + Number(width) + '"' +
    ' height="' + Number(height) + '"' +
    ' style="' + escapeHtmlAttribute(style) + '">' +
    '</canvas>\n' +
    '<script src="/js/tagcanvas.js"></script>\n' +
    '<script src="/js/tagcloud.js"></script>'
  );
}

function emitPugBody(width, height, style) {
  // Pug attributes use parens. Single-quoted strings inside; embedded
  // single quotes are escaped to keep the pug parser happy.
  return (
    'canvas#resCanvas(width=' + Number(width) +
    ' height=' + Number(height) +
    " style='" + escapePugSingleQuotedAttr(style) + "')\n" +
    "script(src='/js/tagcanvas.js')\n" +
    "script(src='/js/tagcloud.js')"
  );
}

function pickNumber(candidate, fallback) {
  // Preserve literal 0 — a `||` default would silently swap it for the
  // fallback. (Mirrors B/T2's render.js fix.)
  if (candidate === undefined || candidate === null || candidate === '') return fallback;
  const coerced = Number(candidate);
  if (!Number.isFinite(coerced)) return fallback;
  return coerced;
}

function pickString(candidate, fallback) {
  if (candidate === undefined || candidate === null) return fallback;
  return String(candidate);
}

function escapeHtmlAttribute(value) {
  // Quoted-attribute context: only `"` and `&` need escaping. We keep the
  // input otherwise literal so a user's `content: "x"` shows up readably.
  return String(value).split('&').join('&amp;').split('"').join('&quot;');
}

function escapePugSingleQuotedAttr(value) {
  // Pug single-quoted attribute: backslash-escape backslashes and
  // single quotes. (Newlines must not appear in attribute values; we
  // strip them defensively.)
  return String(value)
    .split('\\').join('\\\\')
    .split("'").join("\\'")
    .split('\n').join(' ');
}

module.exports = {
  emitManagedBlock,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_CANVAS_STYLE,
};
