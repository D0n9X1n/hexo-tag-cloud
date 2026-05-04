---
title: 中文 / 日本語 / 한국어 のタグクラウド
date: 2026-05-03 10:00:00
tags:
  - 中文
  - 日本語
  - 한국어
  - 漢字
  - ひらがな
  - カタカナ
  - 简体
  - 繁體
---

This post exists to seed the tag cloud with **CJK** tag names so the live
cloud demonstrates the v3.0.0 non-ASCII fix.

## Why this matters

In hexo-tag-cloud 2.1.x, tag names containing CJK characters could render
as empty strings or trigger HTML-escape regressions when the tag URL was
percent-encoded (upstream issue #39). The v3.0.0 refactor fixed this in
the render module's text-emit path; the bundled TagCanvas runtime itself
(`lib/tagcanvas.js`) is unchanged from upstream.

The tags on this post:

- 中文 (Chinese)
- 日本語 (Japanese)
- 한국어 (Korean)
- 漢字 (Han characters)
- ひらがな (Hiragana)
- カタカナ (Katakana)
- 简体 (Simplified Chinese)
- 繁體 (Traditional Chinese)

If you can see all eight tag names spinning in the sidebar cloud, the
fix is working.
