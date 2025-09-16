---
title: Differences between window.isNaN() and Number.isNaN()
tags:
   - javascript
---

[Source](https://twitter.com/Wattenberger/status/1257808141103910916)

> TIL the global isNaN() function and Number.isNaN() are different
>
> global isNaN() coerces into a number
> Number.isNaN() (ES6) doesn't, and only returns true for NaN

```js
window.isNaN(undefined)
//=> true

window.isNaN(NaN)
//=> true

window.isNaN('')
//=> false

Number.isNan(undefined)
//=> false

Number.isNan(NaN)
//=> true

Number.isNaN('')
//=> false
```
