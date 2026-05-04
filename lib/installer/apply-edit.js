'use strict';

/**
 * Pure decision module for the installer's edit step. Given the
 * existing file content (verbatim), the new managed-block string
 * (from `partial-emitter.js`), the recipe, and a `force` flag,
 * returns one of five `ApplyAction` shapes:
 *
 *   - { kind: "insert", newContent }
 *   - { kind: "noop", message }
 *   - { kind: "conflict", diff, exitCode: 2 }
 *   - { kind: "force-replace", newContent }
 *   - { kind: "legacy", message, exitCode: 3 }
 *
 * EOL handling (per spec AC #3 + plan T3):
 *   - Comparison normalizes both sides to LF (so CRLF-vs-LF doesn't
 *     trigger false conflicts).
 *   - Emission detects the dominant EOL of `existingContent` and
 *     re-emits the splice with that EOL. Empty file defaults to LF.
 *
 * No imports of `fs`, `path`, or `process`. Pure module.
 *
 * Inherits B/T2's discipline: every splice uses array indexing +
 * concatenation, NOT `.replace(string, string)` — guarding against
 * `$&`/`$$`/`$1` backreference interpretation in user content.
 */

const LEGACY_TRIPLE = Object.freeze([
  'id="resCanvas"',
  '/js/tagcloud.js',
  '/js/tagcanvas.js',
]);

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
    if (force) {
      const newContent = spliceReplace(content, existingBlockSpan, withEol(newBlock, eol));
      const diff = renderUnifiedDiff(
        'before',
        'after',
        normalizeEol(existingBlock),
        normalizeEol(newBlock),
      );
      return { kind: 'force-replace', newContent, diff };
    }
    const diff = renderUnifiedDiff(
      'before',
      'after',
      normalizeEol(existingBlock),
      normalizeEol(newBlock),
    );
    return { kind: 'conflict', diff, exitCode: 2 };
  }

  if (hasLegacyTriple(content)) {
    return {
      kind: 'legacy',
      message:
        'detected a legacy hexo-tag-cloud install (manual <canvas>/<script> ' +
        'snippet without managed-block markers). Remove the existing block ' +
        'manually before re-running; automated --migrate is deferred.',
      exitCode: 3,
    };
  }

  // No existing block, no legacy install → insert.
  const insertDiff = renderUnifiedDiff('before', 'after', '', normalizeEol(newBlock));
  if (recipe.insertionMode === 'standalone') {
    // Standalone partials replace whatever is in the target file (which
    // would be empty in normal use, since the bin only writes when the
    // file does not exist; but if the user pre-created an empty file,
    // we still write the block as the file's full body).
    return { kind: 'insert', newContent: withEol(newBlock, eol), diff: insertDiff };
  }
  const appended = appendBlock(content, newBlock, eol);
  return { kind: 'insert', newContent: appended, diff: insertDiff };
}

// --- internals ------------------------------------------------------------

function findManagedBlockSpan(content, markerStart, markerEnd) {
  const startIdx = content.indexOf(markerStart);
  if (startIdx === -1) return null;
  const endMarkerIdx = content.indexOf(markerEnd, startIdx + markerStart.length);
  if (endMarkerIdx === -1) return null;
  return { start: startIdx, end: endMarkerIdx + markerEnd.length };
}

function hasLegacyTriple(content) {
  for (const needle of LEGACY_TRIPLE) {
    if (content.indexOf(needle) === -1) return false;
  }
  return true;
}

function normalizeEol(s) {
  return s.split('\r\n').join('\n');
}

function detectDominantEol(content) {
  if (typeof content !== 'string' || content.length === 0) return '\n';
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

function appendBlock(content, newBlock, eol) {
  const blockWithEol = withEol(newBlock, eol);
  if (content.length === 0) return blockWithEol;
  const trailing = content.endsWith(eol) ? '' : eol;
  return content + trailing + eol + blockWithEol;
}

function renderUnifiedDiff(beforeLabel, afterLabel, beforeText, afterText) {
  // Minimal unified-diff renderer: prefixes every existing line with `-`
  // and every new line with `+`. Sufficient for the user to spot what
  // would change without pulling in a `diff` npm dep.
  const beforeLines = beforeText.split('\n');
  const afterLines = afterText.split('\n');
  const out = [
    '--- ' + beforeLabel,
    '+++ ' + afterLabel,
  ];
  for (const line of beforeLines) out.push('-' + line);
  for (const line of afterLines) out.push('+' + line);
  return out.join('\n');
}

module.exports = {
  computeApplyAction,
  NOOP_MESSAGE,
  LEGACY_TRIPLE,
  renderUnifiedDiff,
};
