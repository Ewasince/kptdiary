// One-off generator for the PWA PNG icons from public/icon.svg.
// Run with: node scripts/make-icons.mjs. Playwright is not a project dependency:
// it is loaded through require so a globally installed copy (NODE_PATH) works.
// Commit the resulting PNGs.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const svg = await readFile(`${publicDir}icon.svg`, 'utf8');
const sizes = [192, 512];

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',
});
try {
  for (const size of sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    // The page background matches the icon colour so the PNG is full-bleed,
    // which the maskable 512 icon needs (no transparent rounded corners).
    await page.setContent(
      `<html><body style="margin:0;background:#2F6B8C">` +
        `<div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>` +
        `</body></html>`,
    );
    await page.screenshot({ path: `${publicDir}icon-${size}.png`, omitBackground: false });
    await page.close();
    console.log(`wrote public/icon-${size}.png`);
  }
} finally {
  await browser.close();
}
