# Sub-project B / integration — Hexo plugin loader gotcha

**Date:** 2026-05-03  | **Author:** PM (claude-opus-4.7-xhigh)
**Severity:** R-level (caught at e2e integration, NOT at plan audit)

## What broke

B's plan T3 contracted `index.js` to expose
`module.exports = function(hexo) { … }` and instructed unit tests to
drive it via `factory(fakeHexo)`. The unit tests passed; the e2e
suite then failed with HTTP 404 on `/js/tagcloud.js` because the
plugin never wrote the file.

## Root cause

`hexo/dist/hexo/index.js` `loadPlugin()` wraps each plugin's source
text as

```js
(async function(exports, require, module, __filename, __dirname, hexo){
  // …plugin source verbatim…
});
```

and invokes the wrapper with `(module.exports, req, module, path,
dirname, this)`. Hexo never inspects whatever `module.exports` is
assigned to inside that source — the plugin must perform its
side-effecting registration during the wrapper's synchronous
execution, typically by referencing the wrapper-injected `hexo`
parameter as a free variable.

A plugin that ONLY does `module.exports = function(hexo) { … }`
silently no-ops because that function is never called.

## Fix shipped (still inside B)

`index.js` keeps the exported factory (preserves the clean unit-test
shape from the plan) AND adds a typeof-guarded auto-register block at
the bottom:

```js
function registerHexoTagCloud(hexo) {
  hexo.extend.filter.register('after_generate', function () { … });
}
module.exports = registerHexoTagCloud;

if (typeof hexo !== 'undefined') {
  // eslint-disable-next-line no-undef
  registerHexoTagCloud(hexo);
}
```

Coverage stays 100/100/100/100 because `tests/server/index.test.js`
adds an "auto-registers when loaded with `hexo` set as a free
variable" case that mounts `global.hexo` before requiring the
module — `typeof hexo !== 'undefined'` resolves through the global
chain in the test's wrapper-less context.

## Why the audit didn't catch it

Plan R3-R5 fixated on the renderer's correctness (`text_original`
vs `original`, double-decode regression, stale-reference scrubbing).
Nobody ran a real `hexo generate` against the new `index.js` until
e2e. **Lesson for sub-projects C and D:** any change that switches
the shape of an inter-process or inter-tool boundary (plugin entry,
CLI entry, MCP handshake, generator hook) MUST be exercised against
the real consumer before the integrated diff audit, not just against
fakes in unit tests.

## Lint accommodation status (T4)

`tests/server/lint-config.test.js` STILL passes — the temporary
`.eslintrc.js` `index.js` override block and `globals.hexo` entry
remain deleted. Replaced with a single `// eslint-disable-next-line
no-undef` comment scoped to one line in `index.js`. Narrowly targeted,
documented, and easy to grep for if a future maintainer wants to
revisit.
