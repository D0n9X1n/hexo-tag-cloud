# Hexo Tag Cloud

![GitHub release (latest SemVer including pre-releases)](https://img.shields.io/github/v/release/D0n9x1n/hexo-tag-cloud?include_prereleases)
[![Build Status](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/badges/build.png?b=master)](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/build-status/master)
[![Scrutinizer Code Quality](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/badges/quality-score.png?b=master)](https://scrutinizer-ci.com/g/MikeCoder/hexo-tag-cloud/?branch=master)

[English ReadMe](https://github.com/MikeCoder/hexo-tag-cloud/blob/master/README.md)

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

### `&#NN;`(如 `&#43;` 而非 `+`)出现在画布上
原生 TagCanvas v2.9 将标签文本作为 DOM 字面字符串读取，而原生 hexo 的 `tagcloud()` 助手输出的 HTML 实体由浏览器正确解码。如果在画布上看到字面的实体码，是你的 hexo 构建链在 TagCanvas 读取之前双重转义了 `<a>` 文本内容——最常见的原因是通过 cheerio 重新序列化生成 HTML 的插件（`hexo-asset-image`、自定义 HTML 后处理器等）。请审查你的 hexo 插件列表中接触 `<a>` 文本的项；v3 在 `tests/e2e/smoke.spec.js` 中固化了字面文本往返回归测试作为上游行为的证据。

### 其他问题
请提交 issue，并附上你的 `npm list`、`_config.yml`，以及 `hexo generate` 之后 `public/js/tagcloud.js` 的内容。

## 自定义
现在 hexo-tag-cloud 插件支持自定义啦。非常简单的步骤就可以改变你的标签云的字体和颜色，还有突出高亮。

+ 在你的博客根目录，找到 *_config.yml* 文件然后添加如下的配置项:

```yaml
# hexo-tag-cloud
tag_cloud:
    textFont: Trebuchet MS, Helvetica   # v3+ 会为任意单字体值自动追加 CJK 回退族
    textColor: '#333'
    textHeight: 25
    outlineColor: '#E2E1D1'
    maxSpeed: 0.5
    pauseOnSelected: false # true 意味着当选中对应 tag 时,停止转动
```
+ 然后使用 `hexo c && hexo g && hexo s` 来享受属于你自己的独一无二的标签云吧。

### 非 ASCII 标签（中文/日文/韩文/西里尔字母等）
v3.0.0 起，中文 / 日文 / 韩文 / 西里尔字母及其他非拉丁字符的标签默认即可正确渲染。默认 `textFont`（以及你提供的任何单字体值）会自动追加跨平台 CJK 回退族（PingFang SC、Hiragino Sans GB、Microsoft YaHei、Source Han Sans CN、Noto Sans CJK SC、sans-serif），主字体缺失的字形会向后一族回退，而不是显示为 `□`。如果你提供多字体值（例如 `'Comic Sans MS, sans-serif'`），系统会原样保留你的值。

## 致谢
+ **[TagCanvas](http://www.goat1000.com/tagcanvas.php)**
