// Checks the design tokens in src/app/globals.css against WCAG 2.1 contrast:
// 4.5:1 for text, 3:1 for non-text (form outlines, chart marks, icons).
// Run after changing colours:  node scripts/check-contrast.mjs
import { readFileSync } from "node:fs"

const css = readFileSync("src/app/globals.css", "utf8")

function block(selector) {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`No ${selector} block`)
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start))
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [
      m[1],
      m[2],
    ]),
  )
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function ratio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = "#ffffff"
// [foreground token, background token, minimum]
const PAIRS = [
  ["foreground", "background", 4.5],
  ["foreground", "card", 4.5],
  ["muted-foreground", "card", 4.5],
  ["muted-foreground", "background", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["primary", "card", 4.5],
  ["primary", "background", 4.5],
  ["destructive", "card", 4.5],
  ["warning", "card", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["accent-foreground", "accent", 4.5],
  ["sage-ink", "sage", 4.5],
  ["lavender-ink", "lavender", 4.5],
  ["peach-ink", "peach", 4.5],
  ["mint-ink", "mint", 4.5],
  ["rose-ink", "rose", 4.5],
  ["foreground", "rose", 4.5],
  ["foreground", "lavender", 4.5],
  ["sidebar-foreground", "sidebar", 4.5],
  ["sidebar-primary", "sidebar", 4.5],
  [WHITE, "bloom-from", 4.5],
  [WHITE, "bloom-via", 4.5],
  [WHITE, "bloom-to", 4.5],
  ["input", "card", 3],
  ["chart-expense", "card", 3],
  ["gold", "card", 3],
  ["ring", "card", 3],
]

let failures = 0
for (const [name, selector] of [
  ["light", ":root {"],
  ["dark", ":root.dark,"],
]) {
  const tokens = block(selector)
  for (const [fg, bg, min] of PAIRS) {
    const a = fg.startsWith("#") ? fg : tokens[fg]
    const b = tokens[bg]
    if (!a || !b) throw new Error(`${name}: missing ${fg} or ${bg}`)
    const r = ratio(a, b)
    const ok = r >= min
    if (!ok) failures++
    console.log(
      `${ok ? "ok  " : "FAIL"} ${name.padEnd(5)} ${fg} on ${bg}: ${r.toFixed(2)} (needs ${min})`,
    )
  }
}
if (failures > 0) {
  console.error(`\n${failures} pair(s) below WCAG AA.`)
  process.exit(1)
}
console.log("\nAll pairs meet WCAG AA.")
