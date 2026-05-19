import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/coach/play', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const dump = await page.evaluate(() => {
  const e2 = document.querySelector('[data-square="e2"]');
  // Look for any descendant that looks like a piece image.
  const img = e2?.querySelector('img');
  const svg = e2?.querySelector('svg');
  const allChildren = e2 ? Array.from(e2.querySelectorAll('*')).slice(0, 5).map(el => ({
    tag: el.tagName,
    attrs: Object.fromEntries(Array.from(el.attributes).filter((a) => !['style', 'class'].includes(a.name)).map((a) => [a.name, a.value])),
  })) : [];
  return {
    hasImg: Boolean(img),
    imgSrc: img?.src ?? null,
    hasSvg: Boolean(svg),
    children: allChildren,
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
