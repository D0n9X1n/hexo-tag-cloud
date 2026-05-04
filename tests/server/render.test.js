'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderTagCloudJs } = require('../../lib/render');

const baseOpts = {
  textFont:        'Helvetica',
  textColour:      '#333',
  textHeight:      15,
  outlineColour:   '#E2E1C1',
  maxSpeed:        0.03,
  pauseOnSelected: true,
};

test('renders a non-empty string', () => {
  const out = renderTagCloudJs(baseOpts);
  assert.ok(typeof out === 'string', 'output is a string');
  assert.ok(out.length > 100, 'output is non-trivial');
});

test('emits TagCanvas.Start on resCanvas', () => {
  assert.match(renderTagCloudJs(baseOpts), /TagCanvas\.Start\('resCanvas'\);/);
});

test('values are interpolated literally — happy path', () => {
  const out = renderTagCloudJs({
    ...baseOpts,
    textFont: 'Helvetica',
    textColour: '#abc',
  });
  assert.match(out, /TagCanvas\.textFont = "Helvetica";/);
  assert.match(out, /TagCanvas\.textColour = "#abc";/);
});

// --- bug 1 regression: replace() $-pattern interpretation ----------------

test('bug 1 regression: textFont containing $& is round-tripped intact', () => {
  const out = renderTagCloudJs({ ...baseOpts, textFont: 'My$&Font' });
  // The replacement substring "$&" must appear LITERALLY in the output,
  // not interpreted as a back-reference pattern. JSON.stringify wraps
  // the value in quotes; the dollar/ampersand bytes survive verbatim.
  assert.match(out, /TagCanvas\.textFont = "My\$&Font";/);
  assert.ok(!out.includes('${textFont}'),
    'no template marker should leak into the rendered output');
});

test('bug 1 regression: textFont containing $$ is round-tripped intact', () => {
  const out = renderTagCloudJs({ ...baseOpts, textFont: 'A$$B' });
  assert.match(out, /TagCanvas\.textFont = "A\$\$B";/);
});

test('bug 1 regression: textFont containing $1 is round-tripped intact', () => {
  const out = renderTagCloudJs({ ...baseOpts, textFont: 'X$1Y' });
  assert.match(out, /TagCanvas\.textFont = "X\$1Y";/);
});

test('bug 1 regression: textFont with backslashes is escaped safely', () => {
  const out = renderTagCloudJs({ ...baseOpts, textFont: 'Path\\with\\back' });
  // JSON.stringify escapes each backslash as \\ in the source.
  assert.match(out, /TagCanvas\.textFont = "Path\\\\with\\\\back";/);
});

test('bug 1 regression: textFont with double-quotes is escaped safely', () => {
  const out = renderTagCloudJs({ ...baseOpts, textFont: 'a"b' });
  assert.match(out, /TagCanvas\.textFont = "a\\"b";/);
});

test('bug 1 regression: textFont containing newline is escaped safely', () => {
  const out = renderTagCloudJs({ ...baseOpts, textFont: 'a\nb' });
  // \n inside the value becomes the two-char escape \n in the source.
  assert.match(out, /TagCanvas\.textFont = "a\\nb";/);
});

// --- numeric / boolean knobs --------------------------------------------

test('textHeight: 0 emits literal 0 (not defaulted)', () => {
  const out = renderTagCloudJs({ ...baseOpts, textHeight: 0 });
  assert.match(out, /TagCanvas\.textHeight = 0;/);
});

test('maxSpeed: 0 emits literal 0', () => {
  const out = renderTagCloudJs({ ...baseOpts, maxSpeed: 0 });
  assert.match(out, /TagCanvas\.maxSpeed = 0;/);
});

test('pauseOnSelected: false emits TagCanvas.freezeActive = false', () => {
  const out = renderTagCloudJs({ ...baseOpts, pauseOnSelected: false });
  assert.match(out, /TagCanvas\.freezeActive = false;/);
});

test('pauseOnSelected: true emits TagCanvas.freezeActive = true', () => {
  const out = renderTagCloudJs({ ...baseOpts, pauseOnSelected: true });
  assert.match(out, /TagCanvas\.freezeActive = true;/);
});

test('numeric coercion: textHeight string "20" → emitted as number 20', () => {
  const out = renderTagCloudJs({ ...baseOpts, textHeight: '20' });
  assert.match(out, /TagCanvas\.textHeight = 20;/);
});
