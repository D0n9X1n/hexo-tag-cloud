'use strict';

/**
 * Playwright config for hexo-tag-cloud's end-to-end smoke tests.
 *
 * Sub-project A ships a single smoke spec proving the plugin's emitted
 * scripts load against a generated Hexo fixture site. Sub-project D
 * adds the visual-regression matrix and re-introduces sharding once
 * the spec count justifies it.
 */

const { defineConfig, devices } = require('@playwright/test');

const isCI = !!process.env.CI;

module.exports = defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.js/,
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results',
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
