# hexo-tag-cloud Wiki

`hexo-tag-cloud` is a 3-D rotating tag cloud for [Hexo](https://hexo.io/)
sites, powered by HTML5 canvas via [TagCanvas](https://www.goat1000.com/tagcanvas.php).

This wiki is a long-form companion to the project [`README.md`](../README.md);
it covers the per-theme install matrix, the `tag_cloud` config reference,
common pitfalls, the AI skill, and the contributor workflow.

## Pages

- **[Installation](Installation.md)** — manual + AI-assisted install across
  every supported theme (landscape, next, butterfly, icarus, fluid, generic).
- **[Customization](Customization.md)** — every option in the `tag_cloud`
  config block: font, colors, depth, rotation speed, TagCanvas pass-through.
- **[Troubleshooting](Troubleshooting.md)** — blank canvas, missing tags, CJK
  glyphs, the `<%- tagcloud() %>` helper, theme-detection failures.
- **[AI-Skill-Usage](AI-Skill-Usage.md)** — invoking the bundled Claude
  skill, dry-run vs apply, managed-block markers, conflict recovery.
- **[Contributing](Contributing.md)** — branch policy, conventional commits,
  TDD gate (`npm test` + 100 % c8), how to run e2e locally.

## Quick links

- [README (English)](../README.md) · [README (中文)](../README.ZH.md)
- [Migration: 2.x → 3.x](../docs/migration-2.x-to-3.x.md)
- [Changelog](../CHANGELOG.md)
- [Live demo](https://d0n9x1n.github.io/hexo-tag-cloud/) (built from `demo/`)

## Mirror policy

This `wiki/` directory in the source tree is the canonical Markdown source;
the GitHub `<repo>.wiki.git` repo is a manual mirror. To publish updates:

```bash
git clone https://github.com/D0n9X1n/hexo-tag-cloud.wiki.git
cp wiki/*.md hexo-tag-cloud.wiki/
cd hexo-tag-cloud.wiki && git add . && git commit -m "Sync from main repo" && git push
```

(GitHub does not currently support automated wiki pushes from `GITHUB_TOKEN`,
so the mirror step is intentionally manual.)
