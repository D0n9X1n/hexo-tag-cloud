#Hexo Tag Cloud

[![npm version](https://badge.fury.io/js/hexo-tag-cloud.svg)](https://badge.fury.io/js/hexo-tag-cloud)
[English Version ReadMe](https://github.com/MikeCoder/hexo-tag-cloud/blob/master/README.md)

Hexo 标签云插件

##效果图
![TagCloud](./img/example.jpg)

这里是[效果预览站点](http://mikecoder.github.io)

##如何使用
+ 进入到 hexo 的根目录，然后在 `package.json` 中添加依赖: `"hexo-tag-cloud": "2.0.*"`
+ 然后执行 `npm install` 命令
+ 然后需要你去修改主题的 tagcloud 的模板
+ 这里以默认主题 landscape 为例，tagcloud 模板文件为 `hexo/themes/landscape/layout/_widget/tagcloud.ejs`
+ 然后将这个文件修改为如下内容：
```
<% if (site.tags.length){ %>
    <div class="widget-wrap">
        <h3 class="widget-title"><%= __('tagcloud') %></h3>
        <div id="myCanvasContainer" class="widget tagcloud">
            <canvas width="250" height="250" id="resCanvas" style="width=100%">
                <%- tagcloud() %>
            </canvas>
        </div>
    </div>
<% } %>
```
+ 完成安装和显示，可以通过 hexo g && hexo s 来进行本地预览

##Troubleshooting
提交 issue 和截图以及 log

##TODO
看 [Todo.md](./TODO.md)

##自定义
将会在下一版本支持

##致谢
+ **[TagCanvas](http://www.goat1000.com/tagcanvas.php)**
