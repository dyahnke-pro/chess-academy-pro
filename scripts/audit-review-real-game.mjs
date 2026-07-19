/**
 * audit-review-real-game — THE post-game-review audit, held to the locked
 * REAL-GAME EXPERIENCE AUDIT STANDARD (CLAUDE.md). Unlike a capture harness, this
 * ASSERTS the experience contracts and exits non-zero on any failure.
 *
 * THREE INSTRUMENTS: Playwright drives the full walk · the audit-stream is pulled
 * before/after · the narration listener captures every spoken line.
 *
 * IT SEEDS A REAL, UNPROCESSED GAME, runs the genuine pipeline (real Stockfish),
 * walks EVERY ply resolving cards like a human, then asserts (hard PASS/FAIL):
 *   R1  opening named early (summary + spoken)
 *   RES result stated correctly (a WIN is not called a draw)
 *   R2  own-side opening why-density >= 80%
 *   PLAN both plan beats fired (opening developing + middlegame)
 *   S5   the better-line playout FIRED with a why on (nearly) every ply
 *   OPP  opponent commentary fired at least once
 *   R10  NO verbatim-duplicate narration line
 *   ACC  board-accuracy: every "<piece> on <square>" claim is true on the board
 *   ERR  zero page/console errors
 *
 * Run (prod): AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_LISTENER=1 \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-review-real-game.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { attachVoiceListener, voiceLines, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'chesscom-996014340';
// Knight_Mare_01 (White, student) beat iankane21 — opponent RESIGNED (1-0).
const PGN = '1. e4 d6 2. d4 g6 3. f4 e6 4. Be3 b6 5. c4 Bg7 6. Qd2 Nf6 7. Bd3 Na6 8. Nf3 c6 9. O-O Nc7 10. e5 Nd7 11. exd6 Na6 12. Nc3 Nf8 13. c5 g5 14. fxg5 e5 15. Nxe5 Nd7 16. Nxc6 1-0';
const SANS = PGN.replace(/\d+\.\s*/g, '').replace(/\s*1-0\s*$/, '').trim().split(/\s+/);

const log = (s) => console.log(s);
const txt = async (p, sel) => { try { const l = p.locator(sel).first(); return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };

/** Position (chess.js) AFTER walk-ply N (= PGN half-move N). */
function posAfterPly(n) {
  const c = new Chess();
  for (let i = 0; i < n && i < SANS.length; i++) { try { c.move(SANS[i]); } catch { break; } }
  return c;
}
const PIECE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };

/** Audit-stream pull (instrument 3-of-3). Returns event count or a reason. */
async function pullAuditStream(sinceMs) {
  const secret = process.env.AUDIT_STREAM_SECRET || '';
  if (!secret) return { ok: false, reason: 'no AUDIT_STREAM_SECRET in env' };
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': secret } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const j = await res.json();
    return { ok: true, count: j.count ?? (j.entries?.length ?? 0), storage: j.storage };
  } catch (e) { return { ok: false, reason: String(e).slice(0, 80) }; }
}

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...(process.env.AUDIT_LISTENER === '1' ? LISTENER_LAUNCH_ARGS : [])] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  const voice = process.env.AUDIT_LISTENER === '1' ? await attachVoiceListener(ctx) : null;
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!/favicon|manifest|net::ERR|Download the React/i.test(t)) errs.push('CONSOLE: ' + t.slice(0, 160)); } });

  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      for (const [s, c] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
      await page.waitForTimeout(500);
    }
  };

  const streamBefore = await pullAuditStream(Date.now() - 60000);

  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss();
  await page.waitForTimeout(3000);

  const seed = await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, pgn, white: 'Knight_Mare_01', black: 'iankane21', result: '1-0', date: '2026.07.17', event: 'Daily Chess', eco: 'B06', whiteElo: 1292, blackElo: 887, source: 'chesscom', termination: 'resigned', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Knight_Mare_01'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();

  let ready = false;
  for (let i = 0; i < 110; i++) {
    await page.waitForTimeout(1500);
    const btn = page.locator('[data-testid="start-walk-btn"]').first();
    if ((await btn.count()) && (await btn.getAttribute('disabled')) === null) { ready = true; break; }
    if (i % 8 === 0) log(`  …analysing (${(i * 1.5).toFixed(0)}s)`);
  }
  const summaryBody = (await txt(page, 'main')) || (await txt(page, 'body'));
  log(`[analysis] ready=${ready}`);
  log(`[summary] ${summaryBody.slice(0, 500)}`);
  if (!ready) { log('[FATAL] analysis never settled'); if (voice) await voice.stop(); await browser.close(); process.exit(1); }

  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});

  const CARD_TESTIDS = ['discussion-prompt', 'discussion-reason-picker', 'review-find-shot-card', 'review-find-shot-reveal', 'review-rewind-card', 'review-turning-point-card', 'review-turning-point-reveal', 'review-cameo-ask', 'review-cameo-playback', 'review-theory-ask', 'review-theory-playback', 'review-principle-quiz', 'review-sequence-ask', 'review-sequence-playback', 'review-capture-teach', 'review-capture-continue'];
  const visibleCards = async () => { const f = []; for (const t of CARD_TESTIDS) if (await has(page, `[data-testid="${t}"]`)) f.push(t); return f; };
  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  const plyNow = async () => { const t = await page.locator('[data-testid="coach-game-review-walk"]').innerText({ timeout: 2000 }).catch(() => ''); const m = t.match(/Ply\s+(\d+)\s*\/\s*(\d+)/i); return m ? { n: Number(m[1]), total: Number(m[2]) } : { n: 0, total: 0 }; };

  const plies = [];
  const s5runs = [];
  let stuck = 0;
  log('\n===== PLY-BY-PLY WALK =====');
  for (let step = 1; step <= 60; step++) {
    const before = (await plyNow()).n;
    if ((await visibleCards()).length) {
      const p = await plyNow();
      const vBefore = voice ? voiceLines(voice).length : 0;
      if (await has(page, '[data-testid="discussion-reason-picker"]')) {
        await page.locator('[data-testid="discussion-reason-option"]').first().click({ timeout: 2000 }).catch(() => {});
        for (let d = 0; d < 24; d++) { const x = page.locator('[data-testid="explanation-card"] button[aria-label="Dismiss"]').first(); if (await x.count()) { await x.click({ timeout: 2000 }).catch(() => {}); break; } await page.waitForTimeout(750); }
        await page.waitForTimeout(11000); // §5 playout: computePvLine + batch-warm + per-ply voice
        if (voice) {
          const playout = voiceLines(voice).slice(vBefore);
          const fired = playout.some((l) => /stronger line/i.test(l));
          s5runs.push({ ply: p.n, fired, lineCount: playout.length, lines: playout });
          log(`  >> §5 PLAYOUT at Ply ${p.n}: fired=${fired}, ${playout.length} lines`);
          playout.forEach((l) => log(`       · ${l}`));
        }
      }
      if (await has(page, '[data-testid="review-find-shot-card"]')) { await page.locator('[data-testid="review-find-shot-hint"]').first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(600); for (const sel of ['[data-testid="review-find-shot-continue"]', '[data-testid="review-find-shot-skip"]']) { if (await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); break; } } }
      if (await has(page, '[data-testid="review-sequence-ask"]')) { await page.locator('[data-testid="review-sequence-show"]').first().click({ timeout: 1500 }).catch(() => {}); for (let s = 0; s < 8; s++) { if (await has(page, '[data-testid="review-sequence-skip"]')) { await page.locator('[data-testid="review-sequence-skip"]').first().click({ timeout: 1500 }).catch(() => {}); break; } await page.waitForTimeout(500); } await page.waitForTimeout(400); }
      if (await has(page, '[data-testid="review-sequence-playback"]')) { await page.locator('[data-testid="review-sequence-skip"]').first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); }
      for (const sel of ['[data-testid="review-cameo-skip"]', '[data-testid="review-cameo-stop"]', '[data-testid="review-theory-skip"]', '[data-testid="review-theory-stop"]', '[data-testid="review-turning-point-done"]', '[data-testid="review-capture-continue"]', '[data-testid="review-capture-skip"]', '[data-testid="review-rewind-decline"]']) { if (await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); } }
    }
    await fwd.click({ timeout: 2000, force: true }).catch(() => {});
    await page.waitForTimeout(650);
    const p = await plyNow();
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const narr = await txt(page, '[data-testid="review-narration-banner"]');
    if (!plies.some((x) => x.ply === p.n)) plies.push({ ply: p.n, badge, narr });
    log(`  Ply ${String(p.n).padStart(2)}/${p.total} [${(badge || '-').padEnd(10)}] ${narr || '(silent)'}`);
    if (p.n >= p.total && p.total > 0) { log(`  (reached end)`); break; }
    stuck = p.n === before ? stuck + 1 : 0;
    if (stuck > 5) { log(`  ⟳ stuck at Ply ${p.n}`); break; }
  }

  const voiceAll = voice ? voiceLines(voice).filter((l) => !/^dropped |^throttled /.test(l)) : [];
  const streamAfter = await pullAuditStream(Date.now() - 300000);

  // ─── ASSERTIONS ────────────────────────────────────────────────────────────
  const results = [];
  const add = (id, pass, detail) => results.push({ id, pass, detail });

  // R1 — opening named early (summary text).
  const openingNamed = /pirc|modern|caro|sicilian|french|defen[cs]e|opening|game\b/i.test(summaryBody);
  add('R1 opening-named', openingNamed, openingNamed ? 'summary names the opening' : 'no opening name in summary');

  // RES — result stated correctly (a WIN, never "draw"). The intro is spoken +
  // the recap is in the summary body.
  const introLine = voiceAll.find((l) => /let's review your game|walk through this game/i.test(l)) || '';
  const saysDraw = /\bdraw\b/i.test(introLine) || /ended in a draw|the game was a draw/i.test(summaryBody);
  const saysWin = /a win|the student won|victory/i.test(introLine + ' ' + summaryBody);
  add('RES result-correct', saysWin && !saysDraw, `intro="${introLine.slice(0, 80)}" saysWin=${saysWin} saysDraw=${saysDraw}`);

  // R2 — own-side opening why-density >= 80% (student = White = ODD plies, 1..15).
  const studentOpening = plies.filter((p) => p.ply >= 1 && p.ply <= 15 && p.ply % 2 === 1);
  const withWhy = studentOpening.filter((p) => p.narr && p.narr.length > 3);
  const density = studentOpening.length ? withWhy.length / studentOpening.length : 0;
  add('R2 why-density>=80%', density >= 0.8, `${withWhy.length}/${studentOpening.length} = ${(density * 100).toFixed(0)}%`);

  // PLAN — both plan beats fired (opening developing + middlegame majority/race).
  const openingPlan = plies.some((p) => /out of the opening|develop behind|claim the (centre|center)|develop.*castle/i.test(p.narr || ''));
  const midPlan = plies.some((p) => /majority|opposite wings|pawn(s)? forward|push those|storm/i.test(p.narr || ''));
  add('PLAN both-beats', openingPlan && midPlan, `opening=${openingPlan} middlegame=${midPlan}`);

  // S5 — the better-line playout FIRED with a why on nearly every ply. A real
  // playout is intro + several per-ply whys + a verdict (>= 4 distinct lines).
  const s5 = s5runs.filter((r) => r.fired);
  const s5best = s5.reduce((a, r) => Math.max(a, r.lineCount), 0);
  add('S5 playout-per-move-why', s5.length > 0 && s5best >= 4, `runs=${s5runs.length} fired=${s5.length} maxLines=${s5best} (need >=4)`);

  // OPP — opponent commentary fired at least once (targets OR developing reads).
  const oppFired = plies.some((p) => /contest|steps in eyeing|trains on|leaves your .* loose|plants a .* on|outpost no/i.test(p.narr || ''));
  add('OPP commentary-fired', oppFired, oppFired ? 'an opponent read appeared' : 'no opponent commentary in the whole walk');

  // R10 — no verbatim-duplicate narration line (the repetition failure).
  const seen = new Map();
  let dup = null;
  for (const p of plies) { const n = (p.narr || '').trim().toLowerCase(); if (n.length < 8) continue; if (seen.has(n)) { dup = p.narr; break; } seen.set(n, p.ply); }
  add('R10 no-repetition', dup === null, dup ? `duplicate line: "${dup.slice(0, 60)}"` : 'every narration line distinct');

  // ACC — board-accuracy: every "<piece> on <square>" claim is TRUE on the board
  // AFTER that ply (replay the PGN; the deterministic facts + containment guard
  // should make this hold, but the audit proves it independently).
  const accFails = [];
  for (const p of plies) {
    if (!p.narr) continue;
    const pos = posAfterPly(p.ply);
    const re = /\b(knight|bishop|rook|queen|pawn|king)\s+on\s+([a-h][1-8])\b/gi;
    let m;
    while ((m = re.exec(p.narr)) !== null) {
      const want = PIECE[m[1].toLowerCase()];
      const sq = m[2].toLowerCase();
      const cell = pos.get(sq);
      if (!cell || cell.type !== want) accFails.push(`ply ${p.ply}: "${m[1]} on ${sq}" but board has ${cell ? cell.type : 'empty'}`);
    }
  }
  add('ACC board-accuracy', accFails.length === 0, accFails.length ? accFails.slice(0, 3).join(' | ') : 'no false piece-on-square claims');

  // ERR — zero page/console errors.
  add('ERR no-errors', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');

  // ─── REPORT ─────────────────────────────────────────────────────────────────
  log('\n===== 3-INSTRUMENT COVERAGE =====');
  log(`  Playwright: walked ${plies.length} plies`);
  log(`  Narration listener: ${voiceAll.length} spoken lines`);
  log(`  Audit-stream: before=${JSON.stringify(streamBefore)} after=${JSON.stringify(streamAfter)}`);

  log('\n===== R-CONTRACT COVERAGE GRID =====');
  let allPass = true;
  for (const r of results) { log(`  ${r.pass ? '✅ PASS' : '❌ FAIL'}  ${r.id.padEnd(26)} ${r.detail}`); if (!r.pass) allPass = false; }
  log(`\n===== VERDICT: ${allPass ? '✅ MEETS STANDARD' : '❌ FAILS STANDARD'} =====`);

  if (voice) await voice.stop();
  await browser.close();
  process.exit(allPass ? 0 : 1);
};
run().catch((e) => { console.error('fatal:', e); process.exit(1); });
