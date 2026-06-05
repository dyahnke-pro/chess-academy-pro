// Render /rpg-demo and screenshot the board so we can eyeball the costumes.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const waitFor = (url, ms = 20000) => new Promise((res, rej) => {
  const t0 = Date.now();
  const tick = async () => {
    try { const r = await fetch(url); if (r.ok) return res(); } catch { /* */ }
    if (Date.now() - t0 > ms) return rej(new Error('no server'));
    setTimeout(tick, 300);
  };
  tick();
});

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  await waitFor(BASE);
  const exe = await resolveChromiumExecutable();
  browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 520, height: 900 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  // Hide onboarding/help overlays via CSS so they don't cover the board (survives re-render).
  await page.addInitScript(() => {
    const s = document.createElement('style');
    s.textContent = '[data-testid="strength-calibration-bubble"],[data-testid="page-help-modal"]{display:none!important}';
    document.documentElement.appendChild(s);
  });
  await page.goto(`${BASE}/rpg-demo`, { waitUntil: 'networkidle' });
  const board = page.locator('[data-testid="rpg-chess-board"]');
  await board.waitFor({ timeout: 10000 });
  await page.addStyleTag({ content: '[data-testid="strength-calibration-bubble"],[data-testid="page-help-modal"],[role="dialog"]{display:none!important}' });
  await page.waitForTimeout(1200); // let sprite sheets decode
  await board.screenshot({ path: '/tmp/rpg-board.png' });
  console.log('shot saved /tmp/rpg-board.png');
} catch (e) {
  console.error('SHOT ERROR', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
