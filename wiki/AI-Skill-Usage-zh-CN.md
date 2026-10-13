# AI skill 使用指南（Claude Code）

[English](AI-Skill-Usage) · **简体中文**

`hexo-tag-cloud` 自带一个 [Claude Code skill](https://code.claude.com/docs/en/skills)，
可以为**任意** Hexo 主题加上标签云。skill 运行的就是你自己手动会运行的那套 CLI。
它总是先给你看预览（dry-run）结果，经你同意后才真正写入改动。

## 安装

skill 只有一个文件：
[`skills/hexo-tag-cloud/SKILL.md`](https://github.com/D0n9X1n/hexo-tag-cloud/blob/master/skills/hexo-tag-cloud/SKILL.md)。
把它复制到 `~/.claude/skills/hexo-tag-cloud/SKILL.md`，或者让 CLI 从 npm 包里复制：

```bash
npx hexo-tag-cloud install-skill           # 首次安装
npx hexo-tag-cloud install-skill --force   # 更新旧版本
npx hexo-tag-cloud install-skill --dry-run # 预览
```

如果想让同一个博客的所有协作者都能用，可以改为放到该仓库的
`.claude/skills/hexo-tag-cloud/SKILL.md`。

新开一个 Claude Code 会话，或者运行 `/skills`，即可加载它。

## 使用

在博客目录下打开 Claude Code，然后说：

```
给我的 Hexo 博客加一个标签云
```

skill 会按以下步骤进行：

1. 确认站点已安装 `hexo-tag-cloud`（`npm install hexo-tag-cloud --save`）。
2. 运行 `npx hexo-tag-cloud inspect`，找出主题、主题目录（`themes/` 或
   `node_modules/hexo-theme-*`）、对应的内置配方，以及按“是侧边栏的可能性”排序的模板列表。
3. 选择一种方式：
   - **内置配方**：landscape、NexT、Butterfly、Fluid。
   - **指定目标文件**：任意 `.ejs` / `.njk` / `.swig` / `.pug` / `.jade` 模板，
     通过 `--target <file> --before "</aside>"` 写入。如果有两个候选看起来都合适，
     它会问你用哪一个。
   - **注入模式**：`tag_cloud.inject: true`，不改动任何模板。适用于 Icarus 这类 JSX 主题、
     从 npm 安装的主题，或者你不想改模板的情况。
4. 展示 dry-run 的 diff（或 `_config.yml` 的改动），等待你确认。
5. 写入改动，运行 `hexo clean && hexo generate`，并检查生成的页面里是否包含 canvas
   及其标签链接。

除非你要求覆盖自己手动改过的受管代码块，skill 绝不会使用 `--force`；
删除手写的标签云之前，它也一定会先征求你的同意。

## 受管代码块标记

CLI 只会在下面这对标记之间创建或修改内容：

```
<!-- hexo-tag-cloud:begin -->      //- hexo-tag-cloud:begin   (Pug)
...                                 ...
<!-- hexo-tag-cloud:end -->        //- hexo-tag-cloud:end
```

标记之外的内容会逐字节原样保留。如果你手动修改了这个代码块，下次运行会以退出码 `2`
退出并展示 diff，而不会覆盖你的修改。参见[故障排查](Troubleshooting-zh-CN)中的安装器退出码说明。

## 不使用 skill

skill 只是 CLI 外面的一层薄封装，所以上面的每一步都可以手动完成。参见
[安装](Installation-zh-CN)。
