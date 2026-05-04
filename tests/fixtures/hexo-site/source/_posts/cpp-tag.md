---
title: HTML-special character tags
date: 2026-05-03 00:00:00
tags:
  - C++
  - 'A&B'
  - 'quote"tag'
---

T6 fixture: tags with HTML-special characters that triggered upstream
issue #39 (double-escaping in plugin chains using cheerio). Sub-project
B's T5/T7 e2e regression locks in that TagCanvas v2.9 reads these as
literals through stock hexo's `tagcloud()` helper.
