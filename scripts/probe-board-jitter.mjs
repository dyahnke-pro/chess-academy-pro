// Probe: does the Learn board change size between moves? Plays moves by
// clicking squares and samples board width + every row height ~every 100ms.
import { chromium } from 'playwright';
import { sandboxLaunchArgs, sandboxContextOptions, resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5191';
const [W, H] = (process.env.SIZE ?? '430x748').split('x').map(Number);
const MOVES = (process.env.MOVES ?? 'e2e4,g1f3,f1c4,b1c3,d2d3,c1g5,e1g1').split(',');
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: W, height: H }, isMobile: true, hasTouch: true });
await ctx.addInitScript(muteTtsForAudit); await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
await page.goto(`${URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(9000);
const consent = page.locator('[data-testid="ai-consent-allow"]'); if (await consent.isVisible().catch(() => false)) await consent.click();
await page.evaluate(() => {
  window.__jit = [];
  const t0 = performance.now();
  const rows = () => {
    const a = document.querySelector('[data-square="a1"]')?.getBoundingClientRect();
    const h = document.querySelector('[data-square="h1"]')?.getBoundingClientRect();
    const w = a && h ? Math.round(Math.max(a.right, h.right) - Math.min(a.left, h.left)) : null;
    const pick = (sel) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? Math.round(r.height) : 0; };
    return { w, opp: pick('[data-testid="player-info-bar"]'), bar: pick('[data-testid="coach-board-bar"]'), extras: pick('[data-testid="coach-board-bar-extras"]'), focus: pick('[data-testid="focus-banner"]'), nav: pick('[data-testid="teach-nav-row"]'), eval: pick('[data-testid="eval-bar"]'), mission: pick('[data-testid="mission-banner"]') };
  };
  let last = '';
  const tick = () => { const r = rows(); const k = JSON.stringify(r); if (k !== last) { window.__jit.push({ t: Math.round(performance.now() - t0), ...r }); last = k; } };
  setInterval(tick, 50);
});
for (const mv of MOVES) {
  await page.locator(`[data-square="${mv.slice(0, 2)}"]`).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
  await page.locator(`[data-square="${mv.slice(2, 4)}"]`).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(6000);
}
const log = await page.evaluate(() => window.__jit);
for (const r of log) console.log(JSON.stringify(r));
await browser.close();
