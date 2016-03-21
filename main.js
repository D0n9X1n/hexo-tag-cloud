'use strict';

var util = require('hexo-util');
var fs = require('hexo-fs');
var pathFn = require('path');
var Hexo = require('hexo');

hexo.on('exit', function(post) {
    fs.listDir(pathFn.join(hexo.public_dir, 'tags')).then(function(files) {
        var tags = {}
        for (var idx in files) {
            var tagName = files[idx].substr(0, files[idx].indexOf('/'));
            if (tags[tagName]) {
                tags[tagName] = tags[tagName] + 1;
            } else {
                tags[tagName] = 1;
            }
        }
        var content = '<tags>';
        for(var tag in tags){
            if(tags.hasOwnProperty(tag)) {
                var fontSize = tags[tag] > 10 ? 20 : tags[tag] + 8;
                content += '<a href="'+hexo.config.url+'/tags/'+tag+'" class="tag-link-'+tag+'" title="'+tags[tag]+' topics" rel="tag" style="font-size:'+fontSize+'pt;">'+tag+'</a>';
            }
        }
        content += '</tags>';
        fs.writeFile(pathFn.join(hexo.public_dir, 'tagcloud.xml'), content);

        var cloudPath = pathFn.join(pathFn.join(pathFn.join(hexo.base_dir, 'node_modules'), 'hexo-tag-cloud'), 'tagcloud.swf');
        fs.exists(pathFn.join(hexo.public_dir, 'tagcloud.swf')).then(function (res) {
            if (!res) {
                fs.readFile(cloudPath).then(function(content) {
                    console.log(res);
                    console.log(content.length);
                    fs.copyFile(cloudPath, pathFn.join(hexo.public_dir, 'tagcloud.swf'));
                });
            }
        })
    });
});
