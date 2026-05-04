# name

hexo-tag-cloud

## description

Install or refresh the `hexo-tag-cloud` plugin's animated 3D tag cloud
inside any [Hexo](https://hexo.io/) blog. Edits the active theme's
sidebar partial through a deterministic CLI (`npx hexo-tag-cloud
install`) so users can adopt or upgrade the plugin without
hand-editing `ejs`/`swig`/`pug` snippets across themes.

## when_to_use

Trigger this skill when the user says any of:

- "Add a tag cloud to my hexo site"
- "Install hexo-tag-cloud"
- "Wire up the 3D tag cloud in my theme"
- "Re-run hexo-tag-cloud after a theme upgrade"
- "How do I add hexo-tag-cloud to landscape / next / butterfly /
  icarus / fluid?"
- "My existing tag cloud broke after updating the theme"

Do NOT trigger for general Hexo questions, custom canvas drawing,
non-Hexo static-site generators, or for editing arbitrary theme
partials unrelated to the tag cloud.

## usage

The bundled CLI is the durable contract. The skill exists to make AI
agents call it correctly and explain its output to the user.

**Always-do checklist** (in order):

1. Confirm the user is in a Hexo site root (presence of `_config.yml`
   AND a `themes/` directory). If not, ask the user for the site
   root path or stop.
2. Detect the theme by reading `_config.yml`'s `theme:` field, or run
   `node ./skills/hexo-tag-cloud/scripts/detect-theme.js` from the
   site root. (You may also call the bundled
   `inspect-partials.js` to show the user candidate partial files
   the installer would target.)
3. Run a **dry-run first**:
   ```
   npx hexo-tag-cloud install
   ```
   This prints either the unified diff that would be written, the
   exit-code 2 conflict diff, or the legacy-install message — see
   `failure_modes` below for what each means.
4. Show the diff to the user **verbatim**, including the file path the
   installer would mutate. Wait for explicit approval.
5. Only after approval, run:
   ```
   npx hexo-tag-cloud install --apply
   ```
6. Tell the user to run `hexo clean && hexo generate && hexo server`
   to verify, and to point their browser at the homepage to see the
   tag cloud.

**Never run `--apply` without showing the dry-run diff first.** Never
pass `--force` unless the user has explicitly told you to overwrite a
managed block they edited themselves. Never edit `lib/tagcanvas.js` —
it is vendored upstream and must stay byte-identical.

If the user's `_config.yml` has a nested `theme:` mapping (e.g.
`theme:\n  name: butterfly`), the bundled YAML parser intentionally
refuses; pass `--theme <name>` explicitly. Likewise for themes
installed as `hexo-theme-<name>` npm packages, pass `--theme-dir
<path>` so the installer can find the partial.

## examples

**1. Fresh install on landscape (the default theme):**

```
$ cd ~/blog                                       # site root
$ npx hexo-tag-cloud install                       # dry-run
[dry-run] would write 187 bytes to themes/landscape/layout/_partial/sidebar.ejs
(re-run with --apply to write)
$ npx hexo-tag-cloud install --apply
✓ wrote tag-cloud managed block to themes/landscape/layout/_partial/sidebar.ejs
$ hexo clean && hexo generate && hexo server
```

**2. Re-running after an existing install (idempotent):**

```
$ npx hexo-tag-cloud install --apply
tag-cloud managed block already up-to-date; no changes written.
```

**3. The user customised the canvas size, then ran the installer
again. Conflict surfaces, you ask before overwriting:**

```
$ npx hexo-tag-cloud install --apply
--- before
+++ after
-<canvas id="resCanvas" width="999" height="800" ...>
+<canvas id="resCanvas" width="500" height="400" ...>
...
run with --apply --force to overwrite the user-edited block.
```

→ Tell the user: "I see you've edited the managed block (changed
canvas size to 999×800). I can either keep your edits (do nothing)
or overwrite them with the latest defaults (`--force`). Which would
you like?" Wait for the user's answer before running `--force`.

## failure_modes

The CLI returns these exit codes — translate them for the user
verbatim:

- **Exit 0** — success or dry-run succeeded.
- **Exit 1 (theme detection)** — could not figure out which theme is
  active. Suggest the user pass `--theme landscape` (or `next`,
  `butterfly`, `icarus`, `fluid`, `generic`) or `--theme-dir <path>`.
- **Exit 2 (conflict)** — the managed block already exists in the
  partial but its body differs from what the installer would write.
  The unified diff is printed to stdout. Ask the user whether to
  overwrite (re-run with `--apply --force`) or keep the existing
  edits (do nothing).
- **Exit 3 (legacy install)** — the partial contains a manually-
  installed tag-cloud snippet without managed-block markers. Tell
  the user to remove the existing `<canvas id="resCanvas">` block +
  the two `<script>` tags by hand, then re-run the installer. Do
  NOT try to delete it for them — there's no automated migration in
  this version.
- **Exit 4 (write conflict)** — target partial file does not exist
  for the chosen theme, or the installer could not write to it.
  Suggest `--theme-dir <path>` for npm-installed themes.
