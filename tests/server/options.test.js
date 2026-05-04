'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  computeOptions,
  ensureCjkFallback,
  DEFAULT_TEXT_FONT,
  CJK_FALLBACK_STACK,
} = require('../../lib/options');

// --- ensureCjkFallback() --------------------------------------------------

test('ensureCjkFallback: undefined → DEFAULT_TEXT_FONT', () => {
  assert.equal(ensureCjkFallback(undefined), DEFAULT_TEXT_FONT);
});

test('ensureCjkFallback: null → DEFAULT_TEXT_FONT', () => {
  assert.equal(ensureCjkFallback(null), DEFAULT_TEXT_FONT);
});

test('ensureCjkFallback: empty string → DEFAULT_TEXT_FONT', () => {
  assert.equal(ensureCjkFallback(''), DEFAULT_TEXT_FONT);
});

test('ensureCjkFallback: number → DEFAULT_TEXT_FONT (not a string)', () => {
  assert.equal(ensureCjkFallback(42), DEFAULT_TEXT_FONT);
});

test('ensureCjkFallback: single-family "Trebuchet MS" → user font + CJK chain appended', () => {
  const out = ensureCjkFallback('Trebuchet MS');
  assert.ok(out.startsWith('Trebuchet MS, '),
    `expected output to start with "Trebuchet MS, "; got: ${out}`);
  assert.ok(out.includes('Noto Sans CJK SC'),
    `expected CJK family in output; got: ${out}`);
});

test('ensureCjkFallback: multi-family "Trebuchet MS, sans-serif" → passes through unchanged', () => {
  const stack = 'Trebuchet MS, sans-serif';
  assert.equal(ensureCjkFallback(stack), stack,
    'user-supplied stacks (containing a comma) must pass through unchanged');
});

test('ensureCjkFallback: user-supplied stack with CJK already → no double-append', () => {
  const stack = 'Comic Sans MS, "Noto Sans CJK SC"';
  assert.equal(ensureCjkFallback(stack), stack);
});

// --- DEFAULT_TEXT_FONT contract ------------------------------------------

test('DEFAULT_TEXT_FONT includes a CJK family (Noto Sans CJK SC)', () => {
  assert.ok(DEFAULT_TEXT_FONT.includes('Noto Sans CJK SC'),
    `default font must include a CJK family; got: ${DEFAULT_TEXT_FONT}`);
});

test('CJK_FALLBACK_STACK contains macOS, Windows, and Linux CJK families', () => {
  assert.ok(CJK_FALLBACK_STACK.includes('PingFang SC'),       'macOS family');
  assert.ok(CJK_FALLBACK_STACK.includes('Microsoft YaHei'),   'Windows family');
  assert.ok(CJK_FALLBACK_STACK.includes('Noto Sans CJK SC'),  'Linux family');
});

// --- computeOptions() ----------------------------------------------------

test('computeOptions: no rawCfg → all defaults; CJK fallback in textFont', () => {
  const o = computeOptions(undefined);
  assert.equal(o.textFont,        DEFAULT_TEXT_FONT);
  assert.equal(o.textColour,      '#333');
  assert.equal(o.textHeight,      15);
  assert.equal(o.outlineColour,   '#E2E1C1');
  assert.equal(o.maxSpeed,        0.03);
  assert.equal(o.pauseOnSelected, true);
});

test('computeOptions: null rawCfg → all defaults', () => {
  const o = computeOptions(null);
  assert.equal(o.textFont, DEFAULT_TEXT_FONT);
  assert.equal(o.textHeight, 15);
});

test('computeOptions: non-object rawCfg → all defaults', () => {
  const o = computeOptions('garbage');
  assert.equal(o.textFont, DEFAULT_TEXT_FONT);
  assert.equal(o.pauseOnSelected, true);
});

test('computeOptions: empty {} → all defaults', () => {
  const o = computeOptions({});
  assert.equal(o.textFont, DEFAULT_TEXT_FONT);
  assert.equal(o.textColour, '#333');
});

test('computeOptions: only textColor set → other defaults preserved', () => {
  const o = computeOptions({ textColor: '#abc' });
  assert.equal(o.textColour, '#abc');
  assert.equal(o.textFont, DEFAULT_TEXT_FONT);
});

test('computeOptions: only textFont (single-family) → wrapped with CJK chain', () => {
  const o = computeOptions({ textFont: 'Trebuchet MS' });
  assert.ok(o.textFont.startsWith('Trebuchet MS, '));
  assert.ok(o.textFont.includes('Noto Sans CJK SC'));
});

test('computeOptions: only textHeight set, including 0', () => {
  assert.equal(computeOptions({ textHeight: 42 }).textHeight, 42);
  // Critical regression — A's `||` defaulting would have clobbered 0 → 15.
  assert.equal(computeOptions({ textHeight: 0 }).textHeight, 0);
});

test('computeOptions: only outlineColor set', () => {
  assert.equal(computeOptions({ outlineColor: '#123' }).outlineColour, '#123');
});

test('computeOptions: only maxSpeed set, including 0', () => {
  assert.equal(computeOptions({ maxSpeed: 0.5 }).maxSpeed, 0.5);
  // Critical regression — A's `||` defaulting would have clobbered 0 → 0.03.
  assert.equal(computeOptions({ maxSpeed: 0 }).maxSpeed, 0);
});

test('computeOptions: pauseOnSelected explicitly false (preserved, not defaulted to true)', () => {
  assert.equal(computeOptions({ pauseOnSelected: false }).pauseOnSelected, false);
});

test('computeOptions: pauseOnSelected explicitly true', () => {
  assert.equal(computeOptions({ pauseOnSelected: true }).pauseOnSelected, true);
});

test('computeOptions: all six knobs together', () => {
  const o = computeOptions({
    textFont: 'Comic Sans MS, sans-serif',
    textColor: '#abcdef',
    textHeight: 25,
    outlineColor: '#fedcba',
    maxSpeed: 0.07,
    pauseOnSelected: false,
  });
  assert.equal(o.textFont,        'Comic Sans MS, sans-serif');
  assert.equal(o.textColour,      '#abcdef');
  assert.equal(o.textHeight,      25);
  assert.equal(o.outlineColour,   '#fedcba');
  assert.equal(o.maxSpeed,        0.07);
  assert.equal(o.pauseOnSelected, false);
});
