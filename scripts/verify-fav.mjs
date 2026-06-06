import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const BASE = 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable(false);
const br = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await br.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
await page.goto(`${BASE}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(4000);
await page.locator('[data-testid="tab-all"]').click().catch(()=>{});
await page.waitForTimeout(2000);
const tog = page.locator('[data-testid^="eco-toggle-"]').first();
await tog.waitFor({ timeout: 45000 }).catch(()=>{});
await tog.click().catch(()=>{});
await page.waitForTimeout(2500);
const hearts = await page.locator('[data-testid^="favorite-toggle-"]').count();
console.log(`favorite hearts on the All-tab list: ${hearts}`);
if (hearts > 0) {
  const h = page.locator('[data-testid^="favorite-toggle-"]').first();
  await h.click().catch(()=>{});
  await page.waitForTimeout(1500);
  const filled = await page.locator('[data-testid^="favorite-toggle-"] svg.fill-red-500').count();
  console.log(`after clicking first heart, filled(red) hearts: ${filled}`);
}
await br.close();
