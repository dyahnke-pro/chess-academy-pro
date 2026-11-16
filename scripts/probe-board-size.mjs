// Probe: board width vs viewport on /coach/teach (muted).
import { chromium } from 'playwright';
import { sandboxLaunchArgs, sandboxContextOptions, resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const sizes = (process.env.SIZES ?? '430x748,390x664,375x667').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(muteTtsForAudit); await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  await page.goto(`${URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(9000);
  const consent = page.locator('[data-testid="ai-consent-allow"]'); if (await consent.isVisible().catch(() => false)) await consent.click();
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => {
    const sq = (s) => document.querySelector(`[data-square="${s}"]`)?.getBoundingClientRect();
    const a = sq('a1'), h = sq('h1'), a8 = sq('a8');
    const nav = document.querySelector('[data-bottom-nav]')?.getBoundingClientRect();
    const bar = document.querySelector('[data-testid="coach-board-bar"]')?.getBoundingClientRect();
    return { vw: innerWidth, board: a && h ? Math.round(Math.max(a.right, h.right) - Math.min(a.left, h.left)) : null, boardTop: a8 ? Math.round(Math.min(a8.top, a.top)) : null, barBottom: bar ? Math.round(bar.bottom) : null, navTop: nav ? Math.round(nav.top) : null };
  });
  await page.screenshot({ path: `/tmp/claude-0/-home-user-chess-academy-pro/0f88d73e-3ffc-51d5-9748-a55ad2122b96/scratchpad/board-${w}x${h}.png` });
  console.log(`${w}x${h}`, JSON.stringify(m));
  await ctx.close();
}
await browser.close();
