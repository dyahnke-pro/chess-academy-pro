import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
page.on('console', (m) => console.log(`[${m.type()}] ${m.text().slice(0, 300)}`));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);

// Try to fetch Anthropic + DeepSeek from the page context.
const result = await page.evaluate(async () => {
  const results = {};
  try {
    const r = await fetch('https://api.anthropic.com/', { method: 'GET' });
    results.anthropicGet = { status: r.status, ok: r.ok };
  } catch (e) {
    results.anthropicGet = { error: String(e) };
  }
  try {
    const r = await fetch('https://api.deepseek.com/', { method: 'GET' });
    results.deepseekGet = { status: r.status, ok: r.ok };
  } catch (e) {
    results.deepseekGet = { error: String(e) };
  }
  return results;
});
console.log('NETWORK TEST RESULT:');
console.log(JSON.stringify(result, null, 2));
await browser.close();
