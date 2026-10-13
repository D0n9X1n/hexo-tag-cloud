'use strict';

/**
 * Pure decision module for the installer's edit step. Given the
 * existing file content (verbatim), the new managed-block string
 * (from `partial-emitter.js`), the recipe, and a `force` flag,
 * returns one of five `ApplyAction` shapes:
 *
 *   - { kind: "insert", newContent, diff }
 *   - { kind: "noop", message }
 *   - { kind: "conflict", diff, exitCode: 2 }
 *   - { kind: "force-replace", newContent, diff }
 *   - { kind: "legacy", message, exitCode: 3 }
 *
 * Unmanaged content is never replaced (#45): a new block is inserted
 * before the last line containing `recipe.before` (e.g. `</aside>`, so
 * the cloud lands inside the sidebar), or appended when there is no
 * anchor or the anchor is absent.
 *
 * EOL handling:
 *   - Comparison normalizes both sides to LF (so CRLF-vs-LF doesn't
 *     trigger false conflicts).
 *   - Emission detects the dominant EOL of `existingContent` and
 *     re-emits the splice with that EOL. Empty file defaults to LF.
 *
 * No imports of `fs`, `path`, or `process`. Pure module. Every splice
 * uses slicing + concatenation, NOT `.replace(string, string)` —
 * guarding against `$&`/`$$`/`$1` backreference interpretation.
 */

// A hand-written install: a resCanvas element (HTML or pug syntax, any
// quoting) plus a reference to one of the plugin's scripts (#51).
const LEGACY_CANVAS = /id\s*=\s*["']resCanvas["']|canvas#resCanvas/;
const LEGACY_SCRIPT = /js\/tag(?:cloud|canvas)\.js/;

const NOOP_MESSAGE = 'tag-cloud managed block already up-to-date; no changes written.';

/**
 * @typedef {object} ApplyArgs
 * @property {string} existingContent  raw bytes from the target file (may be empty)
 * @property {string} newBlock         marker-wrapped block from emitManagedBlock()
 * @property {Readonly<ThemeRecipe>} recipe
 * @property {boolean} [force]
 */

/**
 * @param {ApplyArgs} args
 * @returns {ApplyAction}
 */
function computeApplyAction(args) {
  if (!args || typeof args !== 'object') {
    throw new TypeError('computeApplyAction: args object required');
  }
  const { existingContent, newBlock, recipe } = args;
  const force = Boolean(args.force);

  if (typeof newBlock !== 'string' || newBlock.length === 0) {
    throw new TypeError('computeApplyAction: newBlock must be a non-empty string');
  }
  if (!recipe || typeof recipe.markerStart !== 'string' ||
      typeof recipe.markerEnd !== 'string') {
    throw new TypeError('computeApplyAction: recipe with markerStart/markerEnd required');
  }
  const content = typeof existingContent === 'string' ? existingContent : '';
  const eol = detectDominantEol(content);

  const existingBlockSpan = findManagedBlockSpan(content, recipe.markerStart, recipe.markerEnd);

  if (existingBlockSpan) {
    const existingBlock = content.slice(existingBlockSpan.start, existingBlockSpan.end);
    if (normalizeEol(existingBlock) === normalizeEol(newBlock)) {
      return { kind: 'noop', message: NOOP_MESSAGE };
    }
    const diff = renderUnifiedDiff(
      'before',
      'after',
      normalizeEol(existingBlock),
      normalizeEol(newBlock),
    );
    if (force) {
      const newContent = spliceReplace(content, existingBlockSpan, withEol(newBlock, eol));
      return { kind: 'force-replace', newContent, diff };
    }
    return { kind: 'conflict', diff, exitCode: 2 };
  }

  if (hasLegacyInstall(content)) {
    return {
      kind: 'legacy',
      message:
        'detected a legacy hexo-tag-cloud install (a resCanvas <canvas> and ' +
        'tagcloud/tagcanvas script without managed-block markers). Remove ' +
        'it before re-running, or keep it and do not run the installer.',
      exitCode: 3,
    };
  }

  // No existing block, no legacy install → insert; never drop content.
  const blockWithEol = withEol(newBlock, eol);
  const at = insertionIndex(content, recipe.before);
  let newContent;
  let where;
  if (at === -1) {
    newContent = appendBlock(content, blockWithEol, eol);
    where = 'append at end of file';
  } else {
    newContent = content.slice(0, at) + blockWithEol + eol + content.slice(at);
    where = 'insert before line ' + lineNumberAt(content, at) + ': ' +
      lineAt(content, at).trim();
  }
  const diff = '@@ ' + where + ' @@\n' +
    normalizeEol(newBlock).split('\n').map(function (l) { return '+' + l; }).join('\n');
  return { kind: 'insert', newContent, diff };
}

// --- internals ------------------------------------------------------------

function findManagedBlockSpan(content, markerStart, markerEnd) {
  const startIdx = content.indexOf(markerStart);
  if (startIdx === -1) return null;
  const endMarkerIdx = content.indexOf(markerEnd, startIdx + markerStart.length);
  if (endMarkerIdx === -1) return null;
  return { start: startIdx, end: endMarkerIdx + markerEnd.length };
}

function hasLegacyInstall(content) {
  return LEGACY_CANVAS.test(content) && LEGACY_SCRIPT.test(content);
}

/**
 * Start offset of the LAST line containing `anchor`, or -1. The last
 * occurrence is the outermost closing tag (`</aside>`) in a sidebar.
 */
function insertionIndex(content, anchor) {
  if (typeof anchor !== 'string' || anchor.length === 0) return -1;
  const idx = content.lastIndexOf(anchor);
  if (idx === -1) return -1;
  return content.lastIndexOf('\n', idx) + 1;
}

function lineNumberAt(content, offset) {
  return content.slice(0, offset).split('\n').length;
}

function lineAt(content, offset) {
  const end = content.indexOf('\n', offset);
  return content.slice(offset, end === -1 ? content.length : end);
}

function normalizeEol(s) {
  return s.split('\r\n').join('\n');
}

function detectDominantEol(content) {
  if (content.length === 0) return '\n';
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const totalLfCount = (content.match(/\n/g) || []).length;
  const loneLfCount = totalLfCount - crlfCount;
  return crlfCount > loneLfCount ? '\r\n' : '\n';
}

function withEol(s, eol) {
  // Convert any line endings inside `s` to the target eol.
  const normalized = normalizeEol(s);
  if (eol === '\n') return normalized;
  return normalized.split('\n').join('\r\n');
}

function spliceReplace(content, span, replacement) {
  return content.slice(0, span.start) + replacement + content.slice(span.end);
}

function appendBlock(content, blockWithEol, eol) {
  if (content.length === 0) return blockWithEol + eol;
  const trailing = content.endsWith(eol) ? '' : eol;
  return content + trailing + eol + blockWithEol + eol;
}

function renderUnifiedDiff(beforeLabel, afterLabel, beforeText, afterText) {
  // Minimal unified-diff renderer: prefixes every existing line with `-`
  // and every new line with `+`. Sufficient for the user to spot what
  // would change without pulling in a `diff` npm dep.
  const out = ['--- ' + beforeLabel, '+++ ' + afterLabel];
  for (const line of beforeText.split('\n')) out.push('-' + line);
  for (const line of afterText.split('\n')) out.push('+' + line);
  return out.join('\n');
}

module.exports = {
  computeApplyAction,
  NOOP_MESSAGE,
  LEGACY_CANVAS,
  LEGACY_SCRIPT,
  renderUnifiedDiff,
};
