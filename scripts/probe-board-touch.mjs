// Probe: can a piece be selected and moved, by touch tap (iPhone 15) and by
// mouse (desktop), on the Coach boards? Prints one line per surface × input.
// PROBE_BROWSER=webkit runs the iPhone app's engine (David 2026-11-06: "Coach
// tab, all surfaces — they don't work on my end", while Chromium taps worked).
import { chromium, webkit, devices } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const ROUTES = (process.env.PROBE_ROUTES ?? '/coach/play,/coach/teach,/coach/campaign').split(',');
const OUT = process.env.PROBE_OUT ?? '/tmp/probe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const onWebkit = process.env.PROBE_BROWSER === 'webkit';
const browser = onWebkit
  ? await webkit.launch({ headless: true })
  : await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(false), args: sandboxLaunchArgs() });
console.log(`engine: ${onWebkit ? 'webkit' : 'chromium'}`);
for (const mode of ['touch', 'mouse']) {
  for (const route of ROUTES) {
    const ctx = await browser.newContext(mode === 'touch'
      ? { ...devices['iPhone 15'], ...sandboxContextOptions(), userAgent: `${devices['iPhone 15'].userAgent} AuditCoachPlayBot/probe` }
      : { ...sandboxContextOptions(), viewport: { width: 1280, height: 900 }, userAgent: 'AuditCoachPlayBot/probe' });
    await ctx.addInitScript(autoDismissCalibration);
    await ctx.addInitScript(muteTtsForAudit);
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const allow = page.locator('[data-testid="ai-consent-allow"]');
    if (await allow.isVisible({ timeout: 8000 }).catch(() => false)) await allow.click().catch(() => {});
    const e2 = page.locator('[data-square="e2"]').first();
    const up = await e2.waitFor({ state: 'visible', timeout: 45000 }).then(() => true).catch(() => false);
    if (!up) { console.log(`${mode} ${route}: NO BOARD`); await page.screenshot({ path: `${OUT}-${mode}-${route.replace(/\//g, '_')}.png` }); await ctx.close(); continue; }
    await sleep(2500);
    const pieceOn = async (sq) => (await page.locator(`[data-square="${sq}"] [data-piece]`).count().catch(() => 0)) > 0
      || (await page.locator(`[data-square="${sq}"] img, [data-square="${sq}"] svg`).count().catch(() => 0)) > 0;
    const FROM = process.env.PROBE_FROM ?? 'e2'; const TO = process.env.PROBE_TO ?? 'e4';
    const before = { e2: await pieceOn(FROM), e4: await pieceOn(TO) };
    const act = (sq) => (mode === 'touch'
      ? page.locator(`[data-square="${sq}"]`).first().tap({ timeout: 5000 })
      : page.locator(`[data-square="${sq}"]`).first().click({ timeout: 5000 }));
    let tapErr = '';
    // SWITCH: select one piece, change your mind to another, move that one.
    const seq = (process.env.PROBE_SEQ ?? 'e2,e4').split(',');
    try { for (const sq of seq) { await act(sq); await sleep(400); } } catch (e) { tapErr = String(e).split('\n')[0].slice(0, 160); }
    await sleep(2500);
    const after = { e2: await pieceOn(FROM), e4: await pieceOn(TO) };
    const moved = before.e2 && !after.e2 && after.e4;
    // A drag (mouse only — Playwright has no touch drag): only if tap/click did not move.
    let dragged = null;
    if (!moved && mode === 'mouse') {
      const a = await page.locator('[data-square="e2"]').first().boundingBox();
      const b = await page.locator('[data-square="e4"]').first().boundingBox();
      if (a && b) {
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
        await sleep(2500);
        dragged = !(await pieceOn('e2')) && (await pieceOn('e4'));
      }
    }
    console.log(`${mode} ${route}: ${moved ? 'MOVED e2-e4' : 'DID NOT MOVE'} before=${JSON.stringify(before)} after=${JSON.stringify(after)}${dragged !== null ? ` drag=${dragged ? 'moved' : 'no'}` : ''}${tapErr ? ` err=${tapErr}` : ''}${errs.length ? ` pageerrors=${errs.join(' | ')}` : ''}`);
    await page.screenshot({ path: `${OUT}-${mode}-${route.replace(/\//g, '_')}.png` });
    await ctx.close();
  }
}
await browser.close();
