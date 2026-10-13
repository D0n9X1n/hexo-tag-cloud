# 参与贡献

[English](Contributing) · **简体中文**

感谢你考虑为本项目做贡献！本项目遵循严格的 TDD 标准：整个覆盖范围内的
c8 行、函数、分支和语句覆盖率均须达到 100 %，并配有一套 Playwright 端到端
（e2e）测试。所有 PR 都必须保持这一标准。

## 环境准备

```bash
git clone https://github.com/D0n9X1n/hexo-tag-cloud.git
cd hexo-tag-cloud
npm install --no-audit --no-fund
```

请使用 Node.js 20 或 22。CI 使用 Node 20，而 c8 在 Node 26 上会崩溃。

## 运行测试套件

```bash
npm run lint            # ESLint
npm run test:server     # node --test，强制 c8 100/100/100/100
npm run test:e2e        # Playwright（chromium）；首次运行时会安装浏览器
npm test                # 以上全部（与 CI 一致）
```

运行单个服务端测试文件：

```bash
node --test tests/server/render.test.js
```

运行单个 e2e spec：

```bash
npx playwright test --config tests/e2e/playwright.config.js \
  tests/e2e/installer.spec.js
```

在本地运行演示站点：

```bash
cd demo && npm install && npx hexo clean && npx hexo generate && \
  npx hexo server
# 然后打开 http://localhost:4000/hexo-tag-cloud/
```

## 分支策略

- `master` 是受保护分支，禁止直接推送；所有改动都必须通过 PR 提交。
- 功能分支：`feature/<short-description>`。
- 修复分支：`fix/<issue-number>-<short-description>`。
- 发布分支：`release/<vX.Y.Z>`（很少使用；通常直接在 master 上打
  `vX.Y.Z` 标签）。

## 提交信息

遵循 [Conventional Commits](https://www.conventionalcommits.org/)。正文在
72 列处换行。如果你的 fork 策略要求，请添加 sign-off。

```
<type>(<scope>): <short summary>

<body explaining the why>

Co-authored-by: ...
```

允许的类型：`feat`、`fix`、`docs`、`test`、`refactor`、`chore`、
`ci`、`build`、`perf`。scope 可自由填写，常见的有 `lib`、`installer`、`cli`、
`docs`、`ci`、`e2e`。

## TDD 关卡（这是铁律）

任何影响覆盖率的代码改动都必须：

1. 先写一个会失败的测试。
2. 用最少的代码让测试通过。
3. 运行 `npm run test:server`，确认 c8 报告 100/100/100/100。
4. 运行 `npm run lint`，确认 0 个错误。

使覆盖率低于 100 % 的 PR 在覆盖率恢复之前不会被合并。仅在分支确实不可达时
才使用 `/* c8 ignore next */`（不要用 istanbul 风格的写法），并在代码旁注明原因。

## 发布前检查

`scripts.prepublishOnly` 会运行 `npm run verify-pack`，它通过
`build/verify-pack.js` 断言 npm 包（tarball）的内容与白名单完全一致
（参见 `tests/server/build/verify-pack.test.js`）。白名单之外的文件会导致发布中止。

如果你新增了需要随 tarball 一起发布的顶层文件或目录，请更新
`package.json#files`、`build/verify-pack.js` 中的 `ALLOWED_EXACT` /
`ALLOWED_PREFIXES` / `REQUIRED_PATHS` 集合，然后重新运行
`npm run test:server`（单元测试会对完整文件集合进行断言）。

## 发布流程（仅限维护者）

该流水线与 SonicTerm 的相同：只接受打在经 CI 验证的 `master` 提交上的标签，
GitHub Release 说明由提交范围自动生成，因此无需维护 CHANGELOG 文件。

1. 将本次发布的所有 PR 合入 `master`。在 PR 或提交中用 `Fixes #N` /
   `Closes #N` 引用 issue，使其出现在发布说明的 **Resolved issues** 部分。
2. 通过 PR 提升 `package.json#version` 并合并。
3. 等待该 `master` 提交对应的 **Tests** 运行通过。
4. 为该提交打标签并推送标签：
   ```bash
   git tag v3.1.0 && git push origin v3.1.0
   ```
5. 随后 `.github/workflows/release.yml` 会执行：
   - **validate-release-tag**：验证该提交位于 `master` 上、其对应的 Tests
     运行已成功、标签与 `package.json` 一致、tarball 通过
     `build/verify-pack.js` 校验，且发布工具的测试全部通过；
   - **publish-npm**：通过 OIDC 可信发布（trusted publishing）附带来源证明
     （provenance）进行发布（`latest`，`-rc`/`-beta` 标签则为 `next`）；
   - **publish-github-release**：运行 `scripts/release-notes.sh`，列出提交范围内
     经提交或 PR 证实已关闭的 issue（`scripts/release-issues.py`，能识别
     revert），以及自上一个标签以来的所有提交；
   - **publish-github-packages**：以 `@d0n9x1n/hexo-tag-cloud` 镜像发布同一版本。

在本地预览发布说明（需要先执行 `gh auth login` 并拥有完整的提交历史）：

```bash
bash scripts/release-notes.sh v3.1.0
```

## Wiki

`wiki/` 是唯一的文档目录，也是 GitHub wiki 的唯一事实来源。每次推送到 `master`
都会运行 `.github/workflows/publish-wiki.yml`，它会校验页面，并将所有
`wiki/*.md` 文件同步到 GitHub wiki。切勿直接编辑 GitHub wiki：这些修改会在
下次发布时被覆盖。

每个页面都有两个文件：英文版 `wiki/<Page>.md` 和中文版
`wiki/<Page>-zh-CN.md`。请在同一次改动中同时更新两者。以下规则由 CI 中的
`python3 scripts/check-wiki.py` 强制执行：

- 每个文件开头都有一个指向对应语言版本的语言切换链接。
- 两个文件的标题结构相同。
- 页面之间通过裸页面名互相链接（英文页面用 `Installation`，中文页面用
  `Installation-zh-CN`），不使用 `.md` 路径，并且只链接同一语言的页面。
- `Home` 和 `Home-zh-CN` 链接到其所属语言的所有页面。
- 不使用子目录：所有页面都直接放在 `wiki/` 下。

## 报告 Bug

提交 issue 时请附上：

- Hexo 版本（`npx hexo version`）。
- 你的主题名称和版本。
- `_config.yml` 中 `tag_cloud:` 块的内容（如果有）。
- 复现步骤。
- 如果能写出失败的测试用例就更好了，哪怕只是一个草稿也很有帮助。

## 许可证

提交贡献即表示你同意你的贡献以 MIT 许可证授权（参见 `LICENSE`）。
