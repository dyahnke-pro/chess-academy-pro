// Post-deploy audit for the FULL Eric Rosen pro-rep (G1 + G9.3 Gate A), live
// PROD. Data-driven over every pro-ericrosen-* opening in pro-repertoires.json:
// for each, opens the page and the main Watch and asserts it renders the curated
// LessonPlayer (NOT legacy WalkthroughMode). Pulls the audit-stream (G2).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const rep = JSON.parse(readFileSync('src/data/pro-repertoires.json', 'utf8'));
const OPENINGS = rep.openings.filter((o) => o.id.startsWith('pro-ericrosen-')).map((o) => o.id);

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }
async function pullStream(since, label) {
  if (!SECRET) return;
  try { const r = await fetch(`${PROD}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } }); const j = await r.json().catch(() => ({})); console.log(`  [audit-stream] ${label}: ${(j.events || []).length} events, storage=${j.storage ?? 'n/a'}`); } catch (e) { console.log(`  [audit-stream] ${label}: ${e.message}`); }
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
async function dismissOnboarding() { try { await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }); await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }); } catch { /* */ } }
async function dismissHelp() { const m = page.locator('[data-testid="page-help-modal"]'); if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); } }

const t0 = Date.now() - 60000;
console.log(`=== Eric Rosen FULL pro-rep audit vs PROD (${PROD}) — ${OPENINGS.length} openings ===\n`);
await pullStream(t0, 'before');
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  waiting 55s for seed...');
await page.waitForTimeout(55000);

for (const id of OPENINGS) {
  await page.goto(`${PROD}/openings/pro/ericrosen/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(2500);
  await dismissHelp();
  const renders = await page.locator('body').evaluate((b) => b.innerText.length > 1500).catch(() => false);
  if (!renders) { rec(`${id}: page renders`, 'FAIL', 'thin/empty page'); continue; }
  let clicked = false;
  for (const sel of ['button:has-text("Watch")', '[data-testid*="watch"]']) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible().catch(() => false)) { await el.click().catch(() => null); clicked = true; break; }
  }
  if (!clicked) { rec(`${id}: Watch button`, 'WARN', 'not found'); continue; }
  await page.waitForTimeout(2500);
  await dismissHelp();
  const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
  rec(`${id}: curated Watch lesson (not legacy)`, isLegacy ? 'FAIL' : 'PASS');
}
await pullStream(t0, 'after');
await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
process.exit(fail > 0 ? 1 : 0);
