#!/usr/bin/env node
/**
 * audit-coach-full-games — plays FULL games on /coach/play to their natural
 * end and drives the post-game review for every one of them (David
 * 2026-07-13: "It needs to play at least 10 games, all with different
 * openings. Testing for errors in the new build.").
 *
 * Per game:
 *   1. Fresh SPA load of /coach/play?side=<white|black>.
 *   2. A scripted opening PREFIX steers the student's side into a distinct
 *      opening family (10 plans: Italian/d4/c4/Nf3/f4 systems as White; Sicilian/
 *      Caro-Kann/French/Modern/Scandinavian replies as Black). A plan whose
 *      family depends on the coach's replies (Italian) also passes `?subject=`
 *      so the coach follows that opening's book side.
 *   3. After the prefix, a deterministic greedy policy (mate > best capture >
 *      check > development) plays the student's moves until chess.js says the
 *      game is over (checkmate/stalemate/draw). No move is ever invented —
 *      a Node-side chess.js mirror tracks the position; the coach's replies
 *      are read back from the app's own `coach-turn-checkpoint` audit
 *      entries (san + fen) and cross-checked against the mirror (G3-safe:
 *      the audit only plays legal mirror moves via board clicks).
 *   4. The game-over overlay's "Review Game" button (skip-to-review-btn) is
 *      clicked and the post-game review walk (coach-game-review-walk) is
 *      driven forward ply by ply, interacting with every diagnostic card
 *      that surfaces: find-the-shot (hint → reveal → continue), blunder
 *      rewind (decline — accepting hijacks the walk into practice), turning
 *      point (pick → done).
 *   5. Persistence is verified straight from IndexedDB: the finished game
 *      must exist in `games` with source='coach'.
 *
 * Hard contract (exit 1 on any):
 *   - every game reaches a terminal state (a ply-cap resign is recorded as
 *     `capResign` and counts as a completed game, but is called out);
 *   - the detected openings across games are ALL DISTINCT (≥ GAMES names);
 *   - the review walk mounts for every game;
 *   - every finished game (≥ MIN_PERSIST_PLIES) is persisted to Dexie;
 *   - zero pageerrors and zero non-NOISE console errors across the run.
 *
 * Usage:
 *   node scripts/audit-coach-full-games.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 GAMES=2 node scripts/audit-coach-full-games.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const STREAM_URL = `${BASE_URL}/api/audit-stream`;
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const GAMES = Math.max(1, Number(process.env.GAMES) || 10);
// PLAN_FILTER=sicilian,caro-kann scopes the run to named plans (debug aid).
const PLAN_FILTER = (process.env.PLAN_FILTER || '').split(',').map((s) => s.trim()).filter(Boolean);
const PLY_CAP = Math.max(40, Number(process.env.PLY_CAP) || 220);
const COACH_REPLY_TIMEOUT_MS = 30_000;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-full-games-${stamp}`;

// Console noise that is NOT an app bug in a headless/foreign-cert context.
const NOISE = [
  /ERR_CERT/i, /net::ERR_/i, /Failed to load resource/i, /favicon/i,
  /\/api\/tts/i, /\/api\/audit-stream/i, /Polly/i, /tts-failure/i,
  /AudioContext/i, /play\(\) failed/i, /NotAllowedError/i,
  /\[Stockfish\]/i, /RuntimeError: unreachable/i, /worker\.onerror/i,
  // Cold-boot handshake race, root-caused 2026-07-13: a `uci` sent before
  // the Emscripten module installs its real handler is eaten by the boot
  // glue, which prints these two lines once. stockfishEngine now re-sends
  // `uci` until uciok (the functional fix); the one-time glue print on a
  // slow load is understood noise, still visible via stockfish-* audits.
  /received unknown command/i, /^uci$/,
  /\[CoachAPI\]/i, /APIConnectionError/i, /Connection error/i,
];
const isNoise = (t) => NOISE.some((re) => re.test(t));

// 10 opening plans — every game steers into a DIFFERENT family. White plans
// script the student's first moves outright; Black plans pick the first
// LEGAL preference each ply (the coach owns move 1), which still forces a
// distinct family (Sicilian vs Caro vs French vs Modern vs Scandinavian).
//
// A plan whose family identity depends on the COACH's cooperation must ASK the
// coach to play that opening via `?subject=` — scripting only the student's
// side is not enough. Run 29249281899 proved it: the `italian-shape` plan
// played 1.e4 with no subject, the coach (owning Black) answered ...e6, and the
// game was (correctly) detected as "French Defense: Knight Variation" —
// colliding with the Black `french` plan's "French Defense" root → 9 families,
// not 10. The Italian (1.e4 e5 → Italian) is exactly this case: its family is
// decided by the coach's replies. Fix = tell the coach to play it
// (`subject: 'Italian Game'`), so the coach follows the Italian's Black side
// (e5/Nc6/Bc5 — verified live 2026-07-13) and the game is a real, distinct
// "Italian Game". `subject` is passed on the /coach/play URL; the White-system
// plans below need no subject (their family is named by White's own structure,
// robust to any Black reply), so they stay free-play.
// Every plan whose detected family could be moved by the COACH's choice carries
// a `subject` so the coach follows THAT opening's book (deterministic family):
//   - the Italian (1.e4 e5) — the coach owns Black's reply;
//   - the 5 Black defenses — the coach owns White's OPENING move, so without a
//     subject it can open 1.Nf3 and turn a "Scandinavian" (1...d5) into a
//     Zukertort/Tennison (run 29260208403 collided scandinavian↔reti this way);
//   - the d4 White plan — 1.d4 + a Black ...g6 reply reads as "Modern Defense"
//     and would collide with the modern plan, so it asks for a Queen's Gambit
//     (coach answers 1...d5).
// The three flank White systems (1.c4/1.Nf3/1.f4) need no subject: their family
// root (English / Zukertort / Bird) is fixed by WHITE's own first move.
const PLANS = [
  { name: 'italian-shape',   side: 'white', subject: 'Italian Game',        prefs: [['e4'], ['Nf3'], ['Bc4'], ['c3'], ['d3']] },
  { name: 'queens-pawn',     side: 'white', subject: "Queen's Gambit",      prefs: [['d4'], ['c4', 'Nf3'], ['Nc3', 'Nf3'], ['e3', 'Bf4'], ['Nf3', 'Be2']] },
  { name: 'english',         side: 'white', prefs: [['c4'], ['Nc3'], ['g3'], ['Bg2'], ['Nf3']] },
  { name: 'reti',            side: 'white', prefs: [['Nf3'], ['g3'], ['Bg2'], ['O-O'], ['d3']] },
  { name: 'birds',           side: 'white', prefs: [['f4'], ['Nf3'], ['e3'], ['Be2'], ['O-O']] },
  { name: 'sicilian',        side: 'black', subject: 'Sicilian Defense',    prefs: [['c5'], ['d6', 'Nc6'], ['Nc6', 'd6'], ['Nf6', 'g6'], ['g6', 'e6']] },
  { name: 'caro-kann',       side: 'black', subject: 'Caro-Kann Defense',   prefs: [['c6'], ['d5'], ['Nf6', 'dxe4', 'e6'], ['e6', 'Bf5', 'Nbd7'], ['Be7', 'Bd6', 'Nbd7']] },
  { name: 'french',          side: 'black', subject: 'French Defense',      prefs: [['e6'], ['d5'], ['Nf6', 'c5', 'dxe4'], ['Be7', 'c5', 'Nbd7'], ['O-O', 'c5', 'Nbd7']] },
  { name: 'modern',          side: 'black', subject: 'Modern Defense',      prefs: [['g6'], ['Bg7'], ['d6', 'c5'], ['Nf6', 'Nc6'], ['O-O', 'c5']] },
  { name: 'scandinavian',    side: 'black', subject: 'Scandinavian Defense', prefs: [['d5'], ['Qxd5', 'Nf6', 'c6'], ['Qa5', 'Qd6', 'Nf6'], ['Nf6', 'c6', 'e6'], ['c6', 'Bf5', 'e6']] },
];

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Deterministic greedy policy: mate > best capture > check > development.
 *  Skips promotions unless nothing else is legal (headless promotion UI). */
function pickStudentMove(chess, ply) {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;
  const nonPromo = moves.filter((m) => !m.promotion);
  const pool = nonPromo.length > 0 ? nonPromo : moves;
  // 1. mate in one
  for (const m of pool) {
    chess.move(m.san);
    const mate = chess.isCheckmate();
    chess.undo();
    if (mate) return m;
  }
  // 2. best capture (by captured value, prefer defended-looking recaptures last)
  const captures = pool.filter((m) => m.captured).sort(
    (a, b) => (PIECE_VALUE[b.captured] ?? 0) - (PIECE_VALUE[a.captured] ?? 0),
  );
  if (captures.length > 0 && (PIECE_VALUE[captures[0].captured] ?? 0) >= 3) return captures[0];
  // 3. check
  const checks = pool.filter((m) => m.san.includes('+'));
  if (checks.length > 0) return checks[ply % checks.length];
  // 4. any capture (pawns included)
  if (captures.length > 0) return captures[0];
  // 5. development-ish: knights/bishops/castle/central pawns first, king moves last
  const ranked = [...pool].sort((a, b) => {
    const score = (m) => {
      if (m.san === 'O-O' || m.san === 'O-O-O') return 0;
      if (m.piece === 'n' || m.piece === 'b') return 1;
      if (m.piece === 'p' && 'cde'.includes(m.from[0])) return 2;
      if (m.piece === 'r' || m.piece === 'q') return 3;
      if (m.piece === 'p') return 4;
      return 5; // king shuffles dead last
    };
    return score(a) - score(b);
  });
  // deterministic-but-varied within the top band
  const band = ranked.filter((m) => {
    const s = (x) => (x.san === 'O-O' || x.san === 'O-O-O') ? 0 : x.piece === 'n' || x.piece === 'b' ? 1 : 2;
    return s(m) === s(ranked[0]);
  });
  return band[ply % band.length];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[full-games] base   = ${BASE_URL}`);
  console.log(`[full-games] games  = ${GAMES} (ply cap ${PLY_CAP})`);
  console.log(`[full-games] outDir = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachPlayBot/full-games (chromium)',
  });
  // CONTINUOUS overlay handling + the audit-mute law. The point-in-time
  // clearFirstRunOverlays sweeps miss modals that mount MID-TURN: the
  // AI-consent dialog appears at the first coach interaction and ate game 1's
  // opening move on three straight nightlies (stallResign@3, opening=null) —
  // the click landed on the backdrop, the node-side mirror desynced, and the
  // coach "never replied". The init script clicks/neutralizes consent,
  // calibration, and page-help the moment they appear, every navigation.
  // muteTtsForAudit: this nightly drove voice UNMUTED since it shipped —
  // the mute emits the same narration events with zero synthesis spend.
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(({ url, secret }) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch { /* ignore */ }
  }, { url: STREAM_URL, secret: SECRET });

  const page = await ctx.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 400)); });
  page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 400)));

  const visible = (tid) => page.locator(`[data-testid="${tid}"]`).first().isVisible().catch(() => false);
  async function shot(name) {
    try { await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false }); } catch { /* ignore */ }
  }

  /** Newest audit entries (in-page Dexie log — the source of truth). */
  async function dumpAudit() {
    try {
      return await page.evaluate(async () => {
        const a = window.__AUDIT__;
        if (!a || typeof a.dump !== 'function') return [];
        try { return await a.dump(); } catch { return []; }
      });
    } catch { return []; }
  }

  /** The slip-detector's blocking "Blunder Detected" card (Continue /
   *  Take Back / Try best) pauses the game until answered — the coach
   *  won't move while it's open. A real user picks one; the audit picks
   *  Continue (own the blunder, play on) and counts the interception. */
  let blunderCards = 0;
  async function answerBlunderCard() {
    if (!(await visible('blunder-interception'))) return false;
    blunderCards++;
    await page.locator('[data-testid="blunder-continue"]').click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(400);
    return true;
  }

  /** Wait for a NEW coach move-committed checkpoint after `sinceTs`. */
  async function waitCoachReply(sinceTs, timeoutMs = COACH_REPLY_TIMEOUT_MS) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      await answerBlunderCard(); // card blocks the coach's reply until answered
      const entries = await dumpAudit();
      const hits = entries.filter((e) =>
        e.kind === 'coach-turn-checkpoint' &&
        typeof e.summary === 'string' && e.summary.startsWith('move-committed san=') &&
        (e.timestamp ?? 0) > sinceTs);
      if (hits.length > 0) {
        const latest = hits.reduce((a, b) => ((a.timestamp ?? 0) > (b.timestamp ?? 0) ? a : b));
        const san = /san=(\S+)/.exec(latest.summary)?.[1] ?? null;
        return { san, fen: latest.fen ?? null, ts: latest.timestamp ?? Date.now() };
      }
      await page.waitForTimeout(400);
    }
    return null;
  }

  async function clearFirstRunOverlays() {
    const consent = page.locator('[data-testid="ai-consent-modal"]');
    if (await consent.isVisible().catch(() => false)) {
      await page.locator('[data-testid="ai-consent-allow"]').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.isVisible().catch(() => false)) {
      await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => {});
      await calib.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
    }
    const help = page.locator('[data-testid="page-help-modal"]');
    if (await help.isVisible().catch(() => false)) {
      await page.locator('[data-testid="page-help-close"], [data-testid="page-help-modal"] button').first()
        .click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
    // The rating-harvest ask ("Enjoying Chess Academy Pro?") fires after a
    // student VICTORY and covers the review summary — runs 31379840616 /
    // 31481020131 / 31586907934 all failed "game-8-french: review walk never
    // mounted" because this modal sat over the Start button. Dismiss like a
    // player would (the X), never "Yes" (that routes toward the store ask).
    const harvest = page.locator('[data-testid="review-prompt"]');
    if (await harvest.isVisible().catch(() => false)) {
      await page.locator('[data-testid="review-prompt-close"]').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  /** Click-to-move (drag doesn't fire cleanly headless). */
  async function clickMove(m) {
    await page.locator(`[data-square="${m.from}"]`).first().click({ timeout: 3000, force: true });
    await page.waitForTimeout(180);
    await page.locator(`[data-square="${m.to}"]`).first().click({ timeout: 3000, force: true });
    if (m.promotion) {
      // Best-effort promotion pick (queen). react-chessboard renders a
      // promotion overlay; click the queen option if one appears.
      await page.waitForTimeout(300);
      const q = page.locator('[data-piece$="Q"], [data-testid*="promotion"]').first();
      if (await q.isVisible().catch(() => false)) await q.click({ timeout: 2000 }).catch(() => {});
    }
  }

  /** Pick the student's move: plan preference first, greedy policy after. */
  function chooseMove(chess, plan, studentPly) {
    const prefs = plan.prefs[studentPly] ?? null;
    if (prefs) {
      for (const san of prefs) {
        const legal = chess.moves({ verbose: true }).find((m) => m.san === san || m.san === `${san}+` || m.san === `${san}#`);
        if (legal) return legal;
      }
    }
    return pickStudentMove(chess, studentPly);
  }

  /** Drive the post-game review walk, interacting with every card. */
  async function driveReview(gameTag, pliesPlayed) {
    const review = { mounted: false, summarySeen: false, steps: 0, cards: { findShot: 0, rewind: 0, turningPoint: 0 }, badgeSeen: false, stalls: 0 };
    // Post-game lands on the SUMMARY card first (accuracy / chips / eval
    // graph) with a big green start-walk-btn that reads "Preparing…" while
    // the walk narration preps (5–60s), then "Start". Tap it when ready.
    review.summarySeen = await page.locator('[data-testid="coach-game-review"]')
      .waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false);
    if (review.summarySeen) await shot(`${gameTag}-summary`);
    const startBtn = page.locator('[data-testid="start-walk-btn"]');
    // 180s: cold-runner Stockfish contention can push walk prep past the old
    // 120s budget (run 30354871921 game-8-french: review "never mounted" —
    // prep simply outran the clock on a loaded runner). Record the last
    // observed button label so a genuine failure diagnoses itself.
    const prepDeadline = Date.now() + 180_000;
    while (Date.now() < prepDeadline) {
      if (await page.locator('[data-testid="coach-game-review-walk"]').isVisible().catch(() => false)) break;
      // The victory rating-harvest modal covers the Start button — clear it
      // (and any other first-run overlay) every pass so the click can land.
      await clearFirstRunOverlays();
      const label = (await startBtn.innerText().catch(() => '')).trim();
      if (label) review.lastPrepLabel = label;
      if (label === 'Start') { await startBtn.click({ timeout: 3000 }).catch(() => {}); break; }
      await page.waitForTimeout(1500);
    }
    const walkMounted = await page.locator('[data-testid="coach-game-review-walk"]')
      .waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
    review.mounted = walkMounted;
    if (!walkMounted) return review;
    await shot(`${gameTag}-review-start`);

    const maxSteps = pliesPlayed * 3 + 40; // sentence segments can outnumber plies
    let noProgress = 0;
    for (let i = 0; i < maxSteps; i++) {
      // Diagnostic cards take priority — they block/own the flow while open.
      if (await visible('review-find-shot-card')) {
        review.cards.findShot++;
        await page.locator('[data-testid="review-find-shot-hint"]').click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(800);
        if (await visible('review-find-shot-reveal')) {
          await page.locator('[data-testid="review-find-shot-continue"]').click({ timeout: 2000 }).catch(() => {});
        } else {
          await page.locator('[data-testid="review-find-shot-skip"]').click({ timeout: 2000 }).catch(() => {});
        }
        await page.waitForTimeout(400);
        continue;
      }
      if (await visible('review-rewind-card')) {
        review.cards.rewind++;
        // Decline — accepting hijacks the walk into a practice position.
        await page.locator('[data-testid="review-rewind-decline"]').click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
        continue;
      }
      if (await visible('review-turning-point-card')) {
        review.cards.turningPoint++;
        await page.locator('[data-testid^="turning-point-pick-"]').first().click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(800);
        await page.locator('[data-testid="review-turning-point-done"]').click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(400);
        continue;
      }
      if (!review.badgeSeen && await visible('review-classification-badge')) review.badgeSeen = true;

      const fwd = page.locator('[data-testid="review-forward-btn"]');
      if (!(await fwd.isVisible().catch(() => false))) break; // walk done / left
      const disabled = await fwd.isDisabled().catch(() => false);
      if (disabled) {
        noProgress++;
        if (noProgress > 25) { review.stalls++; break; } // narration segment stuck
        await page.waitForTimeout(700);
        continue;
      }
      noProgress = 0;
      await fwd.click({ timeout: 3000 }).catch(() => {});
      review.steps++;
      await page.waitForTimeout(450);
    }
    await shot(`${gameTag}-review-end`);
    return review;
  }

  // ── Boot once (context persists across games via SPA-reloads) ──────
  console.log('\n[full-games] booting app…');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6000);
  await clearFirstRunOverlays();

  // ── Engine warm-up (task #32): the FIRST-EVER load pays the Stockfish
  // variant probe — on a contended runner the multi-thread WASM build can
  // crashloop for minutes before the persisted fallback pins single-thread
  // (run 29232631772 game-1: 1,188 worker errors, dead coach). Real devices
  // pay this at most once per install; warm it here so the 10 games measure
  // GAMEPLAY, not the one-time probe. The underlying cold-boot bug stays
  // tracked (task #32) — this does not hide it, it scopes the standard.
  console.log('[full-games] engine warm-up (variant probe settle)…');
  await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await clearFirstRunOverlays();
  {
    const t0 = Date.now();
    let settled = false;
    while (Date.now() - t0 < 120_000) {
      const entries = await dumpAudit();
      if (entries.some((e) => e.kind === 'stockfish-variant-resolved' || e.kind === 'stockfish-variant-fallback')) {
        // Give a possible fallback re-init a moment to reach ready.
        await page.waitForTimeout(8000);
        settled = true;
        break;
      }
      await page.waitForTimeout(2000);
    }
    console.log(`[full-games] engine warm-up ${settled ? 'settled' : 'TIMED OUT (proceeding)'} in ${Math.round((Date.now() - t0) / 1000)}s`);
    // Warm-up page/worker errors belong to the probe, not the games.
    pageErrors.length = 0;
    consoleErrors.length = 0;
  }

  const results = [];

  for (let g = 0; g < GAMES; g++) {
    const activePlans = PLAN_FILTER.length ? PLANS.filter((p) => PLAN_FILTER.includes(p.name)) : PLANS;
    const plan = activePlans[g % activePlans.length];
    const tag = `game-${g + 1}-${plan.name}`;
    console.log(`\n[full-games] ── ${tag} (side=${plan.side}) ──`);
    const errsBefore = pageErrors.length;
    const consBefore = consoleErrors.length;

    // Capture the game's epoch BEFORE navigating: as Black the coach plays
    // its first move within ~1-2s of mount (fastpath), long before the
    // overlay-clearing + board-wait settle — capturing the epoch after the
    // settle filtered that checkpoint out and read as "coach never moved"
    // (the 2026-07-13 prod run failed all 5 black games exactly this way).
    const gameStartTs = Date.now();

    // `subject` tells the coach which opening to play (its book side), for
    // plans whose family identity depends on the coach's cooperation (Italian).
    const subjectQ = plan.subject ? `&subject=${encodeURIComponent(plan.subject)}` : '';
    // One retry, and NEVER let a transient prod-navigation hiccup crash the
    // whole run: run 31678116078 lost 8 games to a single 60s goto timeout on
    // game 2. A failed navigation fails THAT game and the loop moves on.
    let navOk = false;
    for (let attempt = 0; attempt < 2 && !navOk; attempt += 1) {
      navOk = await page.goto(`${BASE_URL}/coach/play?side=${plan.side}${subjectQ}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
        .then(() => true)
        .catch((e) => { console.log(`[full-games] ${tag}: goto attempt ${attempt + 1} failed — ${String(e).slice(0, 120)}`); return false; });
    }
    if (!navOk) {
      results.push({ tag, plan: plan.name, side: plan.side, error: 'navigation failed twice' });
      continue;
    }
    await page.waitForTimeout(4000);
    await clearFirstRunOverlays();
    const boardUp = await page.locator('[data-square="e4"]').first()
      .waitFor({ state: 'visible', timeout: 20_000 }).then(() => true).catch(() => false);
    if (!boardUp) {
      results.push({ tag, plan: plan.name, side: plan.side, error: 'board never mounted' });
      await shot(`${tag}-no-board`);
      continue;
    }

    const chess = new Chess();
    const blundersBefore = blunderCards;
    let lastTs = gameStartTs;
    let studentPly = 0;
    let terminal = null; // 'natural' | 'capResign' | error string
    let stalled = 0;

    // As Black the coach moves first — pick up its opening move. sinceTs =
    // the PRE-NAVIGATION epoch (older entries belong to previous games; the
    // coach's ~1-2s fastpath first move lands after it). 90s budget: the
    // run's first game pays Stockfish WASM boot on a cold shared runner.
    if (plan.side === 'black') {
      const first = await waitCoachReply(gameStartTs, 90_000);
      if (first?.san) { try { chess.move(first.san); lastTs = first.ts; } catch { /* fen fallback below */ } }
      if (first?.fen && chess.fen() !== first.fen) { try { chess.load(first.fen); } catch { /* keep mirror */ } }
      if (!first) { results.push({ tag, plan: plan.name, side: plan.side, error: 'coach never made the first move' }); continue; }
    }

    while (!chess.isGameOver() && chess.history().length < PLY_CAP) {
      await answerBlunderCard(); // never click through an open interception
      const m = chooseMove(chess, plan, studentPly);
      if (!m) break;
      await clickMove(m);
      // Confirm the student's move registered: the coach's reply checkpoint
      // (or terminal state) is the acknowledgment.
      const applied = chess.move(m.san);
      if (!applied) break;
      studentPly++;

      if (chess.isGameOver()) { terminal = 'natural'; break; }

      // Budget the coach's reply. The FIRST reply of any game gets the long
      // budget. The ENTIRE first game (g === 0) also runs on a wider per-reply
      // budget + one extra stall of grace: even with the engine warm-up, the
      // cold runner's first real Stockfish SEARCHES (not just the WASM boot)
      // spike past 30s mid-game under contention — run 29260208403 stall-
      // resigned game 1 at ply 12 that way, which then failed review+persist.
      // Warm games (g > 0) completed cleanly on the tight 30s budget.
      const replyBudget = studentPly <= 1 ? 90_000 : (g === 0 ? 75_000 : COACH_REPLY_TIMEOUT_MS);
      const reply = await waitCoachReply(lastTs, replyBudget);
      if (!reply?.san) {
        // A "stall" is often a MODAL, not latency: the AI-consent dialog
        // mounts at the first coach interaction — AFTER the fixed-point
        // overlay sweeps — and the coach cannot reply until it's allowed
        // (three straight nightlies stall-resigned game 1 at ply 3 this
        // way). Sweep overlays before spending a stall strike.
        await clearFirstRunOverlays();
        stalled++;
        // Verify via checkpoint FEN next round; after N stalls, resign to
        // finish (one extra stall of grace on the cold first game).
        if (stalled >= (g === 0 ? 3 : 2)) break;
        continue;
      }
      stalled = 0;
      lastTs = reply.ts;
      try {
        chess.move(reply.san.replace(/[+#]$/, ''));
      } catch {
        if (reply.fen) { try { chess.load(reply.fen); } catch { /* mirror hosed */ } }
      }
      if (reply.fen && chess.fen() !== reply.fen) { try { chess.load(reply.fen); } catch { /* keep */ } }
      if (chess.isGameOver()) { terminal = 'natural'; break; }
    }

    const plies = chess.history().length;
    if (!terminal) {
      // Ply cap or stall — resign so the game still ENDS and reviews.
      console.log(`[full-games] ${tag}: resigning at ply ${plies} (${stalled >= 2 ? 'stall' : 'ply cap'})`);
      await answerBlunderCard(); // an open card intercepts the resign click
      await page.locator('[data-testid="resign-btn"]').click({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="resign-yes"]').waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="resign-yes"]').click({ timeout: 4000 }).catch(() => {});
      terminal = stalled >= 2 ? `stallResign@${plies}` : `capResign@${plies}`;
    }

    // Game-over overlay → Review Game. The button fades in ~1.5s after the
    // overlay; auto-transition to postgame fires at 3.5s regardless — wait
    // for either affordance instead of sampling once.
    const skipBtn = page.locator('[data-testid="skip-to-review-btn"]');
    if (await skipBtn.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false)) {
      await skipBtn.click({ timeout: 3000 }).catch(() => {});
    }
    await shot(`${tag}-end`);

    // Detected opening (family) from the app's own audit trail — extracted
    // BEFORE the review walk. The in-page audit log is a 300-entry ROLLING
    // buffer (APP_AUDIT_LOG_MAX_ENTRIES); a long review walk (35-72 steps,
    // each logging several events) evicts every in-game entry, including all
    // `coach-opening-auto-detected` events. Runs 30354871921 / 30266621261
    // read the buffer post-review and got opening="null" on 7/10 games —
    // exactly the games with the biggest game+review event volume — and
    // failed distinctness on a phantom. Detection itself was fine (the app
    // emits a detect on every player move; the last one sits near the buffer
    // tail right here, before review floods it).
    const preReviewEntries = await dumpAudit();
    const detects = preReviewEntries.filter((e) => e.kind === 'coach-opening-auto-detected');
    const lastDetect = detects.length ? detects[detects.length - 1] : null;
    const openingName = lastDetect ? (/name="([^"]+)"/.exec(lastDetect.summary ?? '')?.[1] ?? null) : null;

    const review = await driveReview(tag, plies);

    const entries = await dumpAudit();

    // Persistence: the finished game must be in Dexie (source='coach').
    const persisted = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onerror = () => resolve(-1);
        req.onsuccess = () => {
          try {
            const db = req.result;
            const tx = db.transaction('games', 'readonly');
            const all = tx.objectStore('games').getAll();
            all.onsuccess = () => resolve(all.result.filter((r) => r.source === 'coach').length);
            all.onerror = () => resolve(-1);
          } catch { resolve(-1); }
        };
      });
    }).catch(() => -1);

    const voiceEvents = entries.filter((e) => e.kind === 'coach-narration-spoken' || e.kind === 'voice-speak-invoked').length;
    const gameErrors = pageErrors.slice(errsBefore);
    const gameConsole = consoleErrors.slice(consBefore).filter((t) => !isNoise(t));

    const rec = {
      tag, plan: plan.name, side: plan.side, plies, terminal,
      opening: openingName, review, coachGamesInDb: persisted,
      blunderInterceptions: blunderCards - blundersBefore,
      voiceEventsSoFar: voiceEvents,
      pageErrors: gameErrors, consoleErrors: gameConsole,
    };
    results.push(rec);
    console.log(`[full-games] ${tag}: ${plies} plies, end=${terminal}, opening="${openingName}", review: mounted=${review.mounted} steps=${review.steps} cards=${JSON.stringify(review.cards)}, blunderCards=${rec.blunderInterceptions}, coachGamesInDb=${persisted}, errs=${gameErrors.length}/${gameConsole.length}`);
  }

  // ── Verdict ─────────────────────────────────────────────────────────
  const failures = [];
  const completed = results.filter((r) => !r.error);
  if (completed.length < GAMES) failures.push(`${GAMES - completed.length} game(s) never completed: ${results.filter((r) => r.error).map((r) => `${r.tag}(${r.error})`).join(', ')}`);
  for (const r of completed) {
    // A sub-persist-floor stall game (< 6 plies) has no analysis to walk —
    // its walk prep never produces segments, so only require the walk for
    // games with a real move history.
    if (!r.review?.mounted && (r.plies ?? 0) >= 6) failures.push(`${r.tag}: review walk never mounted`);
    if ((r.plies ?? 0) >= 6 && r.coachGamesInDb === 0) failures.push(`${r.tag}: finished game not persisted to Dexie`);
    for (const e of r.pageErrors ?? []) failures.push(`${r.tag}: pageerror: ${e}`);
    for (const e of r.consoleErrors ?? []) failures.push(`${r.tag}: console.error: ${e}`);
  }
  const openings = completed.map((r) => r.opening).filter(Boolean);
  const distinct = new Set(openings.map((o) => o.split(':')[0].trim()));
  if (distinct.size < completed.length) {
    failures.push(`openings not all distinct: ${completed.length} games → ${distinct.size} families (${[...distinct].join(' | ')})`);
  }
  const capResigns = completed.filter((r) => String(r.terminal).startsWith('capResign') || String(r.terminal).startsWith('stallResign'));
  if (capResigns.length > 0) console.log(`[full-games] NOTE: ${capResigns.length} game(s) ended by cap/stall resign: ${capResigns.map((r) => `${r.tag}=${r.terminal}`).join(', ')}`);

  const report = { base: BASE_URL, startedAt: stamp, games: results, distinctOpenings: [...distinct], failures };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(`\n[full-games] DONE — ${completed.length}/${GAMES} games, ${distinct.size} distinct opening families`);
  console.log(`[full-games] openings: ${[...distinct].join(' | ')}`);
  if (failures.length) {
    console.log(`[full-games] ${failures.length} FAILURE(S):`);
    failures.forEach((f) => console.log(`   ✗ ${f}`));
  } else {
    console.log('[full-games] all contracts green ✓');
  }
  console.log(`[full-games] report: ${OUT_DIR}/report.json`);

  await browser.close();
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
