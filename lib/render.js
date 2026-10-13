'use strict';

/**
 * Pure renderer that produces the bootstrap `tagcloud.js` source string
 * from a normalised options object. The output is a small JavaScript
 * file that the user's hexo theme loads via a <script src> tag; it
 * configures TagCanvas and starts it on the `#resCanvas` element.
 *
 * No imports of `hexo`, `hexo-fs`, `hexo-log`, or `path`. Pure module.
 *
 * # Why JSON.stringify for strings, Number()/Boolean() for primitives
 *
 * Sub-project A inherited this template-injection logic from MikeCoder's
 * v2.1.2 plugin, which used `String.prototype.replace(string, string)`
 * — and that form interprets `$&`, `$$`, `$'`, `` $` ``, `$1`...`$9` in
 * the REPLACEMENT string as backreference patterns. Result: a user
 * setting `textFont: "My$&Font"` produced `My${textFont}Font` in the
 * emitted bootstrap. JSON.stringify always quotes the value as a valid
 * JavaScript string literal (escaping quotes, backslashes, line breaks,
 * and unicode), eliminating the bug at the type level.
 */

/**
 * @typedef {import('./options').NormalisedOptions} NormalisedOptions
 */

/**
 * @typedef {object} TagLink
 * @property {string} name  tag display name
 * @property {string} url   root-aware tag URL
 */

/**
 * @param {NormalisedOptions} opts
 * @param {TagLink[]} [tags]  only used in inject mode, where no template
 *   renders `tagcloud()` into the canvas
 * @returns {string} the bootstrap `tagcloud.js` source
 */
function renderTagCloudJs(opts, tags) {
  const textFont        = JSON.stringify(String(opts.textFont));
  const textColour      = JSON.stringify(String(opts.textColour));
  const outlineColour   = JSON.stringify(String(opts.outlineColour));
  const textHeight      = Number(opts.textHeight);
  const maxSpeed        = Number(opts.maxSpeed);
  const pauseOnSelected = Boolean(opts.pauseOnSelected);

  // Inject mode builds the canvas from data, with DOM APIs only (no
  // innerHTML), so tag names never reach an HTML parser.
  const mountJs = opts.inject
    ? (
      '    if (!document.getElementById(\'resCanvas\')) {\n' +
      '        var tags = ' + JSON.stringify(tags || []) + ';\n' +
      '        var selectors = ' + JSON.stringify(String(opts.mount).split(',')
        .map(function (sel) { return sel.trim(); })
        .filter(Boolean)) + ';\n' +
      '        var mount = null;\n' +
      '        for (var i = 0; i < selectors.length && !mount; i++) {\n' +
      '            try { mount = document.querySelector(selectors[i]); } catch (e) { mount = null; }\n' +
      '        }\n' +
      '        if (!mount || !tags.length) return;\n' +
      '        var container = document.createElement(\'div\');\n' +
      '        container.id = \'myCanvasContainer\';\n' +
      '        container.className = \'widget tagcloud hexo-tag-cloud\';\n' +
      '        var canvas = document.createElement(\'canvas\');\n' +
      '        canvas.id = \'resCanvas\';\n' +
      '        canvas.width = 250;\n' +
      '        canvas.height = 250;\n' +
      '        canvas.style.width = \'100%\';\n' +
      '        for (var j = 0; j < tags.length; j++) {\n' +
      '            var a = document.createElement(\'a\');\n' +
      '            a.href = tags[j].url;\n' +
      '            a.textContent = tags[j].name;\n' +
      '            canvas.appendChild(a);\n' +
      '        }\n' +
      '        container.appendChild(canvas);\n' +
      '        mount.appendChild(container);\n' +
      '    }\n'
    )
    : '';

  return (
    '(function () {\n' +
    'function start() {\n' +
    mountJs +
    "    if (!document.getElementById('resCanvas') || typeof TagCanvas === 'undefined') return;\n" +
    '    try {\n' +
    '        TagCanvas.textFont = '        + textFont        + ';\n' +
    '        TagCanvas.textColour = '      + textColour      + ';\n' +
    '        TagCanvas.textHeight = '      + textHeight      + ';\n' +
    '        TagCanvas.outlineColour = '   + outlineColour   + ';\n' +
    '        TagCanvas.maxSpeed = '        + maxSpeed        + ';\n' +
    '        TagCanvas.freezeActive = '    + pauseOnSelected + ';\n' +
    "        TagCanvas.outlineMethod = 'block';\n" +
    '        TagCanvas.minBrightness = 0.2;\n' +
    '        TagCanvas.depth = 0.92;\n' +
    '        TagCanvas.pulsateTo = 0.6;\n' +
    '        TagCanvas.initial = [0.1, -0.1];\n' +
    '        TagCanvas.decel = 0.98;\n' +
    '        TagCanvas.reverse = true;\n' +
    '        TagCanvas.hideTags = false;\n' +
    "        TagCanvas.shadow = '#ccf';\n" +
    '        TagCanvas.shadowBlur = 3;\n' +
    '        TagCanvas.weight = false;\n' +
    '        TagCanvas.imageScale = null;\n' +
    '        TagCanvas.fadeIn = 1000;\n' +
    '        TagCanvas.clickToFront = 600;\n' +
    '        TagCanvas.lock = false;\n' +
    "        TagCanvas.Start('resCanvas');\n" +
    "        TagCanvas.tc['resCanvas'].Wheel(true);\n" +
    '    } catch (e) {\n' +
    "        var container = document.getElementById('myCanvasContainer');\n" +
    "        if (container) container.style.display = 'none';\n" +
    '    }\n' +
    '}\n' +
    "if (document.readyState === 'complete') {\n" +
    '    start();\n' +
    '} else {\n' +
    "    window.addEventListener('load', start);\n" +
    '}\n' +
    '})();\n'
  );
}

module.exports = { renderTagCloudJs };
