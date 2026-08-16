// Focused post-deploy audit for the Weapons WLPP Watch→Learn handoff (PR #741).
//
// The bug: a gem (Weapons) Watch showed a header button labeled "Practice"
// that dropped the student into a silent, un-guided memory replay (no voice,
// no hint, no arrows) — so moves got rejected and it felt stuck. The fix gives
// PlayableLinePlayer an `onAdvanceToLearn` prop so Watch's header button reads
// "Learn" and hands off to the Learn rung (same board, pieces reset, voice
// guides you to play the punish).
//
// This drives it on LIVE prod: seed the unlock, open a gem's Watch, assert the
// header button is `advance-to-learn` (text "Learn") and NOT `skip-to-memory`,
// then click it and assert we land on the Learn rung (memory phase, "Learn —
// listen, then play the move").
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-gem-watch-learn-handoff-prod.mjs
import { chromium } from 'playwright';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENINGS = (process.env.AUDIT_OPENING ?? 'caro-kann,vienna-game,italian-game,ruy-lopez').split(',');

async function dismissOverlays(page) {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 6000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown */ }
  try {
    const help = page.locator('[data-testid="page-help-modal"]');
    await help.waitFor({ state: 'visible', timeout: 3000 });
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* none */ }
}

async function run() {
  const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
  const proxyServer = isLocal ? undefined : (process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
    ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
  });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await context.newPage();
  const results = [];

  for (const opening of OPENINGS) {
    const r = { opening, steps: {} };
    try {
      await page.goto(`${BASE}/openings/${opening}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await dismissOverlays(page);
      // Let the deferred seed land the opening record.
      await page.waitForTimeout(45000);
      const seed = await seedUnlockedOpenings(page, [opening]);
      r.steps.seed = seed;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await dismissOverlays(page);
      await page.waitForTimeout(4000);

      // Find any surfaced gem Watch button.
      const gemWatch = page.locator('[data-testid^="gem-watch-"]').first();
      try {
        await gemWatch.waitFor({ state: 'visible', timeout: 20000 });
      } catch {
        r.steps.gemPresent = false;
        r.verdict = 'NO_GEM_SURFACED';
        results.push(r);
        continue;
      }
      r.steps.gemPresent = true;
      await gemWatch.scrollIntoViewIfNeeded();
      await gemWatch.click();

      // Watch demo should mount.
      await page.locator('[data-testid="line-player-demo"]').waitFor({ state: 'visible', timeout: 15000 });
      r.steps.watchMounted = true;

      // THE FIX: header button is "Learn" (advance-to-learn), not "Practice".
      const advance = page.locator('[data-testid="advance-to-learn"]');
      const skip = page.locator('[data-testid="skip-to-memory"]');
      r.steps.advanceToLearnPresent = await advance.count() > 0;
      r.steps.skipToMemoryAbsent = await skip.count() === 0;
      r.steps.buttonLabel = r.steps.advanceToLearnPresent ? (await advance.innerText()).trim() : null;

      if (!r.steps.advanceToLearnPresent || !r.steps.skipToMemoryAbsent) {
        r.verdict = 'FAIL_BUTTON';
        results.push(r);
        continue;
      }

      // Click it → land on the Learn rung (memory phase, guided subtitle).
      const errs = [];
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
      page.on('pageerror', (e) => errs.push('PAGEERR: ' + String(e).slice(0, 200)));
      await advance.click();
      try {
        await page.locator('[data-testid="line-player-memory"]').waitFor({ state: 'visible', timeout: 15000 });
      } catch (e) {
        r.steps.afterClickTestids = await page.evaluate(() =>
          [...document.querySelectorAll('[data-testid]')].map((el) => el.getAttribute('data-testid')).slice(0, 25));
        r.steps.afterClickText = await page.evaluate(() => ({
          h2: [...document.querySelectorAll('h1,h2')].map((e) => e.textContent?.trim()).slice(0, 4),
          subtitle: [...document.querySelectorAll('p')].map((e) => e.textContent?.trim()).filter(Boolean).slice(0, 4),
        }));
        r.steps.consoleErrors = errs.filter((e) => !e.includes('ERR_CONNECTION_CLOSED')).slice(0, 8);
        throw e;
      }
      const subtitle = await page.locator('text=Learn — listen, then play the move').count();
      r.steps.landedOnLearn = subtitle > 0;
      r.verdict = r.steps.landedOnLearn ? 'PASS' : 'FAIL_HANDOFF';
    } catch (e) {
      r.verdict = 'ERROR';
      r.error = String(e).split('\n')[0];
    }
    results.push(r);
  }

  await browser.close();
  console.log(JSON.stringify({ base: BASE, results }, null, 2));
  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const realFail = results.filter((r) => r.verdict.startsWith('FAIL') || r.verdict === 'ERROR').length;
  console.log(`\n${pass} PASS / ${realFail} FAIL / ${results.length} openings`);
  process.exit(realFail > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
