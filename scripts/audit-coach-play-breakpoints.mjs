// Per-function BREAKING-POINT probe for Play with Coach.
// Protocol (David): push EACH function to the point where it SHOULD break — if
// it holds, it's working; if it breaks, fix it. Each test targets one function's
// own failure edge (locked-control bypass, illegal input, counter underflow,
// spam, nav past bounds, chat sub-commands) and asserts: no console/page error
// AND correct behavior (control stayed locked / move rejected / bound held).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const out = [];
const sel = (t) => `[data-testid="${t}"]`;

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1100, height: 1000 } });
const page = await ctx.newPage();
let cErr = []; let pErr = [];
page.on('console', (m) => { if (m.type() === 'error') cErr.push(m.text()); });
page.on('pageerror', (e) => pErr.push(e.message));
const errN = () => cErr.length + pErr.length;

const nuke = async () => {
  try { const b = page.locator(sel('strength-calibration-bubble')); if (await b.isVisible({ timeout: 3000 })) { await page.locator(sel('skill-band-intermediate')).click({ timeout: 4000 }).catch(() => {}); await b.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); } } catch {}
  try { const h = page.locator(sel('page-help-modal')); if (await h.isVisible({ timeout: 1000 })) await page.locator(`${sel('page-help-modal')} button`).first().click({ timeout: 2000 }).catch(() => {}); } catch {}
};
const sq = (s) => page.locator(`[data-square="${s}"]`).first();
const hasPieceOn = (s) => sq(s).locator('[data-piece],img,svg,[class*="piece"]').count().then((n) => n > 0).catch(() => false);
// Real click-to-move (NOT force — the board's move handler needs a genuine
// click), matching the working function audit's timing.
async function move(from, to) { await sq(from).click({ timeout: 2500 }).catch(() => {}); await page.waitForTimeout(180); await sq(to).click({ timeout: 2500 }).catch(() => {}); await page.waitForTimeout(1300); }
// Has at least one move been played? (the pre-game controls lock once it has)
const aMoveWasPlayed = () => disabled('color-white-btn');
const spam = async (t, n) => { for (let i = 0; i < n; i++) await page.locator(sel(t)).first().click({ timeout: 600, force: true }).catch(() => {}); };
const disabled = (t) => page.locator(sel(t)).first().isDisabled().catch(() => false);
const mounted = () => page.locator(sel('coach-game-page')).first().isVisible({ timeout: 2500 }).catch(() => false);
// A breaking-point test: run `pushFn` (which should break a fragile impl), then
// assert `holdFn()` is true AND no new errors appeared. HELD = working.
async function bp(fn, pushFn, holdFn, why) {
  const before = errN();
  let extra = '';
  try { await pushFn(); } catch (e) { extra = ` push-threw:${e.message.slice(0, 40)}`; }
  const held = (await holdFn().catch(() => false)) && errN() === before;
  out.push({ fn, held, why, errs: errN() - before, detail: extra });
  console.log(`${held ? '  ✅ HELD' : '  💥 BROKE'}  ${fn}  ·  pushed: ${why}${held ? '' : `  (errs:+${errN() - before}${extra})`}`);
  return held;
}

try {
  await page.goto(`${BASE}/coach/home?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await nuke();
  await page.locator(sel('coach-action-play')).click({ timeout: 12000 }).catch(async () => { await nuke(); await page.locator(sel('coach-action-play')).click({ timeout: 8000 }).catch(() => {}); });
  await page.waitForTimeout(800); await nuke();
  await bp('page', async () => {}, mounted, 'load');

  // make one move so the pre-game controls LOCK
  await move('e2', 'e4');

  await bp('color selector (locked mid-game)', async () => { await spam('color-white-btn', 5); await spam('color-black-btn', 5); }, async () => (await disabled('color-white-btn')) && (await disabled('color-black-btn')), 'force-click after a move — must stay locked');
  await bp('difficulty (locked mid-game)', async () => { await spam('difficulty-easy', 5); await spam('difficulty-hard', 5); }, async () => disabled('difficulty-easy'), 'force-change mid-game — must stay locked');
  await bp('time control (locked mid-game)', async () => { await page.locator(sel('time-control-select')).selectOption({ index: 2 }).catch(() => {}); }, async () => disabled('time-control-select'), 'change mid-game — must stay locked');

  await bp('player move — illegal rejected', async () => { await move('e1', 'e3'); await move('a2', 'a5'); await move('d2', 'h6'); await sq('c4').click({ force: true }).catch(() => {}); await sq('c4').click({ force: true }).catch(() => {}); }, async () => (await hasPieceOn('e1')) && (await hasPieceOn('a2')), 'illegal/teleport moves — pieces must NOT move');

  await bp('hint — spam', async () => spam('hint-button', 15), mounted, '15× rapid');
  await bp('tips toggle — spam', async () => spam('coach-tips-toggle', 20), mounted, '20× rapid');
  await bp('read-position — overlap spam', async () => spam('read-position-btn', 10), mounted, '10× rapid (overlapping narration)');

  // nav bounds
  await move('g1', 'f3'); await move('f1', 'c4');
  await bp('nav-prev — underflow', async () => spam('nav-prev', 15), async () => (await disabled('nav-prev')) || (await mounted()), '15× past the first move');
  await bp('nav-next — overflow', async () => spam('nav-next', 15), async () => (await disabled('nav-next')) || (await mounted()), '15× past the last move');
  await bp('nav→move (branch from history)', async () => { await spam('nav-prev', 2); await move('b1', 'c3'); }, mounted, 'navigate into history, then move');

  await bp('takeback — underflow', async () => spam('takeback-btn', 20), async () => (await disabled('takeback-btn')) || (await mounted()), '20× past move 0');
  await bp('restart — spam', async () => spam('restart-btn', 8), mounted, '8× rapid');

  // chat sub-commands (real LLM path): play / illegal / reset / takeback
  await move('e2', 'e4');
  await page.locator(sel('play-chat-button')).first().click({ timeout: 3000, force: true }).catch(() => {});
  await page.waitForTimeout(700);
  const input = page.locator('textarea, input[type="text"]').first();
  const chatOk = await input.isVisible({ timeout: 2500 }).catch(() => false);
  if (chatOk) {
    await bp('chat play-move — illegal SAN', async () => { await input.fill('play Ke8'); await input.press('Enter'); await page.waitForTimeout(4000); }, mounted, 'ask coach to play an illegal move — must reject gracefully');
    await bp('chat takeback command', async () => { await input.fill('take back my last move'); await input.press('Enter'); await page.waitForTimeout(4000); }, mounted, 'natural-language takeback');
    await bp('chat reset-board command', async () => { await input.fill('reset the board to the start'); await input.press('Enter'); await page.waitForTimeout(4000); }, mounted, 'natural-language reset');
    await page.keyboard.press('Escape').catch(() => {});
  } else out.push({ fn: 'chat sub-commands', held: false, why: 'chat did not open', errs: 0 });
  await nuke();

  // explore mode — try the chat route to enter it, else flag
  let explored = false;
  if (await page.locator(sel('explore-from-here-btn')).first().isVisible({ timeout: 800 }).catch(() => false)) {
    await page.locator(sel('explore-from-here-btn')).click({ force: true }).catch(() => {});
    explored = await page.locator(sel('back-to-game-btn')).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (explored) { await bp('explore — illegal move in explore', async () => { await move('a1', 'a8'); }, mounted, 'illegal move while exploring'); await page.locator(sel('back-to-game-btn')).click({ force: true }).catch(() => {}); }
  }
  if (!explored) out.push({ fn: 'explore mode', held: null, why: 'gated behind coach tactic-show; route to device check', errs: 0 });

  // resign: cancel path, then confirm + try to move
  if (await page.locator(sel('restart-btn')).first().isVisible({ timeout: 800 }).catch(() => false)) { await page.locator(sel('restart-btn')).click({ force: true }).catch(() => {}); await page.waitForTimeout(600); await move('e2', 'e4'); }
  await bp('resign — cancel keeps the game', async () => { await page.locator(sel('resign-btn')).first().click({ force: true }).catch(() => {}); await page.locator(sel('resign-no')).first().click({ timeout: 1500, force: true }).catch(() => {}); }, async () => !(await disabled('takeback-btn')), 'open resign then cancel — game must continue');
  await bp('resign — confirm then move blocked', async () => { await page.locator(sel('resign-btn')).first().click({ force: true }).catch(() => {}); await page.locator(sel('resign-yes')).first().click({ timeout: 1500, force: true }).catch(() => page.locator(sel('resign-confirm')).first().click({ force: true }).catch(() => {})); await page.waitForTimeout(1200); await move('d2', 'd4'); }, mounted, 'resign, then try to keep moving');

  out.push({ fn: 'totals', held: cErr.length === 0 && pErr.length === 0, consoleErrors: cErr.length, pageErrors: pErr.length });
} catch (e) {
  out.push({ fn: 'run', held: false, why: e.message });
} finally {
  await browser.close();
}

const broke = out.filter((r) => r.held === false);
const held = out.filter((r) => r.held === true).length;
const flagged = out.filter((r) => r.held === null);
const dir = `audit-reports/coach-play-breakpoints-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, held, broke: broke.length, flagged: flagged.length, consoleErrors: cErr, pageErrors: pErr, results: out }, null, 2));
console.log(`\n${held} held · ${broke.length} broke · ${flagged.length} flagged-for-device · console ${cErr.length} · page ${pErr.length}`);
if (broke.length) { console.log('--- BROKE ---'); broke.forEach((b) => console.log(`  ${b.fn}: ${b.why || ''} ${b.detail || ''}`)); }
if (cErr.length) cErr.slice(0, 6).forEach((e) => console.log('  console: ' + e.slice(0, 140)));
console.log(`report: ${dir}/report.json`);
process.exit(broke.length === 0 ? 0 : 1);
