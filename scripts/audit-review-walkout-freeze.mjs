/**
 * audit-review-walkout-freeze — REGRESSION for David's 2026-07-24 report:
 * "Review is not working!!! The pieces even stopped moving when clicking the
 * next arrow." Root cause: a §5 better-line walkout stranded `walkExplorationFen`
 * (the board renders it in place of the live position), so forward kept advancing
 * the ply while the pieces stayed pinned.
 *
 * This drives the review walk forward through a WHOLE game the way a human does,
 * on a game where the STUDENT side blunders (so the better-line walkouts fire —
 * the exact condition that stranded the overlay). At every forward step it snaps
 * the board's piece signature; the freeze bug shows up as a long run of steps
 * where the ply climbs but the pieces never move. Passes only when the board
 * keeps advancing and actually reaches the final position.
 *
 * Run (prod): AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-review-walkout-freeze.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'audit-freeze-game';
// The Opera Game. Student = BLACK (the losing side) so the review flags black's
// mistakes and fires the better-line walkouts that stranded the overlay.
const PGN = '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const SANS = PGN.replace(/\d+\.(\.\.)?\s*/g, '').replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '').trim().split(/\s+/);

const results = [];
const add = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };
const log = (m) => console.log(m);

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error' && /same key|unique "key"|Maximum update|Cannot update a component/.test(m.text())) errs.push('REACT: ' + m.text().slice(0, 160)); });

  const has = async (sel) => (await page.locator(sel).count()) > 0;
  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      let acted = false;
      for (const [sel, click] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(sel)) { try { await page.locator(click).first().click({ timeout: 3000 }); acted = true; } catch { /* */ } } }
      await page.waitForTimeout(500);
      if (!acted && i > 1) break;
    }
  };
  // Board signature — the DISPLAYED board FEN, read straight off the wrapper
  // (Board/ChessBoard sets data-fen = the exact position it's rendering, overlay
  // included). This is position-exact: it changes on any piece movement, and a
  // stranded exploration overlay shows up as a FEN that won't change while the
  // ply climbs. (The old piece-type multiset only changed on captures — vacuous.)
  const boardSig = async () => page.locator('[data-testid="board-wrapper"]').first().getAttribute('data-fen').catch(() => '') || '';

  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss();
  await page.waitForTimeout(2500);

  const seed = await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, pgn, white: 'Opponent', black: 'Student', result: '1-0', date: '2026.07.24', event: 'Freeze Audit', eco: 'C41', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'normal', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Student'; p.preferences.coachNarration = 'full'; p.preferences.readingChallengesInReview = true; await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();

  let ready = false;
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(1500);
    const btn = page.locator('[data-testid="start-walk-btn"]').first();
    if ((await btn.count()) && (await btn.getAttribute('disabled')) === null) { ready = true; break; }
    if (i % 8 === 0) log(`  …analysing (${(i * 1.5).toFixed(0)}s)`);
  }
  add('analysis settled', ready, ready ? '' : 'start-walk never enabled');
  if (!ready) { await browser.close(); report(); return; }

  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});

  const plyNow = async () => { const t = await page.locator('[data-testid="coach-game-review-walk"]').innerText({ timeout: 2000 }).catch(() => ''); const m = t.match(/Ply\s+(\d+)\s*\/\s*(\d+)/i); return m ? { n: Number(m[1]), total: Number(m[2]) } : { n: 0, total: 0 }; };
  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  const CARDS = ['review-find-shot-card', 'review-find-shot-reveal', 'review-rewind-card', 'review-turning-point-card', 'review-trap-card', 'discussion-reason-picker', 'review-sequence-ask', 'review-cameo-ask', 'review-theory-ask', 'review-capture-teach'];

  const anyCard = async () => { for (const c of CARDS) if (await has(`[data-testid="${c}"]`)) return c; return null; };
  const dismissCards = async () => {
    // Forward IS the escape hatch, but a card may need its own skip/continue.
    for (const [card, act] of [
      ['review-find-shot-card', 'review-find-shot-skip'], ['review-find-shot-reveal', 'review-find-shot-continue'],
      ['review-rewind-card', 'review-rewind-decline'], ['review-turning-point-card', 'review-turning-point-confirm'],
      ['review-turning-point-reveal', 'review-turning-point-done'], ['review-trap-card', 'review-trap-pick-leave'],
      ['review-sequence-ask', 'review-sequence-skip'], ['review-cameo-ask', 'review-cameo-skip'],
      ['review-theory-ask', 'review-theory-skip'], ['review-capture-teach', 'review-capture-continue'],
      ['discussion-reason-picker', 'discussion-reason-option'],
    ]) { if (await has(`[data-testid="${card}"]`) && await has(`[data-testid="${act}"]`)) { await page.locator(`[data-testid="${act}"]`).first().click({ timeout: 2000 }).catch(() => {}); await page.waitForTimeout(500); } }
  };

  const trail = []; // { ply, sig }
  const cardsSeen = new Set();
  let maxFreezeRun = 0, freezeRun = 0, lastSig = await boardSig(), lastPly = (await plyNow()).n;
  const total = (await plyNow()).total || SANS.length;
  log(`\n===== FORWARD WALK (0/${total}) =====`);

  for (let step = 0; step < total * 3 + 20; step++) {
    const before = (await plyNow()).n;
    // Dismiss any blocking card first (records that the diagnostic fired), THEN
    // click forward — the human "tap next to move on" action.
    const card = await anyCard();
    if (card) { cardsSeen.add(card); await dismissCards(); }
    try { await fwd.click({ timeout: 4000, force: true }); } catch { /* transiently covered */ }
    // Voice-gated advance can take several seconds — poll for the ply to move or
    // a card to appear before giving up on this step.
    let p = before;
    for (let w = 0; w < 16; w++) {
      await page.waitForTimeout(500);
      p = (await plyNow()).n;
      if (p > before) break;
      if (await anyCard()) break;
    }
    const now = (await plyNow()).n;
    const sig = await boardSig();
    trail.push({ ply: now, sig });
    if (now > lastPly) {
      if (sig === lastSig && sig !== '') { freezeRun += (now - lastPly); maxFreezeRun = Math.max(maxFreezeRun, freezeRun); }
      else freezeRun = 0;
      lastPly = now; lastSig = sig;
    }
    if (now >= total) break;
  }

  const distinctSigs = new Set(trail.map((t) => t.sig)).size;
  const reached = lastPly;
  log(`[cards] diagnostics that fired during the walk: ${[...cardsSeen].join(', ') || '(none)'}`);
  log(`[walk] reached ply ${reached}/${total}, distinct board positions=${distinctSigs}, maxFreezeRun=${maxFreezeRun}`);

  // THE FREEZE ASSERTION: the board must keep moving as the ply climbs. A stranded
  // overlay pins it → a long run of ply-advances with no piece movement.
  add('FREEZE board keeps advancing (no stranded overlay)', maxFreezeRun <= 1, `maxFreezeRun=${maxFreezeRun} (pieces frozen across N ply-advances)`);
  // The walk actually reaches (near) the end — a hard freeze also stalls progress.
  add('WALK reaches the end of the game', reached >= total - 1, `reached ${reached}/${total}`);
  // The board visited many distinct positions (it truly played out).
  add('BOARD played out (many distinct positions)', distinctSigs >= Math.min(10, Math.floor(total / 2)), `${distinctSigs} distinct`);
  add('NO errors during the walk', errs.length === 0, errs.slice(0, 3).join(' | '));

  await browser.close();
  report();
};

function report() {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  console.log(`\n${'='.repeat(48)}\n  RESULT: ${pass}/${results.length} passed${fail ? ` — ${fail} FAILED` : ' — ALL GREEN'}\n${'='.repeat(48)}`);
  process.exit(fail ? 1 : 0);
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
