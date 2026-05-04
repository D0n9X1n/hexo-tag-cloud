'use strict';

/**
 * Playwright global setup — generates the Hexo fixture site (lazy npm
 * install + hexo clean + hexo generate) and starts a static loopback
 * HTTP server to host the resulting `public/` directory. Exports the
 * server's base URL via `process.env.E2E_BASE_URL` so per-test fixtures
 * can read it.
 *
 * Companion teardown (`global-teardown.js`) closes the server.
 */

const path = require('path');
const fs = require('fs');

const { generateSite } = require('../helpers/generateSite');
const { serveSite } = require('../helpers/serveSite');

const HANDLE_FILE = path.join(__dirname, '.server-handle.json');

module.exports = async function globalSetup() {
  const { publicDir } = await generateSite();
  const handle = await serveSite({ root: publicDir });

  process.env.E2E_BASE_URL = handle.url;

  // Persist the URL for the teardown hook (which runs in a fresh
  // module context and so cannot see this closure).
  fs.writeFileSync(HANDLE_FILE, JSON.stringify({
    url: handle.url,
    pid: process.pid,
  }));

  // Stash the close() callback on the global Node namespace so teardown
  // (same process) can invoke it directly. Falls back to a no-op when absent.
  global.__HEXO_TAG_CLOUD_E2E_CLOSE__ = handle.close;
};
