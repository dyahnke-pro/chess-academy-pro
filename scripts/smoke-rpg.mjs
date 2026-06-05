// Smoke test for the /rpg-demo interactive board. Serves the built dist via
// vite preview, loads the route, plays e2-e4, and asserts the board mounted,
// the move committed (turn flips), and no page/console errors fired.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PORT = 4178;
const BASE = `http://localhost:${PORT}`;

function waitFor(url, ms = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try { const r = await fetch(url); if (r.ok) return resolve(); } catch { /* not up yet */ }
      if (Date.now() - start > ms) return reject(new Error('server never came up'));
      setTimeout(tick, 300);
    };
    tick();
  });
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: process.cwd(), stdio: 'ignore' });
let browser;
try {
  await waitFor(BASE);
  const exe = await resolveChromiumExecutable();
  browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto(`${BASE}/rpg-demo`, { waitUntil: 'networkidle' });

  // Dismiss the first-run strength-calibration bubble (+ any page-help modal),
  // which otherwise intercept pointer events. The async profile write can stall
  // in-sandbox, so after the normal click we force-remove any leftover overlay.
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.count()) {
      await page.locator('[data-testid^="skill-band-"]').first().click({ timeout: 3000 }).catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
    }
  } catch { /* ignore */ }
  await page.evaluate(() => {
    for (const sel of ['[data-testid="strength-calibration-bubble"]', '[data-testid="page-help-modal"]']) {
      document.querySelectorAll(sel).forEach((e) => e.remove());
    }
  });
  await page.waitForTimeout(200);

  const board = page.locator('[data-testid="rpg-chess-board"]');
  await board.waitFor({ timeout: 10000 });
  const status0 = (await page.locator('[data-testid="rpg-status"]').textContent())?.trim();

  await page.screenshot({ path: '/tmp/rpg-before.png' });
  const bubblePresent = await page.locator('[data-testid="strength-calibration-bubble"]').count();

  // Fire the click straight on the square element (dispatchEvent bypasses the
  // onboarding overlay's pointer interception, which the sandbox can't dismiss).
  await page.locator('[data-square="e2"]').dispatchEvent('click');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/rpg-selected.png' });
  await page.locator('[data-square="e4"]').dispatchEvent('click');
  await page.waitForTimeout(2600); // walk animation + commit

  const status1 = (await page.locator('[data-testid="rpg-status"]').textContent())?.trim();

  const move = async (from, to, wait) => {
    await page.locator(`[data-square="${from}"]`).dispatchEvent('click');
    await page.waitForTimeout(250);
    const dots = await page.locator(`[data-square="${to}"] div`).count();
    const sel = await board.getAttribute('data-selected');
    await page.locator(`[data-square="${to}"]`).dispatchEvent('click');
    await page.waitForTimeout(wait);
    const st = (await page.locator('[data-testid="rpg-status"]').textContent())?.trim();
    const fen = (await board.getAttribute('data-fen'))?.split(' ').slice(0, 2).join(' ');
    console.log(`  move ${from}-${to}: selected=${sel} legalDot=${dots} -> ${st} | ${fen}`);
    return st;
  };
  // A short game that exercises every combat style:
  await move('e7', 'e5', 1500); // black pawn (melee walk)
  await move('f1', 'c4', 1800); // white bishop develops
  await move('b8', 'c6', 2200); // black knight LEAP
  const statusArcher = await move('c4', 'f7', 3600); // white BISHOP ARCHER captures f7 (bow + arrow)
  const statusFinal = await move('e8', 'f7', 2200); // black king captures the bishop (melee)
  await page.screenshot({ path: '/tmp/rpg-after.png' });

  console.log(JSON.stringify({ status0, status1, statusArcher, statusFinal, mounted: true, bubblePresent, errors }, null, 2));
  const ok =
    status0?.includes('White') &&
    status1?.includes('Black') &&
    statusArcher?.includes('Black') && // after the archer capture it's Black to move (in check)
    statusFinal?.includes('White') && // after Kxf7 it's White's move
    errors.length === 0;
  console.log(ok ? '\nSMOKE PASS ✅ (mounts; leap + archer-capture + melee-capture all commit; no errors)' : '\nSMOKE FAIL ❌');
  process.exitCode = ok ? 0 : 1;
} catch (e) {
  console.error('SMOKE ERROR', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
