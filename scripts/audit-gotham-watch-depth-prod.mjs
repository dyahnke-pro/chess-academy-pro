// STRONG post-deploy audit for the GothamChess pro-rep Watch lessons — runs
// against LIVE PROD. Catches the two bugs David found (2026-05-31):
//   1. Watch falls back to legacy WalkthroughMode (generic, board-INACCURATE
//      auto-narration like "Bg5 pins the knight to the queen" when no knight is
//      on f6) because the opening has no hand-authored LessonScript.
//   2. The Watch line is too short — it plays the 8-move repertoire pgn and
//      never reaches a middlegame.
// Detection:
//   - legacy WalkthroughMode renders `[data-testid="walkthrough-progress"]`
//     and the "Move X / N" counter. The masterclass LessonPlayer does NOT.
//   - N (total moves) < MIDDLEGAME_MOVES => the spine doesn't reach a middlegame.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const MIDDLEGAME_MOVES = 12; // a real middlegame Watch should be >= ~12 moves
const OPENINGS = [
  'pro-gothamchess-caro-advance-white', 'pro-gothamchess-italian',
  'pro-gothamchess-london', 'pro-gothamchess-vienna', 'pro-gothamchess-trompowsky',
  'pro-gothamchess-english', 'pro-gothamchess-ponziani', 'pro-gothamchess-anti-sicilian',
  'pro-gothamchess-milner-barry', 'pro-gothamchess-fantasy-caro', 'pro-gothamchess-stafford-refute',
  'pro-gothamchess-kia', 'pro-gothamchess-closed-sicilian', 'pro-gothamchess-caro-kann',
  'pro-gothamchess-scandinavian', 'pro-gothamchess-qgd', 'pro-gothamchess-french-defense',
  'pro-gothamchess-pirc-defense',
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

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

console.log(`=== STRONG Watch-lesson audit vs PROD (${PROD}) ===\n`);
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  waiting 55s for seed...');
await page.waitForTimeout(55000);

let legacyCount = 0, shortCount = 0;
for (const id of OPENINGS) {
  const short = id.replace('pro-gothamchess-', '');
  await page.goto(`${PROD}/openings/pro/gothamchess/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(3000);
  await dismissHelp();

  // Click the main-line Watch button.
  let clicked = false;
  for (const sel of ['button:has-text("Watch")', '[data-testid*="watch"]']) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible().catch(() => false)) { await el.click().catch(() => null); clicked = true; break; }
  }
  if (!clicked) { rec(`${short}: Watch button`, 'WARN', 'not found'); continue; }
  await page.waitForTimeout(2500);
  await dismissHelp();

  // Detect legacy WalkthroughMode vs masterclass LessonPlayer.
  const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
  // Read the "Move X / N" counter (legacy) to measure spine depth.
  let totalMoves = null;
  const body = await page.evaluate(() => document.body.innerText).catch(() => '');
  const m = body.match(/Move\s+\d+\s*\/\s*(\d+)/i) || body.match(/MOVE\s+\d+\s*\/\s*(\d+)/i);
  if (m) totalMoves = parseInt(m[1], 10);

  if (isLegacy) {
    legacyCount++;
    rec(`${short}: Watch uses curated masterclass lesson (not legacy auto-narration)`, 'FAIL', `legacy WalkthroughMode${totalMoves ? `, ${totalMoves} moves` : ''}`);
  } else {
    rec(`${short}: Watch uses curated masterclass lesson`, 'PASS');
  }
  if (totalMoves !== null && totalMoves < MIDDLEGAME_MOVES) {
    shortCount++;
    rec(`${short}: Watch line reaches a middlegame (>= ${MIDDLEGAME_MOVES} moves)`, 'FAIL', `only ${totalMoves} moves`);
  } else if (totalMoves !== null) {
    rec(`${short}: Watch line reaches a middlegame`, 'PASS', `${totalMoves} moves`);
  }
  // Exit back for the next opening.
  await page.locator('[data-testid="walkthrough-back"]').click({ timeout: 3000 }).catch(() => page.goBack().catch(() => null));
  await page.waitForTimeout(800);
}

await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
console.log(`  ${legacyCount}/${OPENINGS.length} openings fall back to legacy auto-narration (no curated lesson)`);
console.log(`  ${shortCount}/${OPENINGS.length} openings have a Watch line that doesn't reach a middlegame`);
process.exit(fail > 0 ? 1 : 0);
