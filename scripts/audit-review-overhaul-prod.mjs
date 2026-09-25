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
 *   THESIS the selector's thesis spoken once at the turning-point reveal, after the pick (N1)
 *   NEED   opening teaching covered AGAINST the student's computed need, never a sentence count (N2 — R2 retired)
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
import { sampleRenderers, playwrightRenderers } from './audit-lib/os-sample.mjs';
import { raced as racedRead, wedgeWatch, until as sharedUntil } from './audit-lib/wedge-watch.mjs';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { seatReattributes } from './audit-lib/seat-reattribution.mjs';
import { judgeCriticalVoice } from './audit-lib/critical-moment-voice.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { seedWeaknessProfile } from './audit-lib/seed-weakness-profile.mjs';
import { exploreOnFreeBoard, readWalkPly } from './audit-lib/review-explore.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';
import { LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { wedgeTracer } from './audit-lib/wedge-tracer.mjs';
import { SEEDS, pickRealGame, fetchGameById } from './audit-lib/source-real-game.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

/**
 * 🔄 A NEW GAME EVERY RUN (David 2026-09-17: "I want new games audited each
 * time. No good to have the same one over and over. It doesn't tell us anything
 * new.").
 *
 * This audit used to replay ONE hardcoded PGN — David's Alapin — so every run
 * re-read a board we had already read. That is a regression test wearing an
 * audit's clothes. The fleet wrapper (`audit-review-fleet-newgames.mjs`) has
 * always sourced fresh real games, but it spawned `audit-review-real-game.mjs`,
 * which has been STALE since the 2026-09-05 overhaul — so the rotation never
 * actually reached a working audit and every review run was the same game.
 *
 * ROTATE FOR DISCOVERY, PIN FOR DIAGNOSIS. If the board changes every run then
 * a red row is ambiguous — regression, or just a different position? So the run
 * PRINTS the exact command that reproduces it:
 *   default            → a fresh real master game (G3-sourced, chess.js-verified)
 *   AUDIT_GAME_ID=<id> → re-run that exact game
 *   AUDIT_GAME=fixture → David's Alapin, the known baseline
 */
const FIXTURE = {
  id: 'fixture-alapin',
  white: 'KaiserlicheHoheit',
  black: 'Knight_Mare_01',
  result: '0-1',
  studentSide: 'black',
  seedName: 'Alapin fixture (David\'s own game)',
  movetext: '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6 9. Be2 Bg4 10. Nb5 Qd7 11. Bf4 Nd5 12. Ne5 Bxe2 13. Qxe2 Nxf4 14. Nxd7 Nxe2 15. Nc7+ Kxd7 16. Nxa8 Nexd4 17. Rd1 e5 18. a3 Bc5 19. b4 Nxb4 20. axb4 Bxb4+ 21. Kf1 Rxa8 22. Rb1 a5 23. h4 Rc8 0-1',
};

async function resolveGame() {
  const mode = process.env.AUDIT_GAME || '';
  if (mode === 'fixture') return { ...FIXTURE, how: 'AUDIT_GAME=fixture' };
  // A caller that already sourced a game (the fleet wrapper) hands it straight
  // in — no point querying the explorer twice for a game it already verified.
  if (process.env.AUDIT_PGN) {
    const result = process.env.AUDIT_RESULT || '*';
    const side = process.env.AUDIT_STUDENT === 'black' ? 'black' : 'white';
    return {
      id: process.env.AUDIT_GID || 'supplied',
      white: process.env.AUDIT_WHITE || 'White',
      black: process.env.AUDIT_BLACK || 'Black',
      result,
      studentSide: side,
      seedName: process.env.AUDIT_SEED_NAME || 'supplied by caller',
      movetext: process.env.AUDIT_PGN,
      // "AUDIT_PGN=<supplied>" would reproduce NOTHING — a reproduce line that
      // cannot be pasted is the same disease as an audit that reports green
      // having verified nothing. The caller passes the source id so a red row
      // from a rotated fleet run can be re-run on the exact same board.
      how: process.env.AUDIT_SOURCE_ID
        ? `AUDIT_GAME_ID=${process.env.AUDIT_SOURCE_ID} AUDIT_STUDENT=${side}`
        : `AUDIT_STUDENT=${side} AUDIT_PGN='${process.env.AUDIT_PGN}'`,
    };
  }
  const byId = process.env.AUDIT_GAME_ID;
  if (byId) {
    // A PINNED run must run THAT game or say so. On 2026-09-19 a transient
    // fetch throw was swallowed here and the run fell back to a fresh pick —
    // then printed a "reproduce" line for a game it never played, and the
    // reproducibility pair it was part of compared two different games. Retry
    // the fetch (the export proxy had just served the same id seconds earlier),
    // name the reason, and FAIL LOUDLY rather than rotate under a pin.
    let lastErr = null;
    for (const waitMs of [0, 2000, 5000]) {
      if (waitMs) await new Promise((r) => setTimeout(r, waitMs));
      try {
        const g = await fetchGameById(BASE, byId);
        if (g) return { ...g, studentSide: process.env.AUDIT_STUDENT || 'white', how: `AUDIT_GAME_ID=${byId}` };
        lastErr = 'verifyLegal rejected the movetext';
      } catch (e) { lastErr = String(e).slice(0, 160); }
      log(`[game] AUDIT_GAME_ID=${byId} fetch failed (${lastErr}) — retrying`);
    }
    console.log(`\n===== VERDICT: ❌ FAILS STANDARD (pinned game ${byId} could not be fetched: ${lastErr}) =====`);
    process.exit(2);
  }
  const idx = process.env.AUDIT_SEED_INDEX ? Number(process.env.AUDIT_SEED_INDEX) : Date.now();
  // Walk the seed list from the rotation point so one empty explorer answer
  // does not abort the run — "the explorer had nothing" is not a product bug.
  for (let i = 0; i < SEEDS.length; i += 1) {
    const seedIdx = (Math.abs(Math.floor(idx)) + i) % SEEDS.length;
    const g = await pickRealGame(BASE, SEEDS[seedIdx]).catch(() => null);
    if (g) return { ...g, how: `AUDIT_GAME_ID=${g.id} AUDIT_STUDENT=${g.studentSide}` };
  }
  log('[game] no real game could be sourced (explorer unreachable?) — using the fixture so the run still reports');
  return { ...FIXTURE, how: 'AUDIT_GAME=fixture' };
}

const GID = process.env.AUDIT_GID || `audit-review-overhaul-${Date.now()}`;
let GAME = FIXTURE;          // replaced in main() before any use
let PGN = FIXTURE.movetext;
let SANS = [];
let FUND_PLY = 12;           // chosen from the engine's own flags, per game
let EXPLORE_PLY = 11;        // a student-to-move ply, derived below

// Every line stamped: on 2026-09-20 two 'wedges' turned out to sit at 29:53 of
// a 30-min chain bound, and without timestamps nobody could tell a slow run
// from a blocked one (PLAN #21 n=5/n=6).
const log = (s) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${s}`);
// 🔒 `count()` TAKES NO TIMEOUT, so it waits FOREVER on a renderer that has
// stopped answering — and `resolveCards` calls this first thing in the
// reopened-walk loop, ahead of the blow-up check. That is exactly how the
// wedge guard sat for 27 minutes on 2026-09-20 instead of reporting
// CONTAMINATED: the detector's own detection path needed the wedged thread to
// answer. Every read that can meet a wedged page is now bounded.
const raced = racedRead;                       // scripts/audit-lib/wedge-watch.mjs
const has = async (p, sel) => raced(p.locator(sel).count().then((n) => n > 0), false);
// Every read is short-fused: on a starved box a default 30s innerText wait
// inside an 80-iteration nav loop turned a slow page into a 3-hour "hang".
const txt = async (p, sel) => { try { const l = p.locator(sel).first(); return (await l.count()) ? (await l.innerText({ timeout: 3000 })).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
// 🔒 NOT the hand-rolled `while (Date.now() - t0 < ms)` poll this file used to
// carry. That shape evaluates its deadline only BETWEEN iterations, so a
// predicate that never settles on a wedged page means the loop never returns to
// its own condition — it READS as a bounded wait and is unbounded in exactly
// the failure it exists to bound. 18 call sites below depended on it. The
// shared version races each predicate against the REMAINING budget.
const until = sharedUntil;

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
  // AUDIT_DETERMINISTIC=1 → the app runs review analysis depth-only (PLAN #70):
  // the annotations become a pure function of the game, so two runs on one
  // game can be compared row for row. Off by default — the default run
  // measures the product as users get it, budgets and all.
  if (process.env.AUDIT_DETERMINISTIC === '1') {
    await ctx.addInitScript(() => { try { window.localStorage.setItem('auditDeterministicAnalysis', '1'); } catch { /* ignore */ } });
    log('[determinism] review analysis depth-only for this run (AUDIT_DETERMINISTIC=1)');
  }
  await ctx.addInitScript(autoDismissCalibration);
  // Instrument 2 — the narration listener sidecar. The page streams EVERY
  // logAppAudit event to it; `coach-narration-spoken` carries the full spoken
  // text (narrationText), which is what the contracts below read.
  const listener = await attachVoiceListener(ctx);
  // WEDGE HUNT ONLY (#21). Beacons the enter/exit of every expensive,
  // non-interruptible call over a size floor, with its JS call site. It is the
  // only channel that survives the wedge: `sendBeacon` hands the payload to
  // the BROWSER process before the call begins, so the last `enter` with no
  // `exit` names the call that never returned. Off by default — it patches
  // String/RegExp/JSON prototypes and must never colour a normal tape.
  if (process.env.AUDIT_WEDGE_HUNT === '1') {
    // The secret rides in the URL: sendBeacon cannot set the header.
    await ctx.addInitScript(wedgeTracer, `${listener.url}?secret=${LOCAL_LISTENER_SECRET}`);
    log('  [wedge] tracer armed (AUDIT_WEDGE_HUNT=1)');
  }
  const page = await ctx.newPage();
  // Belt AND braces (David 2026-09-07: "all audits are silent"): the mute
  // above stops synthesis in the app; this fulfils any /api/tts request
  // locally so not one byte can reach the provider even if a path slips.
  await blockTtsNetwork(page);
  // MUTE evidence: every synthesis request the page would have sent (blocked
  // above) and every spoken line's voice tag — the audit must prove it ran silent.
  let ttsRequests = 0;
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests += 1; });

  const errs = [];
  page.on('pageerror', (e) => { if (/startsWith is not a function/.test(e.message)) return; errs.push('PAGEERROR: ' + e.message.slice(0, 160)); });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|manifest|net::ERR|Download the React|Failed to load resource.*(429|502|503)|\[Stockfish\] worker\.onerror/i.test(t)) return;
    // A failed resource load names its URL in the console message's location,
    // not its text — record it, or a 500 from an unrelated endpoint reads as
    // this surface's defect (three bare "status of 500" lines, 2026-09-07).
    const loc = m.location?.() ?? m.location;
    const url = loc && typeof loc === 'object' && loc.url ? ` @ ${String(loc.url).replace(/^https?:\/\/[^/]+/, '')}` : '';
    errs.push('CONSOLE: ' + t.slice(0, 160) + url);
  });

  const spoken = () => listener.getCapturedEvents()
    // ONE utterance, TWO app events of this kind: the Learn page's lane record
    // (`CoachTeachPage.trackA`, "track A spoke: …") AND voiceService's own event
    // when the line is actually voiced. Keeping both printed every spoken line
    // twice, which read as a §C "said it twice" defect until the raw tape was
    // read (2026-09-19). The utterance is what voiceService spoke — the muted
    // path emits the same event with the same text, so this stays honest under
    // muteTtsForAudit.
    .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText && String(e.source ?? '').startsWith('voiceService.'))
    .map((e) => ({ t: Number(e.timestamp ?? 0), text: String(e.narrationText), source: String(e.source ?? '') }));
  const events = () => listener.getCapturedEvents().filter((e) => e.kind !== 'coach-narration-spoken');

  const dismiss = async () => {
    for (let i = 0; i < 6; i++) {
      for (const [s, c] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
      await page.waitForTimeout(400);
    }
  };

  const results = [];
  // Worker-target census at every phase boundary: 128 DedicatedWorker threads
  // were found in the wedged renderer (2026-09-06) — the count tells WHEN they
  // pile up, which names the spawner.
  page.on('dialog', (d) => { log(`  [dialog] ${d.type()}: ${d.message().slice(0, 120)} — dismissed`); d.dismiss().catch(() => undefined); });
  const cdp0 = await ctx.newCDPSession(page).catch(() => null);
  const workerCount = async () => {
    if (!cdp0) return '?';
    const r = await Promise.race([cdp0.send('Target.getTargets'), new Promise((res) => setTimeout(() => res(null), 4000))]).catch(() => null);
    if (!r) return '?';
    const ws = r.targetInfos.filter((t) => t.type === 'worker');
    const by = {}; for (const w of ws) { const k = (w.url || '?').split('/').pop().split('?')[0]; by[k] = (by[k] ?? 0) + 1; }
    return `${ws.length} ${JSON.stringify(by)}`;
  };
  const add = async (id, pass, detail) => { const w = await workerCount(); results.push({ id, pass, detail: `${detail} [workers=${w}]` }); log(`  ${pass ? '✅' : '❌'} ${id}: ${detail} [workers=${w}]`); };

  // ── RESOLVE THE GAME, then derive the plies FROM IT ─────────────────────
  GAME = await resolveGame();
  PGN = GAME.movetext;
  SANS = (() => { const c = new Chess(); c.loadPgn(PGN); return c.history(); })();
  // The student's own plies, 1-indexed: White = odd, Black = even.
  const studentPlies = SANS.map((_, i) => i + 1)
    .filter(isStudentPly);
  // Land in the MIDDLEGAME, not on move 2 — a book move has nothing to teach
  // and the fundamentals lead would be legitimately empty there. The engine's
  // own flags refine this later (see FUND_PLY reassignment after the walk).
  FUND_PLY = studentPlies[Math.min(5, studentPlies.length - 1)] ?? 12;
  EXPLORE_PLY = FUND_PLY - 1 > 0 ? FUND_PLY - 1 : 1;
  log(`[game] ${GAME.seedName ?? 'pinned'} — ${GAME.white} vs ${GAME.black} ${GAME.result}, student=${GAME.studentSide}, ${SANS.length} plies (id=${GAME.id})`);
  log(`[game] REPRODUCE THIS EXACT RUN:  ${GAME.how} node scripts/audit-review-overhaul-prod.mjs`);
  log(`[game] fund ply=${FUND_PLY} explore ply=${EXPLORE_PLY}`);

  const streamBefore = await pullAuditStream(Date.now() - 60000);
  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss();
  await page.waitForTimeout(2500);

  // SEED — the RESOLVED game (a fresh real one unless pinned), UNANALYZED. The
  // student is identified by handle, so the seat follows whichever side the
  // sourced game put them on.
  const seed = await page.evaluate(async ({ gid, pgn, g }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    // THE HARNESS MUST TELL THE APP WHICH SEAT IT IS AUDITING. This seeded a
    // real master game and computed its own expectations from `studentSide`
    // (see the owned-ply filter below) while never writing that field into the
    // record — so the app had no way to know, fell back to 'white', and the
    // SEAT row failed the product for a fact the harness had withheld. It is
    // still a real product fix (a guessed seat must never reach narration),
    // but an instrument that hides an input is not measuring the product.
    await put('games', { id: gid, studentSide: g.studentSide, pgn, white: g.white, black: g.black, result: g.result, date: '2026.09.03', event: "Let's Play!", eco: g.eco ?? 'B22', whiteElo: 1392, blackElo: 1378, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = g.studentSide === 'white' ? g.white : g.black; p.preferences.coachNarration = 'full';
      // STOP THE AUTO-IMPORT THE LINE ABOVE WOULD TRIGGER (2026-09-18). The
      // username we seed is a PGN DISPLAY NAME ("Carlsen, M."), so
      // `autoImportScheduler` fired a real chess.com request for it and the API
      // answered 410 — a console error this audit then reported as a product
      // defect. Marking the import just-run uses the scheduler's OWN `isDue`
      // gate, so nothing is stubbed and the cause is removed rather than the
      // symptom filtered. Note a VALID username here would be worse, not
      // better: the audit would import a stranger's games into the profile.
      p.preferences.lastChessComAutoImportAt = Date.now();
      p.preferences.lastLichessAutoImportAt = Date.now(); await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN, g: GAME }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  // OPT-IN: seed a real weakness spine. A cold prod device has NO accumulated
  // holes, so `habitNeedFrom` gets an empty array and the method bars stay at
  // their cold-start defaults — which is correct behaviour, and also means the
  // run cannot tell us whether the habit layer speaks for a student who HAS
  // those holes. AUDIT_SEED_WEAKNESS=1 answers that question; the default run
  // still measures what a genuine fresh install hears.
  if (process.env.AUDIT_SEED_WEAKNESS === '1') {
    const w = await seedWeaknessProfile(page).catch((e) => ({ error: String(e) }));
    log(`[seed-weakness] ${JSON.stringify(w)}`);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    await dismiss();
    await page.waitForTimeout(2000);
  }

  // ── CARD (F) — the list card says WIN, never 0-1 ────────────────────────
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  const cardSel = `[data-testid="review-game-card-${GID}"]`;
  const cardUp = await until(() => has(page, cardSel), 20000);
  const badge = cardUp ? await txt(page, `${cardSel} [data-testid="review-game-outcome"]`) : '';
  const outcome = cardUp ? await page.locator(`${cardSel} [data-testid="review-game-outcome"]`).first().getAttribute('data-outcome').catch(() => '') : '';
  const cardText = cardUp ? await txt(page, cardSel) : '';
  // The card names the OPPONENT, whoever the sourced game gave us — never a
  // hardcoded handle, or the row only ever passes on one game.
/**
 * 🚨 WHOSE PLY IS THIS — READ FROM THE GAME, NEVER ASSUMED.
 *
 * Three places computed this and only ONE of them was right. The other two
 * hardcoded "the student is Black (even plies)", which was true back when this
 * audit ran a single fixture. It now rotates a fresh master game every run, so
 * the first student=WHITE game inverted every seat expectation and failed the
 * PRODUCT for being correct: SEAT reported "Your opponent developed into the
 * game" as a mis-seated student ply when it was the opponent's ply and the
 * coach was right; FUNDLEAD and SHOW then graded opponent plies as flagged
 * student plies.
 *
 * Third instance of "a constant about a different game" in this file — after
 * RECAP's hardcoded flagged-count and the fixed walk budget. One definition.
 */
// A FUNCTION DECLARATION, not a const arrow: it is used above its definition
// (the owned-ply filter) and an arrow in the temporal dead zone would throw.
function isStudentPly(n) { return (n % 2 === 1) === (GAME.studentSide === 'white'); }

  const OPP = GAME.studentSide === 'white' ? GAME.black : GAME.white;
  const wantBadge = GAME.result === '1/2-1/2' ? 'DRAW'
    : (GAME.result === '1-0') === (GAME.studentSide === 'white') ? 'WIN' : 'LOSS';
  await add(`CARD badge-${wantBadge.toLowerCase()}-not-raw-result`, cardUp && badge === wantBadge && !/\b(0-1|1-0)\b/.test(cardText) && cardText.includes(OPP),
    cardUp ? `badge="${badge}" outcome=${outcome} text="${cardText.slice(0, 70)}"` : 'card never rendered');

  // No card = nothing to open. Fail NOW rather than wait out the 300s analysis
  // window on a surface that never rendered (the vacuity negative control must
  // see a verdict, not a hang).
  if (!cardUp) {
    await add('OPEN first-open-analyses', false, 'the seeded game never appeared in the review list — nothing to open');
    log('\n===== VERDICT: ❌ FAILS STANDARD (surface unreachable) =====');
    await listener.stop(); await browser.close(); process.exit(1);
  }

  // ── OPEN (A) — first open runs the genuine pipeline; time it ────────────
  const t0 = Date.now();
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await page.waitForURL(/\/coach\/review\//, { timeout: 15000 }).catch(() => undefined);
  await dismiss();
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled', { timeout: 3000 }).catch(() => 'x')) === null; };
  const ready = await until(startable, 300000, 1500);
  const openMs = Date.now() - t0;
  await add('OPEN first-open-analyses', ready, ready ? `walk startable in ${(openMs / 1000).toFixed(1)}s` : 'analysis never settled (300s)');
  // ENGINE TRUTH for the fixture move — what the app's own engine wrote for
  // 6...Nb6 (and its neighbours). This is the line to read when FUND fails:
  // the fundamentals attach only to a ply the engine graded worse than good.
  const annots = await page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const rows = (g?.annotations ?? []).filter((a) => a.moveNumber >= 5 && a.moveNumber <= 7).map((a) => `${a.moveNumber}${a.color === 'black' ? '...' : '.'}${a.san} ${a.classification} eval=${a.evaluation} bestEval=${a.bestMoveEval} best=${a.bestMove}`);
    // UNMEASURED PLIES — how many positions the engine never scored. A null
    // eval is not cosmetic: `measuredCpLoss` returns null for it, and
    // `autoAnalyzeGame` then substitutes a bucket midpoint (175/350), so an
    // engine failure becomes an INVENTED centipawn cost in the student model
    // (PLAN §B, 2026-09-20). Pool workers really do trap on this build
    // (`RuntimeError: unreachable`, 7 in one walk), so this counts the supply.
    const anns = g?.annotations ?? [];
    const nullEval = anns.filter((a) => a.evaluation === null || a.evaluation === undefined).length;
    const nullBest = anns.filter((a) => a.bestMoveEval === null || a.bestMoveEval === undefined).length;
    // PV PRESENCE on flagged plies. Four fundamentals read the engine lines
    // (calculation-depth, overvalued-attack, poisoned-pawn, botched-conversion)
    // and are structurally unable to fire without them — the focused-noyce
    // session found the recording path never passed them at all. Counting it
    // here stops the next session concluding "the detector has no coverage"
    // when the truth is "its input never arrived".
    const flagged = anns.filter((a) => /inaccuracy|mistake|blunder/i.test(String(a.classification ?? '')));
    const flaggedWithPv = flagged.filter((a) => (a.pv?.afterPlayed?.length ?? 0) > 0 || (a.pv?.afterBest?.length ?? 0) > 0).length;
    return { depth: g?.analysisDepth, fully: g?.fullyAnalyzed, rows, total: anns.length, nullEval, nullBest, flagged: flagged.length, flaggedWithPv };
  }, GID).catch((e) => ({ error: String(e) }));
  log(`  [engine] depth=${annots.depth} fullyAnalyzed=${annots.fully}`);
  (annots.rows ?? []).forEach((r) => log(`  [engine] ${r}`));
  log(`  [engine] UNMEASURED: ${annots.nullEval}/${annots.total} plies have a null eval, ${annots.nullBest}/${annots.total} a null bestMoveEval — each one becomes an invented 175/350 cpLoss downstream`);
  await add('MEASURED every ply carries a real eval', (annots.nullEval ?? 0) === 0, `${annots.nullEval ?? '?'}/${annots.total ?? '?'} null evals, ${annots.nullBest ?? '?'} null bestMoveEval (a null becomes a fabricated cpLoss in the student model)`);
  log(`  [engine] PV ON FLAGGED PLIES: ${annots.flaggedWithPv}/${annots.flagged} carry engine lines — the four PV-gated fundamentals cannot fire on the rest`);
  if (!ready) { await listener.stop(); await browser.close(); process.exit(1); }

  // ── AUTO (C) — Start, then the walk advances on its own ─────────────────
  const spokenAt = () => spoken().length;
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  const p0 = (await readWalkPly(page))?.n ?? 0;
  const advanced = await until(async () => ((await readWalkPly(page))?.n ?? 0) >= p0 + 2, 90000, 800);
  const playState = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
  await add('AUTO advances-by-itself', advanced && playState === 'playing', `from ply ${p0} → ${(await readWalkPly(page))?.n} with no Forward click; play/pause state=${playState}`);

  // ── FUND (E) — land on ply 12 and read the narration ────────────────────
  // Pause first (any intervention pauses), then jump by clicking Back/Forward
  // like a human would. Cards that mount are resolved by clicking.
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 3000 }).catch(() => undefined);
  // The turning-point card gets a BOUNDED number of answering rounds per run.
  // Without a bound the walk loop re-entered the retry block on every one of
  // its 80 iterations while the card sat there unanswered — 3 attempts x ~13s
  // x 80 = the run never finished, and a hung audit tells you less than a
  // failing one (2026-09-16).
  //
  // 🔴 BUT THE FIRST BOUND WAS A LATCH SET ON ENTRY, AND IT PRODUCED FOUR REDS
  // FROM ONE HARNESS FAILURE (found 2026-09-20 reading a clean 43/9 run).
  // `turningHandled = true` ran BEFORE a single attempt, so when all three
  // attempts failed the card could never be answered again for the rest of the
  // run. Everything downstream followed, and none of it was the product:
  //   * the walk loop refuses to resume while the card is up (correctly —
  //     resuming dismisses it unanswered), so the walk PARKED;
  //   * the readout stayed READABLE while parked, so `wedgeWatch` never fired
  //     and the WEDGE row passed — which is why the existing contamination
  //     guard did not cover this;
  //   * RECAP failed on `end reached=false`;
  //   * the post-walk `resolveCards()` no-op'd on the spent latch, so THESIS
  //     reported DRIVER;
  //   * CRIT said "a moment was selected but nothing said it aloud", because
  //     the walk never reached that moment.
  // One latch, four rows, three of them blaming a coach that was fine.
  //
  // So: latch on SUCCESS, and bound the ROUNDS separately so the storm cannot
  // come back. Three rounds is ~39s worst case against a run measured in tens
  // of minutes, and it leaves the post-walk wait a real chance — which is the
  // attempt that matters, since the card is RAISED at `currentPly ===
  // moves.length`, i.e. after the step loop has already broken out.
  let turningBudget = 3;
  let turningRounds = 0;
  let turningAnswered = false;
  /** Rounds spent, with nothing to show for them. */
  const turningSpent = () => !turningAnswered && turningRounds >= turningBudget;
  /** Hand the driver one more answering round (see the post-walk call site). */
  const grantTurningRound = () => { turningBudget += 1; };
  /** True when the card was SEEN but the driver never got a reveal out of it —
   *  the dependent rows must then blame the DRIVER, not the coach. */
  let turningSeenUnanswered = false;
  const resolveCards = async () => {
    for (const [c, sel] of [
      ['discussion-reason-picker', '[data-testid="discussion-reason-option"]'],
      // 🔴 FIVE BLOCKING OVERLAYS THIS TABLE DID NOT KNOW ABOUT (added
      // 2026-09-21). The component keeps its OWN list of overlays that block
      // the walk — the scroll-into-view effect — and diffing it against this
      // table found five with no handler here. Every one of them is a silent
      // walk-park waiting for the right game, which is exactly what this
      // file's own comment says three entries down: "A card this loop does not
      // know how to resolve is a card that freezes the walk."
      //
      // `review-principle-quiz` is the one that was already biting: it opens
      // after any why-picker faucet, and the product's `handleWalkForward`
      // returned silently while it was up (fixed the same day — the forward
      // now reports a `quiz-open` stop and auto-play pauses visibly).
      //
      // Two hand-maintained lists in two files that must agree is a
      // convention, and conventions rot — that list has ALREADY lost this
      // argument once, with the turning-point testid misspelled from the day
      // it was written. The durable fix is the outcome type in
      // useReviewPlayback, which degrades ANY unhandled overlay (known or not)
      // to a visible pause instead of a dead walk. These entries make the
      // audit resolve the five we know about; the type is what covers the
      // sixth nobody has written yet.
      ['discussion-practice-panel', '[data-testid="discussion-skip"]'],
      ['review-principle-quiz', '[data-testid="principle-quiz-skip"]'],
      ['review-find-shot-reveal', '[data-testid="review-find-shot-continue"]'],
      ['review-cameo-playback', '[data-testid="review-cameo-stop"]'],
      ['review-theory-playback', '[data-testid="review-theory-stop"]'],
      ['review-find-shot-card', '[data-testid="review-find-shot-skip"]'],
      ['review-cameo-ask', '[data-testid="review-cameo-skip"]'],
      ['review-theory-ask', '[data-testid="review-theory-skip"]'],
      ['review-trap-card', '[data-testid="review-trap-pick-leave"]'],
      ['review-trap-reveal', '[data-testid="review-trap-done"]'],
      // THE CRITICAL-MOMENT CARD — its chips are named after the SAN they
      // offer (`review-critical-pick-Nf3`), because the choices are the
      // engine's own lines from that position, not a fixed choice set. A
      // literal testid cannot match one, so this is the one prefix selector in
      // the table. A card this loop does not know how to resolve is a card
      // that freezes the walk, which is why it is added with the feature and
      // not after it (CLAUDE.md: audits are living — update before you run).
      ['review-critical-card', '[data-testid^="review-critical-pick-"]'],
      ['review-critical-reveal', '[data-testid="review-critical-done"]'],
      ['review-rewind-card', '[data-testid="review-rewind-decline"]'],
      // review-turning-point-card is NOT in this table — see the block below.
      // Confirm only EXISTS once a candidate chip has been tapped, so a
      // click-if-present on Confirm silently no-ops against a fresh card, the
      // card is never answered, no reveal fires, and the THESIS check then
      // hard-fails on a product that was working (found 2026-09-16). This is
      // the "a silent no-op is a failed test, not a pass" class.

      // The reveal is SPOKEN after the pick — a human reads/hears it before
      // tapping Done. Dismissing it 400ms after confirm cancelled the speech
      // and the THESIS line never reached the listener (2026-09-15). Handled
      // below with a wait, not in this table.
      // ['review-turning-point-reveal', '[data-testid="review-turning-point-done"]'],
      ['review-blunder-capture', '[data-testid="review-capture-skip"]'],
      ['review-sequence-ask', '[data-testid="review-sequence-skip"]'],
      ['review-sequence-playback', '[data-testid="review-sequence-skip"]'],
    ]) {
      if (await has(page, `[data-testid="${c}"]`) && await has(page, sel)) { await page.locator(sel).first().click({ timeout: 1500, force: true }).catch(() => undefined); await page.waitForTimeout(400); }
    }
    // THE TURNING-POINT CARD — answer it the way a human does: tap a candidate
    // to step the board to that moment, THEN commit. Two taps, in order.
    if (!turningAnswered && await has(page, '[data-testid="review-turning-point-card"]')) {
      if (turningRounds >= turningBudget) {
        // SAY IT. A driver that quietly stops trying is the same disease as an
        // audit that reports green having verified nothing: the run needs to
        // record that the card is STILL UP and that this is the harness's
        // failure, or the next reader blames the coach for the rows it takes
        // down with it.
        if (!turningSeenUnanswered) {
          turningSeenUnanswered = true;
          log(`  [turning] card is STILL UP after ${turningRounds} answering round(s) — `
            + 'the DRIVER could not answer it. The walk cannot resume past this card, so RECAP, '
            + 'THESIS and CRIT are all DRIVER failures from here on, not product failures.');
        }
        return;
      }
      turningRounds += 1;
      turningSeenUnanswered = true;
      // PAUSE FIRST. `handleWalkForward` DISMISSES this card by design (David
      // 2026-07-19: forward must never leave a frozen board), and
      // `turningAskedRef` means a dismissed card never returns. With playback
      // still running, the walk advanced out from under the tap and Confirm
      // never rendered — three attempts, three `confirm=false`, on a coach that
      // works: the isolated probe (scripts/probe-turning-card.mjs), which pauses
      // before answering, gets the thesis spoken every time.
      // POLL until it is actually paused; never read the state ONCE. A single
      // `getAttribute` that times out (or catches) returns null, which is not
      // 'playing', so the pause was SKIPPED — the walk then advanced out from
      // under the tap and `handleWalkForward` dismissed the card by design.
      const pauseBtn = page.locator('[data-testid="review-play-pause-btn"]').first();
      let paused = false;
      for (let i = 0; i < 6 && !paused; i += 1) {
        const st = await pauseBtn.getAttribute('data-state', { timeout: 2000 }).catch(() => null);
        if (st === 'paused') { paused = true; break; }
        await pauseBtn.click({ timeout: 2000, force: true }).catch(() => undefined);
        await page.waitForTimeout(350);
      }
      log(`  [turning] playback paused=${paused}`);
      const chip = page.locator('[data-testid^="turning-point-pick-"]').first();
      const chips = await page.locator('[data-testid^="turning-point-pick-"]').count().catch(() => -1);
      log(`  [turning] card present; ${chips} candidate chip(s)`);
      if (await chip.count() > 0) {
        // WAIT FOR STATE, NEVER A FIXED DELAY. The first tap only PREVIEWS; the
        // Confirm button does not exist until React has re-rendered with that
        // preview. A fixed 500ms then "tap the chip again" raced that render:
        // if the first tap had not landed in state yet, the second tap just set
        // the preview again and NOTHING ever committed — the card stayed up, no
        // reveal was spoken, and the THESIS row failed on a coach that was fine
        // (two full prod runs, 0 reveals, 2026-09-16). Retry the whole
        // tap→confirm cycle and stop as soon as the reveal actually speaks.
        const confirmSel = '[data-testid="review-turning-point-confirm"]';
        const revealed = () => spoken().some((x) => /^(You called it\.|Not quite\.)/.test(x.text));
        for (let attempt = 1; attempt <= 3 && !revealed(); attempt += 1) {
          // Re-check the card EVERY attempt. Retrying against a card that is
          // already gone reports three identical `confirm=false` lines and hides
          // what actually happened (2026-09-16: the pause had silently no-op'd,
          // so attempt 1 raced a forward that dismissed it).
          if (!(await has(page, '[data-testid="review-turning-point-card"]'))) {
            log(`  [turning] attempt ${attempt}: card is GONE before the tap — dismissed, not answered`);
            break;
          }
          // Scroll it into view ourselves: the component's own
          // scroll-the-card-into-view effect had the wrong testid for this one
          // card (fixed 2026-09-16), and a smooth-scrolling container can still
          // move the chip between Playwright's scroll and its click.
          await chip.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => undefined);
          await chip.click({ timeout: 2000, force: true }).catch(() => undefined);
          const confirmUp = await until(() => has(page, confirmSel), 5000, 250);
          if (confirmUp) {
            await page.locator(confirmSel).first().click({ timeout: 2000, force: true }).catch(() => undefined);
          }
          const spoke = await until(revealed, 8000, 250);
          log(`  [turning] attempt ${attempt}: confirm=${confirmUp} reveal=${spoke}`);
          // ANSWERED means the reveal SPOKE, never "we tapped something".
          if (spoke) { turningAnswered = true; turningSeenUnanswered = false; break; }
        }
      }
    }
    if (await has(page, '[data-testid="review-turning-point-reveal"]')) {
      // Wait for the reveal's spoken line (the thesis) to land in the listener,
      // like a human who reads it before moving on; then Done.
      await until(() => spoken().some((x) => /The game turned at |The turning point was /.test(x.text)), 12000, 300);
      await page.waitForTimeout(600);
      await page.locator('[data-testid="review-turning-point-done"]').first().click({ timeout: 1500, force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
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
  // 🚨 THE SECTION-14 STEMS ARE IN HERE TOO (2026-09-21). This regex listed
  // only the ORIGINAL fundamentals' phrasings, so a ply that led with a
  // section-14 verdict — calculation-depth, left-book-early, no-plan — scored
  // as "no fundamental". Measured: on the 2026-09-21 run ply 48 led with "The
  // move looks fine for two moves — then bxc6 lands." (calculation-depth,
  // exactly what the expected-points gate had just unblocked) and this row
  // still reported 0/4. An instrument that cannot see the fix it is grading
  // reports the fix as ineffective — which is the night's pattern pointed
  // straight at our own scoreboard.
  //
  // Stems copied from `principleVoice`'s renderers for those three ids. Two
  // hand-maintained lists that must agree is the drift this repo keeps paying
  // for, so when a NEW fundamental gets a voice, its stem belongs here in the
  // same commit — or this row silently under-counts it forever.
  const FUND_RE = /same (knight|bishop|rook|queen|piece) (for the|again|moves)|its (second|third|fourth|fifth) (move|trip)|on its (second|third|fourth|fifth) move|hands them a tempo|tempo lost|the cost is time|another tempo handed|gave up [a-h][1-8]|concedes the [a-h][1-8] square|space handed over|space given up|development first|pieces before pawns|develops nothing while|queen came out too early|early queen sortie|queen before the pieces|castling was there|castle first|uncastled one move too long|pawn grab with the pieces|^greedy:|edge pawn this early|edge pawns wait|both bishops are committed|knights before bishops|bishops declared their squares|buries your own bishop|a centre break|open the centre only when|knight on the rim is dim|knights belong in the centre|loose pieces drop off|their threat first|answer the threat before|checks, captures, threats|a forcing win was on the board|always run the forcing moves|loosens the shelter|pawns in front of the king move only|creates a weakness|pawns don't move backwards|a structural cost|advanced past its support|too far, too soon|trades your active|trade your worst piece|an exchange that improves them|ahead in material — trade|every piece off the board|ahead means simplify|behind in material|when you're down, keep the pieces|behind means complicate|improve your worst piece|looks fine for two moves|nothing hangs right away|shallow read:|that leaves the book|theory ends with|out of book early|what was .{1,12} for\?|a move without a purpose|name the target before you move|the open [a-h]-file was yours|an open file is a highway|rooks belong on open files|trade the bad bishop|a bishop hemmed in by its own pawns|your worst piece is the bishop|that break is mistimed|before the pieces were ready|a pawn break needs its pieces behind it|in the endgame the king is a piece|activate the king|queens off, king on|rooks belong behind passed pawns|in front of the passer the rook blocks|the wrong way round|passed pawns must be pushed|a passer is a rocket|push the passer|take the opposition|turn on the opposition|whoever has to move gives ground|an active rook is worth a pawn|rooks belong on the seventh|the seventh rank is the rook[’']s home|the attack was overvalued|that sacrifice doesn[’']t land|before the attack was real|that pawn was poisoned|a pawn grab with the|don[’']t reach for that pawn|recapture direction|normally you capture toward the centre|the other capture was the one|you had it won and rushed|convert with patience|a won position needs care|poisoned: taking it costs time|spends a tempo on the rim|is shut in behind|loses its diagonal to|break comes too soon|is on the edge of the board|wins it outright|is free material|was hanging before you moved|is airier for it|is overextended|is your least active piece|find the piece doing nothing and fix it/i;
  const lead = fundNarr.split(/(?<=[.!?])\s+/)[0] || '';
  const flagged = /INACCUR|MISTAKE|BLUNDER/i.test(fundBadge);
  // The fixture ply: WHEN the engine flags it, the narration must LEAD with the
  // fundamentals. Whether it flags it is engine truth, printed above ([engine]).
  // INFORMATIONAL, not a gate: whether 6...Nb6 is flagged is the engine's call
  // inside REVIEW_POSITION_BUDGET_MS on THIS hardware (native Stockfish: 52cp at
  // d14 = "good" under the 5% band, 128cp at d16). The product contract — a
  // flagged ply LEADS with its fundamental — is FUNDLEAD below.
  log(`  ${flagged ? '✅' : '⚠️ '} FUND probe-ply-graded (info): ply ${FUND_PLY} (${SANS[FUND_PLY - 1] ?? '?'}) badge=${fundBadge || 'none'} — engine truth at the app's budget, see [engine] rows`);
  await add('FUND probe-ply-leads-with-fundamentals', onFund && (!flagged || FUND_RE.test(lead)), onFund ? `lead="${lead.slice(0, 120)}"` : 'unreached');
  await add('FUND no-we-our', !/\b(we|our|us)\b/i.test(fundNarr), /\b(we|our|us)\b/i.test(fundNarr) ? `perspective leak: "${fundNarr.slice(0, 80)}"` : 'you/your + they/their only');

  // ── FREE + EXPL (D) — the student tries THEIR OWN alternative on the free board
  await goTo(EXPLORE_PLY);
  await settle();
  const spokenBeforeExplore = spokenAt();
  const ex = await exploreOnFreeBoard(page, { replyWaitMs: 45000 });
  const pausedState = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
  const pausedLabel = await has(page, '[data-testid="review-paused-label"]');
  const plyHeld = (await readWalkPly(page))?.n === EXPLORE_PLY;
  await add('FREE piece-move-is-exploring', ex.ok && pausedState === 'paused' && plyHeld, ex.ok ? `played ${ex.san}; banner=${ex.banner}; paused=${pausedState}; pausedLabel=${pausedLabel}; ply held=${plyHeld}` : ex.reason);
  const exploreSpoke = await until(() => spoken().length > spokenBeforeExplore, 45000, 500);
  const exploreLine = exploreSpoke ? spoken().slice(spokenBeforeExplore).map((s) => s.text).join(' | ') : '';
  const exploredEvent = events().some((e) => e.kind === 'review-walk-explored');
  await add('EXPL explored-move-narrated+engine-reply', ex.ok && exploreSpoke && ex.reply && exploredEvent, `spoke="${exploreLine.slice(0, 140)}" engineReply=${ex.reply} auditEvent=${exploredEvent}`);

  // ── EXIT (G.3) — Back exits exploration; Play restarts ──────────────────
  await page.locator('[data-testid="review-back-btn"]').first().click({ timeout: 2000, force: true }).catch(() => undefined);
  await page.waitForTimeout(800);
  const bannerGone = !(await has(page, '[data-testid="review-exploring-banner"]'));
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
  const pBefore = (await readWalkPly(page))?.n ?? 0;
  const restarted = await until(async () => ((await readWalkPly(page))?.n ?? 0) >= pBefore + 2, 60000, 800);
  await add('EXIT back-exits-play-restarts', bannerGone && restarted, `banner gone=${bannerGone}; Play resumed advance=${restarted} (from ply ${pBefore})`);

  // ── RECAP (G.4) — play to the end; the closing aggregates ───────────────
  await page.locator('[data-testid="walk-resume-game-btn"]').first().click({ timeout: 1500, force: true }).catch(() => undefined);
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
  const total = (await readWalkPly(page))?.total ?? SANS.length;
  let reachedEnd = false;
  // THE WEDGE CAN HIT THE FIRST WALK, NOT ONLY THE REOPEN (measured
  // 2026-09-20). On a clean pinned run the readout died at ply 68 of 69 and
  // stayed dead for 250 polls, while each poll stretched from 1s to ~4s — the
  // page degrading, not the walk being slow. RECAP, THESIS and FUNDLEAD then
  // went red for a reason that had nothing to do with the product. A readout
  // that stops answering for this long is the instrument failing, and the run
  // must say so rather than file those rows.
  // Shared detector — the same one any browser-driving audit can import.
  const watch = wedgeWatch({ unreadableLimit: 30, label: 'walk' });
  let wedgedReason = null;
  const flaggedLeads = new Map(); // ply → { badge, lead }
  const plyNarr = new Map();      // ply → { badge, narr } — every ply the walk showed
  // STEP BUDGET. 400 polls at 1500ms reached ply 45 of 46 and ran out — the
  // walk auto-advances on the (muted) voice promise, whose delay is proportional
  // to the beat's LENGTH, so richer narration makes the walk legitimately
  // slower. Three rows then failed for a reason that had nothing to do with
  // them: the recap, the turning-point card and Show-me all need the walk to
  // REACH the end. Poll more often rather than waiting longer.
  // 🔴 A FIXED BUDGET WAS THE BUG. 600 was tuned when this audit ran ONE
  // hardcoded fixture; it now rotates a fresh master game every run, and an
  // 89-ply game reached ply 80 at poll 575 and stopped NINE PLIES SHORT. Two
  // rows then failed for a reason that had nothing to do with the product —
  // RECAP ("end reached=false") and THESIS (the turning-point card only appears
  // after the walk ends) — which is the same "a constant about a different
  // game" defect already fixed once in this file's RECAP assertion.
  //
  // Scaled by the game's OWN length instead. ~12 polls/ply covers the observed
  // ~6-9s per ply with headroom for a richer beat; the floor keeps short games
  // at the previous budget and the ceiling keeps the outer timeout meaningful
  // (the comment this replaces records a 900-poll run being killed at 3300s —
  // the lesson was "bound it", not "freeze it").
  const POLL_BUDGET = Math.min(1800, Math.max(600, total * 12));
  // 🔴 `?? 0` COLLAPSED TWO DIFFERENT STATES INTO ONE NUMBER, and it cost a
  // whole session. `readWalkPly` returns NULL when the "Ply N / M" readout
  // cannot be read (element gone, innerText timed out) — the caller turned that
  // into 0, so "the walk is at ply 0" and "I cannot see the walk" printed
  // IDENTICALLY as `[walk] ply 0/93`. A run was read as frozen and killed on
  // that line, then re-diagnosed wrongly a second time from the same line.
  //
  // This is the audit committing the exact sin it exists to catch in the
  // product (CLAUDE.md: an instrument that reports nothing is indistinguishable
  // from one that found nothing). Null is now carried as null and SAID.
  let unreadable = 0;
  let lastReadPly = 0;
  for (let i = 0; i < POLL_BUDGET; i++) {
    await resolveCards();
    // ONE atomic DOM snapshot per poll. The readout, the badge and the banner
    // used to be three separate round trips, and the (muted, voice-gated) walk
    // advanced between them — so a sentence was filed under the PREVIOUS ply
    // and `ACC board-accuracy` reported "pawn on g6 but board has empty" for
    // the …g6 sentence filed under White's Be3 (pinned pair, 2026-09-20).
    // A false red in the one row that judges board truth is the instrument
    // lying about the product; read the three together or not at all.
    const snap = await page.evaluate(() => {
      const t = (sel) => { const el = document.querySelector(sel); return el ? (el.innerText || '').replace(/\s+/g, ' ').trim() : ''; };
      const walk = t('[data-testid="coach-game-review-walk"]');
      const m = walk.match(/Ply\s+(\d+)\s*\/\s*(\d+)/i);
      return { read: m ? { n: Number(m[1]), total: Number(m[2]) } : null, badge: t('[data-testid="review-classification-badge"]'), banner: t('[data-testid="review-narration-banner"]') };
    }).catch(() => ({ read: null, badge: '', banner: '' }));
    const read = snap.read;
    const n = read?.n ?? 0;
    if (read) { unreadable = 0; lastReadPly = read.n; } else unreadable += 1;
    const b = snap.badge;
    if (n > 0 && !plyNarr.has(n)) {
      const nt = snap.banner;
      // THE BANNER IS NOT THE VOICE. On a quiet ply the coach says nothing and
      // the banner shows the MOVE instead — a deliberate placeholder that
      // replaced "(passes silently)" printing itself all game (David
      // 2026-07-19). Scraping it verbatim recorded "a3" as narration, and the
      // report then told David the coach had read a bare SAN aloud when it had
      // been correctly silent (2026-09-16). A banner whose whole text is just
      // the move IS silence — record it as such.
      const sanOnly = nt && /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[+#]?$|^O-O(-O)?[+#]?$/.test(nt.trim());
      if (nt && !sanOnly) plyNarr.set(n, { badge: b, narr: nt });
    }
    if (isStudentPly(n) && n > 0 && /INACCUR|MISTAKE|BLUNDER/i.test(b) && !flaggedLeads.has(n)) {
      const nt = plyNarr.get(n)?.narr ?? '';
      flaggedLeads.set(n, { badge: b, lead: nt.split(/(?<=[.!?])\s+/)[0] || '' });
    }
    if (n >= total) { reachedEnd = true; break; }
    wedgedReason = watch.observe(!!read, `ply ${lastReadPly}/${total}`);
    if (wedgedReason) { log(`  [walk] WEDGED: ${wedgedReason}`); break; }
    // THE CARD THE DRIVER COULD NOT ANSWER PARKS THE WALK PERMANENTLY. The
    // loop refuses to resume past it (correctly), so every remaining poll is
    // dead time that ends in the same place — and the readout stays READABLE
    // throughout, so the wedge watch will never call it. Stop now and let the
    // post-walk block have its reserved round, rather than burning the budget
    // and then reporting `end reached=false` as if the walk had been slow.
    if (turningSpent() && await has(page, '[data-testid="review-turning-point-card"]')) {
      log(`  [walk] STOPPING at ply ${lastReadPly}/${total}: the turning-point card is up and `
        + 'the driver has spent its answering rounds. This is a DRIVER stop, not a slow walk.');
      break;
    }
    // PROGRESS, so a 10-minute walk is not 10 minutes of silence (CLAUDE.md
    // "never run blind, never wait silent"). Without this the recap phase is
    // indistinguishable from a hang, which is the exact failure this audit
    // exists to catch in the PRODUCT — an instrument that reports nothing is
    // indistinguishable from a green one.
    if (i > 0 && i % 25 === 0) {
      log(read
        ? `  [walk] ply ${n}/${total} after ${i}s (poll ${i}/${POLL_BUDGET})`
        : `  [walk] READOUT UNREADABLE for ${unreadable} poll(s) after ${i}s `
          + `(poll ${i}/${POLL_BUDGET}) — the walk element is not reporting a ply; `
          + `this is NOT "the walk is at ply 0"`);
    }
    // NEVER RESUME WHILE THE TURNING-POINT CARD IS UP — resuming advances the
    // walk, which dismisses it unanswered (see the pause note in resolveCards).
    const cardBlocking = await has(page, '[data-testid="review-turning-point-card"]');
    const st = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state', { timeout: 3000 }).catch(() => null);
    if (st === 'paused' && !cardBlocking) { await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined); }
    await page.waitForTimeout(1000);
  }
  // ── ORDER MATTERS, AND IT WAS WRONG (fixed 2026-09-17) ───────────────────
  // The recap wait used to run HERE, before the turning-point card was
  // answered. It could never pass. The closing is spoken by `useReviewPlayback`
  // only at `lastPly + 1` (it clamps to `Math.min(ply, lastPly + 1)`), the card
  // is raised AT `currentPly === moves.length`, and the walk loop above refuses
  // to resume while that card is up — correctly, since resuming dismisses it
  // unanswered. So the walk sat parked one step short of the closing for the
  // whole 60s wait, and the row reported the PRODUCT silent when it was this
  // instrument holding the door shut.
  //
  // The narration was never in doubt: driving the same Alapin game through the
  // real `generateReviewNarration` returns "The pattern: one of your two
  // flagged moves handed over a tempo." Answer the card, let the reveal speak,
  // STEP PAST the last ply, and only then listen.
  // THE TURNING-POINT CARD FIRES AFTER THE WALK ENDS — the component raises it
  // when currentPly === moves.length, which is AFTER the step loop above has
  // already broken out. So the loop's last `resolveCards()` ran before the card
  // existed and nothing ever answered it (found 2026-09-16: the THESIS row read
  // as a broken N1 wire for two runs while the product was fine). Wait for it
  // here, answer it, and let the reveal speak.
  const turnCardUp = await until(() => has(page, '[data-testid="review-turning-point-card"]'), 45000, 500);
  log(`  [turning] waited for card after walk end: present=${turnCardUp}`);
  // THE POST-WALK ATTEMPT GETS ITS OWN ROUND, ALWAYS. The card is RAISED at
  // `currentPly === moves.length` with playback naturally stopped, which is the
  // condition the answering sequence was designed for — so it is the attempt
  // most likely to work, and starving it because earlier in-walk attempts
  // burned the budget would throw away the good shot to protect against the
  // retry storm the budget exists for.
  grantTurningRound();
  await resolveCards();
  const revealed = await until(() => spoken().some((x) => /^(You called it\.|Not quite\.)/.test(x.text)), 20000, 500);
  log(`  [turning] reveal spoken=${revealed}`);
  // 🔒 THE DRIVER REPORTS ITS OWN FAILURES AS ROWS, NOT AS LOG LINES. A driver
  // that gives up quietly is the same class as every instrument bug this file
  // documents: the reader is left to INFER the harness broke from a downstream
  // symptom (`end reached=false`), which is precisely how one latch got read as
  // three product failures. Say it in the results, where the verdict counts it.
  //
  // It is skipped, not passed, when the card never appeared: a game with fewer
  // than two costed moments raises no card by design, and a row that reports
  // green for an event that could not happen is the self-declared n/a this
  // audit has had to delete twice already.
  if (turnCardUp || turningSeenUnanswered || turningAnswered) {
    await add('DRIVER answered-the-turning-point-card', turningAnswered,
      turningAnswered
        ? `answered in ${turningRounds} round(s); reveal spoken`
        : `the card defeated the driver after ${turningRounds} round(s) — no reveal was ever spoken. `
          + 'The walk cannot pass this card, so RECAP, THESIS and CRIT below are DRIVER failures too. '
          + 'This is the HARNESS, not the coach.');
  }

  // STEP PAST THE LAST PLY — the closing lives at lastPly + 1, so something has
  // to take that step: auto-advance if it resumes, else the forward control.
  // 🔒 MATCH THE CONTRACT, NOT ONE PHRASING (fixed 2026-09-17, after this row
  // false-failed a recap that had spoken FIVE times).
  //
  // The old regex was `/of your \w+ flagged move|carry into the next game|The
  // pattern: you \w/`, and every branch of it encoded a phrasing that no longer
  // ships. `renderFundamentalsRecap` was corrected the same day to stop saying
  // "one of your one flagged move" — the x-of-y shape only reads as English
  // while y is genuinely bigger than x — so with a single flagged ply it now
  // says "The pattern: YOUR ONE flagged move …". That matches none of the
  // three: there is no "of your", the "carry into the next game" close needs
  // two flagged moves, and "The pattern: you \w" wants a space where the text
  // has the "r" of "your".
  //
  // CLAUDE.md is explicit that this is the author's job — "AUDITS ARE LIVING —
  // UPDATE THE AUDIT BEFORE YOU RUN IT" — and it was not done. The lasting fix
  // is to stop pinning the SUBJECT at all: the stable contract is the "The
  // pattern:" lead plus the flagged-move vocabulary, so every subject shape the
  // renderer can produce (one / both / all three / two-of-five / the
  // subject-less fallback) matches without the audit knowing which.
  // 🚨 ASK THE ENGINE, NEVER THE WALK. Two rows below (FUNDLEAD, RECAP) used to
  // conclude "the engine flagged NO student ply" from `flaggedLeads` — which is
  // populated BY THE WALK, so a walk that stopped seeing flagged plies reported
  // itself healthy, and RECAP hardcoded "the seeded game has two" from the days
  // this audit ran ONE fixture. It now rotates a fresh master game every run
  // (2026-09-17), so a GM draw with genuinely zero flagged plies red-failed a
  // working product against a constant describing a different game.
  // The annotation record in Dexie is what the engine actually decided; read it
  // and let both rows corroborate against it. Zero-in-db + zero-in-walk is a
  // real property of the game; N-in-db + zero-in-walk is the walk defect the
  // red was built for.
  const dbFlagged = await page.evaluate(async ([gid, side]) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const rows = (g?.annotations ?? []).filter((a) => a.color === side && /inaccuracy|mistake|blunder/i.test(String(a.classification ?? '')));
    return { n: rows.length, at: rows.slice(0, 6).map((a) => `${a.moveNumber}${side === 'white' ? '.' : '...'}${a.move ?? '?'} ${a.classification}`) };
  }, [GID, GAME.studentSide]).catch((e) => ({ n: -1, at: [], error: String(e) }));
  log(`  [engine record] ${dbFlagged.n} flagged student ply(s)${dbFlagged.at.length ? ' — ' + dbFlagged.at.join(', ') : ''}`);

  // 🔒 THE DRIVER'S OWN FAILURES MUST NOT BE FILED AS THE COACH'S. When the
  // turning-point card could not be answered, the walk parked before the end —
  // so the closing was never reachable and the critical moment was never
  // reached either. Both rows would then blame a coach that never got a turn.
  // THESIS has said DRIVER since 2026-09-16; these two did not, which is how
  // one latch bug produced four reds on a clean run (2026-09-20).
  //
  // This is deliberately NOT the wedge guard: a wedge is the READOUT dying,
  // and here the readout answers perfectly while the walk is held by a card.
  // The two failures look nothing alike from the instrument's side, which is
  // exactly why one guard could not cover both.
  //
  // BOTH CONDITIONS, NEVER ONE. `turningSeenUnanswered` is set when a round
  // STARTS, so on its own it would also be true for a card that was answered
  // by some other path, or dismissed, after which the walk ran to the end
  // perfectly well. A row that got its full chance and still failed is a REAL
  // red, and excusing it would be this guard committing the sin it prevents —
  // an instrument reporting a failure as not-applicable.
  const driverStop = (!turningAnswered && turningSeenUnanswered && !reachedEnd)
    ? 'DRIVER: the turning-point card was never answered and the walk never reached the end, '
      + 'so this row had no chance to be true. Fix the driver, not the coach'
    : null;
  const RECAP_RE = /The pattern:[^.]*flagged move|The pattern: you \w|carry into the next game/i;
  // 🔴 A LOOP THAT CAN ADVANCE THE WALK MUST ANSWER THE CARDS IT RAISES
  // (found 2026-09-21, from a prod run that looked like a different bug).
  //
  // This loop clicks Forward up to 20 times to reach the closing. When the walk
  // parked SHORT of the end, the turning-point card had not been raised yet —
  // so the wait above correctly reported `present=false` — and then one of
  // THESE clicks landed on `moves.length`, raised the card, and the NEXT click
  // dismissed it: `handleWalkForward` dismisses by design (David 2026-07-19,
  // forward must never leave a frozen board) and `turningAskedRef` means a
  // dismissed card never returns. The driver created the card and destroyed it
  // one second apart, having already given up waiting for it.
  //
  // It read as "the card was never raised", and it was not: the ask line
  // ("where do you think this game turned") was in the captured narration the
  // whole time, one row away from the failure. Two sessions believed two
  // different wrong things about it for an hour.
  //
  // This is the same ORDER class as the 2026-09-17 fix below — that one moved
  // the recap wait AFTER the turning block, which is right when the walk
  // reaches the end and silently wrong when it parks short. Resolving cards
  // every iteration covers both, because it no longer depends on WHEN the card
  // appears relative to the phases.
  for (let i = 0; i < 20; i += 1) {
    if (spoken().some((x) => RECAP_RE.test(x.text))) break;
    await resolveCards();
    const st = await page.locator('[data-testid="review-play-pause-btn"]').first()
      .getAttribute('data-state', { timeout: 2000 }).catch(() => null);
    if (st === 'paused') {
      await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
    }
    // `review-forward-btn` is the real testid — verified in CoachGameReview.tsx
    // rather than guessed, after three selector-shaped misses in one audit run
    // tonight taught that lesson the expensive way.
    await page.locator('[data-testid="review-forward-btn"]').first()
      .click({ timeout: 1500 }).catch(() => undefined);
    await page.waitForTimeout(1000);
  }
  // One more reserved round, for the same reason the post-walk call has one:
  // a card raised by the stepping above deserves the attempt that the loop's
  // own budget may already have spent.
  grantTurningRound();
  await resolveCards();
  await until(() => spoken().some((s) => RECAP_RE.test(s.text)), 60000, 1000);
  const recap = spoken().find((s) => RECAP_RE.test(s.text));
  // The aggregate reads "three of your five flagged moves…" — with NO flagged
  // student ply there is nothing to aggregate and silence is correct.
  // `flaggedLeads` is populated by the walk above.
  if (flaggedLeads.size === 0) {
    // 🚨 STILL NOT A SELF-DECLARED n/a. This branch once reported `true` with
    // "n/a — nothing to aggregate", which is the row DECLINING TO TEST ITSELF.
    // The replacement then over-corrected into a hard red citing a CONSTANT
    // ("the seeded Alapin carries two flagged moves") that stopped being true
    // the day this audit started rotating a fresh game each run — it red-failed
    // a healthy product on a GM draw with genuinely zero flagged plies.
    // Neither the walk nor a constant may answer this: `dbFlagged` asks the
    // ENGINE RECORD, so zero is provably the game's property, and a non-zero
    // record with an empty walk is still the red this was built for.
    await add('RECAP fundamentals-aggregate', dbFlagged.n === 0 && reachedEnd,
      dbFlagged.n === 0
        ? `nothing to aggregate — the ENGINE RECORD confirms 0 flagged student plies, so silence is the correct recap (end reached=${reachedEnd})`
        : `the engine record carries ${dbFlagged.n} flagged student ply(s) (${dbFlagged.at.join(', ')}) and the walk recorded NONE — the walk stopped seeing them (end reached=${reachedEnd})`);
  } else {
    await add('RECAP fundamentals-aggregate', reachedEnd && !!recap, recap ? `"${recap.text.slice(0, 140)}"`
      : driverStop ?? `end reached=${reachedEnd}; ${flaggedLeads.size} flagged ply(s) but no aggregate line spoken`);
  }

  // THESIS (unified-coach N1, 2026-09-15): THE ONE SELECTOR's game-level thesis
  // is spoken at the turning-point REVEAL, retrospective register, exactly once,
  // and only after the student commits (withheld until the pick). The card is
  // driven by resolveCards (confirm → done); its ask line is the marker that it
  // fired at all. The legacy flat "The turning point was" reveal is a regression.
  {
    const lines = spoken().map((x) => x.text);
    const askIdx = lines.findIndex((t) => /where do you think this game turned/i.test(t));
    const thesisIdx = lines.findIndex((t) => /The game turned at /.test(t));
    const thesisCount = lines.filter((t) => /The game turned at /.test(t)).length;
    const legacyCount = lines.filter((t) => /The turning point was /.test(t)).length;
    // THE APP TELLS US THE KIND — read it instead of guessing. CoachGameReview
    // emits `selector read the game: thesis=<kind>@<ply> …`, and the thesis is
    // spoken ONLY when kind==='turned' AND its ply is the one the card asks
    // about (otherwise "the game turned at X" would contradict a card whose
    // answer is Y — a deliberate withhold, not a miss). 2026-09-16: a prod run
    // hard-failed this check at thesis lines=0 with no way to tell which case
    // it was.
    const selLine = events()
      .map((e) => String(e.summary ?? ''))
      .filter((t) => /selector read the game/.test(t))
      .pop() ?? '';
    const kindM = /thesis=([a-z]+)@([0-9-]+)/.exec(selLine);
    const thesisKind = kindM ? kindM[1] : null;
    const thesisPly = kindM ? kindM[2] : null;
    const cardM = /card=([0-9-]+)/.exec(selLine);
    const cardPly = cardM ? cardM[1] : null;
    // Owed only when the selector's thesis is a 'turned' one pointing at the
    // very ply the card asks about.
    const owed = thesisKind === 'turned' && (cardPly === null || thesisPly === cardPly);
    if (askIdx === -1) {
      await add('THESIS spoken-once-at-reveal', true, 'no turning-point card this game (fewer than 2 costed moments) — thesis withheld by design');
    } else if (!lines.some((t) => /^(You called it\.|Not quite\.)/.test(t))) {
      // The reveal is what SPEAKS the thesis, and it only fires on a commit.
      // If no reveal line was ever spoken the card was never answered — that is
      // a DRIVER failure, and reporting it as a broken N1 wire sent a session
      // chasing a product bug that did not exist (2026-09-16).
      // 🔒 "NEVER APPEARED" AND "NEVER ANSWERED" ARE DIFFERENT FACTS, and this
      // row printed the same sentence for both until 2026-09-21. A reader
      // (two of them) took "never answered" to mean the card had not rendered,
      // spent an hour on that, and the truth — it rendered, spoke, and was
      // dismissed unanswered — was one row away the whole time. A message that
      // collapses two causes is how the wrong one gets picked.
      //
      // `askIdx !== -1` is already proof the card RENDERED: the ask is
      // `turningQ.question`, drawn inside the same `{turningQ && …}` element
      // the driver looks for. So this branch always means raised-then-lost;
      // say that, and say WHERE it was lost.
      await add('THESIS spoken-once-at-reveal', false,
        'DRIVER: the card RENDERED (its ask was spoken) but no reveal line ever followed, so it was '
        + `dismissed unanswered — ${turningAnswered ? 'after' : 'without'} a successful answering round `
        + `(${turningRounds} attempted). The thesis had no moment to fire. Fix the driver, not the coach`);
    } else if (!kindM) {
      await add('THESIS spoken-once-at-reveal', false, `card rendered but the selector emitted NO thesis kind — the N1 wire did not run (spoken=${thesisCount})`);
    } else if (!owed) {
      await add('THESIS spoken-once-at-reveal', thesisCount === 0,
        `n/a — selector thesis is ${thesisKind}@${thesisPly} while the card asks about ply ${cardPly ?? '?'}, so it is withheld by design (spoken=${thesisCount}, must be 0)`);
    } else {
      await add('THESIS spoken-once-at-reveal', thesisCount === 1 && legacyCount === 0, `thesis lines=${thesisCount} legacy=${legacyCount}${thesisIdx >= 0 ? ` "${lines[thesisIdx].slice(0, 100)}"` : ''}`);
      await add('THESIS withheld-until-pick', thesisIdx === -1 || thesisIdx > askIdx, `ask@${askIdx} thesis@${thesisIdx}`);
    }
  }
  // NEED COVERAGE (unified-coach N2, 2026-09-15 — the retired R2's replacement):
  // read the app's own `review-need-coverage` rows off the wire. Every opening
  // ply whose computed need cleared the bar was narrated; no quiet per-move beat
  // fired where need said silent. A fresh prod profile is COLD, so the rating
  // prior owes the opening — the July silence cannot hide behind "need said no".
  {
    const ev = listener.getCapturedEvents().filter((e) => e.kind === 'review-need-coverage').pop();
    let cov = null;
    try { cov = ev ? JSON.parse(ev.details ?? '{}') : null; } catch { cov = null; }
    const rows = cov?.rows ?? null;
    if (!rows) {
      await add('NEED coverage-rows-captured', false, 'no review-need-coverage event — the N2 wire did not fire');
    } else {
      const opening = rows.filter((r) => r.ply <= 24);
      const owed = opening.filter((r) => r.speak);
      // `heard` (2026-09-24): what the student actually hears, counted after
      // every fill pass. Older bundles lack it and fall back to `source`.
      const covered = owed.filter((r) => (r.heard ?? (r.source !== null)));
      const leaked = rows.filter((r) => !r.speak && r.spoke);
      await add('NEED coverage-rows-captured', rows.length > 0, `${rows.length} student plies scored; games=${cov.gamesPlayed} cold=${cov.gamesPlayed < 5}`);
      await add('NEED owed-plies-narrated', owed.length > 0 && covered.length >= Math.ceil(owed.length * 0.8), `${covered.length}/${owed.length} owed opening plies narrated${covered.length < owed.length ? ` — silent: ${owed.filter((r) => !covered.includes(r)).map((r) => r.ply).join(',')}` : ''}`);
      // THE TEACH METER (WO-TEACH-02): of the student's spoken plies, how many
      // carried a TEACHING fact rather than only a description. The target is
      // Naroditsky, where every line teaches; the bar is 70%.
      if (Array.isArray(cov.taught) && Array.isArray(cov.described)) {
        const spokenN = cov.taught.length + cov.described.length;
        const share = spokenN ? cov.taught.length / spokenN : 0;
        await add('TEACH student-plies-teach', spokenN > 0 && share >= 0.7, `${cov.taught.length}/${spokenN} spoken student plies teach (${Math.round(share * 100)}%) — describing only: ${cov.described.slice(0, 20).join(',')}`);
      } else {
        await add('TEACH meter-captured', false, 'the coverage row carries no taught/described split — bundle predates WO-TEACH-02');
      }
      await add('NEED silent-where-not-needed', leaked.length === 0, leaked.length ? `per-move beat on ${leaked.map((r) => r.ply).join(',')} where need said silent` : 'no per-move beat where need said silent');
    }
  }
  // LEDGER (unified-coach N7, 2026-09-16): a projected line that trades on BOTH
  // sides must attribute every capture and state the NET. The defect this
  // replaces was a line reading "Kxd7, winning the knight … then Nxa8, winning
  // the rook" under "here's how you take advantage" — the rook being the
  // student's, taken from them. Read the SPOKEN text, not a pass count.
  {
    const spokenAll = spoken().map((x) => x.text);
    // Any line that names two or more captures is an alternating line.
    const lines = spokenAll.filter((t) => /take advantage|gets punished|the engine confirms/i.test(t));
    const unseated = lines.filter((t) => /\bwinning the (pawn|knight|bishop|rook|queen)\b/.test(t));
    const attributed = lines.filter((t) => /\byou win the \w+|\bthey take the \w+/.test(t));
    await add('LEDGER captures-attributed',
      lines.length === 0 || unseated.length === 0,
      lines.length === 0
        ? 'no projected line spoken this game (no flagged mistake reached the projection budget)'
        : `${attributed.length}/${lines.length} projected lines attributed; ${unseated.length} still subjectless`);
    const netLines = spokenAll.filter((t) => /come out (ahead|behind) on material|that trade is even/.test(t));
    await add('LEDGER net-stated-when-both-sides-trade',
      lines.length === 0 || netLines.length > 0 || !lines.some((t) => /you win the \w+/.test(t) && /they take the \w+/.test(t)),
      netLines.length ? `net stated: "${netLines[0].slice(0, 120)}"` : 'no two-sided projected line this game');
    // The ledger must never read as a point total (piece names only).
    // A SQUARE NAME CARRIES A DIGIT ("outpost on d4", "pawn on a7"), so a bare
    // \d scan flags the ledger for naming squares — which is exactly what it
    // should do. Test the ledger CLAUSE only (up to the "but"/period that ends
    // it), and only for a digit that is not part of a square.
    const ledgerClause = (t) => (/on material,([^.]*?)(?:,? but |\.|$)/.exec(t)?.[1] ?? '');
    const pointish = netLines.filter((t) => /(?<![a-h])\d/.test(ledgerClause(t)));
    await add('LEDGER named-in-pieces-not-points',
      pointish.length === 0,
      netLines.length
        ? (pointish.length ? `point total in: "${ledgerClause(pointish[0])}"` : `piece names only — e.g. "${ledgerClause(netLines[0]).trim()}"`)
        : 'n/a — no net stated this game');
  }
  // ACC — board accuracy of every "<piece> on <square>" claim, on the board AFTER
  // that ply (present-tense text only; a projected line is about a future board).
  const PIECE = { knight: 'n', bishop: 'b', rook: 'r', queen: 'q', pawn: 'p', king: 'k' };
  // 🚨 MATCH THE LEAD-IN GENERICALLY, NOT BY LISTING HALF A UNION (2026-09-18).
  // This used to spell out "their idea runs" and miss "their threat runs" —
  // and `coachFeatureService` composes that phrase from a TWO-VALUED union
  // (`isForcingProjection(line) ? 'threat' : 'idea'`), so the audit covered
  // exactly half of it. The cost was a FALSE RED that read like the worst class
  // of product bug: "ply 27: 'pawn on d7' but board has n". The coach was
  // right — it said "knight on d7" about the live board every time, and
  // "a passed pawn on d7" only inside a projected line about a FUTURE board.
  // A red that is wrong in the most alarming way trains the next session to
  // distrust the whole report, so the pattern now admits any "<their|your|the>
  // <noun> runs" and a new union member cannot slip past it.
  const PROJ = /(?:it runs|it goes|it continues|(?:their|your|the)\s+\w+\s+runs|played out from here|Here's how)/i;
  const accFails = [];
  const seatFails = [];
  const tradeFails = [];
  const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const rc = new Chess();
  const victimVal = [];
  for (const san of SANS) { const mv = rc.move(san); victimVal.push(mv?.captured ? PIECE_VAL[mv.captured] : null); }
  for (const [n, { narr }] of plyNarr) {
    if (n > SANS.length) continue; // the closing (lastPly + 1) has no board of its own
    const pos = new Chess(); for (let k = 0; k < n; k++) pos.move(SANS[k]);
    let scan = narr.replace(/\([^)]*\)/g, ' ');
    const cut = scan.search(PROJ); if (cut >= 0) scan = scan.slice(0, cut);
    const re = /\b(knight|bishop|rook|queen|pawn|king)\s+on\s+([a-h][1-8])\b/gi; let m;
    while ((m = re.exec(scan)) !== null) {
      const cell = pos.get(m[2].toLowerCase());
      if (!cell || cell.type !== PIECE[m[1].toLowerCase()]) accFails.push(`ply ${n}: "${m[1]} on ${m[2]}" but board has ${cell ? cell.type : 'empty'}`);
    }
    // SEAT — whose ply this is comes from the GAME (see `isStudentPly`), not
    // from an assumption about the side. An opponent ply must not open
    // "You <verb>"; a student ply must not open "Your opponent" / "They".
    const head = narr.replace(/^["'“‘\s]+/, '').slice(0, 40);
    const studentPly = isStudentPly(n);
    // 🔴 THE ALLOW-LIST IS A LIST OF VERBS, SO A QUANTIFIER BEFORE THE VERB
    // BROKE IT (false red, 2026-09-21). On an opponent ply the coach said:
    //
    //   "You both wanted the open e-file, but only their rook could take it
    //    — it was theirs first."
    //
    // That is CORRECT prose — a plan-race clause that addresses the student,
    // describes both sides, and attributes the file to the OPPONENT ("their",
    // "theirs"). It reattributes nothing. But the guard reads the token right
    // after "You", found "both" rather than a listed verb, and failed a coach
    // that was right. `want` IS in the list; it just was not adjacent.
    //
    // So skip at most ONE intervening quantifier/adverb and then apply the
    // same verb list. Deliberately ONE and deliberately short: the row exists
    // to catch "You <verb>ed" attributing the OPPONENT'S MOVE to the student,
    // and widening it into a general parser would trade a false red for a
    // false green, which is the worse direction for a seat check.
    //
    // Note how this passed for months: it only fires on prose that opens with
    // "You" on an opponent ply, which is rare, and this rotation was the first
    // game to produce that shape. A guard nobody has watched fail is
    // indistinguishable from one that cannot.
    // A LITERAL, not `new RegExp` on an interpolated string. The first cut
    // built it from a template and the escaping came out as `\\s` (a literal
    // backslash) inside the JS string, so the hedge never matched and the fix
    // silently did nothing — a repair that reports itself applied and is not.
    // One layer of escaping, visible on the page, is worth more than a clever
    // composition nobody can read.
    //
    // Two things it now tolerates, both measured on real prose rather than
    // imagined: a QUANTIFIER before the verb ("You BOTH wanted…") and the
    // verb's INFLECTION ("want" was listed, the coach said "wanted", and
    // `want\b` does not match it).
    //
    // 🚨 THIS IS A HEURISTIC AND ITS LIST WILL NEED EXTENDING AGAIN. It errs
    // toward FIRING, because a false red here costs one investigation (this
    // one) while a false green on a SEAT check lets the locked seat rule rot
    // silently. If it starts crying wolf, extend the list — do not relax the
    // shape.
    // 🔴 AND AN OPTIONAL GROUP BACKTRACKS TO EMPTY, which is how the second
    // cut ALSO failed. `^you\s+(?:both|…)?\s*(?!ALLOWED)` looks like it skips
    // the quantifier, and it does — but when the lookahead then rejects at
    // "wanted", the engine backtracks the optional group to empty, re-tests
    // the lookahead at "both", finds it unlisted, and fires anyway. The fix
    // that reads correctly is the one that cannot backtrack: STRIP the hedge
    // first, then test. Three cuts at this line, two of them silently inert,
    // is the argument for a shape you can read over one you have to simulate.
    // ONE DEFINITION, and it is unit-tested (`src/test/seatReattribution.test.ts`).
    // This predicate took three cuts, two of them SILENTLY INERT, while living
    // here where only a full prod browser run could exercise it. It is now a
    // pure function the suite holds to its 12 cases in both directions.
    const seat = seatReattributes(head, studentPly);
    if (seat.fails) seatFails.push(`ply ${n} (${studentPly ? 'you' : 'opponent'}): "${head}"`);
    // NOTRADEWIN — a capture immediately recaptured on the same square at equal
    // value is an even trade: it must not read as profit / material won.
    const i = n - 1;
    if (i + 1 < SANS.length && SANS[i].includes('x') && SANS[i + 1].includes('x')) {
      const to = (x) => x.replace(/[+#]/g, '').slice(-2);
      if (to(SANS[i]) === to(SANS[i + 1]) && victimVal[i] !== null && victimVal[i] === victimVal[i + 1]
        && /clean profit|material in the bag|wins? material|(?:won|wins?) (?:their|your|the) (?:pawn|knight|bishop|rook|queen)|nets? (a|the|\d)|without giving up anything|free pawn|a real price/i.test(scan)) {
        tradeFails.push(`ply ${n} ${SANS[i]}: "${narr.slice(0, 70)}"`);
      }
    }
  }
  await add('ACC board-accuracy', accFails.length === 0, accFails.length ? accFails.slice(0, 3).join(' | ') : `no false piece-on-square claims across ${plyNarr.size} narrated plies`);
  await add('SEAT mover-never-reattributed', seatFails.length === 0, seatFails.length ? seatFails.slice(0, 3).join(' | ') : `every narrated ply keeps its seat (${plyNarr.size} plies)`);
  await add('NOTRADEWIN even-trade-not-profit', tradeFails.length === 0, tradeFails.length ? tradeFails.slice(0, 3).join(' | ') : 'no even trade narrated as material won');


  // FUNDLEAD — across the walk, every flagged STUDENT ply the auto-advance
  // passed leads with a fundamentals verdict when one attached; at least one
  // must have (a game with a flagged move and no fundamental anywhere means
  // the attributor is not wired into the live narration).
  const leads = [...flaggedLeads.entries()];
  const withFund = leads.filter(([, v]) => FUND_RE.test(v.lead));
  // A game where the student was flagged NOWHERE cannot test this. Reporting
  // 0/0 as a hard FAIL is a vacuous red, and a red that is always wrong trains
  // the next session to ignore the whole report (David's standing rule: a
  // silent no-op is a failed test — the converse is that an untestable
  // precondition is NOT TESTED, never a defect).
  if (leads.length === 0) {
    await add('FUNDLEAD flagged-student-plies-lead-with-fundamentals', dbFlagged.n === 0,
      dbFlagged.n === 0
        ? 'n/a — the ENGINE RECORD confirms 0 flagged student plies in this game, so there is nothing to lead with (not a product result)'
        : `the engine record carries ${dbFlagged.n} flagged student ply(s) (${dbFlagged.at.join(', ')}) and the walk surfaced NONE — the walk stopped seeing them`);
  } else {
    await add('FUNDLEAD flagged-student-plies-lead-with-fundamentals', withFund.length > 0,
      `${withFund.length}/${leads.length} flagged student plies lead with a fundamental — ${leads.map(([p, v]) => `ply ${p} ${v.badge}: "${v.lead.slice(0, 60)}"`).join(' | ')}`);
  }

  // ── FUNDWHY — THE ASSERT HALF OF THE DIAGNOSIS (2026-09-21) ─────────────
  //
  // 🔒 An emission nobody asserts on is decoration (CLAUDE.md, the algo-audit
  // rule: EMIT and ASSERT, both halves or it is not shipped). `attrWhy` +
  // `coachFeatureService.reviewFundamentalDeclined` landed as emit-only, and
  // the 2026-09-21 run proved exactly what that costs: FUNDLEAD reproduced
  // perfectly, 0/4 flagged plies leading with a fundamental, and the run could
  // not say WHY — the reason was computed on prod, posted to this very
  // listener, and thrown away because no row read it. A whole audit cycle for
  // a symptom we already had.
  //
  // This reads the rows back. It is deliberately NOT a pass/fail on the
  // product: whether a ply gets a fundamental is FUNDLEAD's job. This asserts
  // the INSTRUMENT — that when a flagged ply leads without one, the app said
  // why. A blind diagnosis is the failure being reported here.
  {
    const declined = events()
      .filter((e) => String(e.source ?? '') === 'coachFeatureService.reviewFundamentalDeclined')
      .map((e) => {
        let d = {};
        try { d = JSON.parse(String(e.details ?? '{}')); } catch { d = {}; }
        return { ply: d.ply, san: d.san, classification: d.classification, bestSan: d.bestSan, why: Array.isArray(d.why) ? d.why : [] };
      });
    const missing = leads.filter(([, v]) => !FUND_RE.test(v.lead)).map(([p]) => Number(p));
    const named = declined.filter((d) => missing.includes(Number(d.ply)));
    // Only meaningful when a flagged ply actually went without a fundamental.
    // No misses = nothing to diagnose, and a row reporting green for an event
    // that could not happen is the self-declared n/a this file has deleted
    // twice (see the turning-card row).
    if (missing.length === 0) {
      await add('FUNDWHY declined-rows-name-the-cause', true,
        'n/a — every flagged student ply led with a fundamental, so there was nothing to decline (not a product result)');
    } else {
      const reasons = named.map((d) => `ply ${d.ply} ${d.classification} ${d.san} (best=${d.bestSan ?? 'null'}): ${d.why[0] ?? '(empty why)'}`);
      await add('FUNDWHY declined-rows-name-the-cause', named.length > 0 && named.every((d) => d.why.length > 0),
        named.length === 0
          ? `BLIND — ${missing.length} flagged ply(s) (${missing.join(', ')}) led without a fundamental and the app emitted NO reviewFundamentalDeclined row for any of them. Either the emission is not reaching the listener, or the attributor bailed on a path that does not emit. The cause is still unnamed.`
          : `${named.length}/${missing.length} named — ${reasons.join(' | ')}`);
      // Print every reason, including plies outside `missing`, so a run that
      // diagnoses more than it fails still hands over the whole picture.
      for (const d of declined) {
        log(`  [fundwhy] ply ${d.ply} ${d.classification} ${d.san} best=${d.bestSan ?? 'null'} :: ${d.why.join(' | ')}`);
      }
    }
  }

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
  // Show-me mounts ONLY on a flagged ply with a better move. When the engine
  // flagged nothing, `showPly` fell back to the fixture ply — which is graded
  // GOOD — so the absent button is CORRECT, not a defect. Report it as such.
  if (flaggedLeads.size === 0) {
    await add('SHOW better-move-narrated-then-paused', true,
      `n/a — no flagged student ply in this game, so no Show-me is owed (probe ply ${FUND_PLY} graded good)`);
  } else {
    await add('SHOW better-move-narrated-then-paused', showBtn && showLines >= 2 && showPaused === 'paused', showBtn ? `ply ${showPly}: ${showLines} lines spoken; state after=${showPaused}` : `no Show-me button on FLAGGED ply ${showPly}`);
  }
  const showStarts = events().filter((e) => e.kind === 'review-show-me-started').length;
  await add('SHOW never-auto-played', showStarts === (showBtn ? 1 : 0), `${showStarts} show-me start(s) — must equal the one tap`);

  // ── REOPEN (A) — instant, no re-analysis ────────────────────────────────
  // Let the background dive finish BEFORE leaving (a human reads the recap
  // while the pill spins); reopening mid-dive would only measure the dive.
  const diveDone = await until(async () => !(await has(page, '[data-testid="review-deepening-pill"]')), 300000, 2000);
  log(`  [dive] background deep dive finished before reopen: ${diveDone}`);
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  await until(() => has(page, cardSel), 20000);
  const t1 = Date.now();
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  // 🔴 RESCOPED 2026-09-17 — this row was measuring the wrong thing and calling
  // it the wrong name. It asserted the overhaul's "reopening an already-analyzed
  // review is INSTANT, no re-run" contract, but it reopens only after waiting
  // out the background deep dive — and the dive REWRITES the annotations, so the
  // narration cache key legitimately changes and the walk is rebuilt. It was
  // measuring the one path where a re-run is correct, then failing the product
  // for doing it (26.8s against a 25s budget, for two days).
  //
  // The contract itself is PROVEN GOOD, separately, by
  // `audit-review-reopen-probe.mjs`: reopen with the annotations unchanged is a
  // cache HIT at 1.7s, the app's own `review-walk-skipped` event confirming it
  // rather than a stopwatch guessing. First open on the same game: 91.3s.
  //
  // So what this row measures is REGENERATION after a dive. Bounded, honestly
  // labelled, and still able to catch the regression that matters — a second
  // full ANALYSIS would raise the spinner or the pill, and neither is allowed.
  const quick = await until(startable, 75000, 250);
  const reopenMs = Date.now() - t1;
  const spinner = await has(page, '[data-testid="review-analyze-spinner"]');
  const pill = await has(page, '[data-testid="review-deepening-pill"]');
  await add('REOPEN regenerates-after-dive-without-reanalysing', quick && !spinner && !pill,
    `startable in ${(reopenMs / 1000).toFixed(1)}s; spinner=${spinner}; deepening pill=${pill} — the dive changed the cache key, so a rebuild here is correct; the INSTANT-reopen contract is audit-review-reopen-probe.mjs`);
  // The key-moment dive ran BEHIND the first open (cold open = sweep only) and
  // was frozen out of that walk; this open carries it. Let a still-running dive
  // finish, then read the fixture ply's grade + lead line — David's own
  // example: 6...Nb6 must be flagged and led by its fundamentals.
  await until(async () => !(await has(page, '[data-testid="review-deepening-pill"]')), 120000, 2000);
  const annots2 = await page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    const a = (g?.annotations ?? []).find((x) => x.moveNumber === 6 && x.color === 'black');
    return { depth: g?.analysisDepth, row: a ? `${a.classification} eval=${a.evaluation} bestEval=${a.bestMoveEval} best=${a.bestMove}` : 'none' };
  }, GID).catch((e) => ({ error: String(e) }));
  log(`  [engine after dive] depth=${annots2.depth} 6...Nb6 ${annots2.row}`);
  // DIAGNOSTIC (2026-09-06): two prod runs saw the renderer climb to 12 GB at
  // this exact step. Sample the JS heap through the reopened walk and profile
  // it; on a blow-up, stop and name the hot functions instead of hanging.
  const heapMB = async () => Promise.race([page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1048576)), new Promise((r) => setTimeout(() => r(-1), 4000))]).catch(() => -1);
  const cdp = await ctx.newCDPSession(page).catch(() => null);
  if (cdp) { await cdp.send('Profiler.enable').catch(() => undefined); await cdp.send('Profiler.setSamplingInterval', { interval: 2000 }).catch(() => undefined); await cdp.send('Profiler.start').catch(() => undefined); }
  const dumpProfile = async (tag) => {
    if (!cdp) return;
    const { profile } = await cdp.send('Profiler.stop').catch(() => ({ profile: null }));
    if (!profile) return;
    const self = new Map(); const nodes = new Map(profile.nodes.map((n) => [n.id, n])); const total = profile.samples.length;
    for (const id of profile.samples) { const n = nodes.get(id); const k = `${n.callFrame.functionName || '(anon)'} ${(n.callFrame.url || '').split('/').slice(-1)[0]}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) ?? 0) + 1); }
    log(`  [profile ${tag}] ${total} samples`);
    [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([k, v]) => log(`    ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`));
  };
  const workers = async () => { if (!cdp) return -1; const r = await cdp.send('Target.getTargets').catch(() => null); return r ? r.targetInfos.filter((t) => t.type === 'worker' || t.type === 'shared_worker').length : -1; };
  log(`  [heap] before start-walk: ${await heapMB()}MB workers=${await workers()}`);
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  log(`  [heap] walk mounted: ${await heapMB()}MB`);
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 3000 }).catch(() => undefined);
  let blown = null; // null = healthy; otherwise the REASON string this run tripped on
  let onFund2 = false;
  const workerList = async () => { if (!cdp) return []; const r = await Promise.race([cdp.send('Target.getTargets'), new Promise((res) => setTimeout(() => res(null), 4000))]).catch(() => null); return r ? r.targetInfos.filter((t) => t.type === 'worker').map((t) => (t.url || '?').split('/').pop()) : []; };
  // A DEADLINE, not just a counter. 40 iterations of ~1s is a minute of real
  // walking; anything past this budget means a read is hanging rather than the
  // walk being slow, and the run must say so instead of sitting (2026-09-20).
  const walkDeadline = Date.now() + 180_000;
  for (let i = 0; i < 40 && !blown; i++) {
    if (Date.now() > walkDeadline) { blown = 'reopened-walk loop exceeded its 180s deadline — a read is hanging, not the walk'; break; }
    await resolveCards();
    const n = (await raced(readWalkPly(page), null))?.n ?? 0;
    const h = await heapMB();
    const wl = await workerList();
    const by = {}; for (const u of wl) by[u] = (by[u] ?? 0) + 1;
    if (i % 2 === 0 || wl.length > 20) log(`  [heap] reopened walk ply=${n}: ${h}MB workers=${wl.length} ${JSON.stringify(by)}`);
    // The blow-up is WORKERS, not JS heap (2026-09-06: 128 DedicatedWorkers at
    // 230 MB of heap). Trip on the census, dump the profile, and get out
    // before the renderer wedges the box.
    if (h > 2500 || h === -1 || wl.length > 40) {
      blown = h > 2500 ? `JS heap ${h}MB > 2500MB`
        : h === -1 ? 'JS heap UNREADABLE (renderer wedged or evaluate timed out)'
        : `${wl.length} live worker targets > 40 — heap was fine at ${h}MB`;
      log(`  [heap] BLOW-UP at ply ${n} (${h}MB, ${wl.length} workers) — ${blown} — dumping profile`);
      // The OS sample FIRST — it is the only reader that works while the main
      // thread is blocked (five wedges, zero profiles: `Profiler.stop` cannot
      // land on a spinning isolate). Names the native frames (#21).
      mkdirSync('audit-reports', { recursive: true });
      // Is the page's execution context reachable at all? A raw CDP evaluate
      // that HANGS means the main thread is blocked; one that ERRORS means the
      // context/renderer is gone — different bugs.
      const probe = cdp ? await Promise.race([
        cdp.send('Runtime.evaluate', { expression: '1+1', returnByValue: true }).then((r) => `answered ${JSON.stringify(r.result?.value)}`, (e) => `error ${String(e.message ?? e).slice(0, 100)}`),
        new Promise((r) => setTimeout(() => r('HUNG >3s'), 3000)),
      ]) : 'no cdp';
      log(`  [wedge] url=${page.url()} closed=${page.isClosed()} cdp Runtime.evaluate: ${probe}`);
      // INTERRUPTIBLE OR NOT — the second half of the diagnosis. V8 checks for
      // interrupts at loop back-edges, so a plain JS loop CAN be paused and its
      // stack read; a regex match or a recursive C++ builtin cannot. Whichever
      // answer comes back rules out half the remaining causes.
      if (cdp) {
        const paused = new Promise((r) => { cdp.on('Debugger.paused', (e) => r(e)); });
        await cdp.send('Debugger.enable').catch(() => undefined);
        void cdp.send('Debugger.pause').catch(() => undefined);
        const got = await Promise.race([paused, new Promise((r) => setTimeout(() => r(null), 10000))]);
        if (!got) log('  [wedge] Debugger.pause NEVER LANDED in 10s — the call has no interrupt check (regex match, or a recursive C++ builtin)');
        else {
          log(`  [wedge] Debugger.pause LANDED (${got.reason}) — it IS interruptible JS; top frames:`);
          for (const f of (got.callFrames || []).slice(0, 12)) log(`     ${f.functionName || '(anon)'} @ ${String(f.url || '').split('/').pop()}:${f.location?.lineNumber}`);
        }
      }
      // The tracer's verdict, read off the listener (it never touched the page).
      const tr = listener.getCapturedEvents().filter((e) => e.kind === 'wedge-trace').map((e) => ({ s: String(e.summary || ''), site: String(e.site || '') }));
      if (tr.length) {
        const open = new Map();
        for (const e of tr) {
          const m = /^(enter|exit)#(\d+) (.*)$/.exec(e.s);
          if (!m) continue;
          if (m[1] === 'enter') open.set(m[2], `${m[3]}  @ ${e.site}`); else open.delete(m[2]);
        }
        const beats = tr.filter((e) => /^alive/.test(e.s));
        log(`  [wedge] tracer: ${tr.length} beacons, last heartbeat ${beats.length ? beats[beats.length - 1].s : '(none)'}`);
        if (open.size === 0) log('  [wedge] tracer: every traced call RETURNED — the wedge is not in a traced entry point');
        for (const [id, what] of open) log(`  [wedge] NEVER RETURNED #${id}: ${what}`);
      }
      const rs = playwrightRenderers();
      log(`  [sample] playwright renderers: ${JSON.stringify(rs)}`);
      for (const smp of sampleRenderers(`audit-reports/renderer-sample-${GID}`, 5)) {
        log(`  [sample] pid ${smp.pid} cpu=${smp.cpu}% rss=${smp.rssMB}MB → ${smp.file}${smp.error ? ' ERROR ' + smp.error : ''}`);
        for (const l of smp.main) log(`     ${l}`);
      }
      if (process.env.AUDIT_WEDGE_HUNT === '1') {
        // The hunt wants the diagnostics, not the rest of the rubric — every
        // later step evaluates against a blocked page and hangs (n=2 sat 49 min).
        log('  [wedge] AUDIT_WEDGE_HUNT=1 — diagnostics captured, exiting 3');
        await browser.close().catch(() => undefined);
        process.exit(3);
      }
      await dumpProfile('blow-up');
      // WHO spawned them: the app's own audit events since the reopen (captured
      // off the wire, so a 500 from the stream server cannot hide them).
      const recent = events().filter((e) => (e.t ?? e.receivedAt ?? e.timestamp ?? 0) >= t1).slice(-60);
      const kinds = {}; for (const e of recent) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
      log(`  [events since reopen] ${JSON.stringify(kinds)}`);
      for (const e of recent.filter((e) => /stockfish|analysis|pool|worker|review-walk|deepen/i.test(e.kind)).slice(-25)) log(`    ${e.kind} | ${String(e.source ?? "")} — ${String(e.summary ?? "").slice(0, 150)}`);
      break;
    }
    if (n === FUND_PLY) { onFund2 = true; break; }
    const sel = n < FUND_PLY ? '[data-testid="review-forward-btn"]' : '[data-testid="review-back-btn"]';
    await page.locator(sel).first().click({ timeout: 2000, force: true }).catch(() => undefined);
    await page.waitForTimeout(700);
  }
  // Pool churn is visible on EVERY run, not only on a blow-up: each pool spawn
  // logs a variant-resolved event, each stall/fallback its own kind. Three warm
  // engines on a reopen means ~3 spawns; a starved box that pings warm workers
  // dead and respawns them shows up here as a spawn count far above the pool.
  {
    const churn = events().filter((e) => (e.receivedAt ?? 0) >= t1 && /stockfish-variant-resolved|analysis-pool|stockfish-analysis-stalled|analysis-worker|wedge/i.test(String(e.kind) + ' ' + String(e.source ?? '')));
    const by = {}; for (const e of churn) { const k = `${e.kind}|${String(e.source ?? '').split('.').pop()}`; by[k] = (by[k] ?? 0) + 1; }
    log(`  [pool churn since reopen] ${JSON.stringify(by)}`);
  }
  // 🚨 REPORT THE PLY IT MEASURED, NEVER THE CONSTANT. This printed
  // "heap 209MB at ply ${FUND_PLY}" — the CONSTANT interpolated into the
  // string — while the walk sat at ply 0 for the entire loop (2026-09-17). A
  // green row quoting a number it never read is the exact failure the vacuity
  // check exists to catch, and it masked the neighbouring red below.
  const heapPly = (await readWalkPly(page))?.n ?? null;
  // 🚨 NAME WHAT TRIPPED, NEVER A GENERIC "EXPLODED". This row printed
  // "renderer heap exploded on the reopened walk" on a run whose heap sat flat
  // at 350MB and whose ONLY trip was the worker census (2026-09-18) — sending
  // the next reader to a heap profile that was 42% idle while the actual
  // finding (one multi-threaded `stockfish-18-lite.js` behind 69
  // `stockfish-18-lite.wasm,worker` pthread targets, climbing 4→34→49→70) went
  // unnamed. The three trip causes are three different bugs; say which.
  if (blown) { await add('HEAP reopened-walk-stays-sane', false, `tripped on: ${blown}`); }
  else { await dumpProfile('reopened-walk'); await add('HEAP reopened-walk-stays-sane', true, `heap ${await heapMB()}MB at ply ${heapPly ?? 'UNREADABLE'}`); }
  // The reopened walk must actually BE a walk before anything navigates it. A
  // null readout makes `goTo` read 0, click forward 80×, and fail — which is
  // what produced the after-dive red: the AUDIT never started the walk, the
  // product was fine.
  await add('REOPEN walk-readout-is-live', heapPly !== null,
    heapPly !== null ? `ply readout reads ${heapPly}` : 'no ply readout on the reopened walk — navigation below cannot work');
  await settle();
  // The banner fills once this ply's line is generated; give it a beat.
  await until(async () => (await txt(page, '[data-testid="review-narration-banner"]')).length > 0, 60000, 1000);
  // Land DETERMINISTICALLY on the fixture ply on the reopened walk. The heap-
  // stress loop above leaves the walk at an arbitrary ply (and `onFund2` only
  // records whether that loop happened to stop there) — read the grade + lead
  // from a clean navigation, exactly as the cold-open FUND check does. Reading
  // off the loop's endpoint was measuring where the stress loop stopped, not the
  // fixture ply, and produced false "badge=none / lead=''" reds (2026-09-13).
  const reachedFund2 = await goTo(FUND_PLY);
  await settle();
  await until(async () => (await txt(page, '[data-testid="review-narration-banner"]')).length > 0, 60000, 1000);
  const fundBadge2 = await txt(page, '[data-testid="review-classification-badge"]');
  const fundNarr2 = await txt(page, '[data-testid="review-narration-banner"]');
  const lead2 = fundNarr2.split(/(?<=[.!?])\s+/)[0] || '';
  const flagged2 = /INACCUR|MISTAKE|BLUNDER/i.test(fundBadge2);
  // The DIVE's job is to DEEPEN the annotation — assert it did that (Dexie is
  // ground truth: a real analysis depth + a real grade for 6...Nb6). Whether the
  // deepened grade is flagged or GOOD is the engine's call at the app's budget on
  // a borderline ~40-60cp move and varies run-to-run — the SAME engine truth the
  // cold-open FUND check treats as informational, not a gate.
  const gradedAfterDive = !annots2.error && typeof annots2.depth === 'number' && !!annots2.row && annots2.row !== 'none';
  await add('FUND probe-ply-graded-after-dive', gradedAfterDive, `ply ${FUND_PLY} depth=${annots2.depth ?? '?'} (${annots2.row ?? annots2.error})`);
  // The PRODUCT contract, identical to the cold-open FUND check: WHEN the
  // reopened+deepened ply is flagged, its narration LEADS with the fundamental;
  // when the engine grades it GOOD, leading with mechanics is correct. Requiring
  // `flagged2` here (the old check) tested engine variance, not the product, and
  // false-red'd a working reopen — the cold-open FUNDLEAD already proves the
  // fundamentals-first narration on the same run.
  await add('FUND probe-ply-leads-with-fundamentals-after-dive', reachedFund2 && (!flagged2 || FUND_RE.test(lead2)), reachedFund2 ? `flagged=${flagged2} lead="${lead2.slice(0, 120)}"` : 'reopened walk did not reach the probe ply');

  // ── THE CRITICAL MOMENT (WO-CRITICAL-MOMENT-01) ───────────────────────────
  //
  // Review has always selected its question by SWING. A student who FOUND the
  // only move has a swing of ZERO, so the most instructive position in the game
  // was the one position the card could never reach. These rows prove the
  // criticality pass ran, that a moment was selected, and — the part no unit
  // test can see — that what the student HEARD names the count and a COMPUTED
  // stake rather than the templated "equality" that is false in both
  // directions.
  const critEvents = events().filter((e) => /criticalMoment|scanCriticalMoments/.test(String(e.source ?? '')));
  const fanEv = critEvents.find((e) => /scanCriticalMoments/.test(String(e.source ?? '')));
  const pickEv = critEvents.find((e) => /CoachGameReview\.criticalMoment/.test(String(e.source ?? '')));
  const fanSummary = String(fanEv?.summary ?? '');
  const pickSummary = String(pickEv?.summary ?? '');
  const scanned = Number(/(\d+) plies/.exec(fanSummary)?.[1] ?? 0);
  await add('CRIT fan-pass-ran', scanned > 0, fanSummary || 'no scanCriticalMoments event — the MultiPV pass never ran');
  // 🔴 A MOMENT MUST BE SELECTED OR THE ROW IS RED (WO-STANDARD-01 I4). This
  // row used to pass on "no ply resolved" — and with it the two CRIT rows below,
  // which then asserted nothing. A quiet rotation is not a pass; it is a run
  // that verified nothing about the critical-moment computer. Pin a game that
  // resolves one (AUDIT_GAME_ID=<id> from a prior run, or AUDIT_GAME=fixture).
  const resolved = Number(/(\d+) speak/.exec(fanSummary)?.[1] ?? 0);
  await add('CRIT moment-selected', !!pickEv,
    pickEv ? pickSummary
      : `NO moment selected — ${resolved === 0 ? 'no ply resolved to a 1- or 2-move count' : `${resolved} resolved but none picked`} (${fanSummary}). `
        + 'Nothing below this line was verified; pin a game with a resolved moment.');

  // THE SIX COMPUTED STAKES — the phrasing rotates, the claim never does.
  // Present for Learn, PAST for review — the two narration registers. A regex
  // that knew only the present tense would read a correct retrospective line as
  // silence, which is the false red this row exists to avoid.
  const STAKE_RE = /(keeps?|kept) (the forced mate|the win|you on top|you level|you in it)|(limits?|limited) the damage/i;
  const COUNT_RE = /\b(only )?one move\b|\btwo moves\b/i;
  const critLines = spoken().map((x) => x.text).filter((t) => COUNT_RE.test(t) && (STAKE_RE.test(t) || /critical moment|fork in the road/i.test(t)));
  // 🔒 A MOMENT THE QUESTION PLAN OWNS IS SUPPOSED TO STAY QUIET HERE — but the
  // row may only excuse it on EVIDENCE that the owner actually spoke (fixed
  // 2026-09-21, from a 48/50 prod run).
  //
  // `handleWalkForward` suppresses the critical beat when `questionPlan` already
  // stops at that ply: "that card owns the moment — speaking the critical
  // reveal first would hand it the answer". So on a game where the plan claims
  // the selected ply, silence in THIS register is the correct computed verdict
  // and a hard fail here is the audit asserting a contract the product
  // deliberately does not hold — the same class as the retired R2 and the RECAP
  // regex that pinned a phrasing which had stopped shipping.
  //
  // But "another card owns it" must never be ASSUMED, because an unconditional
  // yield to a sibling that never claims it is a real defect and the student
  // gets nothing (measured on this same run at ply 64: "the punishment Bd7+ is
  // immediate — another fundamental owns it", and no other fundamental fired).
  // So the excuse is granted only when some spoken line actually NAMES the
  // move the moment was selected on. On the run that prompted this, the
  // turning-point reveal did exactly that — "The game turned at move 34, king
  // to e6" for a moment selected at ply 68 with played=Ke6 — which is the owner
  // speaking, in its own register.
  //
  // Three outcomes, never two: SPOKEN here (pass), CLAIMED elsewhere (pass,
  // and it says by what), or SILENT (fail — the yield went nowhere).
  // ONE DECIDER, SHARED WITH ITS TEST. This judgement lived inline here and
  // one of its three branches had never executed after three prod runs — a
  // rare game is not a test plan. It is now `audit-lib/critical-moment-voice`,
  // exercised by `criticalMomentVoice.test.ts` including the
  // CLAIMED-ELSEWHERE path prod would not produce. Keeping a second copy here
  // is the duplicated-judgement rot this repo names everywhere else.
  const playedSan = /played=(\S+)/.exec(pickSummary)?.[1] ?? null;
  const voice = judgeCriticalVoice({
    momentSelected: !!pickEv,
    criticalLines: critLines,
    playedSan,
    spoken: spoken().map((x) => x.text),
  });
  await add('CRIT spoken-names-count-and-stake',
    voice.pass || !!driverStop,
    voice.verdict === 'silent' && driverStop ? driverStop : `${voice.verdict}: ${voice.detail}`);
  // "Keeps equality" is a claim about the EVALUATION and it is false when they
  // are winning (it keeps the WIN) and when they are lost (it promises a draw
  // that is not there). It must never appear.
  const templated = spoken().map((x) => x.text).filter((t) => /keeps? equality/i.test(t));
  await add('CRIT stake-is-computed-never-templated', templated.length === 0,
    templated.length ? `templated stake spoken: "${templated[0].slice(0, 140)}"` : 'no "keeps equality" anywhere in the run');
  // §G4.5.2 — never ask a student to find a move they played. When the selected
  // register is `credit` (their move HELD), no question card may render.
  const register = /register=(\w+)/.exec(pickSummary)?.[1] ?? null;
  const cardShown = await has(page, '[data-testid="review-critical-card"]');
  // Asserts on a SELECTED moment or fails (I4): with no register there is no
  // move to have played, and "no moment selected" was a green that meant nothing.
  await add('CRIT never-asks-a-move-they-played', !!register && (register !== 'credit' || !cardShown),
    register ? `register=${register} card=${cardShown}` : 'no moment selected on this game — nothing verified; pin a game with a resolved moment');
  log(`\n===== CRITICAL MOMENT (${critLines.length} spoken) =====`);
  if (critLines.length === 0) log('  (none — the fan resolved no 1- or 2-move count on this game)');
  critLines.forEach((t, i) => log(`  [${i + 1}] ${t.slice(0, 260)}`));

  await add('WALK readout-stayed-readable', unreadable === 0,
    unreadable === 0 ? 'the ply readout answered on every poll'
      : `the ply readout went unreadable for the last ${unreadable} poll(s) — every "ply 0" in the tail above is that, not a reset`);

  await add('ERR no-errors', errs.length === 0, errs.length ? errs.slice(0, 3).join(' | ') : 'none');

  const streamAfter = await pullAuditStream(Date.now() - 600000);
  log('\n===== 3-INSTRUMENT COVERAGE =====');
  log(`  Playwright: drove list → open → walk → explore → show-me → end → reopen`);
  log(`  Narration listener: ${spoken().length} spoken lines, ${events().length} other events`);
  log(`  Audit-stream: before=${JSON.stringify(streamBefore)} after=${JSON.stringify(streamAfter)}`);
  // ── THE METHOD LAYER, REPORTED DIRECTLY ────────────────────────────────
  // "Built" is not "speaks". The beats are gated on the student's own recurrence
  // (habitNeedFrom) and say-once per game, so the honest measure is how many
  // actually reached the voice on a real game — printed here rather than left
  // for a grep. Stems come from methodBeat.ts; keep the two in sync.
  const METHOD_STEMS = /habit that catches this|their threat before your plan|what is their move doing|list the checks and the captures|checks and captures first|every check, every capture|moment to slow down|Spend your clock here|fork in the road, and those deserve|Name your candidates|candidate moves, written down|discipline here is listing/i;
  const methodBeats = spoken().map((x) => x.text).filter((t) => METHOD_STEMS.test(t));
  log(`\n===== METHOD BEATS (${methodBeats.length}) — seedWeakness=${process.env.AUDIT_SEED_WEAKNESS === '1' ? 'ON' : 'off (cold device)'} =====`);
  if (methodBeats.length === 0) log('  (none — the habit gates did not clear on this game)');
  methodBeats.forEach((t, i) => {
    const m = METHOD_STEMS.exec(t);
    const at = m ? Math.max(0, m.index - 40) : 0;
    log(`  [${i + 1}] ...${t.slice(at, at + 260)}`);
  });

  log('\n===== SPOKEN (first 30) =====');
  spoken().slice(0, 30).forEach((s, i) => log(`  [${String(i + 1).padStart(2)}] ${s.text.slice(0, 160)}`));
  log('===== SPOKEN (last 10) =====');
  const all = spoken();
  all.slice(-10).forEach((s, i) => log(`  [${String(all.length - 10 + i + 1).padStart(2)}] ${s.text.slice(0, 200)}`));
  // ── THE DECIDING COMPUTER IS OBSERVABLE (the ASSERT half of the algo-audit
  // rule). The door emits one row per decision; these read the WEIGHTING as a
  // distribution instead of judging narration by eye. Review is the surface
  // where the posture contract is load-bearing.
  const decisions = [];
  for (const e of listener.getCapturedEvents()) {
    if (e.kind !== 'coach-decision') continue;
    try {
      // AGGREGATED (2026-09-21): one entry carries the whole burst in `rows`;
      // the older single-row shape is still accepted so a run against an older
      // bundle reads it rather than silently counting zero. Emitting per
      // decision put 54 POSTs on the listener sidecar and cost the coach its
      // narration — see the note in appAuditor.
      const p = JSON.parse(e.details ?? '');
      for (const row of (Array.isArray(p?.rows) ? p.rows : [p])) {
        if (row && typeof row.posture === 'string' && typeof row.speak === 'boolean') decisions.push(row);
      }
    } catch { /* a row we cannot read is not a row */ }
  }
  // THE NEED TERMS as a distribution (`coach-need-scores`, aggregated by the
  // subscriber). This is the weighted speaking itself: which term carried the
  // plies, how often the cold-start prior stood in for data, and — the one a
  // distribution catches that prose never could — that the only LOWERING term
  // never raises. A sign inversion in `capabilityTerm` would make proving a
  // capability make the coach LOUDER, and every sentence would still read fine.
  const needAgg = [];
  for (const e of listener.getCapturedEvents()) {
    if (e.kind !== 'coach-need-scores') continue;
    try { const r = JSON.parse(e.details ?? ''); if (r && r.totals) needAgg.push(r); } catch { /* not a row */ }
  }
  await add('NEED term-distribution-emitted', needAgg.length > 0, `${needAgg.length} aggregated need rows; ${needAgg.reduce((n, r) => n + (r.plies ?? 0), 0)} plies scored`);
  if (needAgg.length > 0) {
    const totals = {};
    const fired = {};
    let plies = 0; let spoke = 0; let prior = 0;
    for (const r of needAgg) {
      plies += r.plies ?? 0; spoke += r.spoke ?? 0; prior += r.prior ?? 0;
      for (const [k, v] of Object.entries(r.totals ?? {})) totals[k] = (totals[k] ?? 0) + v;
      for (const [k, v] of Object.entries(r.fired ?? {})) fired[k] = (fired[k] ?? 0) + v;
    }
    const WANT = ['departure', 'weakness', 'unfamiliarity', 'resultDeficit', 'capability', 'thread'];
    const missing = WANT.filter((k) => !(k in totals));
    await add('NEED every-term-reported', missing.length === 0, missing.length ? `terms missing from the emission: ${missing.join(',')}` : `terms fired: ${WANT.map((k) => `${k}=${fired[k] ?? 0}`).join(' ')}`);
    await add('NEED capability-term-never-raises', (totals.capability ?? 0) <= 0,
      `capability total=${totals.capability ?? 0} (the ONLY lowering term — positive means a sign inversion, and the prose would read fine either way)`);
    await add('NEED not-every-term-is-dead', Object.values(fired).some((n) => n > 0),
      `${plies} plies, ${spoke} cleared the bar, ${prior} on the cold-start prior; totals ${JSON.stringify(totals)}`);
  }
  await add('DECIDER rows-emitted', decisions.length > 0, `${decisions.length} coach-decision rows off the wire`);
  if (decisions.length > 0) {
    // G4.5.15: review is a WALK — the student asked for the sequence, so
    // importance RANKS the moment and must NEVER decide whether the ply
    // speaks. This is the exact failure that cut a 46-ply walk to SIX while
    // every unit test stayed green; it is one number here.
    const walk = decisions.filter((d) => d.posture === 'walk');
    const importanceClosed = walk.filter((d) => d.speak === false && d.reason === 'importance');
    await add('DECIDER walk-posture-never-gated-by-importance', importanceClosed.length === 0,
      `${walk.length}/${decisions.length} rows judged as walk; ${importanceClosed.length} closed on importance (must be 0 — that is the 46-ply-to-6 bug)`);
    const silent = decisions.filter((d) => d.speak === false);
    const unattributed = silent.filter((d) => d.reason !== 'importance' && d.reason !== 'need' && d.reason !== 'unsupported' && d.reason !== 'empty' && d.reason !== 'proven' && d.reason !== 'board');
    await add('DECIDER every-silence-names-its-gate', unattributed.length === 0,
      `silent=${silent.length} importance=${silent.filter((d) => d.reason === 'importance').length} need=${silent.filter((d) => d.reason === 'need').length} unsupported=${silent.filter((d) => d.reason === 'unsupported').length} empty=${silent.filter((d) => d.reason === 'empty').length} proven=${silent.filter((d) => d.reason === 'proven').length} board=${silent.filter((d) => d.reason === 'board').length} unattributed=${unattributed.length}`);
    // THE COMPUTED ORDER (2026-09-23): facts carry STAKES from the computer that
    // made them and the door orders by them. A run where no row ever carried
    // stakes means the wire does not fire and every ply fell back to the tie table.
    const stakedRows = decisions.filter((d) => (d.stakedCount ?? 0) > 0);
    const ledStaked = decisions.filter((d) => d.leadStaked === true);
    await add('DECIDER computed-order-carries-stakes', stakedRows.length > 0 && ledStaked.length > 0,
      `${stakedRows.length}/${decisions.length} rows carried stakes; ${ledStaked.length} led by a staked fact`);
    const spoke = decisions.filter((d) => d.speak);
    // SUBSUMPTION — the knob behind "calling out the pins and the batteries was
    // a bit much" (David 2026-09-16). It is the mechanism the rule says to
    // tighten instead of raising the bar, and until now the only way to know
    // whether it was doing anything was to read the tape and count repeats.
    const quietBy = {};
    for (const d of decisions) for (const [k, v] of Object.entries(d.quietBy ?? {})) quietBy[k] = (quietBy[k] ?? 0) + v;
    const pairs = decisions.flatMap((d) => d.subsumed ?? []);
    await add('DECIDER quiet-attributed-by-mechanism', Object.keys(quietBy).length > 0 || decisions.every((d) => (d.quietCount ?? 0) === 0),
      `${JSON.stringify(quietBy)} — subsumption and the floor are different bugs and quietCount alone cannot tell them apart`);
    // B9 (2026-09-22): a row the DOOR closed files every one of its facts under
    // the gate that closed it — `quietBy.importance` or `quietBy.need`, the same
    // name `reason` carries — never under 'below-bar', which is the FLOOR's
    // name and a different diagnosis. A silent row whose facts are filed
    // elsewhere is the collapse this emission exists to prevent.
    // `proven` is the one exception, and a deliberate one: a fact in a layer the
    // student has PROVEN is quieted BEFORE the door's gates by the green-layer
    // step (WO-LAYERS-01), so it keeps its own name on any row — relabelling it
    // would erase the heat map's only visible trace in the decision row.
    // `said-already` likewise: the say-once verdict is on the fact (the student
    // already heard it), not on the row.
    // The BOARD's verdicts (`in-flux`, `beside-mate`, 2026-09-25) are on the
    // fact too — a recapture pending or a mate on the board — and a row they
    // empty says so with reason 'board'.
    const ownVerdict = (d) => (d.reason === 'proven' ? 0 : (d.quietBy?.proven ?? 0)) + (d.quietBy?.['said-already'] ?? 0)
      + (d.quietBy?.['in-flux'] ?? 0) + (d.quietBy?.['beside-mate'] ?? 0);
    const misfiled = silent.filter((d) => (d.quietCount ?? 0) > 0
      && ((d.quietBy?.[d.reason] ?? 0) + ownVerdict(d)) !== d.quietCount);
    await add('DECIDER door-closed-rows-file-facts-under-their-gate', misfiled.length === 0,
      `${silent.length} silent rows; ${misfiled.length} file facts under a mechanism other than their own gate${misfiled[0] ? ` (e.g. reason=${misfiled[0].reason} quietBy=${JSON.stringify(misfiled[0].quietBy)})` : ''}`);
    // Every subsumption names BOTH sides. A pair with no winner means a fact
    // was silenced and the reason cannot be reconstructed, which is the
    // silence-as-a-guess this whole pass exists to prevent.
    const halfPairs = pairs.filter(([loser, winner]) => !loser || !winner);
    await add('DECIDER every-subsumption-names-what-ate-it', halfPairs.length === 0,
      `${pairs.length} collapses${pairs.length ? `; e.g. "${pairs[0][0].slice(0, 60)}" → "${pairs[0][1].slice(0, 60)}"` : ''}${halfPairs.length ? ` — ${halfPairs.length} UNATTRIBUTED` : ''}`);
    await add('DECIDER weighting-non-degenerate', spoke.length > 0,
      `spoke=${spoke.length} silent=${silent.length} rows-with-quieted-facts=${decisions.filter((d) => d.quietCount > 0).length} method-beats=${decisions.filter((d) => d.method).length}`);
  }
  const voiced = listener.getCapturedEvents().filter((e) => e.kind === 'coach-narration-spoken');
  const unmuted = voiced.filter((e) => !/voice=audit-muted/.test(String(e.summary ?? '')));
  await add('MUTE audit-ran-silent', unmuted.length === 0 && ttsRequests === 0, `${voiced.length} spoken lines, ${unmuted.length} unmuted, ${ttsRequests} /api/tts requests`);
  // 🔒 THE WEDGE GUARD (PLAN §B #21, 2026-09-20). About one reopen in several
  // pins this browser's renderer in one non-returning JS call: the walk stops
  // at ply 0 and every row read after it goes red — HEAP, REOPEN, RECAP,
  // THESIS, CRIT — which reads exactly like a pile of product failures and is
  // not one. Two runs were thrown away to that before it was recognised.
  // PostHog says no real user has ever hit it (802 review events, 90 days, max
  // 47s gap), so this is an INSTRUMENT failure, and the honest verdict is
  // CONTAMINATED rather than FAILS: rows taken after a wedge are not evidence
  // about the product. Exit 4 so a chain can retry the run instead of filing
  // a bug that does not exist.
  const wedged = wedgedReason || blown;
  await add('WEDGE renderer-answered-throughout', !wedged, wedged ? `WEDGED: ${wedged} — rows taken after it are NOT a product verdict` : 'renderer answered every probe, walk and reopen');
  log('\n===== CONTRACT GRID =====');
  let allPass = true;
  for (const r of results) { log(`  ${r.pass ? '✅ PASS' : '❌ FAIL'}  ${r.id.padEnd(40)} ${r.detail}`); if (!r.pass) allPass = false; }
  log(`\n===== VERDICT: ${wedged ? '⚠️ CONTAMINATED (instrument wedged — rerun, do not file these reds)' : allPass ? '✅ MEETS STANDARD' : '❌ FAILS STANDARD'} =====`);
  try {
    const dir = `audit-reports/review-overhaul-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, gid: GID, verdict: wedged ? 'CONTAMINATED (instrument wedged)' : allPass ? 'MEETS STANDARD' : 'FAILS STANDARD', wedged: wedged ?? null, results, engine: annots, spoken: all.map((x) => x.text), plies: [...plyNarr.entries()].map(([ply, v]) => ({ ply, ...v })), streamBefore, streamAfter, coachDecisions: decisions, needScores: needAgg, errors: errs }, null, 2));
    log(`report: ${dir}/report.json`);
  } catch (e) { log(`(report not written: ${String(e).slice(0, 80)})`); }
  await listener.stop();
  await browser.close();
  process.exit(wedged ? 4 : allPass ? 0 : 1);
};
run().catch((e) => { console.error('fatal:', e); process.exit(1); });
