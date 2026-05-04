'use strict';

/**
 * Pure theme-resolution module for the installer CLI. Maps a theme name
 * to a frozen `ThemeRecipe` describing where to write the managed tag-
 * cloud block, which engine to format it for, and which marker comments
 * to wrap it in. No imports of `fs`, `path`, `process`, or any hexo
 * runtime — fully testable in isolation.
 *
 * Recipes are returned with `partialPath` containing a `<theme>`
 * placeholder; the caller substitutes the real theme name (which
 * usually equals `themeName`, but `--theme-dir` may point elsewhere).
 *
 * `insertionMode`:
 *   - `"append"`: append the managed block to the end of an existing
 *     partial file. The file MUST exist; the installer exits 4 otherwise.
 *   - `"standalone"`: write the managed block as a NEW partial file the
 *     user must include manually. Used by the `generic` fallback when
 *     no theme-specific recipe is known.
 */

// HTML comments render through both ejs and swig untouched.
const HTML_MARKER_START = '<!-- hexo-tag-cloud:begin -->';
const HTML_MARKER_END = '<!-- hexo-tag-cloud:end -->';

// Pug comments use the //- syntax (NOT rendered to HTML, unlike //).
const PUG_MARKER_START = '//- hexo-tag-cloud:begin';
const PUG_MARKER_END = '//- hexo-tag-cloud:end';

const RECIPES = Object.freeze({
  landscape: Object.freeze({
    name: 'landscape',
    partialPath: 'themes/<theme>/layout/_partial/sidebar.ejs',
    engine: 'ejs',
    insertionMode: 'append',
    markerStart: HTML_MARKER_START,
    markerEnd: HTML_MARKER_END,
  }),
  next: Object.freeze({
    name: 'next',
    partialPath: 'themes/<theme>/layout/_macro/sidebar.swig',
    engine: 'swig',
    insertionMode: 'append',
    markerStart: HTML_MARKER_START,
    markerEnd: HTML_MARKER_END,
  }),
  butterfly: Object.freeze({
    name: 'butterfly',
    partialPath: 'themes/<theme>/layout/includes/widget/recent_comments.pug',
    engine: 'pug',
    insertionMode: 'append',
    markerStart: PUG_MARKER_START,
    markerEnd: PUG_MARKER_END,
  }),
  icarus: Object.freeze({
    name: 'icarus',
    partialPath: 'themes/<theme>/layout/widget/recent_posts.ejs',
    engine: 'ejs',
    insertionMode: 'append',
    markerStart: HTML_MARKER_START,
    markerEnd: HTML_MARKER_END,
  }),
  fluid: Object.freeze({
    name: 'fluid',
    partialPath: 'themes/<theme>/layout/_partials/sidebar.ejs',
    engine: 'ejs',
    insertionMode: 'append',
    markerStart: HTML_MARKER_START,
    markerEnd: HTML_MARKER_END,
  }),
  generic: Object.freeze({
    name: 'generic',
    partialPath: 'themes/<theme>/layout/_partial/tagcloud-partial.ejs',
    engine: 'ejs',
    insertionMode: 'standalone',
    markerStart: HTML_MARKER_START,
    markerEnd: HTML_MARKER_END,
  }),
});

const KNOWN_THEMES = Object.freeze(Object.keys(RECIPES));

/**
 * @param {string} themeName
 * @returns {Readonly<ThemeRecipe> | null}
 */
function resolveTheme(themeName) {
  if (typeof themeName !== 'string' || themeName.length === 0) return null;
  const recipe = RECIPES[themeName];
  return recipe || null;
}

/**
 * Substitute `<theme>` in the recipe's partialPath with the supplied
 * theme slug. Returns a new string; does not mutate the recipe.
 *
 * @param {Readonly<ThemeRecipe>} recipe
 * @param {string} themeSlug
 * @returns {string}
 */
function interpolatePartialPath(recipe, themeSlug) {
  if (!recipe || typeof recipe.partialPath !== 'string') {
    throw new TypeError('interpolatePartialPath: recipe.partialPath must be a string');
  }
  if (typeof themeSlug !== 'string' || themeSlug.length === 0) {
    throw new TypeError('interpolatePartialPath: themeSlug must be a non-empty string');
  }
  return recipe.partialPath.split('<theme>').join(themeSlug);
}

module.exports = {
  resolveTheme,
  interpolatePartialPath,
  KNOWN_THEMES,
  HTML_MARKER_START,
  HTML_MARKER_END,
  PUG_MARKER_START,
  PUG_MARKER_END,
};
