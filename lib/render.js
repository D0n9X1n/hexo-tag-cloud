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
 * @param {NormalisedOptions} opts
 * @returns {string} the bootstrap `tagcloud.js` source
 */
function renderTagCloudJs(opts) {
  const textFont        = JSON.stringify(String(opts.textFont));
  const textColour      = JSON.stringify(String(opts.textColour));
  const outlineColour   = JSON.stringify(String(opts.outlineColour));
  const textHeight      = Number(opts.textHeight);
  const maxSpeed        = Number(opts.maxSpeed);
  const pauseOnSelected = Boolean(opts.pauseOnSelected);

  return (
    'function addLoadEvent(func) {\n' +
    '    var oldonload = window.onload;\n' +
    "    if (typeof window.onload != 'function') {\n" +
    '        window.onload = func;\n' +
    '    } else {\n' +
    '        window.onload = function() {\n' +
    '            oldonload();\n' +
    '            func();\n' +
    '        };\n' +
    '    }\n' +
    '}\n' +
    '\n' +
    'addLoadEvent(function() {\n' +
    "    console.log('tag cloud plugin rock and roll!');\n" +
    '\n' +
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
    '        console.log(e);\n' +
    "        document.getElementById('myCanvasContainer').style.display = 'none';\n" +
    '    }\n' +
    '});\n'
  );
}

module.exports = { renderTagCloudJs };
