/**
 * audit-coach-isolated-repro.mjs — classify silent-hangs from the loop audit.
 *
 * Re-fires each flagged input ONE AT A TIME on a fresh page with NO concurrent
 * load, and measures time-to-first-response. Per the adversarial-audit doctrine:
 *   - answers in a few seconds alone  → the loop's hang was load/latency, NOT a bug
 *   - still hangs alone (>cap)        → a REAL bug to fix
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-coach-isolated-repro.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const CAP_MS = Number(process.env.REPRO_CAP_MS ?? 120000);
const INPUTS = (process.env.REPRO_INPUTS
  ? JSON.parse(process.env.REPRO_INPUTS)
  : ['what is the main plan in the Vienna?', 'Philidor Defence', 'stop']);

async function transcriptText(page) {
  return page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => '');
}
async function anyPanel(page) {
  const sel = '[data-testid="walkthrough-narrating-panel"],[data-testid="walkthrough-paused-panel"],[data-testid="walkthrough-leaf-panel"],[data-testid="walkthrough-choose-mode"],[data-testid="walkthrough-stage-menu"],[data-testid="line-picker"]';
  return page.locator(sel).first().isVisible().catch(() => false);
}

async function main() {
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });

  for (const input of INPUTS) {
    const ctx = await browser.newContext({ ...sandboxContextOptions() });
    await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
    const page = await ctx.newPage();
    let verdict = 'NO-RESPONSE';
    let elapsed = CAP_MS;
    try {
      await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 20000 });
      // dismiss any page-help modal
      await page.locator('[data-testid="page-help-modal"] button, [data-testid="page-help-close"]').first().click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(800);
      const before = (await transcriptText(page)).length;
      await page.locator('[data-testid="chat-text-input"]').fill(input, { timeout: 8000 });
      await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 8000, force: true });
      const t0 = Date.now();
      while (Date.now() - t0 < CAP_MS) {
        if ((await transcriptText(page)).length > before + 2 || (await anyPanel(page))) {
          verdict = 'RESPONDED'; elapsed = Date.now() - t0; break;
        }
        await page.waitForTimeout(500);
      }
    } catch (e) {
      verdict = `ERROR: ${e.message.slice(0, 80)}`;
    }
    const cls = verdict === 'RESPONDED'
      ? (elapsed < 30000 ? 'LOAD-ARTIFACT (answers fine alone)' : 'SLOW (answered but >30s)')
      : 'REAL-HANG (no response even alone)';
    console.log(`• "${input}" → ${verdict} in ${(elapsed / 1000).toFixed(1)}s → ${cls}`);
    await ctx.close();
  }

  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
