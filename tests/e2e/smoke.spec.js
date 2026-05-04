'use strict';

/**
 * Smoke E2E — proves the plugin's runtime contract end-to-end against
 * a real generated Hexo site:
 *
 *   1. The fixture homepage loads (HTTP 200).
 *   2. Both `tagcloud.js` and `tagcanvas.js` are referenced from the
 *      page as top-level <script src=...> tags.
 *   3. Both scripts are themselves served (HTTP 200).
 *   4. The generated `tagcloud.js` contains the TagCanvas.Start
 *      bootstrap call against the canvas id the README documents.
 *
 * Sub-project B will add CJK-tag assertions and visual checks; D will
 * fan this spec out across themes.
 */

const { test, expect } = require('./fixtures');

test('homepage loads with both plugin scripts wired in', async ({ page, siteUrl }) => {
  const response = await page.goto(siteUrl + '/');
  expect(response.status(), 'GET / must return 200').toBe(200);

  const scripts = await page.locator('script[src]').evaluateAll(
    (els) => els.map((el) => el.getAttribute('src')));

  expect(scripts.some((s) => /\/js\/tagcloud\.js$/.test(s)),
    `expected a <script src="…/js/tagcloud.js"> on /, got: ${JSON.stringify(scripts)}`
  ).toBe(true);

  expect(scripts.some((s) => /\/js\/tagcanvas\.js$/.test(s)),
    `expected a <script src="…/js/tagcanvas.js"> on /, got: ${JSON.stringify(scripts)}`
  ).toBe(true);
});

test('plugin scripts are served and tagcloud.js bootstraps TagCanvas', async ({ request, siteUrl }) => {
  const tagcloud = await request.get(siteUrl + '/js/tagcloud.js');
  expect(tagcloud.status(), '/js/tagcloud.js HTTP status').toBe(200);
  const tagcloudBody = await tagcloud.text();
  expect(tagcloudBody,
    'tagcloud.js must call TagCanvas.Start on the resCanvas element'
  ).toContain("TagCanvas.Start('resCanvas'");

  const tagcanvas = await request.get(siteUrl + '/js/tagcanvas.js');
  expect(tagcanvas.status(), '/js/tagcanvas.js HTTP status').toBe(200);
  const tagcanvasBody = await tagcanvas.text();
  expect(tagcanvasBody.length,
    'tagcanvas.js must be a non-trivial library bundle'
  ).toBeGreaterThan(1000);
});

test('TagCanvas loads CJK / Cyrillic / HTML-special tags from the DOM (B/T7)',
    async ({ page, siteUrl }) => {
  await page.goto(siteUrl + '/');
  await page.waitForFunction(() => (
    // eslint-disable-next-line no-undef
    typeof TagCanvas !== 'undefined' &&
    // eslint-disable-next-line no-undef
    TagCanvas.tc && TagCanvas.tc.resCanvas &&
    // eslint-disable-next-line no-undef
    Array.isArray(TagCanvas.tc.resCanvas.taglist) &&
    // eslint-disable-next-line no-undef
    TagCanvas.tc.resCanvas.taglist.length > 0
  ));

  const result = await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    const tc = TagCanvas.tc.resCanvas;
    const texts = (tc.taglist || []).map((t) => t.text_original);
    // eslint-disable-next-line no-undef
    const cv = document.getElementById('resCanvas');
    const data = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let opaque = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 0) opaque++;
    return { texts, opaque };
  });

  // Spec AC #4 — superset of CJK / Cyrillic / `+` tags.
  for (const required of ['中文', '日本語', '한국어', 'Привет', 'C++']) {
    expect(result.texts,
      `missing required tag "${required}"; got: ${JSON.stringify(result.texts)}`
    ).toContain(required);
  }

  // T5 regression — HTML-special characters render literally, not
  // double-decoded into different glyphs. See docs/notes/2026-05-03-B-T5-no-patch.md.
  expect(result.texts, 'A&B (literal ampersand) must be present').toContain('A&B');
  expect(result.texts, 'quote"tag (literal double-quote) must be present').toContain('quote"tag');

  // Non-zero canvas pixel count proves TagCanvas actually rendered something.
  expect(result.opaque,
    `canvas must render some opaque pixels; got: ${result.opaque}`
  ).toBeGreaterThan(100);
});
