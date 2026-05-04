'use strict';

/**
 * Playwright fixtures — lifts the global-setup baseURL into a per-test
 * `siteUrl` value so tests can perform raw fetches alongside browser
 * navigation. Sub-project D will extend this with theme-variant
 * fixtures for the visual-regression matrix.
 */

const base = require('@playwright/test');

const test = base.test.extend({
  siteUrl: async ({}, use) => {  // eslint-disable-line no-empty-pattern
    const url = process.env.E2E_BASE_URL;
    if (!url) {
      throw new Error('E2E_BASE_URL not set — global-setup did not run');
    }
    await use(url);
  },
});

const expect = base.expect;

module.exports = { test, expect };
