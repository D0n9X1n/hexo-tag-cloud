# 安装

[English](Installation) · **简体中文**

所有安装方式都从安装 npm 包开始，之后再选择把标签云画布放进页面的方式。下面三种方式中，
总有一种适用于你的 Hexo 主题。

| 方式 | 是否修改主题文件？ | 适用范围 |
|---|---|---|
| [A. 内置配方](#a-内置配方) | 是（一个受管代码块） | landscape、NexT、Butterfly、Fluid |
| [B. 任意模板（`--target`）](#b-任意模板--target) | 是（一个受管代码块） | 任意 EJS / Nunjucks / Swig / Pug / Jade 主题 |
| [C. 注入模式](#c-注入模式不修改模板) | **否** | 所有主题，包括 JSX 主题（Icarus）和通过 npm 安装的主题 |

想让 Claude Code 代劳？安装 [Claude Code skill](AI-Skill-Usage-zh-CN) 即可。
它会执行同样的步骤，并在写入任何内容前征求你的同意。

## 前置条件

- Node.js ≥ 18
- Hexo ≥ 5
- 一个 Hexo 站点（包含 `_config.yml` 的目录）

## 1. 安装 npm 包

```bash
npm install hexo-tag-cloud --save
```

这一步必不可少。插件的 `after_generate` 过滤器会在每次构建时写入
`public/js/tagcanvas.js` 和 `public/js/tagcloud.js`。
`npx hexo-tag-cloud install` 只负责修改模板，**不会**安装插件；
如果插件未安装，它会打印一条警告。

## 2. 检查站点（可选）

```bash
npx hexo-tag-cloud inspect
```

该命令会输出一段 JSON，内容包括：当前启用的主题、主题目录、主题是否位于
`node_modules` 中、主题的内置配方（如果有），以及按“像侧边栏或小部件的可能性”
排序的主题模板列表。

## A. 内置配方

```bash
npx hexo-tag-cloud install          # 预览（dry run）：打印 diff，不写入任何内容
npx hexo-tag-cloud install --apply  # 写入修改
```

| 主题 | 模板（相对于主题目录） | 插入位置 |
|---|---|---|
| landscape | `layout/_partial/sidebar.ejs` | `</aside>` 之前 |
| next | `layout/_macro/sidebar.njk` | `</aside>` 之前 |
| butterfly | `layout/includes/widget/card_tags.pug` | 追加到末尾 |
| fluid | `layout/tags.ejs`（即 `/tags/` 页面） | 追加到末尾 |

主题名从 `_config.yml` 中读取。安装器会先在 `themes/<name>` 中查找主题，
再到 `node_modules/hexo-theme-<name>` 中查找。可以用 `--theme <name>` 或
`--theme-dir <path>` 覆盖其中任一值。

## B. 任意模板（`--target`）

从 `inspect` 的输出中选择一个模板：

```bash
npx hexo-tag-cloud install --target layout/_partial/sidebar.ejs --before "</aside>"
npx hexo-tag-cloud install --target layout/_partial/sidebar.ejs --before "</aside>" --apply
```

- `--target` 的路径相对于主题目录解析。模板引擎根据扩展名推断
  （`.ejs`、`.njk`、`.swig`、`.pug`、`.jade`）。
- `--before <text>` 会把代码块插入到**最后一个**包含 `<text>` 的行之前。
  不指定时，代码块会追加到文件末尾。
- 安装器绝不会删除或改写标记之外的内容。

## C. 注入模式（不修改模板）

```yaml
# _config.yml
tag_cloud:
  inject: true
  # mount: '#sidebar'   # 可选：CSS 选择器，以逗号分隔，取第一个匹配
```

Hexo 的 [injector](https://hexo.io/api/injector) 会把两个脚本添加到每个页面。
标签列表（标签名以及考虑了 `root` 的 URL）会写入 `js/tagcloud.js`，标签云则挂载到
第一个匹配 `mount` 的元素中。默认的选择器列表覆盖了 landscape、NexT、Butterfly、
Icarus 和 Fluid 的侧边栏，找不到时再回退到 `aside` 和 `footer`。如果某个页面
已经有来自方式 A 或 B 的 `#resCanvas`，注入模式不会处理该页面。

## 受管代码块的内容

```ejs
<!-- hexo-tag-cloud:begin -->
<% if (site.tags.length) { %>
<div id="myCanvasContainer" class="widget-wrap tagcloud">
  <canvas id="resCanvas" width="250" height="250" style="width: 100%;">
    <%- tagcloud() %>
  </canvas>
</div>
<script src="<%- url_for('/js/tagcanvas.js') %>"></script>
<script src="<%- url_for('/js/tagcloud.js') %>"></script>
<% } %>
<!-- hexo-tag-cloud:end -->
```

Nunjucks 和 Pug 版本的代码块与此等价。`tagcloud()` 提供 TagCanvas 读取的链接；
画布为空时什么也不会绘制。`url_for()` 保证部署在子路径下（`root: /blog/`）的站点
也能正常工作。可以用 `--canvas-width`、`--canvas-height` 和 `--canvas-style`
调整尺寸。

## 重复执行与升级

- 如果代码块没有变化，重复执行会以退出码 0 结束，不写入任何内容。
- 如果你手动修改过代码块，重复执行会以退出码 **2** 结束并打印 diff。
  加上 `--apply --force` 可以覆盖你的修改。
- 如果存在没有标记的手写标签云，重复执行会以退出码 **3** 结束。
  请删除它，或者保留它并跳过安装器。

## 构建

```bash
npx hexo clean && npx hexo generate
```

构建完成后，`public/js/tagcloud.js` 和 `public/js/tagcanvas.js` 会生成出来。使用方式 A 和 B 时，
生成的页面中包含 `<canvas id="resCanvas">`，其中带有 `<a>` 链接。

## 下一步

- 调整外观：[自定义](Customization-zh-CN)
- 修复空白标签云或其他问题：[故障排查](Troubleshooting-zh-CN)
- 从 2.x 升级：[迁移：v2 → v3](Migration-v2-to-v3-zh-CN)
