---
title: HTML-special characters in tag names
date: 2026-05-03 12:00:00
tags:
  - C++
  - F#
  - "ampersand &amp;"
  - "&lt;script&gt;"
  - "quote-test"
---

This post seeds the tag cloud with tags containing **HTML-special**
characters — angle brackets, ampersands, and other punctuation that have
caused escape-regression bugs in past versions of the plugin.

The tags on this post are deliberately adversarial:

- `C++` — plus signs, common programming-language tag.
- `F#` — hash symbol.
- `ampersand &amp;` — a tag whose source name contains `&amp;`. The
  plugin must NOT double-escape this (`&amp;amp;`).
- `&lt;script&gt;` — angle-bracket-escaped form. The plugin must render
  this literally; it must NOT decode the entities and inject a real
  `<script>` element into the DOM.
- `quote-test` — control sample for the test set.

If any of these tags ever rendered as empty bubbles in the cloud or
caused JS errors in the browser console, that would be a regression of
upstream issue #39. v3.0.0 handles them all correctly.
