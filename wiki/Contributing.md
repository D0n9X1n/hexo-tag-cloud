# Contributing

Thanks for considering a contribution! This project is held to a strict
TDD bar (100 % c8 line/function/branch/statement coverage on the entire
covered surface, plus a Playwright e2e suite). All PRs must keep that bar.

## Setup

```bash
git clone https://github.com/D0n9X1n/hexo-tag-cloud.git
cd hexo-tag-cloud
npm install --no-audit --no-fund
```

## Running the test suite

```bash
npm run lint            # ESLint
npm run test:server     # node --test, c8 100/100/100/100 enforced
npm run test:e2e        # Playwright (chromium); installs browsers on first run
npm test                # all of the above (CI parity)
```

To run a single server test file:

```bash
node --test tests/server/render.test.js
```

To run a single e2e spec:

```bash
npx playwright test --config tests/e2e/playwright.config.js \
  tests/e2e/installer.spec.js
```

To run the demo locally:

```bash
cd demo && npm install && npx hexo clean && npx hexo generate && \
  npx hexo server
# then open http://localhost:4000/hexo-tag-cloud/
```

## Branch policy

- `master` is protected. Direct push is forbidden; all changes go through
  PRs.
- Feature branches: `feature/<short-description>`.
- Fix branches: `fix/<issue-number>-<short-description>`.
- Release branches: `release/<vX.Y.Z>` (rare; usually direct `vX.Y.Z`
  tag on master).

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/). Body wraps
at 72 columns. Sign off if required by your fork policy.

```
<type>(<scope>): <short summary>

<body explaining the why>

Co-authored-by: ...
```

Allowed types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`,
`ci`, `build`, `perf`. Scope is freeform but `lib`, `installer`, `cli`,
`docs`, `ci`, `e2e` are common.

## TDD gate (this is the law)

For any code change that affects coverage:

1. Write a failing test first.
2. Implement the minimum code to pass.
3. Run `npm run test:server` and confirm c8 reports 100/100/100/100.
4. Run `npm run lint` and confirm 0 errors.

PRs that lower coverage below 100 % will not merge until coverage is
restored. Use `/* c8 ignore next */` (NOT istanbul-style) only for truly
unreachable branches; document the reason inline.

## Pre-publish checks

`scripts.prepublishOnly` runs `npm run verify-pack`, which uses
`build/verify-pack.js` to assert the npm tarball contents are an exact
match to the allowlist (see `tests/server/build/verify-pack.test.js`).
Files outside the allowlist cause a publish abort.

If you add a new top-level file or directory that should ship in the
tarball, update `package.json#files`, the `ALLOWED_EXACT` /
`ALLOWED_PREFIXES` / `REQUIRED_PATHS` sets in `build/verify-pack.js`, and
re-run `npm run test:server` (the unit tests assert the universe).

## Release flow (maintainers only)

1. Land all PRs for the release on master.
2. Update `CHANGELOG.md`: move `[Unreleased]` items under
   `[X.Y.Z] — YYYY-MM-DD`.
3. Bump `package.json#version` and (if applicable) `package.json#peerDependencies`.
4. Confirm `demo/package.json` does NOT reference `file:..` (the release
   workflow rejects this).
5. `git tag vX.Y.Z && git push --tags`.
6. The `release.yml` workflow publishes to npmjs.com (OIDC trusted
   publisher) and GitHub Releases.
7. The `publish-gh-packages.yml` workflow mirrors to GitHub Packages as
   `@d0n9x1n/hexo-tag-cloud`.

## Reporting bugs

Open an issue with:

- Hexo version (`npx hexo version`).
- Your theme name + version.
- The contents of `_config.yml` `tag_cloud:` block (if any).
- Steps to reproduce.
- A failing test case if you can write one — even a sketch helps.

## License

By contributing you agree your contribution is licensed under the MIT
License (see `LICENSE`).
