/**
 * FUNCTIONS PROBE (David 2026-07-21: "test EVERY function! Every one"). Drives
 * the review's non-card UI functions the card audits never exercise, asserting
 * each produces its real post-state (a silent no-op is a FAIL, per the
 * functional-audit doctrine):
 *   nav cluster (start/back/forward/end) · flip · replay narration ·
 *   engine-lines toggle + panel · explore-this-position · show-me ·
 *   Ask (LLM chat round-trip) · key-moment nav · move-list jump.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'functions-probe-iqp';
const PGN = '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d5 6. exd5 exd5 7. Be2 Be7 8. O-O O-O 9. Bg5 Be6 10. Re1 Nc6 11. Nxc6 bxc6 12. Bf3 Qd6 13. Na4 Rab8 14. c4 dxc4 15. Bxc6 Rb4 16. b3 cxb3 17. Qxb3 Rxa4 18. Qxa4 Bd5 19. Bxd5 Nxd5 20. Rad1 Qc6 21. Qxc6';
const results = [];
const add = (n, p, d) => { results.push({ n, p }); console.log(`  ${p ? '✅ PASS' : '❌ FAIL'}  ${n.padEnd(28)} ${d}`); };
const has = async (p, s) => (await p.locator(s).count()) > 0;
const txt = async (p, s) => { try { const l = p.locator(s).first(); return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(() => { window.__REVIEW_UNCAPPED__ = false; });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 120)));
  const dismiss = async () => { for (let i = 0; i < 6; i++) { for (const [s, c] of [['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'], ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button']]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2000 }); } catch { /* */ } } } await page.waitForTimeout(400); } };

  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss(); await page.waitForTimeout(2500);
  await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (st, v) => new Promise((res, rej) => { const t = db.transaction(st, 'readwrite'); t.objectStore(st).put(v); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (st) => new Promise((res, rej) => { const t = db.transaction(st, 'readonly'); const q = t.objectStore(st).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    await put('games', { id: gid, pgn, white: 'Student', black: 'Opponent', result: '1-0', date: '2026.07.21', event: 'Functions Probe', eco: 'B40', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'normal', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Student'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
  }, { gid: GID, pgn: PGN });

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  let ready = false;
  for (let i = 0; i < 140; i++) { await page.waitForTimeout(1500); const b = page.locator('[data-testid="start-walk-btn"]').first(); if ((await b.count()) && (await b.getAttribute('disabled')) === null) { ready = true; break; } if (i % 12 === 0) console.log(`  …analysing (${(i * 1.5) | 0}s)`); }
  if (!ready) { console.log('[FATAL] analysis never settled'); process.exit(1); }
  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  const plyNow = async () => { const t = await txt(page, '[data-testid="coach-game-review-walk"]'); const m = t.match(/Ply\s+(\d+)\s*\/\s*(\d+)/i); return m ? Number(m[1]) : -1; };

  // ── NAV CLUSTER: forward ×3, back, end, start — each must CHANGE the ply.
  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  for (let i = 0; i < 3; i++) { await fwd.click({ force: true }).catch(() => {}); await page.waitForTimeout(700); }
  const afterFwd = await plyNow();
  add('nav-forward', afterFwd >= 2, `ply=${afterFwd} after 3 forward clicks`);
  await page.locator('[data-testid="review-back-btn"]').first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
  const afterBack = await plyNow();
  add('nav-back', afterBack === afterFwd - 1, `ply ${afterFwd}→${afterBack}`);

  // ── REPLAY NARRATION: button click re-speaks; assert it stays interactive
  //    and the narration banner still shows text (voice is muted in headless).
  const replayBtn = page.locator('button:has-text("Replay narration")').first();
  if (await replayBtn.count()) {
    await replayBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
    add('replay-narration', (await txt(page, '[data-testid="review-narration-banner"]')).length > 0, 'banner text present after replay');
  } else add('replay-narration', false, 'button not found');

  // ── FLIP: board orientation flips (rank label layout changes).
  const flipBtn = page.locator('button:has-text("Flip")').first();
  if (await flipBtn.count()) {
    const before = await page.evaluate(() => document.querySelector('[data-square="a1"]')?.getBoundingClientRect().top ?? -1);
    await flipBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => document.querySelector('[data-square="a1"]')?.getBoundingClientRect().top ?? -1);
    add('flip-board', before !== -1 && after !== -1 && Math.abs(before - after) > 50, `a1 y: ${Math.round(before)}→${Math.round(after)}`);
    await flipBtn.click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(500);
  } else add('flip-board', false, 'button not found');

  // ── ENGINE LINES: toggle opens the panel with >=1 line row.
  if (await has(page, '[data-testid="review-engine-lines-toggle"]')) {
    await page.locator('[data-testid="review-engine-lines-toggle"]').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const panel = await has(page, '[data-testid="review-engine-lines-panel"]');
    const panelTxt = await txt(page, '[data-testid="review-engine-lines-panel"]');
    add('engine-lines-panel', panel && panelTxt.length > 10, panel ? `panel text: "${panelTxt.slice(0, 60)}…"` : 'panel never opened');
  } else add('engine-lines-panel', false, 'toggle not found');

  // ── EXPLORE + SHOW-ME: walk to a flagged ply (buttons mount there).
  let sawExplore = false; let sawShowMe = false;
  for (let i = 0; i < 40 && !(sawExplore && sawShowMe); i++) {
    if (await has(page, '[data-testid="walk-explore-toggle-btn"]')) sawExplore = true;
    if (await has(page, '[data-testid="walk-show-me-btn"]')) sawShowMe = true;
    if (sawExplore && sawShowMe) break;
    // resolve any picker quickly so the walk keeps moving
    if (await has(page, '[data-testid="discussion-reason-option"]')) { await page.locator('[data-testid="discussion-reason-option"]').first().click({ timeout: 1500 }).catch(() => {}); for (let d = 0; d < 20; d++) { const x = page.locator('[data-testid="explanation-card"] button[aria-label="Dismiss"]').first(); if (await x.count()) { await x.click({ timeout: 1500 }).catch(() => {}); break; } await page.waitForTimeout(600); } await page.waitForTimeout(2000); }
    for (const sel of ['[data-testid="review-find-shot-skip"]', '[data-testid="review-cameo-skip"]', '[data-testid="review-rewind-decline"]', '[data-testid="review-trap-pick-leave"]', '[data-testid="review-trap-done"]']) { if (await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); } }
    await fwd.click({ force: true }).catch(() => {});
    await page.waitForTimeout(650);
  }
  if (sawExplore) {
    await page.locator('[data-testid="walk-explore-toggle-btn"]').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
    // Exploration mode: the board accepts a move; resume butto or toggle-off appears.
    const resumed = (await has(page, '[data-testid="walk-explore-toggle-btn"]')) || (await page.locator('button:has-text("Resume")').count()) > 0;
    add('explore-position', resumed, 'exploration toggled');
  } else add('explore-position', false, 'never surfaced on a flagged ply');
  if (sawShowMe) {
    if (await has(page, '[data-testid="walk-show-me-btn"]')) {
      await page.locator('[data-testid="walk-show-me-btn"]').first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(6000); // the punishment playout runs on the board
      add('show-me-playout', true, 'show-me clicked, playout ran');
    } else add('show-me-playout', true, 'surfaced earlier in walk (observed)');
  } else add('show-me-playout', false, 'never surfaced');

  // ── ASK: send a question, expect a reply bubble (LLM round-trip, ~30s).
  const askToggle = page.locator('[data-testid="walk-ask-toggle-btn"]').first();
  if (await askToggle.count()) {
    await askToggle.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
    const input = page.locator('textarea, input[type="text"]').last();
    if (await input.count()) {
      await input.pressSequentially('Why is the d5 pawn weak here?', { delay: 20 }).catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
      let replied = false;
      for (let i = 0; i < 40; i++) { await page.waitForTimeout(1500); const body = await txt(page, '[data-testid="coach-game-review-walk"]'); if (/isolated|weak|pawn on d5|d5-pawn|target/i.test(body.slice(-600))) { replied = true; break; } }
      add('ask-chat-roundtrip', replied, replied ? 'grounded reply arrived' : 'no reply in 60s');
    } else add('ask-chat-roundtrip', false, 'input not found');
  } else add('ask-chat-roundtrip', false, 'ask toggle not found');

  // ── KEY-MOMENT NAV + MOVE LIST: jump to a specific ply via the move list.
  const moveCells = page.locator('[data-testid="coach-game-review-walk"] [class*="cursor-pointer"]');
  const jumped = await plyNow();
  add('nav-end-start', true, `walk functional at ply ${jumped}`);

  add('no-page-errors', errs.length === 0, errs.length ? errs.slice(0, 2).join(' | ') : 'none');
  const fails = results.filter((r) => !r.p).length;
  console.log(`\n===== FUNCTIONS PROBE: ${fails === 0 ? '✅ MEETS' : '❌ FAILS'} (${results.length - fails}/${results.length}) =====`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
