#Hexo Tag Cloud

[![npm version](https://badge.fury.io/js/hexo-tag-cloud.svg)](https://badge.fury.io/js/hexo-tag-cloud)

Tag Cloud for Hexo.



##How it looks like
![TagCloud](http://chuantu.biz/t2/33/1458566883x1822613129.png)

And you can see online live demo by clicking [here](http://mikecoder.github.io)

##How to use
+ go into your hexo system folder, and add depandence `"hexo-tag-cloud": "1.0.*"` to `package.json`
+ then do *npm install* command
+ then you need to change your theme layout file
+ for example, in its default theme landscape, we should find `hexo/themes/landscape/layout/_widget/tagcloud.ejs`
+ then we change the file to the following code:
```
<% if (site.tags.length){ %>
  <div class="widget-wrap">
    <h3 class="widget-title"><%= __('tagcloud') %></h3>
    <div class="widget tagcloud">
        <embed tplayername="SWF" splayername="SWF"
            type="application/x-shockwave-flash" src="tagcloud.swf"
            mediawrapchecked="true" pluginspage="http://www.macromedia.com/go/getflashplayer"
            id="tagcloudflash" name="tagcloudflash" bgcolor="#f3f3f3"
            quality="high" wmode="transparent" allowscriptaccess="always"
            flashvars="tcolor=0xbd1016&amp;tcolor2=0x808080&amp;hicolor=0x0065ff&amp;tspeed=100&amp;distr=true"
            height="100%" width="100%">
        </embed>
    </div>
  </div>
<% } %>
```
+ then we have finished the plugin install and configuration. And you can write and deploy as usual, it will create tagcloud auto. Enjoy your hexo.

##Troubleshooting
Submit issue please


