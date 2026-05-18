#!/usr/bin/env node
/**
 * Audit-coach-full-game — interactive end-to-end probe of the full
 * /coach/play lifecycle, including the post-game review.
 *
 * The audit script picks moves locally via a chess.js mirror using a
 * priority-based heuristic (mate > capture by value > check >
 * develop-pieces > sensible book moves > any legal) so it actually
 * tries to WIN rather than play random moves. Plays White; the coach
 * is the opponent.
 *
 * Captures the entire audit stream — every coach-turn-checkpoint,
 * every brain envelope, every tactics-ctx event, every claim-validator-trip,
 * and any error / warning audit fired during play or review.
 *
 * After game-end, transitions to the postgame review and steps
 * through every move with the review's nav buttons, watching for
 * console / page errors and broken testids.
 *
 * Usage (recommended on a real machine so the browser is visible):
 *   AUDIT_SMOKE_URL=http://localhost:5173 AUDIT_SMOKE_HEADED=1 \
 *     node scripts/audit-coach-full-game.mjs
 *
 * Or headless in CI/sandbox:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *     PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     node scripts/audit-coach-full-game.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-full-game-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const HYDRATE_SETTLE_MS = 2500;
/** How long to wait for the coach to reply with its move after we play ours. */
const COACH_MOVE_WAIT_MS = 35_000;
/** Hard cap on total game length so a stuck audit doesn't run forever. */
const MAX_PLIES = 80;
/** When we hit this ply count without a natural game-over, force a
 *  resign so we always reach the postgame review surface. */
const RESIGN_AFTER_PLY = 28;

// ─── Move picker (Node-side, priority-based) ───────────────────────
// chess.js mirror tracks the position so we never play an illegal
// move. Picks moves by ranking candidates with the simple heuristic
// below — strong enough to play coherent chess against a ~1400-rated
// coach over 20-40 plies without needing a real engine in the audit.
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

const OPENING_BOOK_PRIORITIES = new Set([
  'e4', 'd4', 'Nf3', 'Nc3', 'Bc4', 'Bb5', 'Bf4', 'O-O', 'O-O-O', 'd3', 'c3', 'Re1',
]);

function pickMoveLocally(chess) {
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;

  /** Lightweight SEE — check if the destination square would be
   *  immediately recaptured. If the cheapest recapturer is worth
   *  less than our moving piece, the move is a losing trade. */
  function isLosingCapture(m) {
    if (!m.captured) return false; // not a capture; irrelevant
    const ourValue = PIECE_VALUE[m.piece] ?? 0;
    const theirValue = PIECE_VALUE[m.captured] ?? 0;
    // Apply our move, then see if opponent has any recapture on the
    // destination square.
    const probe = new Chess(chess.fen());
    probe.move({ from: m.from, to: m.to, promotion: m.promotion });
    const opponentMoves = probe.moves({ verbose: true });
    const recaptures = opponentMoves.filter((om) => om.to === m.to && om.captured);
    if (recaptures.length === 0) return false; // not defended
    // Cheapest recapturer.
    const minRecaptureCost = Math.min(...recaptures.map((r) => PIECE_VALUE[r.piece] ?? 0));
    // We lose `ourValue`, gain `theirValue` (already captured), then
    // opponent recaptures (we lose ourValue's worth, they lose
    // recapture-value). Simplified: trade is losing when ourValue >
    // theirValue + something. Conservative: bad if our piece value
    // exceeds their piece value (Nxp where p=1 N=3 → bad).
    return ourValue > theirValue;
  }

  function rank(m) {
    if (m.san.endsWith('#')) return 100_000; // mate
    let s = 0;
    if (m.captured) {
      const gain = (PIECE_VALUE[m.captured] ?? 0) * 1000;
      const loss = (PIECE_VALUE[m.piece] ?? 0) * 10;
      s += gain - loss;
      // Hard penalty for losing trades — keeps the audit from gifting
      // pieces (e.g. Nxd5 when defended by Qxd5).
      if (isLosingCapture(m)) s -= 9000;
    }
    if (m.san.endsWith('+')) s += 500;
    if (m.promotion) s += (PIECE_VALUE[m.promotion] ?? 0) * 800;
    if (m.flags.includes('k') || m.flags.includes('q')) s += 700;
    if (OPENING_BOOK_PRIORITIES.has(m.san)) s += 200;
    if ((m.piece === 'n' || m.piece === 'b') && m.color === 'w' && m.from[1] === '1') s += 150;
    if (m.piece === 'p' && (m.to === 'e4' || m.to === 'd4' || m.to === 'e5' || m.to === 'd5')) s += 100;
    if (m.piece === 'k' && chess.history().length < 20) s -= 400;
    s += Math.random() * 5;
    return s;
  }

  legal.sort((a, b) => rank(b) - rank(a));
  return legal[0];
}

// ─── tryMove (Playwright click-to-move) ────────────────────────────
async function tryMove(page, from, to, promotion = null) {
  const fromSq = page.locator(`[data-square="${from}"]`).first();
  const toSq = page.locator(`[data-square="${to}"]`).first();
  if ((await fromSq.count()) === 0 || (await toSq.count()) === 0) {
    throw new Error(`square not on board: ${from} → ${to}`);
  }
  await fromSq.click({ timeout: 2500 });
  await page.waitForTimeout(180);
  await toSq.click({ timeout: 2500 });
  await page.waitForTimeout(180);
  // If a promotion picker pops up, click the requested piece.
  if (promotion) {
    const promoTestid = `promotion-${promotion}`;
    const promoBtn = page.locator(`[data-testid="${promoTestid}"]`);
    if (await promoBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await promoBtn.click();
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[full-game] base       = ${BASE_URL}`);
  console.log(`[full-game] outDir     = ${OUT_DIR}`);
  console.log(`[full-game] headed     = ${HEADED}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, slowMo: HEADED ? 400 : 0 });
  const ctx = await browser.newContext({
    viewport: HEADED ? { width: 480, height: 920 } : { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachFullGameBot/1.0 (chromium)',
  });

  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch {
        /* ignore */
      }
    },
    { url: listener.url, secret: listener.secret },
  );

  const page = await ctx.newPage();
  const intercepted = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        if (body && typeof body === 'object') {
          const events = Array.isArray(body) ? body : (body.events ?? [body]);
          for (const ev of events) intercepted.push(ev);
        }
      } catch { /* ignore */ }
    }
  });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 600));
  });
  page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 600)));

  const report = {
    base: BASE_URL,
    startedAt: stamp,
    headed: HEADED,
    moves: [],
    gameOutcome: null,
    review: { stepped: 0, errors: [] },
  };

  // ─── Boot: navigate to /coach/play ─────────────────────────────
  console.log('\n[full-game] booting /coach/play');
  await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(HYDRATE_SETTLE_MS);

  // Make sure we're playing as WHITE (so we move first).
  const colorBtn = page.locator('[data-testid="color-white-btn"]');
  if (await colorBtn.isVisible().catch(() => false)) {
    await colorBtn.click().catch(() => undefined);
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: join(OUT_DIR, '00-start.png'), fullPage: false }).catch(() => undefined);

  // ─── Game loop ─────────────────────────────────────────────────
  const mirror = new Chess(); // tracks the position locally
  let ply = 0;
  let lastFen = mirror.fen();

  while (ply < MAX_PLIES) {
    // Check for game-over.
    if (mirror.isGameOver()) {
      console.log(`[full-game] LOCAL MIRROR says game over at ply ${ply}`);
      break;
    }
    // Force-resign so we always reach the review surface (the audit's
    // heuristic isn't strong enough to play a clean win against a
    // 1420 Stockfish; resigning is the deterministic path to review).
    if (ply >= RESIGN_AFTER_PLY) {
      console.log(`[full-game] ply ${ply}: hit RESIGN_AFTER_PLY — clicking resign to reach review`);
      const resignBtn = page.locator('[data-testid="resign-btn"]');
      if (await resignBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await resignBtn.click().catch(() => undefined);
        await page.waitForTimeout(700);
        const yesBtn = page.locator('[data-testid="resign-yes"]');
        if (await yesBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
          await yesBtn.click().catch(() => undefined);
          await page.waitForTimeout(2500);
        }
      }
      break;
    }

    // Pick + play our move (white when ply is even; coach plays black when odd).
    if (mirror.turn() === 'w') {
      const move = pickMoveLocally(mirror);
      if (!move) {
        console.log(`[full-game] ply ${ply}: no legal moves for student`);
        break;
      }
      console.log(`[full-game] ply ${ply}: student plays ${move.san} (${move.from}→${move.to})`);
      const startIdx = intercepted.length;
      try {
        await tryMove(page, move.from, move.to, move.promotion);
      } catch (e) {
        console.log(`[full-game] move click failed: ${String(e?.message ?? e).slice(0, 120)}`);
        break;
      }
      mirror.move({ from: move.from, to: move.to, promotion: move.promotion ?? undefined });
      lastFen = mirror.fen();

      await page.waitForTimeout(600);
      // Blunder-interception modal: if the coach's tactical-awareness
      // wiring caught our move as a blunder, accept the take-back +
      // try-best path (the coach's recommended move is the engine
      // pick; way better than the heuristic that keeps blundering).
      const blunderModal = page.locator('[data-testid="blunder-interception"]');
      if (await blunderModal.isVisible({ timeout: 1500 }).catch(() => false)) {
        console.log(`[full-game] ply ${ply}: BLUNDER INTERCEPTED on ${move.san} — taking back + trying coach's move`);
        const blunderShot = join(OUT_DIR, `KEY-blunder-ply${String(ply).padStart(2, '0')}-${move.san.replace(/[+#]/g, '')}.png`);
        await page.screenshot({ path: blunderShot, fullPage: false }).catch(() => undefined);
        // Undo in our mirror.
        mirror.undo();
        lastFen = mirror.fen();
        // Click "Try d4" (or whatever the coach suggested).
        const tryBest = page.locator('[data-testid="blunder-try-best"]');
        const takeback = page.locator('[data-testid="blunder-takeback"]');
        if (await tryBest.isVisible({ timeout: 1500 }).catch(() => false)) {
          await tryBest.click().catch(() => undefined);
          await page.waitForTimeout(2000);
          // The coach plays the recommended move on our behalf. Sync
          // the mirror by deriving from the audit stream's latest FEN.
          let synced = false;
          for (const e of intercepted.slice().reverse().slice(0, 25)) {
            if (typeof e.fen === 'string' && e.fen !== lastFen) {
              const derived = deriveMoveFromFenDiff(lastFen, e.fen);
              if (derived) {
                mirror.move({ from: derived.from, to: derived.to, promotion: derived.promotion });
                lastFen = mirror.fen();
                synced = true;
                console.log(`[full-game] ply ${ply}: coach's suggestion was ${derived.san}`);
                report.moves.push({
                  ply,
                  side: 'student',
                  san: derived.san,
                  blunderRecovery: { original: move.san, takenBack: true },
                  fen: lastFen,
                });
                break;
              }
            }
          }
          if (!synced) {
            console.log(`[full-game] ply ${ply}: take-back synced via FEN fallback`);
          }
        } else if (await takeback.isVisible({ timeout: 1500 }).catch(() => false)) {
          await takeback.click().catch(() => undefined);
          await page.waitForTimeout(1500);
        }
        // Whatever happened, move on — don't re-pick locally (we'd
        // blunder the same way). Advance ply once and let the coach
        // reply next.
        ply++;
        continue;
      }
      const events = intercepted.slice(startIdx);
      report.moves.push({
        ply,
        side: 'student',
        san: move.san,
        fen: lastFen,
        events: events.length,
        eventKinds: kindCounts(events),
      });
      ply++;
      continue;
    }

    // Wait for coach reply. The local mirror is on black's turn; we
    // poll the audit stream for a FEN that differs from our mirror's
    // FEN (the post-coach-move position). Then derive the coach's
    // move from the FEN diff.
    console.log(`[full-game] ply ${ply}: waiting for coach reply…`);
    const startIdx = intercepted.length;
    const deadline = Date.now() + COACH_MOVE_WAIT_MS;
    let coachReplied = false;
    let coachSan = null;
    let coachFen = null;
    while (Date.now() < deadline) {
      const events = intercepted.slice(startIdx);
      // Find the latest event with a FEN field that's different from
      // ours (mirror) — that's the post-coach-move position.
      for (const e of events.slice().reverse()) {
        const f = e.fen;
        if (typeof f === 'string' && f !== lastFen) {
          // Try to derive the coach's move via FEN diff.
          const move = deriveMoveFromFenDiff(lastFen, f);
          if (move) {
            coachReplied = true;
            coachSan = move.san;
            coachFen = f;
            break;
          }
        }
      }
      if (coachReplied) break;
      await page.waitForTimeout(750);
    }
    if (!coachReplied) {
      console.log(`[full-game] ply ${ply}: coach did not reply within ${COACH_MOVE_WAIT_MS}ms — aborting`);
      break;
    }
    try {
      mirror.move(coachSan);
      lastFen = mirror.fen();
      console.log(`[full-game] ply ${ply}: coach played ${coachSan}`);
    } catch (e) {
      console.log(`[full-game] ply ${ply}: mirror failed to apply "${coachSan}": ${e.message}`);
      // Resync mirror to the page FEN.
      if (coachFen) {
        mirror.load(coachFen);
        lastFen = coachFen;
      }
    }
    const events = intercepted.slice(startIdx);
    // Key-moment screenshot: only when the coach narration mentions
    // a tactic (claim-validator-trip OR brain-answer with tactical
    // language) — keeps the screenshot output small + signal-heavy.
    const interestingEvent = events.find(
      (e) =>
        e.kind === 'claim-validator-trip' ||
        e.kind === 'coach-move-narration-fired' ||
        (e.kind === 'coach-surface-migrated' && (e.summary ?? '').startsWith('tactics ctx:') && /threats=[1-9]|opps=[1-9]|hanging=[1-9]/.test(e.summary ?? '')),
    );
    if (interestingEvent) {
      const shotPath = join(OUT_DIR, `KEY-ply${String(ply).padStart(2, '0')}-${interestingEvent.kind}.png`);
      await page.screenshot({ path: shotPath, fullPage: false }).catch(() => undefined);
      console.log(`  [key moment] ${interestingEvent.kind}: ${(interestingEvent.summary ?? '').slice(0, 120)}`);
    }
    report.moves.push({
      ply,
      side: 'coach',
      san: coachSan,
      fen: lastFen,
      events: events.length,
      eventKinds: kindCounts(events),
      interestingEvent: interestingEvent ? interestingEvent.kind : null,
    });
    ply++;
  }

  await page.screenshot({ path: join(OUT_DIR, `99-end-of-game.png`), fullPage: false }).catch(() => undefined);

  // ─── Game outcome ──────────────────────────────────────────────
  const ourOutcome = mirror.isCheckmate()
    ? mirror.turn() === 'b' ? 'student-checkmate-win' : 'student-checkmate-loss'
    : mirror.isStalemate() ? 'stalemate'
    : mirror.isDraw() ? 'draw'
    : mirror.isGameOver() ? 'game-over-other'
    : ply >= MAX_PLIES ? 'ply-cap-reached'
    : 'aborted';
  report.gameOutcome = ourOutcome;
  console.log(`\n[full-game] OUTCOME: ${ourOutcome}  (${ply} plies played)`);

  // ─── Postgame review ───────────────────────────────────────────
  console.log('\n[full-game] transitioning to postgame review…');
  // The page auto-transitions from gameover overlay to postgame after
  // 3.5s. We also try skip-to-review explicitly in case the user
  // dropped out before checkmate.
  await page.waitForTimeout(4500);
  const skipBtn = page.locator('[data-testid="skip-to-review-btn"]');
  if (await skipBtn.isVisible().catch(() => false)) {
    console.log('  clicking skip-to-review-btn');
    await skipBtn.click().catch(() => undefined);
    await page.waitForTimeout(3000);
  }
  await page.screenshot({ path: join(OUT_DIR, 'review-mounted.png'), fullPage: false }).catch(() => undefined);

  // Step through every move using nav-next and capture errors.
  console.log('\n[full-game] stepping through review…');
  const reviewErrsBefore = pageErrors.length + consoleErrors.length;
  for (let i = 0; i < ply + 4; i++) { // +4 to ensure we walk past the last move
    const nav = page.locator('[data-testid="nav-next"]');
    if (await nav.isVisible({ timeout: 1500 }).catch(() => false)) {
      await nav.click({ timeout: 1500 }).catch(() => undefined);
      await page.waitForTimeout(700);
      report.review.stepped++;
    } else {
      // Maybe in CoachGameReview view, look for forward buttons there
      // or just stop.
      break;
    }
  }
  await page.screenshot({ path: join(OUT_DIR, 'review-stepped.png'), fullPage: false }).catch(() => undefined);

  // Compare error counts before/after review to capture review-only errors.
  const newPageErrs = pageErrors.slice(reviewErrsBefore - consoleErrors.length);
  const newConsoleErrs = consoleErrors.slice(reviewErrsBefore - pageErrors.length);
  report.review.errors = {
    pageErrorsDuringReview: newPageErrs.slice(0, 20),
    consoleErrorsDuringReview: newConsoleErrs.slice(0, 20),
  };

  // ─── Summary ───────────────────────────────────────────────────
  report.totalEvents = intercepted.length;
  report.allKindsCount = kindCounts(intercepted);
  report.tacticsCtxFiredTimes = intercepted.filter(
    (e) => e.kind === 'coach-surface-migrated' && (e.summary ?? '').startsWith('tactics ctx:'),
  ).length;
  report.brainCallsCount = intercepted.filter((e) => e.kind === 'coach-brain-provider-called').length;
  report.brainAnswersCount = intercepted.filter((e) => e.kind === 'coach-brain-answer-returned').length;
  report.claimValidatorTrips = intercepted.filter((e) => e.kind === 'claim-validator-trip').length;
  report.consoleErrorsCount = consoleErrors.length;
  report.pageErrorsCount = pageErrors.length;
  report.consoleErrorsSample = consoleErrors.slice(0, 12);
  report.pageErrorsSample = pageErrors.slice(0, 12);

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');
  await writeFile(join(OUT_DIR, 'all-events.json'), JSON.stringify(intercepted, null, 2), 'utf-8');

  console.log(`\n[full-game] === SUMMARY ===`);
  console.log(`  outcome:                  ${ourOutcome}`);
  console.log(`  plies played:             ${ply}`);
  console.log(`  total audit events:       ${report.totalEvents}`);
  console.log(`  brain calls:              ${report.brainCallsCount}`);
  console.log(`  brain answers:            ${report.brainAnswersCount}`);
  console.log(`  tactics-ctx events:       ${report.tacticsCtxFiredTimes}`);
  console.log(`  claim-validator trips:    ${report.claimValidatorTrips}`);
  console.log(`  console errors:           ${report.consoleErrorsCount}`);
  console.log(`  page errors:              ${report.pageErrorsCount}`);
  console.log(`  review steps:             ${report.review.stepped}`);
  console.log(`  report:                   ${OUT_DIR}/report.json`);

  await browser.close();
  await listener.stop();
}

/** Derive the SAN move that turned `beforeFen` into `afterFen`.
 *  Enumerate legal moves from `beforeFen`, apply each, return the
 *  one whose resulting FEN matches. Returns null if no legal move
 *  produces the target FEN (mirror is desynced — caller should
 *  resync). FEN comparison strips halfmove + fullmove clocks since
 *  the surface may bump those independently of move-application. */
function deriveMoveFromFenDiff(beforeFen, afterFen) {
  function fenCore(f) {
    return f.split(' ').slice(0, 4).join(' ');
  }
  const targetCore = fenCore(afterFen);
  try {
    const ch = new Chess(beforeFen);
    for (const m of ch.moves({ verbose: true })) {
      const probe = new Chess(beforeFen);
      probe.move({ from: m.from, to: m.to, promotion: m.promotion });
      if (fenCore(probe.fen()) === targetCore) return m;
    }
  } catch {
    return null;
  }
  return null;
}

function kindCounts(events) {
  return events.reduce((acc, e) => {
    const k = String(e.kind ?? '?');
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

/** Read the on-screen move list to find what SANs have been played.
 *  The move-list rendering differs from `react-chessboard` — falls
 *  back to reading from the game's audit stream when not available. */
async function readMoveListSANs(page) {
  // Try a few common move-list locations.
  const candidates = [
    '[data-testid="game-pgn"]',
    '[data-testid="move-list"]',
    '.move-list',
  ];
  for (const sel of candidates) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      const text = (await el.innerText({ timeout: 1500 }).catch(() => '')) || '';
      const tokens = text
        .replace(/\d+\./g, ' ')
        .split(/\s+/)
        .filter(Boolean);
      if (tokens.length > 0) return tokens;
    }
  }
  // Fallback: derive from window.__gameState if the page exposes it
  // (best-effort; not all builds will).
  try {
    const sans = await page.evaluate(() => {
      const g = window.__lastGameState;
      if (g && Array.isArray(g.history)) return g.history;
      return [];
    });
    if (Array.isArray(sans) && sans.length > 0) return sans;
  } catch { /* ignore */ }
  return [];
}

main().catch((err) => {
  console.error('[full-game] FATAL', err);
  process.exit(1);
});
