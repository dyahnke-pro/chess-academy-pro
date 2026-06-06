import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const BASE = 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable(false);
const br = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await br.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
// dashboard
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/live-dashboard.png' });
// openings -> All tab -> expand a letter to show hearts
await page.goto(`${BASE}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(3500);
await page.locator('[data-testid="tab-all"]').click().catch(()=>{});
await page.waitForTimeout(2000);
const tog = page.locator('[data-testid^="eco-toggle-"]').first();
await tog.waitFor({ timeout: 40000 }).catch(()=>{});
await tog.click().catch(()=>{});
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/live-openings-hearts.png' });
// weaknesses
await page.goto(`${BASE}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/live-weaknesses.png', fullPage: true });
console.log('shots done');
await br.close();
