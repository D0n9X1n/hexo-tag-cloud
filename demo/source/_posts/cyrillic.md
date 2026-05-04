---
title: Cyrillic tags — Кириллица в облаке тегов
date: 2026-05-03 11:00:00
tags:
  - Русский
  - Кириллица
  - Україна
  - Беларусь
  - Болгарский
---

This post seeds the tag cloud with **Cyrillic** tag names — another script
covered by the v3.0.0 non-ASCII fix.

The tags on this post are common Cyrillic words for the languages that
use the script: Русский (Russian), Кириллица (Cyrillic), Україна
(Ukraine), Беларусь (Belarus), Болгарский (Bulgarian).

The same render-module path that handles CJK tags handles these without
special-casing; both flow through `lib/render.js`'s `emitTagPair` helper
which uses string concatenation rather than `.replace(string, string)`
(the latter would interpret `$&`/`$$`/`$1` as backreferences and
corrupt characters in Cyrillic Unicode ranges).
