# Migrating from hexo-tag-cloud 2.x to 3.x

**English** · [简体中文](Migration-v2-to-v3-zh-CN)

## TL;DR

```bash
npm install hexo-tag-cloud@^3 --save
npx hexo-tag-cloud install          # preview
npx hexo-tag-cloud install --apply  # write
```

Your `tag_cloud:` configuration keeps working unchanged. A hand-written 2.x
snippet in your theme also keeps working. The installer is optional: it
replaces hand edits with one managed block that you can upgrade later.

## Requirements

- Hexo `>= 5` (2.x accepted Hexo 4).
- Node.js `>= 18`.

## Why a major version

3.0 kept the `tag_cloud:` options, but it added new public surface: the
`npx hexo-tag-cloud` CLI and the bundled Claude Code skill. It also rewrote
every internal module. Code that `require`d private internals of the old
`index.js` will break.

See [GitHub Releases](https://github.com/D0n9X1n/hexo-tag-cloud/releases)
for the notes of each version.

## Upgrade steps

### 1. Update the dependency

```bash
npm install hexo-tag-cloud@^3 --save
```

### 2. Check your existing setup

Build the site and open it:

```bash
npx hexo clean && npx hexo generate && npx hexo server
```

If your 2.x snippet renders the cloud, you can stop here.

### 3. Optional: switch to the installer

The installer refuses to run while a hand-written snippet (a `resCanvas`
canvas plus a `tagcloud.js` or `tagcanvas.js` script) is in the target
template, and exits `3`. Remove your snippet first, then:

```bash
npx hexo-tag-cloud install          # prints the diff
npx hexo-tag-cloud install --apply  # writes it
```

Themes without a built-in recipe use `--target <template>`, or
`tag_cloud.inject: true` to skip template edits entirely. See
[Installation](Installation).

## Managed-block markers

The installer writes everything between these markers:

```ejs
<!-- hexo-tag-cloud:begin -->
...
<!-- hexo-tag-cloud:end -->
```

Pug templates use `//- hexo-tag-cloud:begin` and `//- hexo-tag-cloud:end`.
Content outside the markers is never changed. If the content inside differs
from what the installer would write, a re-run exits `2` and prints a diff;
`--apply --force` replaces it.

## Upgrading from 3.0 to 3.1

- Blocks written by the 3.0 installer drew an empty canvas and used
  hard-coded `/js/` paths. Re-run `npx hexo-tag-cloud install --apply --force`
  to replace them.
- The `generic` and `icarus` recipes were removed. Use `--target` or inject
  mode instead.
- The browser bootstrap no longer replaces `window.onload` and no longer
  logs to the console.
- The skill no longer ships helper scripts. Refresh an installed copy with
  `npx hexo-tag-cloud install-skill --force`.

## Reporting issues

If an upgrade breaks your site, open an
[issue](https://github.com/D0n9X1n/hexo-tag-cloud/issues) with your
`npx hexo version` output, your theme name and version, your `tag_cloud:`
block, and the output of `npx hexo-tag-cloud inspect`.
