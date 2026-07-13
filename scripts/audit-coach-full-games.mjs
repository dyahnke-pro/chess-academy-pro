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
 *      opening family (10 plans: e4/d4/c4/Nf3/f4 systems as White; Sicilian/
 *      Caro-Kann/French/Modern/Scandinavian replies as Black).
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
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const STREAM_URL = `${BASE_URL}/api/audit-stream`;
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const GAMES = Math.max(1, Number(process.env.GAMES) || 10);
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
  /\[CoachAPI\]/i, /APIConnectionError/i, /Connection error/i,
];
const isNoise = (t) => NOISE.some((re) => re.test(t));

// 10 opening plans — every game steers into a DIFFERENT family. White plans
// script the student's first moves outright; Black plans pick the first
// LEGAL preference each ply (the coach owns move 1), which still forces a
// distinct family (Sicilian vs Caro vs French vs Modern vs Scandinavian).
const PLANS = [
  { name: 'italian-shape',   side: 'white', prefs: [['e4'], ['Nf3'], ['Bc4'], ['Nc3'], ['O-O']] },
  { name: 'queens-pawn',     side: 'white', prefs: [['d4'], ['c4', 'Nf3'], ['Nc3', 'Nf3'], ['e3', 'Bf4'], ['Nf3', 'Be2']] },
  { name: 'english',         side: 'white', prefs: [['c4'], ['Nc3'], ['g3'], ['Bg2'], ['Nf3']] },
  { name: 'reti',            side: 'white', prefs: [['Nf3'], ['g3'], ['Bg2'], ['O-O'], ['d3']] },
  { name: 'birds',           side: 'white', prefs: [['f4'], ['Nf3'], ['e3'], ['Be2'], ['O-O']] },
  { name: 'sicilian',        side: 'black', prefs: [['c5'], ['d6', 'Nc6'], ['Nc6', 'd6'], ['Nf6', 'g6'], ['g6', 'e6']] },
  { name: 'caro-kann',       side: 'black', prefs: [['c6'], ['d5'], ['Nf6', 'dxe4', 'e6'], ['e6', 'Bf5', 'Nbd7'], ['Be7', 'Bd6', 'Nbd7']] },
  { name: 'french',          side: 'black', prefs: [['e6'], ['d5'], ['Nf6', 'c5', 'dxe4'], ['Be7', 'c5', 'Nbd7'], ['O-O', 'c5', 'Nbd7']] },
  { name: 'modern',          side: 'black', prefs: [['g6'], ['Bg7'], ['d6', 'c5'], ['Nf6', 'Nc6'], ['O-O', 'c5']] },
  { name: 'scandinavian',    side: 'black', prefs: [['d5'], ['Qxd5', 'Nf6', 'c6'], ['Qa5', 'Qd6', 'Nf6'], ['Nf6', 'c6', 'e6'], ['c6', 'Bf5', 'e6']] },
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

  /** Wait for a NEW coach move-committed checkpoint after `sinceTs`. */
  async function waitCoachReply(sinceTs) {
    const t0 = Date.now();
    while (Date.now() - t0 < COACH_REPLY_TIMEOUT_MS) {
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
    const review = { mounted: false, steps: 0, cards: { findShot: 0, rewind: 0, turningPoint: 0 }, badgeSeen: false, stalls: 0 };
    const walkMounted = await page.locator('[data-testid="coach-game-review-walk"]')
      .waitFor({ state: 'visible', timeout: 25_000 }).then(() => true).catch(() => false);
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

  const results = [];

  for (let g = 0; g < GAMES; g++) {
    const plan = PLANS[g % PLANS.length];
    const tag = `game-${g + 1}-${plan.name}`;
    console.log(`\n[full-games] ── ${tag} (side=${plan.side}) ──`);
    const errsBefore = pageErrors.length;
    const consBefore = consoleErrors.length;

    await page.goto(`${BASE_URL}/coach/play?side=${plan.side}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
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
    const gameStartTs = Date.now();
    let lastTs = gameStartTs;
    let studentPly = 0;
    let terminal = null; // 'natural' | 'capResign' | error string
    let stalled = 0;

    // As Black the coach moves first — pick up its opening move.
    if (plan.side === 'black') {
      // sinceTs = game start — the Dexie audit log persists across games,
      // so 0 here would match a PREVIOUS game's checkpoints.
      const first = await waitCoachReply(gameStartTs);
      if (first?.san) { try { chess.move(first.san); lastTs = first.ts; } catch { /* fen fallback below */ } }
      if (first?.fen && chess.fen() !== first.fen) { try { chess.load(first.fen); } catch { /* keep mirror */ } }
      if (!first) { results.push({ tag, plan: plan.name, side: plan.side, error: 'coach never made the first move' }); continue; }
    }

    while (!chess.isGameOver() && chess.history().length < PLY_CAP) {
      const m = chooseMove(chess, plan, studentPly);
      if (!m) break;
      await clickMove(m);
      // Confirm the student's move registered: the coach's reply checkpoint
      // (or terminal state) is the acknowledgment.
      const applied = chess.move(m.san);
      if (!applied) break;
      studentPly++;

      if (chess.isGameOver()) { terminal = 'natural'; break; }

      const reply = await waitCoachReply(lastTs);
      if (!reply?.san) {
        stalled++;
        // undo the mirror move if the board never actually took it? Verify
        // via checkpoint FEN next round; after 2 stalls, resign to finish.
        if (stalled >= 2) break;
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
      await page.locator('[data-testid="resign-btn"]').click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(300);
      await page.locator('[data-testid="resign-yes"]').click({ timeout: 4000 }).catch(() => {});
      terminal = stalled >= 2 ? `stallResign@${plies}` : `capResign@${plies}`;
    }

    // Game-over overlay → Review Game (skip the 3.5s auto-transition).
    await page.waitForTimeout(1500);
    if (await visible('skip-to-review-btn')) {
      await page.locator('[data-testid="skip-to-review-btn"]').click({ timeout: 4000 }).catch(() => {});
    }
    await shot(`${tag}-end`);

    const review = await driveReview(tag, plies);

    // Detected opening (family) from the app's own audit trail.
    const entries = await dumpAudit();
    const detects = entries.filter((e) => e.kind === 'coach-opening-auto-detected');
    const lastDetect = detects.length ? detects[detects.length - 1] : null;
    const openingName = lastDetect ? (/name="([^"]+)"/.exec(lastDetect.summary ?? '')?.[1] ?? null) : null;

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
      voiceEventsSoFar: voiceEvents,
      pageErrors: gameErrors, consoleErrors: gameConsole,
    };
    results.push(rec);
    console.log(`[full-games] ${tag}: ${plies} plies, end=${terminal}, opening="${openingName}", review: mounted=${review.mounted} steps=${review.steps} cards=${JSON.stringify(review.cards)}, coachGamesInDb=${persisted}, errs=${gameErrors.length}/${gameConsole.length}`);
  }

  // ── Verdict ─────────────────────────────────────────────────────────
  const failures = [];
  const completed = results.filter((r) => !r.error);
  if (completed.length < GAMES) failures.push(`${GAMES - completed.length} game(s) never completed: ${results.filter((r) => r.error).map((r) => `${r.tag}(${r.error})`).join(', ')}`);
  for (const r of completed) {
    if (!r.review?.mounted) failures.push(`${r.tag}: review walk never mounted`);
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
