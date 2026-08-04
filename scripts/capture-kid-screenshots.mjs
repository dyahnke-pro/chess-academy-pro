/**
 * capture-kid-screenshots.mjs — App Store screenshots of the KIDS section at
 * iPhone 6.7" (1290×2796 = 430×932 logical @ 3x). Kids hub + a kid puzzle +
 * Pawn Wars (the "pawn rush" game). Raw un-framed captures.
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/capture-kid-screenshots.mjs
 */
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const OUT = 'audit-reports/kid-screenshots';

const SHOTS = [
  { name: '01-kid-hub', path: '/kid', wait: 4000 },
  { name: '02-kid-puzzle', path: '/kid/puzzles', wait: 4000, advance: 'Start Puzzles', afterWait: 9000 },
  { name: '03-pawn-wars', path: '/kid/pawn-games/pawn-wars/1', wait: 4000, advance: 'Start', afterWait: 9000 },
  { name: '04-pawn-games-hub', path: '/kid/pawn-games', wait: 4000 },
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

  // Warm the app once so the deferred seed (puzzle pool, kid data) lands before
  // we hit puzzle/game surfaces on a cold prod context.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(60000); // let the deferred seed (kid puzzle pool + game data) land

  for (const shot of SHOTS) {
    try {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // dismiss calibration bubble + page-help modal if they intercept
      await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 3000 }).catch(() => undefined);
      await page.locator('[data-testid="page-help-modal"] button, [data-testid="page-help-close"]').first()
        .click({ timeout: 2500 }).catch(() => undefined);
      await page.waitForTimeout(shot.wait);
      // Advance past an intro/level card into the actual board, if requested.
      if (shot.advance) {
        await page.locator(`button:has-text("${shot.advance}")`).first()
          .click({ timeout: 4000 }).catch(() => undefined);
        await page.waitForTimeout(shot.afterWait || 4000);
      }
      const file = `${OUT}/${shot.name}.png`;
      await page.screenshot({ path: file });
      console.log(`✓ ${shot.name} → ${file}`);
    } catch (e) {
      console.log(`✗ ${shot.name} — ${e.message.slice(0, 120)}`);
    }
  }
  await browser.close();
  console.log(`\nKid screenshots in ${OUT}/ (1290×2796, App Store 6.7").`);
}
main().catch((e) => { console.error(e); process.exit(1); });
