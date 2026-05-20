import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/coach/play', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
// Look at what's actually on the board.
const state = await page.evaluate(() => {
  const e2 = document.querySelector('[data-square="e2"]');
  const e4 = document.querySelector('[data-square="e4"]');
  return {
    e2html: e2?.outerHTML?.slice(0, 300) ?? null,
    e4html: e4?.outerHTML?.slice(0, 300) ?? null,
    attrs: e2 ? Object.fromEntries(Array.from(e2.attributes).map((a) => [a.name, a.value])) : null,
    children: e2 ? Array.from(e2.children).map((c) => c.outerHTML.slice(0, 100)) : [],
  };
});
console.log(JSON.stringify(state, null, 2));
await browser.close();
