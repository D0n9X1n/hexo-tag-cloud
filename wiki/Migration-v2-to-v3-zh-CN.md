# 从 hexo-tag-cloud 2.x 迁移到 3.x

[English](Migration-v2-to-v3) · **简体中文**

## 简而言之

```bash
npm install hexo-tag-cloud@^3 --save
npx hexo-tag-cloud install          # 预览
npx hexo-tag-cloud install --apply  # 写入
```

现有的 `tag_cloud:` 配置无需任何修改即可继续使用，主题里手写的 2.x 代码片段也照常有效。
安装器是可选的：它会用一段受管代码块替换你手动做的修改，方便以后升级。

## 环境要求

- Hexo `>= 5`（2.x 支持 Hexo 4）。
- Node.js `>= 18`。

## 为什么是大版本升级

3.0 保留了 `tag_cloud:` 的各项配置，但新增了公开接口：`npx hexo-tag-cloud` 命令行工具和随包附带的
Claude Code skill。同时，所有内部模块都已重写。如果你的代码 `require` 了旧版 `index.js`
的私有内部实现，升级后将无法运行。

各版本的更新说明见 [GitHub Releases](https://github.com/D0n9X1n/hexo-tag-cloud/releases)。

## 升级步骤

### 1. 更新依赖

```bash
npm install hexo-tag-cloud@^3 --save
```

### 2. 检查现有配置

构建并打开站点：

```bash
npx hexo clean && npx hexo generate && npx hexo server
```

如果 2.x 的代码片段能正常渲染出标签云，到这一步就可以结束了。

### 3. 可选：改用安装器

如果目标模板中存在手写的代码片段（一个 `resCanvas` canvas，加上 `tagcloud.js` 或
`tagcanvas.js` 脚本），安装器会拒绝执行，并以退出码 `3` 退出。请先删除这段代码，然后运行：

```bash
npx hexo-tag-cloud install          # 打印 diff
npx hexo-tag-cloud install --apply  # 写入修改
```

如果主题没有内置配方，可以用 `--target <template>` 指定模板，或设置
`tag_cloud.inject: true`，完全不修改模板。详见[安装](Installation-zh-CN)。

## 受管代码块标记

安装器写入的所有内容都位于以下标记之间：

```ejs
<!-- hexo-tag-cloud:begin -->
...
<!-- hexo-tag-cloud:end -->
```

Pug 模板使用 `//- hexo-tag-cloud:begin` 和 `//- hexo-tag-cloud:end`。
标记之外的内容永远不会被改动。如果标记内的内容与安装器将要写入的内容不一致，重新运行时会以退出码
`2` 退出并打印 diff；使用 `--apply --force` 可将其替换。

## 从 3.0 升级到 3.1

- 3.0 安装器写入的代码块只会绘制出空白的 canvas，并且使用了硬编码的 `/js/` 路径。
  请重新运行 `npx hexo-tag-cloud install --apply --force` 来替换它们。
- `generic` 和 `icarus` 配方已移除，请改用 `--target` 或注入模式。
- 浏览器端的启动脚本不再替换 `window.onload`，也不再向控制台输出日志。
- skill 不再附带辅助脚本。可运行 `npx hexo-tag-cloud install-skill --force` 更新已安装的副本。

## 报告问题

如果升级导致站点出现问题，请提交
[issue](https://github.com/D0n9X1n/hexo-tag-cloud/issues)，并附上
`npx hexo version` 的输出、主题名称和版本、你的 `tag_cloud:` 配置块，以及
`npx hexo-tag-cloud inspect` 的输出。
