'use strict';

const fs = require('fs');
const path = require('path');

const HANDLE_FILE = path.join(__dirname, '.server-handle.json');

module.exports = async function globalTeardown() {
  try {
    const close = global.__HEXO_TAG_CLOUD_E2E_CLOSE__;
    if (typeof close === 'function') {
      await close();
    }
  } finally {
    if (fs.existsSync(HANDLE_FILE)) {
      try { fs.unlinkSync(HANDLE_FILE); } catch (_e) { /* ignore */ }
    }
  }
};
