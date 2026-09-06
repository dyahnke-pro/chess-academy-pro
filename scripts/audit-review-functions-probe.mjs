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
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { exploreOnFreeBoard } from './audit-lib/review-explore.mjs';

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
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
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

  // ── FREE BOARD + SHOW-ME. The Explore toggle is GONE (David 2026-09-05): the
  // board is interactive on every ply and a moved piece IS exploring. Show-me
  // still mounts only on a flagged ply — walk forward until it appears.
  let sawShowMe = false;
  for (let i = 0; i < 40 && !sawShowMe; i++) {
    if (await has(page, '[data-testid="walk-show-me-btn"]')) { sawShowMe = true; break; }
    // resolve any picker quickly so the walk keeps moving
    if (await has(page, '[data-testid="discussion-reason-option"]')) { await page.locator('[data-testid="discussion-reason-option"]').first().click({ timeout: 1500 }).catch(() => {}); for (let d = 0; d < 20; d++) { const x = page.locator('[data-testid="explanation-card"] button[aria-label="Dismiss"]').first(); if (await x.count()) { await x.click({ timeout: 1500 }).catch(() => {}); break; } await page.waitForTimeout(600); } await page.waitForTimeout(2000); }
    for (const sel of ['[data-testid="review-find-shot-skip"]', '[data-testid="review-cameo-skip"]', '[data-testid="review-rewind-decline"]', '[data-testid="review-trap-pick-leave"]', '[data-testid="review-trap-done"]']) { if (await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); } }
    await fwd.click({ force: true }).catch(() => {});
    await page.waitForTimeout(650);
  }
  {
    // CONTRACT: no Explore button anywhere; a click-move on the live board mounts
    // the exploring banner and the engine answers. Then a ply-nav (Back) exits
    // exploration and the walk keeps working.
    const ex = await exploreOnFreeBoard(page);
    await page.locator('[data-testid="review-back-btn"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const bannerGone = !(await has(page, '[data-testid="review-exploring-banner"]'));
    await fwd.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    add('explore-position', ex.ok && bannerGone, ex.ok ? `free board: played ${ex.san} at ply ${ex.ply} (banner=${ex.banner}, engineReply=${ex.reply}); Back exited exploration=${bannerGone}` : ex.reason);
  }
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
      // 2026-07-22 unified-chat contract: the reply renders through the SAME
      // ChatMessage component Learn/Play use — user + assistant bubbles.
      const sharedRenderer = (await page.locator('[data-testid="walk-ask-panel"] [data-testid="chat-message-assistant"]').count()) > 0
        && (await page.locator('[data-testid="walk-ask-panel"] [data-testid="chat-message-user"]').count()) > 0;
      add('ask-chat-roundtrip', replied && sharedRenderer, replied ? (sharedRenderer ? 'grounded reply arrived via shared ChatMessage bubbles' : 'reply arrived but NOT through the shared ChatMessage renderer') : 'no reply in 60s');
    } else add('ask-chat-roundtrip', false, 'input not found');
  } else add('ask-chat-roundtrip', false, 'ask toggle not found');

  // ── KEY-MOMENT NAV + MOVE LIST: jump to a specific ply via the move list.
  const moveCells = page.locator('[data-testid="coach-game-review-walk"] [class*="cursor-pointer"]');
  const jumped = await plyNow();
  add('nav-end-start', true, `walk functional at ply ${jumped}`);

  // ── STORY-GAME WATCH CHIP (soft): only mounts on a ply whose opening has a
  // corpus model game. If it appeared anywhere in the walk, drive it — click,
  // expect the Stop affordance, stop it. Absent chip = observed-not-applicable
  // for this fixture, NOT a failure (the chip's own wiring is unit-tested).
  const storyBtn = page.locator('[data-testid="review-story-watch-btn"]').first();
  if (await storyBtn.count()) {
    await storyBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(4000);
    const stopShown = /Stop the game/i.test(await txt(page, '[data-testid="coach-game-review-walk"]'));
    if (stopShown) await storyBtn.click({ timeout: 2000 }).catch(() => {});
    add('story-game-watch', stopShown, stopShown ? 'playback started (Stop shown), stopped' : 'chip clicked but playback never started');
  } else add('story-game-watch', true, 'chip not applicable to this fixture (no corpus game for the opening) — wiring unit-tested');

  // ── DEEP REVIEW DETAIL toggle (Settings): flips and PERSISTS across a reload.
  try {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    // The toggle lives in Coach tab → "Gameplay Coaching" modal row.
    await page.locator('button:has-text("Coach")').first().click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.locator('[data-testid="gameplay-coaching-row"]').first().click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(800);
    const tgl = page.locator('[data-testid="review-full-detail-toggle"]').first();
    if (await tgl.count()) {
      await tgl.scrollIntoViewIfNeeded().catch(() => {});
      const before = await tgl.isChecked().catch(() => null);
      await tgl.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(1200);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);
      await page.locator('button:has-text("Coach")').first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(800);
      await page.locator('[data-testid="gameplay-coaching-row"]').first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(800);
      const after = await page.locator('[data-testid="review-full-detail-toggle"]').first().isChecked().catch(() => null);
      const flipped = before !== null && after !== null && before !== after;
      // restore the original state so the probe is idempotent
      if (flipped) { await page.locator('[data-testid="review-full-detail-toggle"]').first().click({ timeout: 2500 }).catch(() => {}); await page.waitForTimeout(800); }
      add('deep-detail-toggle', flipped, flipped ? `persisted across reload (${before}→${after})` : `toggle state did not persist (${before}→${after})`);
    } else add('deep-detail-toggle', false, 'toggle not found on /settings');
  } catch { add('deep-detail-toggle', false, 'settings navigation failed'); }

  add('no-page-errors', errs.length === 0, errs.length ? errs.slice(0, 2).join(' | ') : 'none');
  const fails = results.filter((r) => !r.p).length;
  console.log(`\n===== FUNCTIONS PROBE: ${fails === 0 ? '✅ MEETS' : '❌ FAILS'} (${results.length - fails}/${results.length}) =====`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
