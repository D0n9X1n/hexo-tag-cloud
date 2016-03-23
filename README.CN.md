#Hexo Tag Cloud

[![npm version](https://badge.fury.io/js/hexo-tag-cloud.svg)](https://badge.fury.io/js/hexo-tag-cloud)
[中文说明版本](./README.CN.md)

####使用方法

+ 在 hexo 博客的根目录找到 package.json 这个文件夹，添加如下的依赖:
```
{
    "name": "hexo-site",
    "version": "0.0.0",
    "private": true,
    "hexo": {
        "version": "3.2.0"
    },
    "dependencies": {
        "hexo": "^3.2.0",
        "hexo-deployer-git": "^0.1.0",
        "hexo-generator-archive": "^0.1.4",
        "hexo-generator-category": "^0.1.3",
        "hexo-generator-index": "^0.2.0",
        "hexo-generator-tag": "^0.2.0",
        "hexo-renderer-ejs": "^0.2.0",
        "hexo-renderer-marked": "^0.2.10",
        "hexo-renderer-stylus": "^0.3.1",
        "hexo-server": "^0.2.0",
        "hexo-tag-cloud": "1.0.*" // 就是这句
    }
}
```
+ 执行 **npm install**
+ 然后可以试着执行 **hexo g** 重新生成静态文件，这时候可以看一下 *public* 目录下是否有 tagcloud.xml 和 tagcloud.swf 这两个文件。如果有，则表示插件运行正常。
+ 如果上一步发生问题，请在 github 上提交 issue 并且附上 error log。 提交地址:[GITHUB ISSUE](https://github.com/MikeCoder/hexo-tag-cloud/issues)
+ 然后运行 **hexo s**, 查看 http://localhost:4000/tagcloud.swf 是否可以看到标签云。如果不可以，请查看 tagcloud.xml 是否有内容。
+ 最后，就是将系统原有的 tagcloud 换成新版的 tagcloud.这边以官方自带的 landscape 主题为例。
+ 找到 *hexo/themes/landscape/layout/_widget/tagcloud.ejs* 这个文件，将里面的内容修改为:
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
+ 最后再次执行 **hexo g && hexo s**, 查看首页是否已经替换成功。
+ 好好享受新版的 tagcloud 还有 hexo 吧。
+ **最重要的，请不要使用中文作为 tag，会存在编码问题**

####效果展示
1. 这边首先上一个图片效果图:
> ![TagCloud](http://chuantu.biz/t2/33/1458566883x1822613129.png)

2. 然后就是一个 Live Demo:
> 请点击这个链接:[mikecoder.github.io](http://mikecoder.github.io)

####自定义
如果你想修改标签的背景和字体颜色，请注意看这里:
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
            flashvars="tcolor=0x2CA6CB&amp;tcolor2=0x808080&amp;hicolor=0x1A4666&amp;tspeed=100&amp;distr=true"
            height="100%" width="100%">
        </embed>
    </div>
  </div>
<% } %>
```
bgcolor: 这就是背景色的颜色
我们可以修改 flashvars 来修改字体颜色
+ tcolor: 标签基本颜色, 用 0xffffff 而不是 #ffffff or ffffff
+ tcolor2: 标签的渐变色
+ hicolor: 标签的高亮色
+ tspeed: 标签云转速
+ distr: 背景是否透明

