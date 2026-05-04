# hexo-tag-cloud demo

Live demo of [`hexo-tag-cloud`](https://github.com/D0n9X1n/hexo-tag-cloud)
deployed at <https://d0n9x1n.github.io/hexo-tag-cloud/>.

This is a minimal Hexo blog with the plugin pre-installed and posts
covering ASCII, CJK (中文 / 日本語 / 한국어), Cyrillic, and HTML-special
tag names. The deployed page proves the v3.0.0 non-ASCII fix
end-to-end across the full pipeline.

## Run locally

```bash
cd demo
npm install
npx hexo clean
npx hexo generate
npx hexo server
```

Then open <http://localhost:4000/hexo-tag-cloud/> (the `root:
/hexo-tag-cloud/` setting in `_config.yml` matches the GitHub Pages
project-page URL, so internal links resolve under that prefix locally
too).

## Deployment

Auto-deployed by `.github/workflows/deploy-demo.yml` after every passing
test run on `master`. The workflow builds with `cd demo && npx hexo
generate` and publishes `demo/public/` to the repo's GitHub Pages site.

During development the demo references the plugin via `"file:.."`; the
`release.yml` workflow refuses to publish a tag while this is still in
place.

## Pre-installed managed block

The demo ships with the tag-cloud markup already installed in
`demo/themes/landscape/layout/_partial/sidebar.ejs` (wrapped in
`<!-- hexo-tag-cloud BEGIN -->` / `<!-- hexo-tag-cloud END -->` markers).
This decouples the demo's correctness from the runtime install step —
end-to-end installer correctness is the responsibility of the
`tests/e2e/installer.spec.js` suite.
