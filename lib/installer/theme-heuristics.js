'use strict';

/**
 * Pure theme-resolution module for the installer CLI. Maps a theme name
 * to a frozen `ThemeRecipe` describing which template (relative to the
 * theme directory) receives the managed tag-cloud block, which engine to
 * format it for, which marker comments wrap it, and the anchor it is
 * inserted before. No imports of `fs`, `path`, `process`, or any hexo
 * runtime — fully testable in isolation.
 *
 * Recipes track the current upstream layouts (#46):
 *   - landscape  layout/_partial/sidebar.ejs          before `</aside>`
 *   - next       layout/_macro/sidebar.njk            before `</aside>`
 *   - butterfly  layout/includes/widget/card_tags.pug  appended
 *   - fluid      layout/tags.ejs (tags page)           appended
 *
 * Any other theme goes through `customRecipe()` (`--target <file>`), or
 * through the plugin's theme-agnostic `tag_cloud.inject` mode — the only
 * option for JSX themes such as Icarus, whose templates are not text
 * that can be spliced safely.
 */

// HTML comments render through ejs and nunjucks untouched.
const HTML_MARKER_START = '<!-- hexo-tag-cloud:begin -->';
const HTML_MARKER_END = '<!-- hexo-tag-cloud:end -->';

// Pug comments use the //- syntax (NOT rendered to HTML, unlike //).
const PUG_MARKER_START = '//- hexo-tag-cloud:begin';
const PUG_MARKER_END = '//- hexo-tag-cloud:end';

// Template engines the installer can write, keyed by file extension.
// `.swig` themes are rendered by nunjucks in Hexo 5+.
const ENGINE_BY_EXT = Object.freeze({
  '.ejs': 'ejs',
  '.njk': 'njk',
  '.swig': 'njk',
  '.nunjucks': 'njk',
  '.pug': 'pug',
  '.jade': 'pug',
});

function markersFor(engine) {
  return engine === 'pug'
    ? { markerStart: PUG_MARKER_START, markerEnd: PUG_MARKER_END }
    : { markerStart: HTML_MARKER_START, markerEnd: HTML_MARKER_END };
}

function recipe(name, file, engine, before) {
  return Object.freeze(Object.assign({ name, file, engine, before }, markersFor(engine)));
}

const RECIPES = Object.freeze({
  landscape: recipe('landscape', 'layout/_partial/sidebar.ejs', 'ejs', '</aside>'),
  next: recipe('next', 'layout/_macro/sidebar.njk', 'njk', '</aside>'),
  butterfly: recipe('butterfly', 'layout/includes/widget/card_tags.pug', 'pug', null),
  fluid: recipe('fluid', 'layout/tags.ejs', 'ejs', null),
});

const KNOWN_THEMES = Object.freeze(Object.keys(RECIPES));

/**
 * @param {string} themeName
 * @returns {Readonly<ThemeRecipe> | null}
 */
function resolveTheme(themeName) {
  if (typeof themeName !== 'string' || themeName.length === 0) return null;
  return Object.prototype.hasOwnProperty.call(RECIPES, themeName) ? RECIPES[themeName] : null;
}

/**
 * Engine for a template path, from its extension; null for engines the
 * installer cannot write (e.g. `.jsx`).
 *
 * @param {string} file
 * @returns {string | null}
 */
function engineForFile(file) {
  const match = /\.[^./\\]+$/.exec(String(file));
  const ext = match ? match[0].toLowerCase() : '';
  return Object.prototype.hasOwnProperty.call(ENGINE_BY_EXT, ext) ? ENGINE_BY_EXT[ext] : null;
}

/**
 * Recipe for an arbitrary template chosen by the user or an agent.
 *
 * @param {string} file    path relative to the theme dir (or absolute)
 * @param {string | null} [before]  insert before the last line containing this text
 * @returns {Readonly<ThemeRecipe> | null}  null when the engine is unsupported
 */
function customRecipe(file, before) {
  const engine = engineForFile(file);
  if (!engine) return null;
  return recipe('custom', file, engine, before || null);
}

module.exports = {
  resolveTheme,
  engineForFile,
  customRecipe,
  KNOWN_THEMES,
  ENGINE_BY_EXT,
  HTML_MARKER_START,
  HTML_MARKER_END,
  PUG_MARKER_START,
  PUG_MARKER_END,
};
