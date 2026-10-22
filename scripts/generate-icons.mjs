// Renders DayBloom's app icons (the logo's Sprout on forest green) to PNG
// with Playwright's Chromium. Run after changing the logo:
//   node scripts/generate-icons.mjs
import { mkdir } from "node:fs/promises"

import { chromium } from "@playwright/test"

const FOREST = "#315C49"
// lucide "sprout" (the icon in components/layout/logo.tsx), 24×24 viewBox.
const SPROUT = `
  <path d="M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3"/>
  <path d="M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4"/>
  <path d="M5 21h14"/>`

/**
 * @param {number} size  output size in px
 * @param {object} o
 * @param {number} o.radius  corner radius as a share of the size (0 = square)
 * @param {number} o.glyph   sprout size as a share of the size
 */
function svg(size, { radius, glyph }) {
  const g = size * glyph
  const offset = (size - g) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * radius}" fill="${FOREST}"/>
  <svg x="${offset}" y="${offset}" width="${g}" height="${g}" viewBox="0 0 24 24" fill="none"
       stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SPROUT}</svg>
</svg>`
}

const ICONS = [
  // "any" icons: rounded like the in-app logo.
  { file: "public/icons/icon-192.png", size: 192, radius: 0.22, glyph: 0.56 },
  { file: "public/icons/icon-512.png", size: 512, radius: 0.22, glyph: 0.56 },
  // Maskable: full bleed, sprout inside the central 80% safe zone.
  {
    file: "public/icons/icon-maskable-512.png",
    size: 512,
    radius: 0,
    glyph: 0.46,
  },
  // iOS rounds the corners itself.
  { file: "src/app/apple-icon.png", size: 180, radius: 0, glyph: 0.56 },
]

await mkdir("public/icons", { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
for (const { file, size, ...shape } of ICONS) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg(size, shape)}</body></html>`,
  )
  await page
    .locator("svg")
    .first()
    .screenshot({ path: file, omitBackground: true })
  console.log(`wrote ${file}`)
}
await browser.close()
