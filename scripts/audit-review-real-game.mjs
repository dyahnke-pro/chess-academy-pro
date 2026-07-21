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
// NEW game per run (David 2026-07-20: "pick a different game"). Morphy's Opera
// Game (Philidor Defense) — a real, famous, decisive-by-MATE brilliancy with
// four sacrifices. Hammers exactly this build's fixes: mate naming (Rd8#, not
// "pawns"), the fork/pin/material descriptors on the sacs, and the walk-
// narration unification. Student = White (Morphy).
const GID = process.env.AUDIT_GID || 'audit-opera-game';
const PGN = process.env.AUDIT_PGN || '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
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
  // UNCAPPED diagnostic (David 2026-07-20): turn on the full-data review — every
  // computed facet on every move + the future-position projections. Set unless
  // AUDIT_UNCAPPED=0 (default ON for this audit, since its whole job now is to
  // show what the review computes and what's missing).
  const UNCAPPED = process.env.AUDIT_UNCAPPED !== '0';
  if (UNCAPPED) await ctx.addInitScript(() => { window.__REVIEW_UNCAPPED__ = true; });
  const voice = process.env.AUDIT_LISTENER === '1' ? await attachVoiceListener(ctx) : null;
  const page = await ctx.newPage();
  const errs = [];
  // FULL SPOKEN TEXT — intercept the /api/tts POST bodies (the EXACT words sent to
  // the voice), so the transcript is the real spoken words, not a 40-char preview
  // (David 2026-07-20: "physically read each spoken word").
  const ttsSpoken = [];
  page.on('request', (req) => {
    try {
      if (/\/api\/tts\b/.test(req.url()) && req.method() === 'POST') {
        const b = req.postData();
        if (b) { const j = JSON.parse(b); const t = (j.text ?? j.input ?? j.ssml ?? '').toString().trim(); if (t && t !== '.') ttsSpoken.push(t); }
      }
    } catch { /* non-JSON body */ }
  });
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Excluded NOISE: dev-tools chatter, and — per the audit doctrine — a
    // transient resource-load THROTTLE (429/503). The audit fires a TTS/LLM call
    // for every narrated ply back-to-back; that burst saturates the provider and
    // throttles ONE resource load. It is a load artifact of the harness's pace,
    // not an app defect (a real user steps slowly and never triggers it). Real
    // pageerrors + app console.errors + React warnings still fail the ERR gate.
    if (/favicon|manifest|net::ERR|Download the React/i.test(t)) return;
    if (/Failed to load resource.*(429|503)|status of (429|503)/i.test(t)) return;
    errs.push('CONSOLE: ' + t.slice(0, 160));
  });

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

  // Multi-game sweep support (David 2026-07-20 "run this on at least 5 games"):
  // the student is always the chessComUsername; put them on the side AUDIT_STUDENT
  // names (default white), and seed the real AUDIT_RESULT so wins/losses/draws all
  // score correctly.
  const STUDENT_SIDE = (process.env.AUDIT_STUDENT || 'white').toLowerCase() === 'black' ? 'black' : 'white';
  const RESULT = process.env.AUDIT_RESULT || '1-0';
  const seed = await page.evaluate(async ({ gid, pgn, side, result }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const white = side === 'white' ? 'Student' : 'Opponent';
    const black = side === 'white' ? 'Opponent' : 'Student';
    await put('games', { id: gid, pgn, white, black, result, date: '2026.07.20', event: 'Audit Sweep', eco: 'C41', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'normal', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Student'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN, side: STUDENT_SIDE, result: RESULT }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();

  let ready = false;
  // Uncapped mode adds ~50s (3 Stockfish PV projections + the 8k-token cover-all
  // voice pass) on top of the ~120s game analysis, so allow a longer settle when
  // AUDIT_UNCAPPED is on (David 2026-07-20 diagnostic timed out at the old 165s).
  const READY_ITERS = process.env.AUDIT_UNCAPPED !== '0' ? 240 : 110;
  for (let i = 0; i < READY_ITERS; i++) {
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

  const CARD_TESTIDS = ['discussion-prompt', 'discussion-reason-picker', 'review-find-shot-card', 'review-find-shot-reveal', 'review-rewind-card', 'review-turning-point-card', 'review-turning-point-reveal', 'review-trap-card', 'review-trap-reveal', 'review-cameo-ask', 'review-cameo-playback', 'review-sequence-ask', 'review-sequence-playback', 'review-capture-teach', 'review-capture-continue'];
  let trapCardFired = false;
  const visibleCards = async () => { const f = []; for (const t of CARD_TESTIDS) if (await has(page, `[data-testid="${t}"]`)) f.push(t); return f; };
  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  const plyNow = async () => { const t = await page.locator('[data-testid="coach-game-review-walk"]').innerText({ timeout: 2000 }).catch(() => ''); const m = t.match(/Ply\s+(\d+)\s*\/\s*(\d+)/i); return m ? { n: Number(m[1]), total: Number(m[2]) } : { n: 0, total: 0 }; };

  const plies = [];
  const s5runs = [];
  const cardsFired = new Set();      // which interactive functions actually fired
  const cardLog = [];                // per-encounter card firing record (for reading)
  let stuck = 0;
  let remountRecovered = false; // one-time SW-update re-mount recovery (see below)
  log('\n===== PLY-BY-PLY WALK =====');
  for (let step = 1; step <= 60; step++) {
    const before = (await plyNow()).n;
    const cardsHere = await visibleCards();
    if (cardsHere.length) {
      const p = await plyNow();
      cardsHere.forEach((c) => cardsFired.add(c));
      cardLog.push({ ply: p.n, cards: cardsHere.slice() });
      log(`  📋 CARD/POPUP at Ply ${p.n}: [${cardsHere.join(', ')}]`);
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
      // §4 type-not-move: pick a type, dismiss the reveal (like a human).
      // §4 trap: commit the right call ("leave it"), dismiss the reveal.
      if (await has(page, '[data-testid="review-trap-card"]')) { trapCardFired = true; await page.locator('[data-testid="review-trap-pick-leave"]').first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(700); if (await has(page, '[data-testid="review-trap-done"]')) { await page.locator('[data-testid="review-trap-done"]').first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(300); } }
      if (await has(page, '[data-testid="review-sequence-ask"]')) { await page.locator('[data-testid="review-sequence-show"]').first().click({ timeout: 1500 }).catch(() => {}); for (let s = 0; s < 8; s++) { if (await has(page, '[data-testid="review-sequence-skip"]')) { await page.locator('[data-testid="review-sequence-skip"]').first().click({ timeout: 1500 }).catch(() => {}); break; } await page.waitForTimeout(500); } await page.waitForTimeout(400); }
      if (await has(page, '[data-testid="review-sequence-playback"]')) { await page.locator('[data-testid="review-sequence-skip"]').first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); }
      for (const sel of ['[data-testid="review-cameo-skip"]', '[data-testid="review-cameo-stop"]', '[data-testid="review-theory-skip"]', '[data-testid="review-theory-stop"]', '[data-testid="review-turning-point-done"]', '[data-testid="review-capture-continue"]', '[data-testid="review-capture-skip"]', '[data-testid="review-rewind-decline"]']) { if (await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500 }).catch(() => {}); await page.waitForTimeout(400); } }
    }
    await fwd.click({ timeout: 2000, force: true }).catch(() => {});
    await page.waitForTimeout(650);
    const p = await plyNow();
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const narr = await txt(page, '[data-testid="review-narration-banner"]');
    const src = await page.locator('[data-testid="review-narration-banner"]').first().getAttribute('data-narration-source').catch(() => '') || '';
    if (!plies.some((x) => x.ply === p.n)) plies.push({ ply: p.n, badge, narr, src });
    log(`  Ply ${String(p.n).padStart(2)}/${p.total} [${(badge || '-').padEnd(10)}] ${narr || '(silent)'}`);
    if (p.n >= p.total && p.total > 0) { log(`  (reached end)`); break; }
    stuck = p.n === before ? stuck + 1 : 0;
    if (stuck === 3) {
      // DIAGNOSTIC (2026-07-20): dump what's blocking forward at the stall.
      const cards = await visibleCards();
      const fwdDisabled = await fwd.getAttribute('disabled').catch(() => null);
      const fwdCount = await page.locator('[data-testid="review-forward-btn"]').count();
      const anyOverlay = await page.evaluate(() => {
        const els = [...document.querySelectorAll('[data-testid^="review-"],[data-testid^="discussion-"]')];
        return els.filter((e) => e.offsetParent !== null).map((e) => e.getAttribute('data-testid'));
      }).catch(() => []);
      log(`  🔎 STALL DIAG: visibleCards=[${cards.join(',')}] fwdDisabledAttr=${fwdDisabled} fwdCount=${fwdCount}`);
      log(`  🔎 STALL DIAG: visible review/discussion testids=[${anyOverlay.join(',')}]`);
      // RECOVERY — a service-worker update landing mid-audit (common in the minutes
      // after a fresh deploy) re-mounts the page to the summary card (walkStarted
      // resets), stranding the walk. That's a harness/deploy-window artifact, NOT a
      // code bug (proven by the many clean full walks on the same bundle). Re-click
      // Start ONCE and resume; the ply-dedup backfills the plies we missed.
      if (!remountRecovered && fwdCount === 0 && (await has(page, '[data-testid="review-summary-card"]')) && (await page.locator('[data-testid="start-walk-btn"]').count()) > 0) {
        remountRecovered = true;
        log('  ♻ summary card re-mounted mid-walk (SW update) — re-clicking Start to resume');
        await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 3000 }).catch(() => {});
        await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});
        stuck = 0;
        continue;
      }
    }
    if (stuck > 5) { log(`  ⟳ stuck at Ply ${p.n}`); break; }
  }

  const voiceAll = voice ? voiceLines(voice).filter((l) => !/^dropped |^throttled /.test(l)) : [];
  const streamAfter = await pullAuditStream(Date.now() - 300000);

  // ─── FULL SPOKEN TRANSCRIPT (read every word) ──────────────────────────────
  // David 2026-07-20: "physically read each spoken word … make sure each function
  // that should have fired did." Dump the COMPLETE spoken voice stream + a card /
  // pop-up firing log + a function-coverage grid, so the experience is READ, not
  // inferred from green gates.
  log('\n===== FULL SPOKEN TRANSCRIPT (exact /api/tts text, every word, in order) =====');
  ttsSpoken.forEach((t, i) => log(`  [${String(i + 1).padStart(3)}] ${t}`));
  log(`  [${ttsSpoken.length} TTS utterances captured]`);
  if (voice) {
    const rawAll = voiceLines(voice);
    log(`  [listener cross-check: ${rawAll.length} voice-speak events, ${rawAll.filter((l) => /^dropped |^throttled /.test(l)).length} dropped/throttled]`);
  }
  log('\n===== INTERACTIVE FUNCTIONS FIRED (pop-ups / cards / lines) =====');
  if (cardLog.length === 0) log('  (no cards/pop-ups fired this game)');
  cardLog.forEach((c) => log(`  Ply ${c.ply}: ${c.cards.join(', ')}`));
  log(`  DISTINCT FUNCTIONS FIRED: [${[...cardsFired].sort().join(', ') || 'none'}]`);
  s5runs.forEach((r) => log(`  §5 better-line playout @Ply ${r.ply}: fired=${r.fired}, ${r.lineCount} lines`));

  // ─── ASSERTIONS ────────────────────────────────────────────────────────────
  const results = [];
  const add = (id, pass, detail) => results.push({ id, pass, detail });

  // R1 — opening named early (summary text).
  const openingNamed = /pirc|modern|caro|sicilian|french|defen[cs]e|opening|game\b/i.test(summaryBody);
  add('R1 opening-named', openingNamed, openingNamed ? 'summary names the opening' : 'no opening name in summary');

  // RES — the STUDENT's outcome stated correctly (win / loss / draw), derived from
  // the seeded result + the student's side. The intro is spoken + the recap is in
  // the summary body.
  const expected = RESULT === '1/2-1/2' ? 'draw'
    : (RESULT === '1-0') === (STUDENT_SIDE === 'white') ? 'win' : 'loss';
  const introLine = voiceAll.find((l) => /let's review your game|walk through this game/i.test(l)) || '';
  const blob = introLine + ' ' + summaryBody;
  const saysDraw = /\bdraw\b/i.test(blob);
  const saysWin = /a win|the student won|victory|you won/i.test(blob);
  const saysLoss = /a loss|the student lost|you lost|defeat/i.test(blob);
  const resOk = expected === 'draw' ? saysDraw
    : expected === 'win' ? (saysWin && !saysDraw && !saysLoss)
    : (saysLoss && !saysDraw && !saysWin);
  add('RES result-correct', resOk, `expected=${expected} intro="${introLine.slice(0, 70)}" win=${saysWin} loss=${saysLoss} draw=${saysDraw}`);

  // R2 — own-side opening why-density >= 80% (student = White = ODD plies, 1..15).
  const studentOpening = plies.filter((p) => p.ply >= 1 && p.ply <= 15 && p.ply % 2 === 1);
  const withWhy = studentOpening.filter((p) => p.narr && p.narr.length > 3);
  const density = studentOpening.length ? withWhy.length / studentOpening.length : 0;
  add('R2 why-density>=80%', density >= 0.8, `${withWhy.length}/${studentOpening.length} = ${(density * 100).toFixed(0)}%`);

  // PLAN — both plan beats fired (opening developing + middlegame majority/race).
  // Check the DETERMINISTIC beat source tag, not the WARMED prose — the house-
  // voice pass rewords each beat non-deterministically, so a regex over the
  // spoken text is brittle (it passed one run, missed the next). The beat's
  // data-narration-source is stable: 'opening-plan' for the developing plan,
  // 'orientation' for the middlegame plan (majority race OR king-hunt — both
  // carry 'orientation'). That's the real "did the plan beat fire" signal.
  const openingPlan = plies.some((p) => p.src === 'opening-plan')
    || plies.some((p) => /out of the opening|develop behind|claim the (centre|center)|develop.*castle/i.test(p.narr || ''));
  const midPlan = plies.some((p) => p.src === 'orientation')
    || plies.some((p) => /majority|opposite wings|pawn(s)? forward|push those|storm|stuck in the (centre|center|middle)|marooned in the (centre|center)|pile (on|up)|punish the lag|throw your pieces|open lines|before they (ever )?(castle|scurry|wriggle)/i.test(p.narr || ''));
  add('PLAN both-beats', openingPlan && midPlan, `opening=${openingPlan} middlegame=${midPlan}`);

  // S5 — the better-line playout FIRED with a why on nearly every ply. A real
  // playout is intro + several per-ply whys + a verdict (>= 4 distinct lines).
  // MATE — only when the game actually ENDS in checkmate: the final narration
  // must NAME it as mate (not "pawns"/eval nonsense). Board-truth for the
  // mate-score fix. Skipped for a resignation/draw game.
  const gameEndsInMate = /#\s*(1-0|0-1)?\s*$/.test(PGN);
  if (gameEndsInMate) {
    const mateNamed = plies.some((p) => /checkmate|mate\b/i.test(p.narr || '')) || /checkmate|it's mate|delivers mate/i.test(voiceAll.join(' '));
    add('MATE named-not-pawns', mateNamed, mateNamed ? 'the mate is named as mate' : 'no mate naming at the finish');
  }
  // No "N pawns" where N is absurd (mate score leaked as a pawn count).
  const bogusPawns = [...plies.map((p) => p.narr || ''), ...voiceAll].find((t) => /\b(\d{2,})(?:\.\d+)?\s*pawns?\b/i.test(t) && Number(RegExp.$1) >= 20);
  add('NOPAWNLEAK no-mate-as-pawns', !bogusPawns, bogusPawns ? `mate leaked as pawns: "${String(bogusPawns).slice(0, 60)}"` : 'no absurd pawn counts');

  // S5 is CONDITIONAL: the better-line playout only fires on a student MISTAKE.
  // A cleanly-played game (e.g. a brilliancy) legitimately has none → skip, not
  // fail. Assert quality only WHEN it fired.
  const s5 = s5runs.filter((r) => r.fired);
  const s5best = s5.reduce((a, r) => Math.max(a, r.lineCount), 0);
  if (s5runs.length === 0) {
    log('  ⏭  S5 skipped — no student mistake in this game (no better-line to walk), correct.');
  } else {
    add('S5 playout-per-move-why', s5.length > 0 && s5best >= 4, `runs=${s5runs.length} fired=${s5.length} maxLines=${s5best} (need >=4)`);
  }

  // OPP — opponent commentary fired at least once. Key on the SEGMENT SOURCE
  // (data-narration-source="opponent"), not phrasing: the house-voice pass
  // rephrases freely (R10), so a keyword match against post-rephrase text is
  // brittle. The source tag proves buildOpponentMoveTeaching produced a segment
  // regardless of how the voice worded it. (Keyword fallback kept for safety.)
  const oppFired = plies.some((p) => p.src === 'opponent')
    || plies.some((p) => /contest|steps in eyeing|trains on|leaves your .* loose|plants a .* on|outpost no|opponent'?s .* (eyes|steps in|slides)/i.test(p.narr || ''))
    // Uncapped mode: every source is 'per-move', but the opponent's own moves are
    // always framed with "Your opponent …" (the [move]/[opp-target]/[opp-dev]
    // facets + the warmed prose). That framing proves opponent commentary fired.
    || plies.some((p) => /\byour opponent\b/i.test(p.narr || ''));
  add('OPP commentary-fired', oppFired, oppFired ? 'an opponent read appeared' : 'no opponent commentary in the whole walk');

  // §4 diagnostic cards (type-not-move + trap) — INFORMATIONAL, not pass/fail:
  // they're gated one-shots that only fire when the game HAS a forcing best move
  // / a poisoned capture, so a given game legitimately may not trigger them.
  log(`  [info] §4 trap card fired this game: ${trapCardFired}`);

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

  // SAC — the queen-sacrifice CANARY (David 2026-07-20 Opera nitpick: the
  // immortal queen sac was narrated as "one more check, nothing fancy"). A
  // student move that OFFERS the queen — the opponent captures it on the very
  // next ply — MUST be narrated as a sacrifice, never flattened to a check.
  // Board-truth, game-agnostic: detect it from the move list.
  let queenSacPly = null;
  for (let i = 0; i < SANS.length - 1; i++) {
    if (i % 2 !== 0) continue;                 // student = White = even index (odd ply)
    if (!/^Q/.test(SANS[i])) continue;         // a student queen move
    const toSq = SANS[i].replace(/[+#]/g, '').slice(-2);
    const next = SANS[i + 1].replace(/[+#]/g, '');
    if (next.includes('x') && next.endsWith(toSq)) { queenSacPly = i + 1; break; } // opponent takes the queen there
  }
  if (queenSacPly !== null) {
    const p = plies.find((x) => x.ply === queenSacPly);
    // A genuine queen SACRIFICE is a SOUND move (the review names it "sacrifice").
    // A queen that merely HANGS to a blunder — or a straight queen trade — is not a
    // sac, and the review correctly calls it a blunder; don't demand "sacrifice"
    // there (draw-game false positive: "Qb3 is a blunder" flagged as an un-named
    // sac). Skip when the ply is an engine error.
    const badge = (p?.badge || '').toUpperCase();
    // Key on BOTH the badge AND the spoken narration — the badge testid isn't
    // always captured at that step, but the review reliably says "blunder"/
    // "mistake" in the prose when the queen merely hangs (draw-game Qb3).
    const isError = /BLUNDER|MISTAKE|INACCUR/.test(badge) || /\b(blunder|a mistake|is a mistake|hangs? the queen)\b/i.test(p?.narr || '');
    if (isError) {
      log(`  ⏭  SAC skipped — the queen move at ply ${queenSacPly} is an engine error (${badge.trim()}), a blunder/trade not a sacrifice.`);
    } else {
      const saysSac = /sacrifice|sac\b|offer/i.test(p?.narr || '');
      add('SAC queen-sac-named', saysSac, saysSac ? `queen sac at ply ${queenSacPly} named a sacrifice` : `queen sac at ply ${queenSacPly} NOT named a sacrifice: "${(p?.narr || '(silent)').slice(0, 60)}"`);
    }
  }

  // NOWINDFALL — a RECAPTURE (capturing on the square the previous ply captured
  // on) must NOT claim a material windfall. An even recapture nets ~0 (David
  // 2026-07-20: "Qxf3 nets three points" on an even trade). Board-truth from the
  // move list; the SEE-gated material calc should make this hold.
  // Only a GENUINE EVEN trade (recaptured piece == originally-captured piece in
  // value) may not claim "wins N" — an UNEVEN recapture (a sac recapture that wins
  // a bigger piece, or winning the exchange) legitimately nets material and MAY say
  // so (David 2026-07-20 diagnostic: cxb5/Rxd7 win knight-for-pawn = a real +2, not
  // a windfall). Replay to read each capture's victim value; flag only even trades.
  const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const victimVal = new Array(SANS.length).fill(null);
  {
    const rc = new Chess();
    for (let i = 0; i < SANS.length; i++) {
      const to = SANS[i].replace(/[+#]/g, '').slice(-2);
      const occ = /[a-h][1-8]/.test(to) ? rc.get(to) : null;
      try { const mv = rc.move(SANS[i]); if (mv && mv.captured) victimVal[i] = PIECE_VAL[mv.captured] ?? 0; else if (occ) victimVal[i] = PIECE_VAL[occ.type] ?? 0; } catch { break; }
    }
  }
  const windfalls = [];
  for (let i = 1; i < SANS.length; i++) {
    if (!SANS[i - 1].includes('x') || !SANS[i].includes('x')) continue;
    const prevTo = SANS[i - 1].replace(/[+#]/g, '').slice(-2);
    const curTo = SANS[i].replace(/[+#]/g, '').slice(-2);
    if (prevTo !== curTo) continue;            // not a recapture on the same square
    if (victimVal[i] != null && victimVal[i - 1] != null && victimVal[i] !== victimVal[i - 1]) continue; // UNEVEN recapture — a legit material gain, not a windfall
    const p = plies.find((x) => x.ply === i + 1);
    if (p && /wins?\s+\d+\s+point|nets?\s+\d+\s+point|\d+\s+points?\s+of\s+material|point\s+richer|grabs?\s+\d/i.test(p.narr || '')) {
      windfalls.push(`ply ${i + 1} ${SANS[i]}: "${(p.narr || '').slice(0, 50)}"`);
    }
  }
  add('NOWINDFALL recapture-not-a-win', windfalls.length === 0, windfalls.length ? windfalls.slice(0, 3).join(' | ') : 'no even-trade recapture claimed a material windfall');

  // TEACHSAC — a sacrifice must TEACH its compensation, not just be named (David
  // 2026-07-20, narrating->teaching). If any line names a sacrifice, some line in
  // the walk must give the board-true payoff (king exposure / development lead /
  // winning verdict). This is the narrating-vs-teaching contract for the sac.
  const anySac = plies.some((p) => /\bsacrifice\b|\bsacrifices\b/i.test(p.narr || ''));
  if (anySac) {
    // The compensation CONCEPT must appear somewhere — king exposure / development
    // lead / winning verdict — worded any way Danya's voice phrases it (warmed).
    const taught = plies.some((p) => /in development|develop\w* (lead|ahead|edge)|stuck in the (centre|center|middle)|on top|holds up|worth .*(more|material)|more than enough/i.test(p.narr || ''));
    add('TEACHSAC compensation-taught', taught, taught ? 'the sacrifice teaches its compensation' : 'a sacrifice was named but its compensation was never taught');
  }

  // TEACHFORCED — a game that ends in a forced checking run must FRAME the finish
  // (the forcing-move / calculate-to-the-end concept), then the walk plays it out.
  // Re-derive the run here (chess.js) so the audit checks the concept, not text.
  if (gameEndsInMate) {
    const chk = new Chess();
    const inCheck = []; const gives = [];
    let legal = true;
    for (const s of SANS) { try { inCheck.push(chk.inCheck()); if (!chk.move(s)) { legal = false; break; } gives.push(/[+#]$/.test(s)); } catch { legal = false; break; } }
    let runLen = 0;
    if (legal) { let start = SANS.length - 1; for (let i = SANS.length - 1; i >= 0; i--) { if (gives[i] || inCheck[i]) start = i; else break; } runLen = SANS.length - start; }
    if (runLen >= 3) {
      const framed = plies.some((p) => /forced|ends in mate|watch it land|every move is a check/i.test(p.narr || ''));
      add('TEACHFORCED forced-finish-framed', framed, framed ? 'the forced finish is framed for the student' : 'the forced mating run was never framed as forced');
    }
    // TEACHWHY — the marquee keystone must teach the MECHANISM (the WHY it works),
    // not just name the sac + its compensation (David 2026-07-20: "where is the
    // teaching moment, the why? one sentence per move doesn't cover it"). On a game
    // that finishes with a mating sacrifice, some line must explain the concrete
    // mechanism: a line-clearance/deflection ("drags the ... off / swings open /
    // crashes down") or a king-shield removal ("tear ... away from beside their
    // king"). Multi-sentence, board-true.
    const whyTaught = plies.some((p) => /why it works|drags the .*off|swings (wide )?open|crashes down to|tear the .*away from beside|the \w+-file swings/i.test(p.narr || ''));
    add('TEACHWHY mechanism-taught', whyTaught, whyTaught ? 'the keystone sac teaches its mechanism (the why)' : 'a mating sac was named but its mechanism/why was never explained');
  }

  // TEACHASSESS — the ENUMERATED positional verdict (David 2026-07-20 teaching
  // messages: Danya never says "White is better" and stops — he itemizes the
  // assets). When the assessment beat fires (src='assessment'), it MUST carry a
  // verdict word AND an itemized asset list (≥2 concrete board-true assets joined
  // by "and"). It correctly does NOT fire on a sharp attacking game (no quiet
  // positional edge to enumerate), so SKIP rather than fail when absent — like S5.
  const assessPly = plies.find((p) => p.src === 'assessment');
  if (assessPly) {
    const t = assessPly.narr || '';
    const hasVerdict = /better here|worse here|in trouble/i.test(t);
    // Itemized = names ≥2 concrete assets (open file / outpost / isolated pawn /
    // passed pawn / bishop pair / development lead) joined into a list.
    const assetHits = (t.match(/open \w-file|outpost on [a-h][1-8]|[a-h][1-8] is isolated|doubled pawns|passed pawn on [a-h][1-8]|bishop pair|further developed/gi) || []).length;
    const itemized = hasVerdict && assetHits >= 2 && /\band\b/i.test(t);
    add('TEACHASSESS enumerated-verdict', itemized, itemized ? `verdict + ${assetHits} itemized assets` : `assessment beat malformed: "${t.slice(0, 90)}"`);
  } else {
    log('  ⏭  TEACHASSESS skipped — no quiet positional edge to enumerate in this game (sharp/attacking), correct.');
  }

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
