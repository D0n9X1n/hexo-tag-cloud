#Hexo Tag Cloud

[![npm version](https://badge.fury.io/js/hexo-tag-cloud.svg)](https://badge.fury.io/js/hexo-tag-cloud)
[中文说明版本](https://github.com/MikeCoder/hexo-tag-cloud/blob/master/README.ZH.md)

Tag Cloud for Hexo

##How it looks like
![TagCloud](./img/example.jpg)

And you can see online live demo by clicking [here](http://mikecoder.github.io)

##How to use
+ go into your hexo system folder, and add depandence `"hexo-tag-cloud": "2.0.*"` to `package.json`
+ then do *npm install* command
+ then you need to change your theme layout file
+ for example, in its default theme landscape, we should find `hexo/themes/landscape/layout/_widget/tagcloud.ejs`
+ then we change the file to the following code:
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
+ then we have finished the plugin install and configuration. And you can write and deploy as usual, it will create tagcloud auto. Enjoy your hexo.

##Troubleshooting
Submit issue please

##TODO
See [Todo.md](./TODO.md)

##Customize
Will support next version

#Thanks
+ **[TagCanvas](http://www.goat1000.com/tagcanvas.php)**
