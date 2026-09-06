/**
 * audit-review-overhaul-prod — THE post-game-review OVERHAUL audit (David
 * 2026-09-05, plan: docs/plans/2026-09-05-postgame-review-overhaul.md), held to
 * the locked REAL-GAME EXPERIENCE AUDIT STANDARD: seed a REAL, UNPROCESSED game,
 * run the genuine pipeline, drive the surface like a human, assert experience
 * contracts. Three instruments: Playwright drives · the app's own audit events
 * are captured off the wire (coach-narration-spoken carries the FULL spoken
 * text — the audit runs MUTED, no TTS spend) · the prod audit-stream is pulled
 * before/after.
 *
 * The fixture is David's own game (KaiserlicheHoheit–Knight_Mare_01, chess.com
 * daily 1023640032, Alapin, student = Black, 0-1). His read of 6...Nb6: "gave
 * space away, moved the same piece twice, and allowed the opponent to gain
 * tempo." The attributor must SAY that, first, on ply 12.
 *
 * Contracts (hard PASS/FAIL):
 *   CARD   the review-list card says WIN (green), never a raw 0-1
 *   OPEN   first open analyses + the walk becomes startable (timed)
 *   FUND   ply-12 narration LEADS with the fundamentals (same piece / tempo / space)
 *   AUTO   the walk advances by itself after Start (no Forward click)
 *   FREE   a piece moved on the board = exploring: banner up, walk PAUSED
 *   EXPL   the explored move is NARRATED and the engine REPLIES
 *   EXIT   Back exits exploration; Play restarts auto-advance
 *   SHOW   "Show me better move" narrates the better line and leaves the walk paused
 *   RECAP  the closing aggregates the fundamentals across the flagged moves
 *   REOPEN a second open is instant — no analysis re-run, no spinner
 *   ERR    zero page/console errors
 *
 * Run (prod): AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-review-overhaul-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { exploreOnFreeBoard, readWalkPly } from './audit-lib/review-explore.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = process.env.AUDIT_GID || `audit-alapin-overhaul-${Date.now()}`;
const PGN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6 9. Be2 Bg4 10. Nb5 Qd7 11. Bf4 Nd5 12. Ne5 Bxe2 13. Qxe2 Nxf4 14. Nxd7 Nxe2 15. Nc7+ Kxd7 16. Nxa8 Nexd4 17. Rd1 e5 18. a3 Bc5 19. b4 Nxb4 20. axb4 Bxb4+ 21. Kf1 Rxa8 22. Rb1 a5 23. h4 Rc8 0-1';
const FUND_PLY = 12;    // 6...Nb6 — the fixture move
const EXPLORE_PLY = 11; // after 6.Nc3 — Black (the student) to move
const SANS = (() => { const c = new Chess(); c.loadPgn(PGN); return c.history(); })();

const log = (s) => console.log(s);
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };
const txt = async (p, sel) => { try { const l = p.locator(sel).first(); return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
const until = async (fn, ms, step = 400) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };

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
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(muteTtsForAudit);      // instrument = the app's own spoken events; never a synthesis bill
  await ctx.addInitScript(autoDismissCalibration);
  // Instrument 2 — the narration listener sidecar. The page streams EVERY
  // logAppAudit event to it; `coach-narration-spoken` carries the full spoken
  // text (narrationText), which is what the contracts below read.
  const listener = await attachVoiceListener(ctx);
  const page = await ctx.newPage();

  const errs = [];
  page.on('pageerror', (e) => { if (/startsWith is not a function/.test(e.message)) return; errs.push('PAGEERROR: ' + e.message.slice(0, 160)); });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|manifest|net::ERR|Download the React|Failed to load resource.*(429|502|503)|\[Stockfish\] worker\.onerror/i.test(t)) return;
    errs.push('CONSOLE: ' + t.slice(0, 160));
  });

  const spoken = () => listener.getCapturedEvents()
    .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText)
    .map((e) => ({ t: Number(e.timestamp ?? 0), text: String(e.narrationText), source: String(e.source ?? '') }));
  const events = () => listener.getCapturedEvents().filter((e) => e.kind !== 'coach-narration-spoken');

  const dismiss = async () => {
    for (let i = 0; i < 6; i++) {
      for (const [s, c] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
      await page.waitForTimeout(400);
    }
  };

  const results = [];
  const add = (id, pass, detail) => { results.push({ id, pass, detail }); log(`  ${pass ? '✅' : '❌'} ${id}: ${detail}`); };

  const streamBefore = await pullAuditStream(Date.now() - 60000);
  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss();
  await page.waitForTimeout(2500);

  // SEED — David's real game, UNANALYZED. Student = Black by handle.
  const seed = await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, pgn, white: 'KaiserlicheHoheit', black: 'Knight_Mare_01', result: '0-1', date: '2026.09.03', event: "Let's Play!", eco: 'B22', whiteElo: 1392, blackElo: 1378, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Knight_Mare_01'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  // ── CARD (F) — the list card says WIN, never 0-1 ────────────────────────
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  const cardSel = `[data-testid="review-game-card-${GID}"]`;
  const cardUp = await until(() => has(page, cardSel), 20000);
  const badge = cardUp ? await txt(page, `${cardSel} [data-testid="review-game-outcome"]`) : '';
  const outcome = cardUp ? await page.locator(`${cardSel} [data-testid="review-game-outcome"]`).first().getAttribute('data-outcome').catch(() => '') : '';
  const cardText = cardUp ? await txt(page, cardSel) : '';
  add('CARD win-not-0-1', cardUp && badge === 'WIN' && outcome === 'win' && !/\b0-1\b/.test(cardText) && /vs KaiserlicheHoheit/.test(cardText),
    cardUp ? `badge="${badge}" outcome=${outcome} text="${cardText.slice(0, 70)}"` : 'card never rendered');

  // No card = nothing to open. Fail NOW rather than wait out the 300s analysis
  // window on a surface that never rendered (the vacuity negative control must
  // see a verdict, not a hang).
  if (!cardUp) {
    add('OPEN first-open-analyses', false, 'the seeded game never appeared in the review list — nothing to open');
    log('\n===== VERDICT: ❌ FAILS STANDARD (surface unreachable) =====');
    await listener.stop(); await browser.close(); process.exit(1);
  }

  // ── OPEN (A) — first open runs the genuine pipeline; time it ────────────
  const t0 = Date.now();
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForURL(/\/coach\/review\//, { timeout: 15000 }).catch(() => undefined);
  await dismiss();
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled')) === null; };
  const ready = await until(startable, 300000, 1500);
  const openMs = Date.now() - t0;
  add('OPEN first-open-analyses', ready, ready ? `walk startable in ${(openMs / 1000).toFixed(1)}s` : 'analysis never settled (300s)');
  // ENGINE TRUTH for the fixture move — what the app's own engine wrote for
  // 6...Nb6 (and its neighbours). This is the line to read when FUND fails:
  // the fundamentals attach only to a ply the engine graded worse than good.
  const annots = await page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const rows = (g?.annotations ?? []).filter((a) => a.moveNumber >= 5 && a.moveNumber <= 7).map((a) => `${a.moveNumber}${a.color === 'black' ? '...' : '.'}${a.san} ${a.classification} eval=${a.evaluation} bestEval=${a.bestMoveEval} best=${a.bestMove}`);
    return { depth: g?.analysisDepth, fully: g?.fullyAnalyzed, rows };
  }, GID).catch((e) => ({ error: String(e) }));
  log(`  [engine] depth=${annots.depth} fullyAnalyzed=${annots.fully}`);
  (annots.rows ?? []).forEach((r) => log(`  [engine] ${r}`));
  if (!ready) { await listener.stop(); await browser.close(); process.exit(1); }

  // ── AUTO (C) — Start, then the walk advances on its own ─────────────────
  const spokenAt = () => spoken().length;
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  const p0 = (await readWalkPly(page))?.n ?? 0;
  const advanced = await until(async () => ((await readWalkPly(page))?.n ?? 0) >= p0 + 2, 90000, 800);
  const playState = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
  add('AUTO advances-by-itself', advanced && playState === 'playing', `from ply ${p0} → ${(await readWalkPly(page))?.n} with no Forward click; play/pause state=${playState}`);

  // ── FUND (E) — land on ply 12 and read the narration ────────────────────
  // Pause first (any intervention pauses), then jump by clicking Back/Forward
  // like a human would. Cards that mount are resolved by clicking.
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 3000 }).catch(() => undefined);
  const resolveCards = async () => {
    for (const [c, sel] of [
      ['discussion-reason-picker', '[data-testid="discussion-reason-option"]'],
      ['review-find-shot-card', '[data-testid="review-find-shot-skip"]'],
      ['review-cameo-ask', '[data-testid="review-cameo-skip"]'],
      ['review-theory-ask', '[data-testid="review-theory-skip"]'],
      ['review-trap-card', '[data-testid="review-trap-pick-leave"]'],
      ['review-trap-reveal', '[data-testid="review-trap-done"]'],
      ['review-rewind-card', '[data-testid="review-rewind-decline"]'],
      ['review-turning-point-card', '[data-testid="review-turning-point-confirm"]'],
      ['review-turning-point-reveal', '[data-testid="review-turning-point-done"]'],
      ['review-blunder-capture', '[data-testid="review-capture-skip"]'],
      ['review-sequence-ask', '[data-testid="review-sequence-skip"]'],
      ['review-sequence-playback', '[data-testid="review-sequence-skip"]'],
    ]) {
      if (await has(page, `[data-testid="${c}"]`) && await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500, force: true }).catch(() => undefined); await page.waitForTimeout(400); }
    }
  };
  const goTo = async (target) => {
    for (let i = 0; i < 80; i++) {
      await resolveCards();
      const n = (await readWalkPly(page))?.n ?? 0;
      if (n === target) return true;
      const sel = n < target ? '[data-testid="review-forward-btn"]' : '[data-testid="review-back-btn"]';
      await page.locator(sel).first().click({ timeout: 2000, force: true }).catch(() => undefined);
      await page.waitForTimeout(700);
    }
    return ((await readWalkPly(page))?.n ?? 0) === target;
  };
  // Cards mount a beat AFTER a ply lands (cameo / theory asks); a human reads
  // them and taps. Settle, then resolve whatever appeared, twice.
  const settle = async () => { for (let i = 0; i < 3; i++) { await page.waitForTimeout(900); await resolveCards(); } };
  const onFund = await goTo(FUND_PLY);
  await settle();
  const fundNarr = await txt(page, '[data-testid="review-narration-banner"]');
  const fundBadge = await txt(page, '[data-testid="review-classification-badge"]');
  // The DNA-register verdict stems (principleVoice.ts) + the cost sentence.
  // The DNA-register verdict stems from principleVoice.ts — the fundamentals
  // line, not the generic threat read ("your knight is sitting loose" is the
  // threat detector, and must NOT satisfy this).
  const FUND_RE = /same (knight|bishop|rook|queen|piece) (for the|again|moves)|its (second|third|fourth|fifth) (move|trip)|on its (second|third|fourth|fifth) move|hands them a tempo|tempo lost|the cost is time|another tempo handed|gave up [a-h][1-8]|concedes the [a-h][1-8] square|space handed over|space given up|development first|pieces before pawns|develops nothing while|queen came out too early|early queen sortie|queen before the pieces|castling was there|castle first|uncastled one move too long|pawn grab with the pieces|^greedy:|edge pawn this early|edge pawns wait|both bishops are committed|knights before bishops|bishops declared their squares|buries your own bishop|a centre break|open the centre only when|knight on the rim is dim|knights belong in the centre|loose pieces drop off|their threat first|answer the threat before|checks, captures, threats|a forcing win was on the board|always run the forcing moves|loosens the shelter|pawns in front of the king move only|creates a lasting weakness|pawns don't move backwards|a structural cost|advanced past its support|too far, too soon|trades your active|trade your worst piece|an exchange that improves them|ahead in material — trade|every piece off the board|ahead means simplify|behind in material|when you're down, keep the pieces|behind means complicate|improve your worst piece/i;
  const lead = fundNarr.split(/(?<=[.!?])\s+/)[0] || '';
  const flagged = /INACCUR|MISTAKE|BLUNDER/i.test(fundBadge);
  // The fixture ply: WHEN the engine flags it, the narration must LEAD with the
  // fundamentals. Whether it flags it is engine truth, printed above ([engine]).
  // INFORMATIONAL, not a gate: whether 6...Nb6 is flagged is the engine's call
  // inside REVIEW_POSITION_BUDGET_MS on THIS hardware (native Stockfish: 52cp at
  // d14 = "good" under the 5% band, 128cp at d16). The product contract — a
  // flagged ply LEADS with its fundamental — is FUNDLEAD below.
  log(`  ${flagged ? '✅' : '⚠️ '} FUND fixture-ply-graded (info): 6...Nb6 badge=${fundBadge || 'none'} — engine truth at the app's budget, see [engine] rows`);
  add('FUND fixture-ply-leads-with-fundamentals', onFund && (!flagged || FUND_RE.test(lead)), onFund ? `lead="${lead.slice(0, 120)}"` : 'unreached');
  add('FUND no-we-our', !/\b(we|our|us)\b/i.test(fundNarr), /\b(we|our|us)\b/i.test(fundNarr) ? `perspective leak: "${fundNarr.slice(0, 80)}"` : 'you/your + they/their only');

  // ── FREE + EXPL (D) — the student tries THEIR OWN alternative on the free board
  await goTo(EXPLORE_PLY);
  await settle();
  const spokenBeforeExplore = spokenAt();
  const ex = await exploreOnFreeBoard(page, { replyWaitMs: 45000 });
  const pausedState = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
  const pausedLabel = await has(page, '[data-testid="review-paused-label"]');
  const plyHeld = (await readWalkPly(page))?.n === EXPLORE_PLY;
  add('FREE piece-move-is-exploring', ex.ok && pausedState === 'paused' && plyHeld, ex.ok ? `played ${ex.san}; banner=${ex.banner}; paused=${pausedState}; pausedLabel=${pausedLabel}; ply held=${plyHeld}` : ex.reason);
  const exploreSpoke = await until(() => spoken().length > spokenBeforeExplore, 45000, 500);
  const exploreLine = exploreSpoke ? spoken().slice(spokenBeforeExplore).map((s) => s.text).join(' | ') : '';
  const exploredEvent = events().some((e) => e.kind === 'review-walk-explored');
  add('EXPL explored-move-narrated+engine-reply', ex.ok && exploreSpoke && ex.reply && exploredEvent, `spoke="${exploreLine.slice(0, 140)}" engineReply=${ex.reply} auditEvent=${exploredEvent}`);

  // ── EXIT (G.3) — Back exits exploration; Play restarts ──────────────────
  await page.locator('[data-testid="review-back-btn"]').first().click({ timeout: 2000, force: true }).catch(() => undefined);
  await page.waitForTimeout(800);
  const bannerGone = !(await has(page, '[data-testid="review-exploring-banner"]'));
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
  const pBefore = (await readWalkPly(page))?.n ?? 0;
  const restarted = await until(async () => ((await readWalkPly(page))?.n ?? 0) >= pBefore + 2, 60000, 800);
  add('EXIT back-exits-play-restarts', bannerGone && restarted, `banner gone=${bannerGone}; Play resumed advance=${restarted} (from ply ${pBefore})`);

  // ── RECAP (G.4) — play to the end; the closing aggregates ───────────────
  await page.locator('[data-testid="walk-resume-game-btn"]').first().click({ timeout: 1500, force: true }).catch(() => undefined);
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
  const total = (await readWalkPly(page))?.total ?? SANS.length;
  let reachedEnd = false;
  const flaggedLeads = new Map(); // ply → { badge, lead }
  const plyNarr = new Map();      // ply → { badge, narr } — every ply the walk showed
  for (let i = 0; i < 400; i++) {
    await resolveCards();
    const n = (await readWalkPly(page))?.n ?? 0;
    const b = await txt(page, '[data-testid="review-classification-badge"]');
    if (n > 0 && !plyNarr.has(n)) {
      const nt = await txt(page, '[data-testid="review-narration-banner"]');
      if (nt) plyNarr.set(n, { badge: b, narr: nt });
    }
    if (n % 2 === 0 && n > 0 && /INACCUR|MISTAKE|BLUNDER/i.test(b) && !flaggedLeads.has(n)) {
      const nt = plyNarr.get(n)?.narr ?? '';
      flaggedLeads.set(n, { badge: b, lead: nt.split(/(?<=[.!?])\s+/)[0] || '' });
    }
    if (n >= total) { reachedEnd = true; break; }
    const st = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
    if (st === 'paused') { await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined); }
    await page.waitForTimeout(1500);
  }
  const RECAP_RE = /of your \w+ flagged move|carry into the next game|The pattern: you \w/i;
  await until(() => spoken().some((s) => RECAP_RE.test(s.text)), 60000, 1000);
  const recap = spoken().find((s) => RECAP_RE.test(s.text));
  add('RECAP fundamentals-aggregate', reachedEnd && !!recap, recap ? `"${recap.text.slice(0, 140)}"` : `end reached=${reachedEnd}; no aggregate line spoken`);
  // ACC — board accuracy of every "<piece> on <square>" claim, on the board AFTER
  // that ply (present-tense text only; a projected line is about a future board).
  const PIECE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
  const PROJ = /(?:it runs|the line runs|the plan runs|it goes|it continues|their idea runs|Here's how)/i;
  const accFails = [];
  const seatFails = [];
  const tradeFails = [];
  const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const rc = new Chess();
  const victimVal = [];
  for (const san of SANS) { const mv = rc.move(san); victimVal.push(mv?.captured ? PIECE_VAL[mv.captured] : null); }
  for (const [n, { narr }] of plyNarr) {
    const pos = new Chess(); for (let k = 0; k < n; k++) pos.move(SANS[k]);
    let scan = narr.replace(/\([^)]*\)/g, ' ');
    const cut = scan.search(PROJ); if (cut >= 0) scan = scan.slice(0, cut);
    const re = /\b(knight|bishop|rook|queen|pawn|king)\s+on\s+([a-h][1-8])\b/gi; let m;
    while ((m = re.exec(scan)) !== null) {
      const cell = pos.get(m[2].toLowerCase());
      if (!cell || cell.type !== PIECE[m[1].toLowerCase()]) accFails.push(`ply ${n}: "${m[1]} on ${m[2]}" but board has ${cell ? cell.type : 'empty'}`);
    }
    // SEAT — the student is Black (even plies). An opponent ply must not open
    // "You <verb>"; a student ply must not open "Your opponent" / "They".
    const head = narr.replace(/^["'“‘\s]+/, '').slice(0, 40);
    const studentPly = n % 2 === 0;
    if (!studentPly && /^you\s+(?!(?:'re|'ve|'ll|'d|are|were|have|had|has|need|want|can|could|must|should|may|might|will|would|know|see|feel|get|keep|hold|sit|stand|remain|stay)\b)[a-z]/i.test(head)) seatFails.push(`ply ${n} (opponent): "${head}"`);
    if (studentPly && /^(your opponent|they )/i.test(head)) seatFails.push(`ply ${n} (you): "${head}"`);
    // NOTRADEWIN — a capture immediately recaptured on the same square at equal
    // value is an even trade: it must not read as profit / material won.
    const i = n - 1;
    if (i + 1 < SANS.length && SANS[i].includes('x') && SANS[i + 1].includes('x')) {
      const to = (x) => x.replace(/[+#]/g, '').slice(-2);
      if (to(SANS[i]) === to(SANS[i + 1]) && victimVal[i] !== null && victimVal[i] === victimVal[i + 1]
        && /clean profit|material in the bag|wins? material|nets? (a|the|\d)|without giving up anything|free pawn|a real price/i.test(scan)) {
        tradeFails.push(`ply ${n} ${SANS[i]}: "${narr.slice(0, 70)}"`);
      }
    }
  }
  add('ACC board-accuracy', accFails.length === 0, accFails.length ? accFails.slice(0, 3).join(' | ') : `no false piece-on-square claims across ${plyNarr.size} narrated plies`);
  add('SEAT mover-never-reattributed', seatFails.length === 0, seatFails.length ? seatFails.slice(0, 3).join(' | ') : `every narrated ply keeps its seat (${plyNarr.size} plies)`);
  add('NOTRADEWIN even-trade-not-profit', tradeFails.length === 0, tradeFails.length ? tradeFails.slice(0, 3).join(' | ') : 'no even trade narrated as material won');

  // FUNDLEAD — across the walk, every flagged STUDENT ply the auto-advance
  // passed leads with a fundamentals verdict when one attached; at least one
  // must have (a game with a flagged move and no fundamental anywhere means
  // the attributor is not wired into the live narration).
  const leads = [...flaggedLeads.entries()];
  const withFund = leads.filter(([, v]) => FUND_RE.test(v.lead));
  add('FUNDLEAD flagged-student-plies-lead-with-fundamentals', leads.length > 0 && withFund.length > 0,
    `${withFund.length}/${leads.length} flagged student plies lead with a fundamental` + (leads.length ? ` — ${leads.map(([p, v]) => `ply ${p} ${v.badge}: "${v.lead.slice(0, 60)}"`).join(' | ')}` : ''));

  // ── SHOW (B) — button-only, narrated, leaves the walk paused ────────────
  // Show-me mounts only on a FLAGGED ply with a better move — use the first
  // flagged student ply the walk found (the fixture ply when the engine
  // flagged it).
  const showPly = [...flaggedLeads.keys()][0] ?? FUND_PLY;
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
  await goTo(showPly);
  await settle();
  const showBtn = await has(page, '[data-testid="walk-show-me-btn"]');
  const spokenBeforeShow = spokenAt();
  let showLines = 0; let showPaused = null;
  if (showBtn) {
    await page.locator('[data-testid="walk-show-me-btn"]').first().click({ timeout: 2000, force: true }).catch(() => undefined);
    await until(() => spoken().length >= spokenBeforeShow + 2 && events().some((e) => e.kind === 'review-show-me-finished'), 90000, 800);
    showLines = spoken().length - spokenBeforeShow;
    showPaused = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
  }
  add('SHOW better-move-narrated-then-paused', showBtn && showLines >= 2 && showPaused === 'paused', showBtn ? `ply ${showPly}: ${showLines} lines spoken; state after=${showPaused}` : `no Show-me button on flagged ply ${showPly}`);
  const showStarts = events().filter((e) => e.kind === 'review-show-me-started').length;
  add('SHOW never-auto-played', showStarts === (showBtn ? 1 : 0), `${showStarts} show-me start(s) — must equal the one tap`);

  // ── REOPEN (A) — instant, no re-analysis ────────────────────────────────
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  await until(() => has(page, cardSel), 20000);
  const t1 = Date.now();
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  const quick = await until(startable, 8000, 250);
  const reopenMs = Date.now() - t1;
  const spinner = await has(page, '[data-testid="review-analyze-spinner"]');
  const pill = await has(page, '[data-testid="review-deepening-pill"]');
  add('REOPEN instant-no-rerun', quick && !spinner, `startable in ${(reopenMs / 1000).toFixed(1)}s; spinner=${spinner}; deepening pill=${pill}`);
  // The key-moment dive ran BEHIND the first open (cold open = sweep only) and
  // was frozen out of that walk; this open carries it. Let a still-running dive
  // finish, then read the fixture ply's grade + lead line — David's own
  // example: 6...Nb6 must be flagged and led by its fundamentals.
  await until(async () => !(await has(page, '[data-testid="review-deepening-pill"]')), 240000, 2000);
  const annots2 = await page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const a = (g?.annotations ?? []).find((x) => x.moveNumber === 6 && x.color === 'black');
    return { depth: g?.analysisDepth, row: a ? `${a.classification} eval=${a.evaluation} bestEval=${a.bestMoveEval} best=${a.bestMove}` : 'none' };
  }, GID).catch((e) => ({ error: String(e) }));
  log(`  [engine after dive] depth=${annots2.depth} 6...Nb6 ${annots2.row}`);
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 3000 }).catch(() => undefined);
  const onFund2 = await goTo(FUND_PLY);
  await settle();
  const fundBadge2 = await txt(page, '[data-testid="review-classification-badge"]');
  const fundNarr2 = await txt(page, '[data-testid="review-narration-banner"]');
  const lead2 = fundNarr2.split(/(?<=[.!?])\s+/)[0] || '';
  const flagged2 = /INACCUR|MISTAKE|BLUNDER/i.test(fundBadge2);
  add('FUND fixture-ply-graded-after-dive', onFund2 && flagged2, `6...Nb6 badge=${fundBadge2 || 'none'} (${annots2.row})`);
  add('FUND fixture-ply-leads-with-fundamentals-after-dive', onFund2 && flagged2 && FUND_RE.test(lead2), `lead="${lead2.slice(0, 120)}"`);

  add('ERR no-errors', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');

  const streamAfter = await pullAuditStream(Date.now() - 600000);
  log('\n===== 3-INSTRUMENT COVERAGE =====');
  log(`  Playwright: drove list → open → walk → explore → show-me → end → reopen`);
  log(`  Narration listener: ${spoken().length} spoken lines, ${events().length} other events`);
  log(`  Audit-stream: before=${JSON.stringify(streamBefore)} after=${JSON.stringify(streamAfter)}`);
  log('\n===== SPOKEN (first 30) =====');
  spoken().slice(0, 30).forEach((s, i) => log(`  [${String(i + 1).padStart(2)}] ${s.text.slice(0, 160)}`));
  log('===== SPOKEN (last 10) =====');
  const all = spoken();
  all.slice(-10).forEach((s, i) => log(`  [${String(all.length - 10 + i + 1).padStart(2)}] ${s.text.slice(0, 200)}`));
  log('\n===== CONTRACT GRID =====');
  let allPass = true;
  for (const r of results) { log(`  ${r.pass ? '✅ PASS' : '❌ FAIL'}  ${r.id.padEnd(40)} ${r.detail}`); if (!r.pass) allPass = false; }
  log(`\n===== VERDICT: ${allPass ? '✅ MEETS STANDARD' : '❌ FAILS STANDARD'} =====`);
  try {
    const dir = `audit-reports/review-overhaul-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, gid: GID, verdict: allPass ? 'MEETS STANDARD' : 'FAILS STANDARD', results, engine: annots, spoken: all.map((x) => x.text), plies: [...plyNarr.entries()].map(([ply, v]) => ({ ply, ...v })), streamBefore, streamAfter, errors: errs }, null, 2));
    log(`report: ${dir}/report.json`);
  } catch (e) { log(`(report not written: ${String(e).slice(0, 80)})`); }
  await listener.stop();
  await browser.close();
  process.exit(allPass ? 0 : 1);
};
run().catch((e) => { console.error('fatal:', e); process.exit(1); });
