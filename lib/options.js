'use strict';

/**
 * Pure option-normalisation for hexo-tag-cloud. Takes the user's
 * `_config.yml` `tag_cloud` block (or undefined) and returns a fully-
 * defaulted, validated options object the renderer can consume without
 * defensive checks.
 *
 * No imports of `hexo`, `hexo-fs`, `hexo-log`, or `path`. Pure module.
 */

// Stack assembled to maximise the chance that *any* CJK glyph the user
// puts in a tag name is rendered on the canvas without the user having
// to know which fonts are installed on each visitor's OS:
//   - macOS:    PingFang SC, Hiragino Sans GB
//   - Windows:  Microsoft YaHei
//   - Linux:    Source Han Sans CN, Noto Sans CJK SC
//   - Generic:  sans-serif as last resort
const CJK_FALLBACK_STACK =
  'Arial, "PingFang SC", "Microsoft YaHei", ' +
  '"Hiragino Sans GB", "Source Han Sans CN", ' +
  '"Noto Sans CJK SC", sans-serif';

const DEFAULT_TEXT_FONT = 'Helvetica, ' + CJK_FALLBACK_STACK;

/**
 * Wraps a user-supplied `textFont` value with the CJK fallback stack
 * if (and only if) the user supplied a single family with no commas.
 * Multi-family stacks pass through unchanged (the user knows what
 * they're doing); empty/non-string inputs fall back to the full
 * `DEFAULT_TEXT_FONT`.
 *
 * @param {unknown} font
 * @returns {string}
 */
function ensureCjkFallback(font) {
  if (typeof font !== 'string' || font.length === 0) return DEFAULT_TEXT_FONT;
  if (font.indexOf(',') >= 0) return font;
  return font + ', ' + CJK_FALLBACK_STACK;
}

/**
 * @typedef {object} NormalisedOptions
 * @property {string}  textFont
 * @property {string}  textColour
 * @property {number}  textHeight
 * @property {string}  outlineColour
 * @property {number}  maxSpeed
 * @property {boolean} pauseOnSelected
 * @property {boolean} inject   theme-agnostic mode: inject the cloud via Hexo's injector
 * @property {string}  mount    comma-separated CSS selectors tried in order for inject mode
 */

// Sidebars of landscape, NexT, Butterfly, Icarus, Fluid and most other themes,
// then generic fallbacks. Tried in order; the first match receives the cloud.
const DEFAULT_MOUNT =
  '#sidebar, .sidebar-inner, #aside-content, .column-right, .column-left, ' +
  '.sidebar, aside, footer';

function pickNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pickBoolean(value, fallback) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return fallback;
}

/**
 * Normalises the raw `tag_cloud` block from `_config.yml` into a
 * fully-defaulted options object. Falsy-but-valid values for numeric
 * and boolean knobs (e.g. `textHeight: 0`, `pauseOnSelected: false`)
 * are preserved — the v2.1.2 plugin used `||` defaulting which would
 * silently clobber them. Non-numeric numbers and non-boolean booleans
 * fall back to the default instead of emitting `NaN` into the bootstrap.
 *
 * @param {object | undefined | null} rawCfg
 * @returns {NormalisedOptions}
 */
function computeOptions(rawCfg) {
  const cfg = (rawCfg && typeof rawCfg === 'object') ? rawCfg : {};
  return {
    textFont:        ensureCjkFallback(cfg.textFont),
    textColour:      cfg.textColor    || '#333',
    textHeight:      pickNumber(cfg.textHeight, 15),
    outlineColour:   cfg.outlineColor || '#E2E1C1',
    maxSpeed:        pickNumber(cfg.maxSpeed, 0.03),
    pauseOnSelected: pickBoolean(cfg.pauseOnSelected, true),
    inject:          pickBoolean(cfg.inject, false),
    mount:           (typeof cfg.mount === 'string' && cfg.mount.trim()) ? cfg.mount : DEFAULT_MOUNT,
  };
}

module.exports = {
  computeOptions,
  ensureCjkFallback,
  DEFAULT_TEXT_FONT,
  CJK_FALLBACK_STACK,
  DEFAULT_MOUNT,
};
