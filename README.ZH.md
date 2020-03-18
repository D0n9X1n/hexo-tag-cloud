# Hexo Tag Cloud

[![npm version](https://badge.fury.io/js/hexo-tag-cloud.svg)](https://badge.fury.io/js/hexo-tag-cloud)
[![Build Status](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/badges/build.png?b=master)](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/build-status/master)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/?branch=master)

[English Version ReadMe](https://github.com/MikeCoder/hexo-tag-cloud/blob/master/README.md)

Hexo 标签云插件

## 效果图
![TagCloud](./img/example.png)

这里是[效果预览站点](https://mhexo.github.io/archives/)

## 如何使用
#### 安装
+ 进入到 hexo 的根目录，然后在 `package.json` 中添加依赖: `"hexo-tag-cloud": "2.1.*"`
+ 然后执行 `npm install` 命令
+ 然后需要你去修改主题的 tagcloud 的模板，这个依据你的主题而定。

#### 对于 ejs 的用户
+ 这里以默认主题 landscape 为例。
+ tagcloud 模板文件为 `hexo/themes/landscape/layout/_widget/tagcloud.ejs`
+ 将这个文件修改为如下内容：
```
<% if (site.tags.length) { %>
  <script type="text/javascript" charset="utf-8" src="<%- url_for('/js/tagcloud.js') %>"></script>
  <script type="text/javascript" charset="utf-8" src="<%- url_for('/js/tagcanvas.js') %>"></script>
  <div class="widget-wrap">
    <h3 class="widget-title"><%= __('tagcloud') %></h3>
    <div id="myCanvasContainer" class="widget tagcloud">
      <canvas width="250" height="250" id="resCanvas" style="width:100%">
        <%- tagcloud() %>
      </canvas>
    </div>
  </div>
<% } %>
```
如果你使用的是 [icarus](https://github.com/ppoffice/hexo-theme-icarus) 主题, 请查阅 [Issue #31](https://github.com/MikeCoder/hexo-tag-cloud/issues/31).

#### 对于 swig 用户
+ 这里以 Next 主题为例。
+ 找到文件 `next/layout/_macro/sidebar.swig`, 然后添加如下内容。
```
{% if site.tags.length > 1 %}
<script type="text/javascript" charset="utf-8" src="{{ url_for('/js/tagcloud.js') }}"></script>
<script type="text/javascript" charset="utf-8" src="{{ url_for('/js/tagcanvas.js') }}"></script>
<div class="widget-wrap">
    <h3 class="widget-title">Tag Cloud</h3>
    <div id="myCanvasContainer" class="widget tagcloud">
        <canvas width="250" height="250" id="resCanvas" style="width:100%">
            {{ list_tags() }}
        </canvas>
    </div>
</div>
{% endif %}
```

#### 对于 jade 用户
+ 这里以 Apollo 主题为例
+ 找到 `apollo/layout/archive.jade` 文件，并且把 container 代码块修改为如下内容:
```
block container
    include mixins/post
    .archive
        h2(class='archive-year')= 'Tag Cloud'
        script(type='text/javascript', charset='utf-8', src=url_for("/js/tagcloud.js"))
        script(type='text/javascript', charset='utf-8', src=url_for("/js/tagcanvas.js"))

        #myCanvasContainer.widget.tagcloud(align='center')
            canvas#resCanvas(width='500', height='500', style='width:100%')
                !=tagcloud()
            !=tagcloud()
    +postList()
```

#### 对于 pug 用户

+ 这里以 Butterfly 主题为例
+ 找到 `Butterfly/layout/includes/widget/card_tags.pug` 文件
+ 将这个文件修改为如下内容(注意缩进):

```
if site.tags.length
  .card-widget.card-tags
    .card-content
      .item-headline
        i.fa.fa-tags(aria-hidden="true")
        span= _p('aside.card_tags')
        script(type="text/javascript" charset="utf-8" src="/js/tagcloud.js")
        script(type="text/javascript" charset="utf-8" src="/js/tagcanvas.js")
        #myCanvasContainer.widget.tagcloud(align='center')
          canvas#resCanvas(width='200', height='200', style='width=100%')
            != tagcloud()
          != tagcloud({min_font: 16, max_font: 24, amount: 50, color: true, start_color: '#999', end_color: '#99a9bf'})
```

#### 最后一步

+ 完成安装和显示，可以通过 `hexo clean && hexo g && hexo s` 来进行本地预览, hexo clean 为必须选项。
+ **PS:不要使用 `hexo g -d 或者 hexo d -g` 这类组合命令。**详情见: [Issue 7](https://github.com/MikeCoder/hexo-tag-cloud/issues/7)

## Troubleshooting
提交 issue 和截图以及 log

## 自定义
现在 hexo-tag-cloud 插件支持自定义啦。非常简单的步骤就可以改变你的标签云的字体和颜色，还有突出高亮。

+ 在你的博客根目录，找到 *_config.yml* 文件然后添加如下的配置项:

```
# hexo-tag-cloud
tag_cloud:
    textFont: Trebuchet MS, Helvetica
    textColor: '#333'
    textHeight: 25
    outlineColor: '#E2E1D1'
    maxSpeed: 0.5
    pauseOnSelected: false # true 意味着当选中对应 tag 时,停止转动
```
+ 然后使用 `hexo c && hexo g && hexo s` 来享受属于你自己的独一无二的标签云吧。

## 致谢
+ **[TagCanvas](http://www.goat1000.com/tagcanvas.php)**
