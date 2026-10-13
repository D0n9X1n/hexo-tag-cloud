# hexo-tag-cloud Wiki

**English** · [简体中文](Home-zh-CN)

`hexo-tag-cloud` is a 3-D rotating tag cloud for [Hexo](https://hexo.io/)
sites, powered by HTML5 canvas via [TagCanvas](https://www.goat1000.com/tagcanvas.php).

This wiki is a long-form companion to the project [`README.md`](https://github.com/D0n9X1n/hexo-tag-cloud#readme);
it covers the per-theme install matrix, the `tag_cloud` config reference,
common pitfalls, the AI skill, and the contributor workflow.

## Pages

- **[Installation](Installation)**: three install paths that together cover
  every theme: built-in recipes (landscape, NexT, Butterfly, Fluid), any
  template via `--target`, and inject mode, which needs no template edits.
- **[Customization](Customization)**: every option in the `tag_cloud`
  config block, including `inject` and `mount`.
- **[Troubleshooting](Troubleshooting)**: blank canvas, sub-path 404s,
  inject placement, CJK glyphs, and installer exit codes.
- **[AI-Skill-Usage](AI-Skill-Usage)**: the Claude Code skill and plugin.
- **[Contributing](Contributing)**: tests, the 100% coverage gate, and the
  release flow.
- **[Migration: v2 → v3](Migration-v2-to-v3)**: upgrading from 2.x.

## Quick links

- [README (English)](https://github.com/D0n9X1n/hexo-tag-cloud#readme) · [README (中文)](https://github.com/D0n9X1n/hexo-tag-cloud/blob/master/README.ZH.md)
- [Releases](https://github.com/D0n9X1n/hexo-tag-cloud/releases) (release notes with resolved issues and commits)
- [Live demo](https://d0n9x1n.github.io/hexo-tag-cloud/) (built from `demo/`)

## Mirror policy

`wiki/` in the source repository is the only source of truth.
`.github/workflows/publish-wiki.yml` mirrors it to the GitHub wiki on every
push to `master`. Never edit the GitHub wiki directly, because those edits are
overwritten on the next publish.
