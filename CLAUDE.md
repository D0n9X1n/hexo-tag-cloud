# hexo-tag-cloud

A Hexo plugin that renders an animated 3D tag cloud with TagCanvas. It also ships a Claude Code
skill and plugin that add the cloud to any Hexo theme.

## Layout

- `index.js`: plugin entry. Its `after_generate` filter copies `lib/tagcanvas.js` and writes
  `public/js/tagcloud.js`. When `tag_cloud.inject: true`, it also registers a `body_end` injector.
- `lib/options.js`: normalises `_config.yml` → `tag_cloud`. `lib/render.js` builds the browser
  bootstrap from those options.
- `lib/installer/`: the `npx hexo-tag-cloud` CLI (`install`, `inspect`, `install-skill`). Recipes
  live in `theme-heuristics.js`, snippets in `partial-emitter.js`, and splice decisions in
  `apply-edit.js`.
- `skills/hexo-tag-cloud/SKILL.md`: the Claude Code skill. `.claude-plugin/` makes this repo
  installable as a Claude Code plugin.
- `demo/`: the live demo site (GitHub Pages). `tests/fixtures/`: Hexo sites used by tests.
- `wiki/`: the canonical wiki source, mirrored to the GitHub wiki on every push to `master`.
  Never edit the GitHub wiki directly.
- `scripts/`: release notes (`release-notes.sh`, `release-issues.py`) and the wiki publisher.

## Commands

```bash
npm run lint
npm run test:server   # node:test + c8, 100% lines/branches/functions/statements required
npm run test:e2e      # Playwright against generated fixture sites
bash scripts/test-release-notes.sh && bash scripts/test-wiki-publish.sh
```

Use Node 20 or 22. CI runs Node 20, and c8 crashes on Node 26.

## Rules

- Keep the coverage gate at 100%. Add tests with every change to `index.js`, `lib/` (except
  `tagcanvas.js`), `bin/`, or `build/`.
- `lib/tagcanvas.js` is vendored upstream code. Do not edit it.
- Never use `String.prototype.replace(string, string)` on user-controlled values, because `$&`
  and `$1` are interpreted. Use slicing or concatenation, and `JSON.stringify` for JS literals.
- The installer must never drop content outside its `hexo-tag-cloud:begin/end` markers.
- The inject-mode bootstrap builds DOM with `createElement` and `textContent` only, never `innerHTML`.
- If you change what ships in the tarball, update `package.json#files` and `build/verify-pack.js`.

## Workflow

- Branch from `master` and open a PR. Put `Fixes #N` in commits or the PR so the issue appears
  under **Resolved issues** in the release notes.
- There is no CHANGELOG. GitHub Release notes are generated from the commit range.
- Release: bump `package.json#version`, merge, and wait for the Tests run on that `master` commit
  to pass. Then push `vX.Y.Z` on that exact commit. `release.yml` validates the tag, publishes to
  npm (OIDC), creates the GitHub Release, and mirrors to GitHub Packages.
