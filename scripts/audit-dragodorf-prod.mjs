// Post-deploy G1 check for the Dragodorf exemplar (2026-07-02).
// Verifies on LIVE prod: the pro-naroditsky-dragodorf opening reconciles into
// Dexie, the detail page renders, and its Watch uses the CURATED LessonPlayer
// (G9.3 Gate A) — NOT the legacy WalkthroughMode (which renders
// [data-testid="walkthrough-progress"]/[walkthrough-back]).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ID = 'pro-naroditsky-dragodorf';
const results = [];
const rec = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  // Dismiss onboarding calibration bubble.
  try {
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown */ }
  // Let the deferred pro-rep reconcile run (PRO_DATA_REVISION migration seeds the new opening).
  await page.waitForTimeout(58000);

  await page.goto(`${PROD}/openings/pro/naroditsky/${ID}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(3500);
  // Dismiss page-help modal if it auto-opens.
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await help.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }

  const body = (await page.locator('body').innerText().catch(() => '')) || '';
  rec('opening page reconciled + rendered', /Dragodorf/i.test(body), /Dragodorf/i.test(body) ? 'title present' : 'Dragodorf not found (reconcile/seed?)');

  // Enter Watch.
  let clicked = false;
  for (const sel of ['button:has-text("Watch")', '[data-testid*="watch"]']) {
    const b = page.locator(sel).first();
    if (await b.count() > 0) { await b.click({ timeout: 5000 }).catch(() => null); clicked = true; break; }
  }
  await page.waitForTimeout(3000);
  rec('Watch control found + clicked', clicked);

  const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
  rec('Watch uses curated LessonPlayer (Gate A, not legacy WalkthroughMode)', !isLegacy, isLegacy ? 'LEGACY walkthrough detected' : 'curated');

  rec('no page errors during load', errors.length === 0, errors.slice(0, 2).join(' | '));
} finally {
  await browser.close();
}
const pass = results.filter((r) => r.ok).length;
console.log(`\nDragodorf prod audit: ${pass}/${results.length} green`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
