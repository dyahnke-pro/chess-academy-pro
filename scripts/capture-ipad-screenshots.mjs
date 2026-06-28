// Capture 13" iPad screenshots (2064×2752) of the live app for the App Store
// listing. Drives prod with the calibration bubble + page-help modal
// auto-dismissed. Output → audit-reports/ipad-shots/.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OUT = 'audit-reports/ipad-shots';
mkdirSync(OUT, { recursive: true });

// 13" iPad: 2064×2752 px. CSS 1032×1376 @ deviceScaleFactor 2.
const VIEWPORT = { width: 1032, height: 1376 };

const SURFACES = [
  { path: '/', name: '01_dashboard', wait: 6000 },
  { path: '/openings', name: '02_openings', wait: 8000 },
  { path: '/coach', name: '03_coach', wait: 6000 },
  { path: '/tactics', name: '04_tactics', wait: 6000 },
  { path: '/weaknesses', name: '05_weaknesses', wait: 8000 },
  { path: '/openings/vienna-game', name: '06_vienna', wait: 45000 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: VIEWPORT, deviceScaleFactor: 2 });
ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

// Warm the seed once on first load.
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await sleep(4000);

for (const s of SURFACES) {
  try {
    await page.goto(`${BASE}${s.path}`, { waitUntil: 'domcontentloaded' });
    await sleep(s.wait);
    // make sure the bubble/modal are gone
    await page.evaluate(() => {
      document.querySelectorAll('[data-testid="strength-calibration-bubble"],[data-testid="page-help-modal"]').forEach((e) => e.remove());
    });
    await sleep(500);
    const file = `${OUT}/${s.name}.png`;
    await page.screenshot({ path: file });
    console.log(`✅ ${s.name} (${s.path})`);
  } catch (e) {
    console.log(`⚠️  ${s.name} (${s.path}) — ${String(e.message).split('\n')[0]}`);
  }
}

await browser.close();
console.log(`\nDone → ${OUT}`);
