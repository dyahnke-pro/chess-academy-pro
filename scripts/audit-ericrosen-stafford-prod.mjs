// Post-deploy audit for the Eric Rosen Stafford Gambit pro-rep (G1 + G9.3
// Gates A+B), runs against LIVE PROD. Clone of audit-gotham-watch-depth-prod.mjs
// scoped to pro-ericrosen-stafford + its variation tabs.
//   - Gate A: Watch renders the curated LessonPlayer, NOT legacy WalkthroughMode
//     (legacy = [data-testid="walkthrough-progress"/"walkthrough-back"]).
//   - Gate B: the Watch line reaches a middlegame (>= MIDDLEGAME_MOVES).
// Also pulls the live audit-stream before/after (G2) so the run's emitted
// events (navigation, voice/narration) are inspected.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const MIDDLEGAME_MOVES = 12;
const OPENING_ID = 'pro-ericrosen-stafford';
const URL = `${PROD}/openings/pro/ericrosen/${OPENING_ID}`;
const VARIATIONS = [
  'Five Knights (5.Nc3)', 'Space Grab (5.e5)', 'Knight Retreat (4.Nf3)',
  'Four Knights Decline (3.Nc3)', 'Pawn Returned (4.d4)',
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

async function pullStream(sinceMs, label) {
  if (!SECRET) { console.log(`  [audit-stream] ${label}: no AUDIT_STREAM_SECRET, skipping`); return; }
  try {
    const r = await fetch(`${PROD}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': SECRET } });
    const j = await r.json().catch(() => ({}));
    const events = Array.isArray(j.events) ? j.events : [];
    const voice = events.filter((e) => /voice|narration|speak/i.test(JSON.stringify(e))).length;
    console.log(`  [audit-stream] ${label}: ${events.length} events (${voice} voice/narration), storage=${j.storage ?? 'n/a'}`);
  } catch (e) { console.log(`  [audit-stream] ${label}: ${e.message}`); }
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

async function dismissOnboarding() {
  try { await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }); await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }); } catch { /* */ }
}
async function dismissHelp() {
  const m = page.locator('[data-testid="page-help-modal"]');
  if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => { await m.locator('button').last().click({ force: true }).catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }); }
}
async function checkWatch(label) {
  await page.waitForTimeout(2200);
  await dismissHelp();
  let clicked = false;
  for (const sel of ['button:has-text("Watch")', '[data-testid*="watch"]']) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible().catch(() => false)) { await el.click().catch(() => null); clicked = true; break; }
  }
  if (!clicked) { rec(`${label}: Watch button`, 'WARN', 'not found'); return; }
  await page.waitForTimeout(2500);
  await dismissHelp();
  const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
  const body = await page.evaluate(() => document.body.innerText).catch(() => '');
  const m = body.match(/Move\s+\d+\s*\/\s*(\d+)/i);
  const totalMoves = m ? parseInt(m[1], 10) : null;
  if (isLegacy) rec(`${label}: curated lesson (not legacy)`, 'FAIL', `legacy WalkthroughMode${totalMoves ? `, ${totalMoves} moves` : ''}`);
  else rec(`${label}: curated lesson (not legacy)`, 'PASS');
  if (totalMoves !== null && totalMoves < MIDDLEGAME_MOVES) rec(`${label}: reaches middlegame (>=${MIDDLEGAME_MOVES})`, 'FAIL', `only ${totalMoves}`);
  else if (totalMoves !== null) rec(`${label}: reaches middlegame`, 'PASS', `${totalMoves} moves`);
  await page.locator('[data-testid="walkthrough-back"]').click({ timeout: 3000 }).catch(() => null);
  await page.waitForTimeout(700);
}

const t0 = Date.now() - 60000;
console.log(`=== Eric Rosen Stafford Watch audit vs PROD (${PROD}) ===\n`);
await pullStream(t0, 'before');
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  waiting 55s for seed...');
await page.waitForTimeout(55000);

await page.goto(URL, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
await page.waitForTimeout(3000);
await dismissHelp();
// page renders?
const pageOk = await page.locator('body').evaluate((b) => /Stafford/i.test(b.innerText)).catch(() => false);
rec('opening page renders (Stafford visible)', pageOk ? 'PASS' : 'FAIL');
await checkWatch('main');

// Variation tabs. The tab BUTTON is labelled by the parenthetical short form
// ("Five Knights (5.Nc3)" → button text "5.Nc3"). Re-navigate fresh per tab
// (the curated LessonPlayer has no legacy back button to return from a Watch).
for (const v of VARIATIONS) {
  const label = (v.match(/\(([^)]+)\)/) || [null, v])[1];
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(2500);
  await dismissHelp();
  const tab = page.locator(`button:text-is("${label}")`).first();
  if (await tab.count() > 0 && await tab.isVisible().catch(() => false)) {
    await tab.scrollIntoViewIfNeeded().catch(() => null);
    await tab.click().catch(() => null);
    await page.waitForTimeout(1500);
    await checkWatch(`var: ${label}`);
  } else {
    rec(`var: ${v} tab`, 'WARN', `tab "${label}" not found`);
  }
}

await pullStream(t0, 'after');
await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
process.exit(fail > 0 ? 1 : 0);
