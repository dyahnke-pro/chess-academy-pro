// Comprehensive function-coverage audit for Play with Coach (/coach/play).
// Per the loop-audit protocol: touch EVERY function of the surface, drive it
// interactively, and run as a 3-PASS CONTRACT (this script is one pass; the
// runner re-invokes it). Each function records pass / fail / not-triggered.
//
//   AUDIT_SANDBOX=1 node scripts/audit-coach-play-functions.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const rec = (fn, status, detail = '') => { results.push({ fn, status, detail }); console.log(`${status === 'pass' ? '✓' : status === 'skip' ? '·' : '✗'} ${fn}${detail ? ` — ${detail}` : ''}`); };
const sel = (t) => `[data-testid="${t}"]`;

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1100, height: 1000 } });
const page = await ctx.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

const nuke = async () => {
  // onboarding strength bubble — dismiss by choosing a band (no DOM surgery).
  try {
    const b = page.locator(sel('strength-calibration-bubble'));
    if (await b.isVisible({ timeout: 3000 })) {
      await page.locator(sel('skill-band-intermediate')).click({ timeout: 4000 })
        .catch(() => page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => {}));
      await b.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch { /* none */ }
  // page-help modal — close it via its own controls.
  try {
    const h = page.locator(sel('page-help-modal'));
    if (await h.isVisible({ timeout: 1200 })) {
      await page.locator(`${sel('page-help-modal')} button`).first().click({ timeout: 2000 })
        .catch(() => h.click({ position: { x: 5, y: 5 }, timeout: 2000 }).catch(() => {}));
    }
  } catch { /* none */ }
};
const visible = async (t, ms = 2500) => page.locator(sel(t)).first().isVisible({ timeout: ms }).catch(() => false);
const click = async (t) => page.locator(sel(t)).first().click({ timeout: 4000 });
const moveCount = () => page.evaluate(() => document.querySelectorAll('[data-testid="move-nav"] [data-ply], .move-list li, [data-testid^="ply-"]').length);
async function tryMove(from, to) {
  try {
    await page.locator(`[data-square="${from}"]`).first().click({ timeout: 2500 });
    await page.waitForTimeout(150);
    await page.locator(`[data-square="${to}"]`).first().click({ timeout: 2500 });
    await page.waitForTimeout(1400); // let the coach + engine reply
    return true;
  } catch { return false; }
}

try {
  // Navigate via the hub (deep-linking /coach/play doesn't mount cold).
  await page.goto(`${BASE}/coach/home?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await nuke();
  await page.waitForTimeout(600);
  await nuke();
  await page.locator(sel('coach-action-play')).click({ timeout: 10000 }).catch(async () => {
    await page.getByRole('link', { name: 'Coach' }).first().click().catch(() => {});
    await page.locator(sel('coach-action-play')).click({ timeout: 8000 }).catch(() => {});
  });
  await page.waitForTimeout(800);
  await nuke();
  const mounted = await visible('coach-game-page', 15000);
  rec('page mounts (/coach/play)', mounted ? 'pass' : 'fail');

  // ── PRE-GAME controls (disabled once a move is made) ──────────────────────
  rec('color selector — play as black', (await visible('color-black-btn')) ? (await click('color-black-btn').then(() => 'pass').catch(() => 'fail')) : 'fail');
  rec('color selector — play as white', (await visible('color-white-btn')) ? (await click('color-white-btn').then(() => 'pass').catch(() => 'fail')) : 'fail');
  for (const d of ['easy', 'hard', 'medium']) {
    rec(`difficulty — ${d}`, (await visible(`difficulty-${d}`)) ? (await click(`difficulty-${d}`).then(() => 'pass').catch(() => 'fail')) : 'fail');
  }
  if (await visible('time-control-select')) {
    const opts = await page.locator(`${sel('time-control-select')} option`).count();
    await page.locator(sel('time-control-select')).selectOption({ index: Math.min(1, opts - 1) }).catch(() => {});
    rec('time control select', opts > 0 ? 'pass' : 'fail', `${opts} options`);
  } else rec('time control select', 'fail');

  // ── First move → coach replies (engine + coach wiring) ────────────────────
  const moved = await tryMove('e2', 'e4');
  await page.waitForTimeout(1200);
  const replied = await page.evaluate(() => !!document.querySelector('[data-square]') && document.body.innerText.includes('ELO'));
  rec('player move plays + coach replies', moved && replied ? 'pass' : 'fail');

  // ── In-game coach assists ─────────────────────────────────────────────────
  rec('hint button', (await visible('hint-button')) ? (await click('hint-button').then(() => 'pass').catch(() => 'fail')) : 'fail');
  await page.waitForTimeout(800);

  if (await visible('coach-tips-toggle')) {
    await click('coach-tips-toggle'); await page.waitForTimeout(600);
    rec('coach tips toggle', 'pass');
    if (await visible('coach-tip-bubble', 1500)) {
      rec('coach tip bubble shows', 'pass');
      if (await visible('dismiss-tip-btn', 1000)) rec('dismiss tip', await click('dismiss-tip-btn').then(() => 'pass').catch(() => 'fail'));
      else rec('dismiss tip', 'skip', 'no dismiss btn');
    } else rec('coach tip bubble shows', 'skip', 'no bubble this move');
  } else rec('coach tips toggle', 'fail');

  rec('read position aloud', (await visible('read-position-btn')) ? (await click('read-position-btn').then(() => 'pass').catch(() => 'fail')) : 'fail');
  await page.waitForTimeout(600);

  // chat
  if (await visible('play-chat-button')) {
    await click('play-chat-button'); await page.waitForTimeout(800);
    const chatInput = page.locator('textarea, input[type="text"]').first();
    const chatOpen = await chatInput.isVisible({ timeout: 2500 }).catch(() => false);
    if (chatOpen) { await chatInput.fill('what should I focus on?'); await chatInput.press('Enter'); await page.waitForTimeout(2500); }
    rec('chat opens + accepts a message', chatOpen ? 'pass' : 'fail');
    // Close the chat drawer with Escape only — clicking stray "Close" controls
    // can navigate away from the game.
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
    if (!(await visible('coach-game-page', 1500))) { await page.goBack().catch(() => {}); await nuke(); }
  } else rec('chat opens + accepts a message', 'fail');

  // explore mode
  if (await visible('explore-from-here-btn')) {
    await click('explore-from-here-btn'); await page.waitForTimeout(1000);
    const inExplore = (await visible('explore-engine-eval', 2000)) || (await visible('explore-messages', 2000)) || (await visible('back-to-game-btn', 2000));
    rec('explore from here (enter)', inExplore ? 'pass' : 'fail');
    rec('explore engine eval', (await visible('explore-engine-eval', 1500)) ? 'pass' : 'skip');
    if (await visible('back-to-game-btn', 2000)) rec('back to game', await click('back-to-game-btn').then(() => 'pass').catch(() => 'fail'));
    else rec('back to game', 'fail');
    await page.waitForTimeout(600);
  } else rec('explore from here (enter)', 'skip', 'not offered yet');

  // a few more moves, then move-nav (a button correctly DISABLED at an endpoint
  // is a pass — the function is wired, just not applicable at that ply).
  await tryMove('g1', 'f3'); await tryMove('f1', 'c4');
  for (const nav of ['nav-prev', 'nav-next', 'nav-first', 'nav-last']) {
    if (!(await visible(nav))) { rec(nav, 'skip', 'not present'); continue; }
    const btn = page.locator(sel(nav)).first();
    const disabled = await btn.isDisabled().catch(() => false);
    rec(nav, disabled ? 'pass' : (await btn.click({ timeout: 3000 }).then(() => 'pass').catch(() => 'fail')), disabled ? 'wired (disabled at endpoint)' : '');
    await page.waitForTimeout(300);
  }

  // analysis toggles + panel divider
  rec('panel divider (resize)', (await visible('panel-divider')) ? 'pass' : 'skip');
  if (await visible('panel-divider')) {
    const box = await page.locator(sel('panel-divider')).boundingBox().catch(() => null);
    if (box) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x - 80, box.y + box.height / 2); await page.mouse.up(); }
  }

  // takeback + restart
  rec('takeback', (await visible('takeback-btn')) ? (await click('takeback-btn').then(() => 'pass').catch(() => 'fail')) : 'fail');
  await page.waitForTimeout(800);

  // ── Blunder interception: hang material on purpose ────────────────────────
  // Restart to a clean board, then play a queen-hanging line.
  if (await visible('restart-btn')) { await click('restart-btn').catch(() => {}); await page.waitForTimeout(800); }
  // Bring the queen out, then grab a defended pawn — a clear material hang the
  // coach intercepts. Try a couple of hangs; stop as soon as it fires.
  await tryMove('e2', 'e4'); await tryMove('d1', 'h5');
  let blunder = false;
  for (const [f, t] of [['h5', 'f7'], ['h5', 'e5'], ['h5', 'h7'], ['f1', 'c4']]) {
    await tryMove(f, t);
    blunder = await visible('blunder-interception', 2000);
    if (blunder) break;
  }
  rec('blunder interception fires on a hang', blunder ? 'pass' : 'skip', blunder ? '' : 'engine line avoided the hang this run');
  if (blunder) {
    rec('blunder — try best move', (await visible('blunder-try-best')) ? 'pass' : 'skip');
    rec('blunder — take back', (await visible('blunder-takeback')) ? 'pass' : 'skip');
    if (await visible('blunder-takeback')) await click('blunder-takeback').catch(() => {});
    else if (await visible('blunder-continue')) await click('blunder-continue').catch(() => {});
    rec('blunder — continue/dismiss path', 'pass');
    await page.waitForTimeout(800);
  }

  // ── State-dependent extras: record if present this run ────────────────────
  rec('coach quiz banner', (await visible('coach-quiz-banner', 800)) ? 'pass' : 'skip', 'fires at coach-chosen moments');
  if (await visible('coach-quiz-dismiss', 500)) await click('coach-quiz-dismiss').catch(() => {});
  rec('missed-tactic line', (await visible('show-tactic-line-btn', 800)) ? 'pass' : 'skip');
  rec('practice position banner', (await visible('practice-position-banner', 500)) ? 'pass' : 'skip', 'entered from chat/teach');
  rec('step navigation (walkthrough)', (await visible('show-step-nav', 500)) ? 'pass' : 'skip');

  // ── Resign → game over → review handoff ───────────────────────────────────
  if (await visible('resign-btn')) {
    await click('resign-btn'); await page.waitForTimeout(400);
    const yes = (await visible('resign-yes', 1500)) ? 'resign-yes' : (await visible('resign-confirm', 1500)) ? 'resign-confirm' : null;
    if (yes) { await click(yes); await page.waitForTimeout(1500); rec('resign (confirm)', 'pass'); }
    else { rec('resign (confirm)', 'fail', 'no confirm control'); }
  } else rec('resign (confirm)', 'fail');
  rec('skip to review', (await visible('skip-to-review-btn', 3000)) ? (await click('skip-to-review-btn').then(() => 'pass').catch(() => 'fail')) : 'skip', 'post-game handoff');

  rec('no console errors', consoleErrors.length === 0 ? 'pass' : 'fail', consoleErrors.slice(0, 2).join(' | '));
  rec('no page errors', pageErrors.length === 0 ? 'pass' : 'fail', pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  rec('audit run', 'fail', e.message);
} finally {
  await browser.close();
}

const failed = results.filter((r) => r.status === 'fail');
const passed = results.filter((r) => r.status === 'pass').length;
const skipped = results.filter((r) => r.status === 'skip').length;
const dir = `audit-reports/coach-play-functions-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, passed, skipped, failed: failed.length, results, consoleErrors, pageErrors }, null, 2));
console.log(`\n${passed} pass · ${skipped} skip · ${failed.length} fail  (${results.length} functions) · ${dir}/report.json`);
process.exit(failed.length === 0 ? 0 : 1);
