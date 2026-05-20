import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
// Check via fetch of /__envprobe — vite serves source modules.
// Easier: inject a module script and expose to window.
const env = await page.evaluate(() => {
  const e = (globalThis).__VITE_HMR_ENV_HINT;
  // Vite injects env at build via define; at runtime we can sniff by
  // reading from a module that uses import.meta.env. Easier: open a
  // module via fetch — but for diagnosis, dump localStorage if app
  // stashes a snapshot.
  // Hack: walk window for evidence of keys.
  const keys = [];
  for (const k of Object.keys(globalThis)) {
    if (k.toLowerCase().includes('anthropic') || k.toLowerCase().includes('deepseek') || k.toLowerCase().includes('key')) {
      keys.push(k);
    }
  }
  return JSON.stringify({ keys, hasViteHmr: Boolean(e) });
});
console.log(JSON.stringify(env, null, 2));
await browser.close();
