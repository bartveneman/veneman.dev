---
title: role=list for lists without list-style
tags:
  - html
  - css
  - accessibility
---

[Source](https://twitter.com/stefanjudis/status/1346383989267963904)

> CSS trick.👇
>
> `list-style` affects semantics in some screen readers. Use `role` to define that a ul/ol really is a list (even if it doesn't have bullet points).
>
> When you now use role, the list-style is removed.🎉
>
> Found in @piccalilli 's Modern CSS Reset.

Screenreaders may not see a list (`<ol>` or `<ul>`) when their `list-style` is set to `none`. Add `role="list"` to re-add that semantic.
