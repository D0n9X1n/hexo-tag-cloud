# Migrating from hexo-tag-cloud 2.x to 3.x

## TL;DR

```bash
npm install hexo-tag-cloud@^3
npx hexo-tag-cloud install --apply
```

The runtime API is byte-compatible with 2.1.x. If you already have a working
2.x installation, the version bump alone changes nothing — your existing
`tag_cloud:` configuration and your hand-edited theme partial continue to
work. The optional `npx hexo-tag-cloud install --apply` step writes a
managed block into your active theme's sidebar partial so future
adjustments are reproducible.

## Why a major bump?

v3.0.0 introduces no breaking runtime API. The major-version bump reflects:

1. **New public surface** — a CLI entry-point (`npx hexo-tag-cloud install`)
   and a bundled Claude skill at `skills/hexo-tag-cloud/`. Both are
   versioned-compatibility surfaces in their own right and warrant a major
   bump.
2. **Foundational refactor** — every internal module was rewritten with
   100% c8 coverage. While the public behavior is preserved, integrators
   monkey-patching the old `index.js` internals would notice the change.
3. **Fork lineage clarity** — the project moved from MikeCoder's last
   release (2.1.2, 2018) to the D0n9X1n maintainership. The bump signals
   the clean break.

See [CHANGELOG.md](../CHANGELOG.md) for the full list of additions,
changes, and fixes.

## Upgrade steps

### 1. Update the dependency

In your blog's `package.json`:

```diff
-"hexo-tag-cloud": "^2.1.2",
+"hexo-tag-cloud": "^3.0.0",
```

Then run `npm install`.

### 2. Verify the existing setup still works

If you previously edited your theme's sidebar partial by hand (the classical
`<canvas id="resCanvas">` snippet from the 2.x README), it continues to work
unchanged. Generate the site and confirm the cloud renders:

```bash
npx hexo clean && npx hexo generate
npx hexo server
```

If you see your tags rendering as before, you are done.

### 3. (Optional) Adopt the AI-assisted installer

Run the installer in dry-run first so you can review the unified diff
(bare `install` is the dry-run; pass `--apply` to write):

```bash
npx hexo-tag-cloud install
```

Then apply:

```bash
npx hexo-tag-cloud install --apply
```

The installer detects your active theme from `_config.yml`, picks the
correct partial heuristic (landscape, NexT, Butterfly, Icarus, Fluid, or a
generic fallback), and inserts a managed block:

```ejs
<!-- hexo-tag-cloud BEGIN -->
<canvas id="resCanvas" width="250" height="250">...</canvas>
<script src="/js/tagcloud.js"></script>
<script src="/js/tagcanvas.js"></script>
<!-- hexo-tag-cloud END -->
```

Future installer runs are idempotent — re-running `--apply` on an
already-installed partial detects the existing managed block and exits
without changes. To replace the block (e.g., after upgrading to a new
plugin version with a different snippet), use `--force`.

If your theme is not auto-detected, pin it explicitly:

```bash
npx hexo-tag-cloud install --apply --theme next
```

If you want to keep your hand-edited snippet, you can skip the installer
entirely; the plugin works the same way it did in 2.x.

## Managed-block markers

The installer always wraps its output in:

```ejs
<!-- hexo-tag-cloud BEGIN -->
...
<!-- hexo-tag-cloud END -->
```

Anything outside these markers is left untouched. Anything inside is
considered owned by the installer — `--apply` refuses to overwrite a
managed block whose hash differs from the expected one (exit code 2)
unless `--force` is passed.

This contract is what enables the AI-skill workflow: the bundled Claude
skill at `skills/hexo-tag-cloud/SKILL.md` always invokes the CLI in
`--dry-run` mode first and shows the unified diff to the user; only after
explicit approval does it run `--apply`.

## AI-assisted install

The bundled skill makes installation idempotent across any agent that
understands Anthropic's skill format. To install the skill alongside the
plugin so a Claude-powered editor or CLI can discover it, run:

```bash
npx hexo-tag-cloud install-skill --apply
```

By default this copies `skills/hexo-tag-cloud/` to `./.claude/skills/`. See
[wiki/AI-Skill-Usage.md](../wiki/AI-Skill-Usage.md) for the full workflow.

## What did NOT change

- The `tag_cloud:` configuration block in `_config.yml` (font, colors,
  shape, sizes, options).
- The hexo helper API (`tagcloud()` is unchanged).
- The injected JavaScript runtime (`/js/tagcloud.js` and `/js/tagcanvas.js`
  are byte-identical to 2.1.2).
- The list of supported hexo versions (still `>= 4`).

## What changed but should not affect you

- Internal module layout: `lib/options.js`, `lib/render.js`, and
  `lib/installer/` are new modules. If you were `require`-ing private
  internals from the old `index.js`, expect breakage; pin to v2.1.2 or open
  an issue describing your use case.
- The `files[]` allowed in the published tarball is now strictly verified
  by `build/verify-pack.js`. If you were depending on a file that the 2.x
  tarball happened to ship but which is not in `index.js`, `lib/`, `bin/`,
  `skills/`, `package.json`, `LICENSE`, or `README*`, it is no longer
  shipped.

## Reporting issues

If your 2.x setup breaks after upgrading, please open an issue at
[github.com/D0n9X1n/hexo-tag-cloud/issues](https://github.com/D0n9X1n/hexo-tag-cloud/issues)
with:

1. Your hexo version (`npx hexo version`).
2. Your theme name and version.
3. A minimal reproduction (a copy of your `_config.yml`'s `tag_cloud:`
   block plus the relevant theme partial).

Tag the issue with `v3-migration` so it sorts to the top of the
maintainer's queue.
