#!/usr/bin/env node
/**
 * audit-anti-parity-prod — post-deploy check for the anti-opening
 * masterclass-parity content layers (middlegame plans + model games).
 *
 * Drives the LIVE /openings/<anti-id> detail page, waits for the
 * deferred seed, and asserts the Middlegame Plans + Model Games
 * sections render the NEW curated content (specific plan-line +
 * model-game testids), capturing console/page errors per opening.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-anti-parity-prod.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-anti-parity-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/anti-parity-${stamp}`;

// (openingId, expected plan-id substring, expected model-game-id substring)
const TARGETS = [
  ['anti-grand-prix-black', 'mp-antigrandprix-clamp', 'mg-antigrand-prix-black'],
  ['anti-caro-fantasy', 'mp-anticaro-fantasy', 'mg-anticaro-fantasy'],
  ['anti-kings-gambit-black', 'mp-antikings-gambit-black', 'mg-antikings-gambit-black'],
  ['anti-catalan-black', 'mp-anticatalan-black', 'mg-anticatalan-black'],
  ['anti-englund', 'mp-antienglund', 'mg-antienglund'],
];

const SEED_WAIT_MS = 70_000;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[anti-parity] base=${BASE_URL}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditAntiParityBot/1.0 (chromium)',
  });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
  const page = await ctx.newPage();

  const results = [];
  for (const [id, planSub, mgSub] of TARGETS) {
    const errors = [];
    const onErr = (e) => errors.push(String(e.message ?? e));
    const onConsole = (m) => { if (m.type() === 'error') errors.push(m.text()); };
    page.on('pageerror', onErr);
    page.on('console', onConsole);
    const r = { id, planSection: false, planLine: false, mgSection: false, mgCard: false, errors: [] };
    try {
      await page.goto(`${BASE_URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      // dismiss any page-help modal
      try {
        const help = page.locator('[data-testid="page-help-modal"] button, [data-testid="page-help-close"]').first();
        await help.click({ timeout: 4000 });
      } catch {}
      // wait for the seed + sections to mount
      const planSection = page.locator('[data-testid="middlegame-plans-section"]');
      try { await planSection.waitFor({ state: 'attached', timeout: SEED_WAIT_MS }); r.planSection = true; } catch {}
      // scroll to force lazy sections into view
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);
      r.planLine = (await page.locator(`[data-testid^="plan-line-${planSub}"]`).count()) > 0
        || (await page.locator(`[data-testid="plan-line-${planSub}"]`).count()) > 0;
      r.mgSection = (await page.locator('[data-testid="model-games-section"]').count()) > 0;
      r.mgCard = (await page.locator(`[data-testid^="model-game-card-${mgSub}"]`).count()) > 0;
    } catch (e) {
      r.errors.push(`nav: ${String(e.message ?? e)}`);
    }
    // only app-level errors (ignore noisy network/CSP third-party)
    r.errors.push(...errors.filter((e) => !/net::|Failed to load resource|favicon|manifest|analytics|posthog/i.test(e)));
    page.off('pageerror', onErr);
    page.off('console', onConsole);
    const pass = r.planSection && r.planLine && r.mgSection && r.mgCard && r.errors.length === 0;
    r.pass = pass;
    results.push(r);
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}  plan=${r.planSection}/${r.planLine} model=${r.mgSection}/${r.mgCard} errs=${r.errors.length}`);
    if (r.errors.length) console.log('   errors:', r.errors.slice(0, 3).join(' | '));
  }

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
  const passed = results.filter((r) => r.pass).length;
  console.log(`\n[anti-parity] ${passed}/${results.length} openings green. report: ${OUT_DIR}/report.json`);
  process.exit(passed === results.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
