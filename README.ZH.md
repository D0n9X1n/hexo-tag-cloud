# Hexo Tag Cloud

[![Tests](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/test.yml/badge.svg?branch=master)](https://github.com/D0n9X1n/hexo-tag-cloud/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/hexo-tag-cloud.svg)](https://www.npmjs.com/package/hexo-tag-cloud)
[![npm downloads](https://img.shields.io/npm/dm/hexo-tag-cloud.svg)](https://www.npmjs.com/package/hexo-tag-cloud)
[![License: MIT](https://img.shields.io/npm/l/hexo-tag-cloud.svg)](./LICENSE)

[English ReadMe](./README.md)

Hexo 标签云插件

## 效果图
![TagCloud](./img/example.png)

## 在线 Demo

在线演示：<https://d0n9x1n.github.io/hexo-tag-cloud/> —— 由
[`demo/`](./demo/) 自动构建，部署工作流见
`.github/workflows/deploy-demo.yml`。

## AI 辅助安装

把 tag cloud 加到任何 Hexo 主题（landscape、next、butterfly、icarus、
fluid，或通过 generic 兜底加到自定义主题）的最快方式。

### 一键安装 CLI（任何 shell）

在 Hexo 站点根目录：

```bash
# 预演：打印将要写入的 diff，不修改任何文件。
npx hexo-tag-cloud install

# 正式应用：把带 <!-- hexo-tag-cloud:begin/end --> 标记的代码块写入
# 当前主题的侧边栏 / widget 模板。
npx hexo-tag-cloud install --apply

# 重复运行是幂等的。如果你手动改过托管块，CLI 退出码 2 并打印 diff；
# 用 --apply --force 可强制覆盖你的改动并恢复默认。
```

可用参数：

| 参数 | 默认 | 用途 |
|---|---|---|
| `--theme <name>` | 从 `_config.yml` 自动检测 | landscape / next / butterfly / icarus / fluid / generic |
| `--theme-dir <path>` | `<cwd>/themes/<theme>` | 用于以 npm 包方式安装的主题 (`hexo-theme-<name>`) |
| `--canvas-width <px>` | `500` | 画布宽度 |
| `--canvas-height <px>` | `400` | 画布高度 |
| `--canvas-style <css>` | `margin: 0 auto;` | 内联样式 |

退出码：`0` 成功 / 预演；`1` 主题检测失败；`2` 托管块被修改冲突
（`--force` 可覆盖）；`3` 发现遗留手工安装片段（请先手动清除）；
`4` 写入冲突。

### Claude skill（给 AI 代理）

如果你使用 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
或任何会扫描 `~/.claude/skills/` 的代理运行时，可以安装内置 skill。
代理在调用前会先做 dry-run 并向用户确认，再执行 `--apply`：

```bash
npx hexo-tag-cloud install-skill           # → ~/.claude/skills/hexo-tag-cloud/
npx hexo-tag-cloud install-skill --dry-run # 预演，不写入
npx hexo-tag-cloud install-skill --target ~/.config/agent/skills/
```

安装完成后请重启你的 AI 代理以加载新 skill。

如果你偏好手工操作，下方按引擎分类的说明仍然有效 — CLI 只是把它
们自动化了。

## 如何使用
#### 安装
+ 进入到 hexo 的根目录，然后在 `package.json` 中添加依赖: `"hexo-tag-cloud": "^3.0.0"`
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

## Wiki / 长文档

完整文档见仓内 [`wiki/`](./wiki/Home.md):
[Installation](./wiki/Installation.md) ·
[Customization](./wiki/Customization.md) ·
[Troubleshooting](./wiki/Troubleshooting.md) ·
[AI-Skill-Usage](./wiki/AI-Skill-Usage.md) ·
[Contributing](./wiki/Contributing.md).

## 更新日志

参见 [`CHANGELOG.md`](./CHANGELOG.md)。从 2.x 升级请阅读
[`docs/migration-2.x-to-3.x.md`](./docs/migration-2.x-to-3.x.md)。
