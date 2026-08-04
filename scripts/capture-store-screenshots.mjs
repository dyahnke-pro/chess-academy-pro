/**
 * capture-store-screenshots.mjs — raw App Store screenshots at iPhone 6.7"
 * (1290×2796 = 430×932 logical @ 3x). Captures the key value surfaces from a
 * local dev server. These are UN-FRAMED raw captures — a submittable starting
 * point; for best conversion, add the marketing captions from LAUNCH_PLAYBOOK
 * §5 and device frames. Data-heavy surfaces (insights/weaknesses) look best
 * captured on-device with real imported games.
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/capture-store-screenshots.mjs
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const OUT = 'audit-reports/store-screenshots';

const SHOTS = [
  { name: '01-dashboard', path: '/', wait: 3500 },
  { name: '02-openings', path: '/openings', wait: 4000 },
  { name: '03-coach-home', path: '/coach/home', wait: 3500 },
  { name: '04-tactics', path: '/tactics', wait: 3500 },
  { name: '05-weaknesses', path: '/weaknesses', wait: 3500 },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 3, // → 1290×2796, App Store 6.7" requirement
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
  const page = await ctx.newPage();

  for (const shot of SHOTS) {
    try {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // dismiss any page-help modal that auto-opens
      await page.locator('[data-testid="page-help-modal"] button, [data-testid="page-help-close"]').first()
        .click({ timeout: 2500 }).catch(() => undefined);
      await page.waitForTimeout(shot.wait);
      const file = `${OUT}/${shot.name}.png`;
      await page.screenshot({ path: file });
      console.log(`✓ ${shot.name} → ${file}`);
    } catch (e) {
      console.log(`✗ ${shot.name} — ${e.message.slice(0, 100)}`);
    }
  }
  await browser.close();
  console.log(`\nScreenshots in ${OUT}/ (1290×2796, App Store 6.7"). Raw — add captions/frames per LAUNCH_PLAYBOOK §5.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
