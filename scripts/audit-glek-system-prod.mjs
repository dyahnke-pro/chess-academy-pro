// Post-deploy audit for the Glek System standalone masterclass (David 2026-07-03).
// Verifies against LIVE PROD that the promoted `glek-system` renders the full
// masterclass (variation tabs + plans + model games + pitfalls), the Watch uses
// the curated LessonPlayer (NOT legacy WalkthroughMode), and the bare Lichess
// ECO twin aliases through to the masterclass instead of the empty reference page.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const rec = (name, status, detail) => { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

async function dismissOnboarding() {
  try {
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown */ }
}
async function dismissHelp() {
  const m = page.locator('[data-testid="page-help-modal"]');
  if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }
}
const bodyText = () => page.evaluate(() => document.body.innerText).catch(() => '');

console.log(`=== Glek System masterclass audit vs PROD (${PROD}) ===\n`);
async function gotoRetry(url, opts, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(url, opts); return true; }
    catch (e) { console.log(`  nav retry ${i + 1} (${(e.message || '').split('\n')[0].slice(0, 50)})`); await page.waitForTimeout(2000 * (i + 1)); }
  }
  return false;
}
await gotoRetry(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  waiting 55s for the deferred seed...');
await page.waitForTimeout(55000);

async function auditPath(label, path) {
  console.log(`\n--- ${label} (${path}) ---`);
  await page.goto(`${PROD}${path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(3500);
  await dismissHelp();
  const body = await bodyText();

  // 1. Resolves to the masterclass, not "Opening not found" / bare page.
  if (/not found/i.test(body)) { rec(`${label}: resolves`, 'FAIL', 'Opening not found'); return; }
  rec(`${label}: title`, 'INFO', (body.split('\n').find((l) => /glek/i.test(l)) || '').slice(0, 60));

  // 2. Variation tabs present (the bare ECO twin has NONE).
  const tabHits = [];
  for (const t of ['Central', 'Pin', 'Fianchetto', 'Symmetrical', '4...d5', '4...Bb4', '4...g6']) {
    if (await page.getByText(t, { exact: false }).count() > 0) tabHits.push(t);
  }
  rec(`${label}: variation tabs render`, tabHits.length >= 2 ? 'PASS' : 'FAIL', tabHits.join(', ') || 'none');

  // 3. Masterclass sections present (plans / model games / pitfalls).
  const sections = ['Middlegame', 'Model Game', 'Mistake', 'Pitfall'].filter((s) => new RegExp(s, 'i').test(body));
  rec(`${label}: masterclass sections`, sections.length >= 2 ? 'PASS' : 'WARN', sections.join(', ') || 'none');

  // 4. Watch uses the curated LessonPlayer, not legacy WalkthroughMode.
  const watch = page.locator('button:has-text("Watch")').first();
  if (await watch.count() > 0) {
    await watch.click().catch(() => null);
    await page.waitForTimeout(2500);
    await dismissHelp();
    const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
    rec(`${label}: Watch is curated lesson (not legacy auto-narration)`, isLegacy ? 'FAIL' : 'PASS', isLegacy ? 'legacy WalkthroughMode' : '');
  } else {
    rec(`${label}: Watch button`, 'WARN', 'not found');
  }
}

await auditPath('canonical', '/openings/glek-system');
await auditPath('ECO-twin alias', '/openings/c47-four-knights-game-glek-system');

await browser.close();
const fails = results.filter((r) => r.status === 'FAIL');
console.log(`\n=== ${results.filter((r) => r.status === 'PASS').length} PASS / ${fails.length} FAIL ===`);
if (fails.length) { for (const f of fails) console.log(`  FAIL ${f.name}${f.detail ? ' — ' + f.detail : ''}`); process.exit(1); }
