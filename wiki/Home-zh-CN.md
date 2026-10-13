# hexo-tag-cloud Wiki

[English](Home) · **简体中文**

`hexo-tag-cloud` 是一款适用于 [Hexo](https://hexo.io/) 站点的 3D 旋转标签云，
基于 HTML5 canvas，由 [TagCanvas](https://www.goat1000.com/tagcanvas.php) 驱动。

本 Wiki 是项目 [`README.md`](https://github.com/D0n9X1n/hexo-tag-cloud#readme) 的详细补充，
内容涵盖各主题的安装对照、`tag_cloud` 配置参考、常见问题、AI skill
以及贡献流程。

## 页面

- **[安装](Installation-zh-CN)**：三种安装方式，合起来覆盖所有主题：
  内置配方（landscape、NexT、Butterfly、Fluid）、通过 `--target` 写入任意模板，
  以及无需修改模板的注入模式。
- **[自定义配置](Customization-zh-CN)**：`tag_cloud` 配置块中的全部选项，
  包括 `inject` 和 `mount`。
- **[故障排查](Troubleshooting-zh-CN)**：画布空白、子路径 404、注入位置、
  CJK 字形以及安装器退出码。
- **[AI Skill 使用](AI-Skill-Usage-zh-CN)**：Claude Code skill 与插件。
- **[参与贡献](Contributing-zh-CN)**：测试、100% 覆盖率门槛以及发布流程。
- **[迁移指南：v2 → v3](Migration-v2-to-v3-zh-CN)**：从 2.x 升级。

## 快速链接

- [README（English）](https://github.com/D0n9X1n/hexo-tag-cloud#readme) · [README（中文）](https://github.com/D0n9X1n/hexo-tag-cloud/blob/master/README.ZH.md)
- [Releases](https://github.com/D0n9X1n/hexo-tag-cloud/releases)（发布说明，附已解决的 issue 和提交记录）
- [在线演示](https://d0n9x1n.github.io/hexo-tag-cloud/)（由 `demo/` 构建）

## 镜像策略

源码仓库中的 `wiki/` 是唯一的权威来源。每次推送到 `master` 时，
`.github/workflows/publish-wiki.yml` 都会将其镜像到 GitHub Wiki。
切勿直接编辑 GitHub Wiki，因为这些修改会在下次发布时被覆盖。
