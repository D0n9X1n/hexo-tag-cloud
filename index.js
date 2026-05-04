// Copyright © 2016 TangDongxin
// Copyright © 2026 D0n9X1n (v3.0.0 refactor)

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the "Software"),
// to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense,
// and/or sell copies of the Software, and to permit persons to whom the
// Software is furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
// OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
// OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

const fsp  = require('fs/promises');
const path = require('path');

const { computeOptions }   = require('./lib/options');
const { renderTagCloudJs } = require('./lib/render');

/**
 * Hexo plugin entry. Registers an `after_generate` filter on the
 * supplied hexo instance that copies the vendored TagCanvas library
 * and writes a small bootstrap script into the user's `public/js/`
 * directory.
 *
 * Exposed as the module export so that unit tests (and any future
 * programmatic embedders) can drive the plugin with a fake hexo
 * without monkey-patching globals. Hexo's plugin loader does NOT
 * auto-invoke `module.exports`; see the typeof-guarded auto-register
 * block below.
 *
 * Implementation notes:
 *  - Uses `node:fs/promises` (Node 18+ built-in) instead of `hexo-fs`
 *    to avoid pulling in `hexo-fs@0.2.x`'s vulnerable `braces` /
 *    `chokidar` / `micromatch` transitive deps.
 *  - Uses `hexo.log` (the live hexo instance's logger) instead of
 *    importing `hexo-log` directly, removing one more transitive
 *    audit-flagged path. Falls back to `console` for tests / standalone
 *    invocation that pass a hexo without a logger.
 *
 * @param {object} hexo - hexo instance (real or test double)
 */
function registerHexoTagCloud(hexo) {
  const log = (hexo && hexo.log) || console;

  hexo.extend.filter.register('after_generate', async function () {
    const libDir   = path.join(hexo.base_dir, 'node_modules',
                               'hexo-tag-cloud', 'lib');
    const srcLib   = path.join(libDir, 'tagcanvas.js');
    const destDir  = path.join(hexo.public_dir, 'js');
    const destLib  = path.join(destDir, 'tagcanvas.js');
    const destBoot = path.join(destDir, 'tagcloud.js');

    log.info('---- START COPYING TAG CLOUD FILES ----');
    await fsp.mkdir(destDir, { recursive: true });
    await fsp.copyFile(srcLib, destLib);

    const opts = computeOptions(hexo.config.tag_cloud);
    await fsp.writeFile(destBoot, renderTagCloudJs(opts));

    log.info('---- END COPYING TAG CLOUD FILES ----');
  });
}

module.exports = registerHexoTagCloud;

// Hexo's plugin loader wraps each plugin's source as
//   (function(exports, require, module, __filename, __dirname, hexo){ … })
// and invokes it with the hexo instance as the 6th parameter (see
// hexo/dist/hexo/index.js, `loadPlugin`). Within that wrapper the
// identifier `hexo` is a free variable bound to the running site;
// outside it (e.g. unit tests that `require()` this module directly),
// it is undefined and the typeof guard skips the auto-register so the
// tests can drive `registerHexoTagCloud(fakeHexo)` themselves.
if (typeof hexo !== 'undefined') {
  // eslint-disable-next-line no-undef
  registerHexoTagCloud(hexo);
}
