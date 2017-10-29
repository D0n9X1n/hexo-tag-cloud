// Copyright © 2016 TangDongxin

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

var fs = require('hexo-fs');
var pathFn = require('path');
var Hexo = require('hexo');
var log = require('hexo-log')({
    debug: false,
    silent: false
});


hexo.extend.filter.register('after_generate', function(post) {
    // when using hexo s directly the public folder will not be created
    // so the folder can't be used as the flag to mark whether the user
    // use the tags.
    // TODO: find another flag
    // if (!fs.existsSync(pathFn.join(hexo.public_dir, 'tags'))) {
        // return;
    // }
    var libPath = pathFn.join(pathFn.join(pathFn.join(hexo.base_dir, 'node_modules'), 'hexo-tag-cloud'), 'lib');

    var tagcanvasPubPath = pathFn.join(pathFn.join(hexo.public_dir, 'js'), 'tagcanvas.js');
    var tagcloudPubPath  = pathFn.join(pathFn.join(hexo.public_dir, 'js'), 'tagcloud.js');

    log.info("---- START COPYING TAG CLOUD FILES ----")
    fs.copyFile(pathFn.join(libPath, 'tagcanvas.js'), tagcanvasPubPath);

    var tagCloudJsContent = "function addLoadEvent(func) {"
                                + "var oldonload = window.onload;"
                                + "if (typeof window.onload != 'function') {"
                                    + "window.onload = func;"
                                + "} else {"
                                    + "window.onload = function() {"
                                        + "oldonload();"
                                        + "func();"
                                    + "}"
                                + "}"
                            + "}"
                            + "addLoadEvent(function() {"
                                + "console.log('tag cloud plugin rock and roll!');"
                                + " try {"
                                    + " TagCanvas.textFont = " + (!(hexo.config.tag_cloud && hexo.config.tag_cloud.textFont) ? "'Trebuchet MS, Helvetica, sans-serif';" : "'" + hexo.config.tag_cloud.textFont + "';")
                                    + " TagCanvas.textColour = " + (!(hexo.config.tag_cloud && hexo.config.tag_cloud.textColour) ? "'#333';" : "'" + hexo.config.tag_cloud.textColour + "';")
                                    + " TagCanvas.textHeight = " + (!(hexo.config.tag_cloud && hexo.config.tag_cloud.textHeight) ? "15;" : hexo.config.tag_cloud.textHeight + ";")
                                    + " TagCanvas.outlineColour = " + (!(hexo.config.tag_cloud && hexo.config.tag_cloud.outlineColour) ? "'#E2E1C1';" : "'" + hexo.config.tag_cloud.outlineColour + "';")
                                    + " TagCanvas.outlineMethod = 'block';"
                                    + " TagCanvas.maxSpeed = 0.03;"
                                    + " TagCanvas.minBrightness = 0.2;"
                                    + " TagCanvas.depth = 0.92;"
                                    + " TagCanvas.pulsateTo = 0.6;"
                                    + " TagCanvas.initial = [0.1,-0.1];"
                                    + " TagCanvas.decel = 0.98;"
                                    + " TagCanvas.reverse = true;"
                                    + " TagCanvas.hideTags = false;"
                                    + " TagCanvas.shadow = '#ccf';"
                                    + " TagCanvas.shadowBlur = 3;"
                                    + " TagCanvas.weight = false;"
                                    + " TagCanvas.imageScale = null;"
                                    + " TagCanvas.fadeIn = 1000;"
                                    + " TagCanvas.clickToFront = 600;"
                                    + " TagCanvas.Start('resCanvas');"
                                    + " TagCanvas.tc['resCanvas'].Wheel(false)"
                                + "} catch(e) {"
                                    + " console.log(e);"
                                    + " document.getElementById('myCanvasContainer').style.display = 'none';"
                                + " }"
                            + " });";
    fs.writeFile(tagcloudPubPath, tagCloudJsContent);
    log.info("---- END COPYING TAG CLOUD FILES ----")
});

