import { Capacitor } from '@capacitor/core';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine, resolveWorkerUrl, isIosSafari } from './stockfishEngine';
import { computeWeaknessProfile } from './weaknessAnalyzer';
import { generateMistakePuzzlesFromGame } from './mistakePuzzleService';
import { isBookLine } from './openingDetectionService';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { detectBadHabitsFromGame } from './coachFeatureService';
import { classifyTacticsFromGame } from './tacticClassifierService';
import { useAppStore } from '../stores/appStore';
import { logAppAudit } from './appAuditor';
import type { GameRecord, MoveAnnotation, MoveClassification, StockfishAnalysis, UserProfile } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BatchAnalysisProgress {
  currentGame: number;
  totalGames: number;
  currentGameName: string;
  phase: 'analyzing' | 'computing_weaknesses' | 'done';
}

// ─── Constants ──────────────────────────────────────────────────────────────

// Per-move eval-curve depth. Raised 12→16 (David 2026-06-27) after a real
// game read 87% in-app vs 83.5% on chess.com: depth 12 missed the punishment
// of dubious moves, so cp-loss was under-counted and accuracy rounded HIGH.
// The accuracy FORMULA already matches chess.com's published model
// (accuracyService) — eval QUALITY (depth) was the gap. Bumping this stamps
// `analysisDepth` on each game; `gameNeedsAnalysis` re-analyzes anything below
// it, so existing depth-12 games refresh to the deeper number once.
export const ANALYSIS_DEPTH = 16;
/** Depth for the BEST MOVE on a slip — deliberately deeper than any eval depth
 *  and the ONE place the extra plies are load-bearing. This move becomes the
 *  SOLUTION to a mistake drill the student is graded against, so a shallow
 *  answer does not read as a slightly-off eval, it teaches the wrong move. Every
 *  other consumer wants a verdict, which is settled far shallower (see
 *  REVIEW_DEEP_DEPTH). Do not alias the two together again. */
export const BEST_MOVE_DEPTH = 18;
// BLUNDER_CP / MISTAKE_CP / INACCURACY_CP moved to `engineConstants` (imported
// below). They were duplicated in `moveRating` with DIFFERENT numbers, so the
// same Stockfish delta produced a different word in the review than in the
// coach's mouth. One home, one meaning.
/**
 * How many Stockfish engines to run in parallel for batch analysis.
 *
 * Each worker is a full WASM engine. On a desktop browser (8+ cores) running
 * 6 is smooth — which is why the web app never glitches. On a PHONE (Capacitor
 * WKWebView, 4-6 thermally-limited cores, less RAM) 6 concurrent engines
 * saturate the CPU and starve the main thread, so the whole app goes
 * glitchy / slow / frozen while analysis runs — and analysis runs right after
 * importing a big game library (David 2026-06-06: "the APP is frozen", web is
 * fine). Cap hard on native so the UI always keeps a couple of cores free.
 */
/** Cores assumed for a PHONE when the browser hides the count. iOS Safari and
 *  the Capacitor WKWebView do NOT expose `navigator.hardwareConcurrency`
 *  (fingerprinting policy), so it reads `undefined` on every iPhone. Every
 *  iPhone since the 6s has 6 cores (2 performance + 4 efficiency). */
const PHONE_ASSUMED_CORES = 6;
/** Hard cap on phone pool width. One asm.js engine per core, minus two cores
 *  kept free for the UI thread, voice playback and the coach's singleton
 *  engine. Memory is NOT the limit (~45MB per asm worker); a 5th engine
 *  time-slices with the others and thermally throttles ALL of them — the
 *  "hot phone" of the e1534fc era. (David 2026-09-05: "how many bots can we
 *  add?" — four.) */
const PHONE_POOL_CAP = 4;

function resolveWorkerPoolSize(): number {
  const reportedCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency > 0
    ? navigator.hardwareConcurrency
    : undefined;
  let isNative = false;
  try { isNative = Capacitor.isNativePlatform(); } catch { /* web */ }
  // A PHONE is a phone whether it's the native app OR mobile-web Safari.
  // `isNativePlatform()` is FALSE in Safari, so mobile-web iOS was falling into
  // the desktop branch below and getting a pool of up to 6 asm.js engines —
  // each a heavy ~1.6MB module with its own WASM/asm heap. On an iPhone that
  // OOMs / thrashes, and the workers wedge and respawn without ever finishing a
  // game (David 2026-09-05, testing on iPhone Safari: `/weaknesses` spawned a
  // 3-worker asm pool that respawned with zero completions). `isIosSafari()`
  // catches the mobile-web iOS that `isNativePlatform()` misses.
  // try/catch, like Capacitor.isNativePlatform() above: WORKER_POOL_SIZE is a
  // top-level const, so this runs at module load. A partial test mock of
  // './stockfishEngine' that omits isIosSafari makes vitest THROW on the access
  // (its mock proxy rejects undefined exports rather than returning undefined),
  // which a `typeof` guard cannot prevent — the throw is on the binding access.
  // In real code the import is always present, so behavior is unchanged; a mock
  // without it simply reads as "not mobile web".
  let isMobileWeb = false;
  try { isMobileWeb = isIosSafari(); } catch { /* partial mock without the export */ }
  if (isNative || isMobileWeb) {
    // 🔒 PHONE (native iOS/Android + mobile-web iOS): a 4-worker asm.js pool.
    // Capped so the UI + voice always keep cores (a 6-core iPhone keeps 2 free).
    // Raised on David's call (2026-09-05, "still too slow") once the wedge was
    // proven to be the 8s spawn gate, NOT memory — heap sat at ~7% of cap on
    // the web test. Never more than PHONE_POOL_CAP.
    //
    // WHY THE POOL STAYS ON iOS — and why e1534fc's "no pool on iOS" was WRONG
    // (David 2026-09-05, "still stuck at 1"; confirmed in PostHog).
    //
    // e1534fc returned 0 here so iOS batch fell back to the native singleton,
    // reasoning the native ARM engine is "vastly faster" than the asm.js pool.
    // But it never verified the singleton COMPLETES a batch — and it does not.
    // The differential, straight off David's device (device eb8cc1c1):
    //
    //   WORKED (bundles 261efbd/b2c3f7f, misconception+weakness output flowing):
    //     gameAnalysisService.spawnDedicatedWorker  worker 0/1  variant=asm  (/weaknesses)
    //   BROKE (bundle 561d741d = e1534fc, ZERO analysis output all day):
    //     stockfishEngine.initialize  variant=ios-native   ← and NO pool workers
    //
    // With the pool gone, `analyzeGamePositions` runs every position of every
    // game through the native singleton in a tight sequential loop, and one
    // `analyzePosition` never resolves — the batch wedges on game 1 ("stuck at
    // 1"). The asm.js pool spawns isolated Worker engines and does not wedge; it
    // is the app's DELIBERATE safe iOS build (the WASM/multi builds are the ones
    // that crash-storm — see resolveWorkerUrl). e1534fc's real complaint — "2
    // asm engines grinding 831 games = hot phone" — is a BATCH-SIZE problem, and
    // it is fixed by ANALYSIS_PACKAGE_SIZE (50 games/tap), not by removing the
    // one engine path that actually finishes.
    //
    // 🔒 DO NOT SUBTRACT A RESERVE FROM A NUMBER THAT IS ALREADY ONE (David
    // 2026-09-05, "still seems slow" — and the device's own warm log said
    // `2/2 pool workers warm`, not 4/4).
    //
    // This read `Math.min(PHONE_POOL_CAP, cores - 2)` on the theory that iOS
    // HIDES `hardwareConcurrency`, so the fallback would supply 6 and the -2
    // reserve would leave 4. iOS does NOT hide it. David's iPhone REPORTS 4 —
    // and 4 is already a conservative figure Apple publishes for a 6-core part
    // (2 performance + 4 efficiency). Subtracting another 2 from the capped
    // number left a 2-worker pool: the exact width the change was meant to
    // double, shipped as a no-op and only visible in the warm-up audit line.
    //
    // min(cap, reported) puts 4 engines on 6 real cores, so the headroom the
    // subtraction was protecting still exists — it is Apple's reserve now
    // instead of a second one stacked on top of it.
    const cores = reportedCores ?? PHONE_ASSUMED_CORES;
    return Math.max(1, Math.min(PHONE_POOL_CAP, cores));
  }
  // Desktop web: keep it quick but don't hog every core.
  const cores = reportedCores ?? 4;
  return Math.max(2, Math.min(6, cores - 1));
}

const WORKER_POOL_SIZE = resolveWorkerPoolSize();

// Abort signal for background suspension (tab hidden → pause + auto-resume).
let _abortAnalysis = false;
// USER cancel — distinct from the suspension abort so the run does NOT
// auto-restart when the tab is visible (the finally block resumes only a
// suspension abort). Set by the "Stop analyzing" banner control.
let _userCancelled = false;

/** Stop the in-flight background game analysis at the next game boundary and do
 *  NOT auto-restart (the user asked to stop). The current game finishes; every
 *  game already analyzed keeps its insights (they're written per-game). */
export function cancelBackgroundAnalysis(): void {
  if (!_backgroundRunning) return;
  _userCancelled = true;
  _abortAnalysis = true;
  // Immediate UI feedback — hide the banner now; the loop unwinds shortly.
  useAppStore.getState().setBackgroundAnalysis(false, null);
}

// Review-priority pause (David 2026-07-19: opening a review sat on
// "Preparing your review…" forever behind a 707-game bulk analysis — the
// single user-blocking game must own the CPU). While paused, the batch
// loops finish their in-flight game, then idle between games; the flag
// clears in analyzeSingleGame's finally.
let _pausedForReview = false;

export function pauseBatchAnalysis(): void {
  _pausedForReview = true;
}

export function resumeBatchAnalysis(): void {
  _pausedForReview = false;
}

async function waitWhilePaused(): Promise<void> {
  while (_pausedForReview && !_abortAnalysis) {
    await new Promise((r) => setTimeout(r, 500));
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// MATE_EVAL_THRESHOLD is now exported from engineConstants so all
// subsystems share the same value. Local alias kept for readability.
import {
  MATE_EVAL_THRESHOLD, MATE_EVAL_VALUE, INACCURACY_CP, MISTAKE_CP, BLUNDER_CP,
  INACCURACY_WIN_PCT, MISTAKE_WIN_PCT, BLUNDER_WIN_PCT, EXCELLENT_WIN_PCT,
} from './engineConstants';
import { winPercent, capEval } from './accuracyService';
import { lookupPositionEvals, storePositionEvals, prunePositionEvalCache, type EvalToStore } from './positionEvalCache';

/**
 * True when the engine's deep best-move (UCI) for `fenBefore` is the very move
 * that was actually played there. This happens because the slip is classified
 * from the SHALLOW eval pass (ANALYSIS_DEPTH) but the best move is found by a
 * DEEPER search (BEST_MOVE_DEPTH) — at the deeper depth the engine sometimes
 * confirms the played move WAS best, leaving us with a "mistake" whose best
 * move equals the move played. That bestMove is meaningless to every consumer
 * (the review narration would say "<played move> was stronger" and the mistake
 * puzzle's solution would be the move you played), so we drop it. David caught
 * this 2026-06-11 ("the opponent slipped but the better move it named was the
 * move the opponent played").
 */
/** Does the stored best move (UCI or SAN) denote the same move as `uci`? */
function bestMoveEqualsUci(fen: string, stored: string, uci: string): boolean {
  if (stored === uci) return true;
  try {
    const c = new Chess(fen);
    const m = c.move(/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(stored) ? { from: stored.slice(0, 2), to: stored.slice(2, 4), promotion: stored[4] } : stored);
    return !!m && `${m.from}${m.to}${m.promotion ?? ''}` === uci;
  } catch { return false; }
}
function bestMoveEqualsPlayed(
  fenBefore: string,
  playedSan: string,
  bestUci: string | null,
): boolean {
  if (!bestUci || bestUci.length < 4) return false;
  try {
    const probe = new Chess(fenBefore);
    const m = probe.move({
      from: bestUci.slice(0, 2),
      to: bestUci.slice(2, 4),
      promotion: bestUci.length > 4 ? bestUci[4] : undefined,
    });
    const strip = (s: string): string => s.replace(/[+#!?]+$/, '');
    return strip(m.san) === strip(playedSan);
  } catch {
    return false;
  }
}

// Exported so the offline narration harness (reviewFullGameNarration.harness
// .test.ts) classifies each ply with the SAME thresholds production uses —
// keeps the dial-in output faithful, never a re-implemented approximation.
export function classifyCpLoss(
  cpLoss: number,
  evalBefore?: number | null,
  evalAfter?: number | null,
  isPlayerWhiteMove?: boolean,
  deliveredMate?: boolean,
): MoveClassification {
  // A move that DELIVERS checkmate is the best possible outcome — NEVER a
  // mistake, no matter what the post-mate eval reads. The engine returns 0 for
  // a terminal (checkmated) position, so the eval-swing math below would call
  // the mating move a "blunder" (evalBefore +winning → 0). Board-truth from the
  // SAN's '#' short-circuits that (audit 2026-07-20: "Rd8# was a blunder").
  if (deliveredMate) {
    return evalBefore !== undefined && evalBefore !== null && Math.abs(evalBefore) < MATE_EVAL_THRESHOLD
      ? 'brilliant'   // found a mate that wasn't already a mate score
      : 'good';       // converting an already-decisive position
  }
  // Handle mate evals: if the player delivered/found checkmate, it's brilliant
  if (evalAfter !== undefined && evalAfter !== null && Math.abs(evalAfter) >= MATE_EVAL_THRESHOLD) {
    const goodForPlayer = isPlayerWhiteMove ? evalAfter > 0 : evalAfter < 0;
    if (goodForPlayer) return 'brilliant';
    // Walked into forced mate that wasn't there before
    if (evalBefore !== undefined && evalBefore !== null && Math.abs(evalBefore) < MATE_EVAL_THRESHOLD) {
      return 'blunder';
    }
    return 'good'; // Mate was already on the board
  }

  // ── GRADE IN EXPECTED POINTS, THE WAY CHESS.COM DOES ──────────────────────
  //
  // The accuracy percentage on this same screen was already built from win%
  // (sigmoid → exponential decay → harmonic mean, the published model). The
  // LABELS were raw centipawns, so the two halves of one review graded in
  // different currencies and the move counts could never line up with the
  // report David compares them against.
  //
  // chess.com bands on EXPECTED POINTS LOST — the same quantity — and says
  // plainly why: "the same centipawn loss can be a mistake in a tense position
  // and barely an inaccuracy in a decided one." Giving back 300cp at +9.0
  // barely moves the win probability; dropping 100cp at 0.00 moves it a lot.
  // Centipawns cannot express that, which is why this function used to need a
  // hand-rolled `STILL_WINNING_CP = 250` escape hatch to stop calling a winning
  // move a blunder. Grading in win% handles it natively, so that patch is gone
  // rather than reimplemented.
  //
  // When we have both evals, use them. Falling back to the centipawn bands only
  // when an eval is missing keeps a partial analysis labelled rather than blank.
  if (
    evalBefore !== undefined && evalBefore !== null
    && evalAfter !== undefined && evalAfter !== null
  ) {
    // Win% from the MOVER's side, so a drop is always "what this move gave up".
    const sign = isPlayerWhiteMove ? 1 : -1;
    const before = winPercent(evalBefore * sign);
    const after = winPercent(evalAfter * sign);
    const lost = before - after;

    if (lost >= BLUNDER_WIN_PCT) return 'blunder';
    if (lost >= MISTAKE_WIN_PCT) return 'mistake';
    if (lost >= INACCURACY_WIN_PCT) return 'inaccuracy';
    // Gains. A move that IMPROVES the position beyond noise is the student
    // finding something; the thresholds mirror the loss side.
    if (lost <= -BLUNDER_WIN_PCT) return 'brilliant';
    if (lost <= -EXCELLENT_WIN_PCT) return 'great';
    return 'good';
  }

  // No eval pair — fall back to the centipawn bands.
  if (cpLoss >= BLUNDER_CP) return 'blunder';
  if (cpLoss >= MISTAKE_CP) return 'mistake';
  if (cpLoss >= INACCURACY_CP) return 'inaccuracy';
  if (cpLoss <= -150) return 'brilliant';
  if (cpLoss <= -10) return 'great';
  return 'good';
}

export function replayPgnToFens(pgn: string): { fens: string[]; moves: string[] } {
  const chess = new Chess();
  const fens: string[] = [];
  const moves: string[] = [];
  try {
    chess.loadPgn(pgn);
    // Read positions straight from the VERBOSE history — `.before` on the first
    // ply is the game's TRUE starting FEN (honors a `[SetUp]`/`[FEN]` header:
    // odds games, custom positions) and `.after` is the FEN after each ply. The
    // old code did `chess.reset()` (back to the STANDARD board) and re-`move`d
    // the SANs — which threw/truncated on a later move that's legal only on the
    // custom board (the two-knights-odds game where 3.O-O is legal without the
    // g1-knight but illegal on a standard board). No replay, no throw.
    const verbose = chess.history({ verbose: true });
    if (verbose.length > 0) {
      fens.push(verbose[0].before);
      for (const mv of verbose) { fens.push(mv.after); moves.push(mv.san); }
    } else {
      fens.push(chess.fen());
    }
  } catch {
    // Return what we have
    if (fens.length === 0) fens.push(new Chess().fen());
  }
  return { fens, moves };
}

// ─── Dedicated Worker ───────────────────────────────────────────────────────

/**
 * A dedicated Stockfish Web Worker that processes positions sequentially.
 * Each worker owns one game at a time — multiple workers run games in parallel.
 */
class DedicatedWorker {
  private worker: Worker;

  constructor(worker: Worker) {
    this.worker = worker;
  }

  /** @param budgetMs optional `movetime` cap. REQUIRED on a slow engine: this
   *  used to send a bare `go depth 16` against a hard 10s reject, so on the
   *  asm.js build (every iPhone) a deep search simply blew the timeout and the
   *  caller lost the position. With a budget the search returns whatever depth
   *  it reached in time — and reports it, so the caller can record what it
   *  actually got instead of what it asked for. */
  analyzePosition(
    fen: string,
    depth: number,
    budgetMs?: number,
  ): Promise<{ evaluation: number; bestMove: string; depth: number }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Analysis timed out'));
      }, budgetMs ? budgetMs + 4_000 : 10_000);

      const blackToMove = fen.split(' ')[1] === 'b';
      let lastEval = 0;
      let lastDepth = 0;

      const handler = (event: MessageEvent<string>): void => {
        const data = event.data;
        // The worker can post a non-string message (Emscripten glue frames, and
        // error/status objects from a crashing multi-thread bundle). A bare
        // data.startsWith then throws an uncaught "t.startsWith is not a
        // function" pageerror (caught live in the 2026-07-25 hand audit). Ignore
        // anything that isn't a UCI text line.
        if (typeof data !== 'string') return;

        if (data.startsWith('info ')) {
          const depthMatch = /\bdepth (\d+)/.exec(data);
          if (depthMatch) lastDepth = Number(depthMatch[1]) || lastDepth;
          const scoreMatch = /score (cp|mate) (-?\d+)/.exec(data);
          if (scoreMatch) {
            const scoreType = scoreMatch[1];
            const scoreValue = parseInt(scoreMatch[2]);
            lastEval = scoreType === 'mate'
              ? (scoreValue > 0 ? MATE_EVAL_VALUE : -MATE_EVAL_VALUE)
              : scoreValue;
          }
        }

        const bmMatch = /^bestmove (\S+)/.exec(data);
        if (bmMatch) {
          clearTimeout(timeoutId);
          this.worker.removeEventListener('message', handler);
          const flip = blackToMove ? -1 : 1;
          resolve({ evaluation: lastEval * flip, bestMove: bmMatch[1], depth: lastDepth });
        }
      };

      try {
        this.worker.addEventListener('message', handler);
        this.worker.postMessage('ucinewgame');
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(budgetMs ? `go depth ${depth} movetime ${budgetMs}` : `go depth ${depth}`);
      } catch {
        clearTimeout(timeoutId);
        this.worker.removeEventListener('message', handler);
        reject(new Error('Worker is dead'));
      }
    });
  }

  /** Liveness probe for a WARM worker: `isready` → `readyok` within `timeoutMs`.
   *  A worker iOS killed while the app sat in the background never answers. */
  ping(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      let settled = false;
      const handler = (event: MessageEvent<unknown>): void => {
        if (event.data === 'readyok') finish(true);
      };
      const finish = (ok: boolean): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.worker.removeEventListener('message', handler);
        resolve(ok);
      };
      const timer = setTimeout(() => finish(false), timeoutMs);
      try {
        this.worker.addEventListener('message', handler);
        this.worker.postMessage('isready');
      } catch {
        finish(false);
      }
    });
  }

  destroy(): void {
    try {
      this.worker.postMessage('stop');
    } catch {
      // Worker already terminated (e.g. iOS killed it while backgrounded)
    }
    try {
      this.worker.terminate();
    } catch {
      // Already dead
    }
  }
}

/**
 * Spawn a dedicated Stockfish worker, wait for it to be ready.
 */
/** How long to wait for a POOL worker before giving up on the pool.
 *
 *  🔒 NOT the engine's 45s init budget. The pool is an OPTIMISATION — if its workers
 *  can't boot we fall back to the singleton and the review still runs. Waiting
 *  45s to learn that is 45 seconds of a blank progress bar added to the front of
 *  every review on any platform where the pool can't spawn, which until the fix
 *  below was every iPhone. A worker that hasn't said `readyok` in 8s is not
 *  coming; take the fallback and start analysing. */
const POOL_SPAWN_TIMEOUT_MS = 8_000;

/** Spawn wait for the asm.js build SPECIFICALLY — the engine's full init budget.
 *
 *  🚨 THE REGRESSION THAT BROKE BATCH ANALYSIS ON EVERY iPHONE (David 2026-09-05,
 *  "still spinning on 1/50"; "≤30s a game before it broke"). The 8s wait above
 *  is right for the fast WASM builds, but the asm.js bundle the pool spawns on
 *  iOS must cold-compile 1.58MB before it can say `readyok` — up to ~45s on a
 *  phone (stockfishEngine.INIT_TIMEOUT_MS exists for exactly this). So under an
 *  8s gate the asm pool NEVER became ready: every spawn timed out, the pool
 *  "failed", and the sweep fell back to the sequential singleton — which on
 *  native is `ios-native` (wedges on a batch) and on web is asm at the 5s review
 *  budget (~3 min/game). Both read as "stuck at 1." The fallback was only a
 *  console.warn, so the audit stream showed nothing but silent workers.
 *
 *  Before the Sep-2 rewrite the pool waited long enough for asm to compile, the
 *  workers came up, and the sweep ran in parallel at ≤30s/game. Waiting for asm
 *  is the fix because the fallback is strictly worse than the wait. */
const ASM_POOL_SPAWN_TIMEOUT_MS = 45_000;

function spawnDedicatedWorker(index: number): Promise<DedicatedWorker> {
  return new Promise((resolve, reject) => {
    // Armed AFTER the build is resolved (below) so the wait can be variant-aware.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      // 🔒 ASK THE ENGINE WHICH BUILD RUNS HERE — DO NOT HARDCODE ONE.
      //
      // This said `/stockfish/stockfish-18-lite-single.js` outright: the WASM
      // single build. `stockfishEngine.resolveWorkerUrl` routes iOS AWAY from
      // that exact file because it `call_indirect`-traps on WebKit — that is
      // why the asm.js build exists at all.
      //
      // So on every iPhone the pool spawned workers that could never signal
      // ready, waited out the timeout, logged "Worker pool failed, falling back
      // to single engine", and analysed the whole game SEQUENTIALLY on the
      // slowest engine we ship. That is the 216-second review David reported:
      // 66 positions × ~3.3s, one at a time, after a dead wait for a pool that
      // never had a chance.
      //
      // One owner for "which engine build runs on this device". The pool is a
      // second consumer of that decision, not a place to re-guess it.
      const resolved = resolveWorkerUrl();
      // asm.js cold-compiles ~1.58MB before `readyok` — give it the engine's
      // full init budget. Fast WASM builds keep the short gate.
      const spawnTimeoutMs = resolved.variant === 'asm' ? ASM_POOL_SPAWN_TIMEOUT_MS : POOL_SPAWN_TIMEOUT_MS;
      timeoutId = setTimeout(() => {
        reject(new Error(`Worker ${index} init timed out after ${spawnTimeoutMs}ms (variant=${resolved.variant})`));
      }, spawnTimeoutMs);
      // NAME THE BUILD THE POOL SPAWNS. The pool is the only Stockfish consumer
      // that spawned workers WITHOUT recording which build it chose, so when
      // `stockfish-18-lite-single.js` crash-stormed a device on 2026-09-02 (276
      // WASM traps in 4 minutes) there was no variant event to attribute it to —
      // every `stockfish_variant` in the window said `ios-native` from the
      // singleton, and the crashing loader was invisible. One log per pool
      // worker makes the next occurrence self-identifying.
      void logAppAudit({
        kind: 'stockfish-variant-resolved',
        category: 'subsystem',
        source: 'gameAnalysisService.spawnDedicatedWorker',
        summary: `pool worker ${index} variant=${resolved.variant} url=${resolved.url} reason=${resolved.reason}`,
      });
      const worker = new Worker(resolved.url, resolved.workerType === 'module' ? { type: 'module' } : undefined);

      worker.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error(`Worker ${index} failed to load`));
      };

      const readyHandler = (event: MessageEvent<string>): void => {
        if (event.data === 'readyok') {
          clearTimeout(timeoutId);
          worker.removeEventListener('message', readyHandler);
          worker.postMessage('setoption name MultiPV value 1');
          resolve(new DedicatedWorker(worker));
        }
      };

      worker.addEventListener('message', readyHandler);
      worker.postMessage('uci');
      worker.postMessage('isready');
    } catch {
      clearTimeout(timeoutId);
      reject(new Error(`Worker ${index} spawn failed`));
    }
  });
}

// ─── Warm pool ──────────────────────────────────────────────────────────────
//
// 🔒 THE POOL IS WARMED AT LAUNCH AND KEPT ALIVE BETWEEN RUNS (David 2026-09-05:
// "get those parallel computers warming up at app launch"). The asm.js build a
// phone runs cold-compiles ~1.58MB PER WORKER (~45s) — and every sweep and every
// review used to pay that from cold, then TERMINATE the workers at the end so
// the next tap paid it again. Now App.tsx warms the pool a few seconds after
// boot (when the library has games), and every consumer ACQUIRES from the warm
// set and RELEASES back to it. A worker only dies when it wedges or fails a
// liveness ping.
//
// Memory is not the cost that matters: ~45MB per resident asm worker, against a
// 45s blank progress bar in front of every Analyze tap.

/** How long a warm worker gets to answer `isready` before it is presumed dead. */
const WARM_PING_TIMEOUT_MS = 1_500;
let _warmPool: DedicatedWorker[] = [];
let _warmPromise: Promise<void> | null = null;

function resolvedVariantName(): string {
  try { return resolveWorkerUrl().variant; } catch { return 'unknown'; }
}

/**
 * Spawn the full pool ahead of any demand and park it warm. Idempotent and
 * single-flight; a spawn failure leaves whatever came up. Returns the warm
 * count. Safe to call anywhere — a no-op where `Worker` does not exist.
 */
export async function warmAnalysisPool(): Promise<number> {
  if (typeof Worker === 'undefined') return 0;
  if (_warmPool.length > 0) return _warmPool.length;
  if (_warmPromise) { await _warmPromise; return _warmPool.length; }
  const started = Date.now();
  const run = (async (): Promise<void> => {
    const results = await Promise.allSettled(
      Array.from({ length: WORKER_POOL_SIZE }, (_, i) => spawnDedicatedWorker(i)),
    );
    const spawned: DedicatedWorker[] = [];
    for (const r of results) if (r.status === 'fulfilled') spawned.push(r.value);
    _warmPool.push(...spawned);
    void logAppAudit({
      kind: 'analysis-pool-warmed',
      category: 'subsystem',
      source: 'gameAnalysisService.warmAnalysisPool',
      summary: `${spawned.length}/${WORKER_POOL_SIZE} pool workers warm (variant=${resolvedVariantName()}) in ${Date.now() - started}ms`,
    });
  })();
  _warmPromise = run;
  try { await run; } finally { _warmPromise = null; }
  return _warmPool.length;
}

/**
 * Take up to `size` LIVE workers: warm ones first (liveness-pinged; a dead one is
 * dropped), then fresh spawns for any shortfall. Throws only when NO worker at
 * all could be had — callers then take the singleton fallback exactly as before.
 */
async function acquirePool(size: number): Promise<DedicatedWorker[]> {
  if (_warmPromise) { try { await _warmPromise; } catch { /* spawn below */ } }
  const taken = _warmPool.splice(0, size);
  const alive: DedicatedWorker[] = [];
  if (taken.length > 0) {
    const pings = await Promise.all(taken.map((w) => w.ping(WARM_PING_TIMEOUT_MS)));
    taken.forEach((w, i) => { if (pings[i]) alive.push(w); else w.destroy(); });
  }
  const shortfall = size - alive.length;
  if (shortfall > 0) {
    const results = await Promise.allSettled(
      Array.from({ length: shortfall }, (_, i) => spawnDedicatedWorker(alive.length + i)),
    );
    for (const r of results) if (r.status === 'fulfilled') alive.push(r.value);
    if (alive.length === 0) throw new Error('no analysis pool worker could be spawned');
  }
  return alive;
}

/** Hand workers back to the warm set for the next run; surplus past the pool
 *  width is destroyed. */
function releasePool(workers: readonly DedicatedWorker[]): void {
  for (const w of workers) {
    if (_warmPool.length < WORKER_POOL_SIZE && !_warmPool.includes(w)) _warmPool.push(w);
    else w.destroy();
  }
}

/** Test hook — destroy every warm worker so a test starts cold. */
function resetAnalysisPool(): void {
  for (const w of _warmPool) w.destroy();
  _warmPool = [];
  _warmPromise = null;
}

/** Per-position search budget for the REVIEW's key-moment re-search.
 *
 *  8s, not 3s (David 2026-09-06: "Set it."). The review re-searches at most
 *  REVIEW_MAX_DEEP_PLIES (12) key plies at REVIEW_DEEP_DEPTH (16), and since
 *  the non-blocking open that pass runs BEHIND an already-open review, so its
 *  ceiling (12 × 8s ≈ 96s, and only when every key ply is slow) is not time
 *  the student waits for. What 3s bought was the wrong verdict: in-browser
 *  Stockfish stopped near depth 13 and graded 6...Nb6 (52cp at d14, 128cp at
 *  d16) a good move. A quiet position still stops the moment depth 16 lands. */
const REVIEW_POSITION_BUDGET_MS = 8_000;

/** Per-position budget for the sweep's BEST-MOVE refinement — the only deep
 *  search the sweep still runs, and only on the handful of moves it graded a
 *  mistake or worse (the drills need a solution move). The eval curve itself
 *  runs at BATCH_SHALLOW_BUDGET_MS.
 *
 *  David 2026-09-05, on the native app: analysis "stuck at 1 for 4 minutes."
 *  The audit stream proved the workers were ALIVE (no wedge-respawn in 200s),
 *  just slow: at depth 16 with the 5s review budget, one ~40-move game on the
 *  iOS asm.js engine takes ~3 minutes, so the counter never leaves game 1 in a
 *  normal foreground window. It "used to be ≤30s" because the budget/depth were
 *  lower before they were raised for review accuracy — a change that quietly
 *  broke the bulk sweep on phones.
 *
 *  The bulk sweep does not need review depth: a game analysed shallow on a phone
 *  is stamped with the depth it REACHED (achievedDepth < ANALYSIS_DEPTH), so
 *  `gameNeedsAnalysis` re-picks it for a deeper pass whenever it is next opened
 *  on a faster engine (desktop). Fast-and-re-deepenable beats
 *  correct-but-never-finishes. 800ms keeps a typical 30-40 move game under ~30s
 *  and makes the counter visibly advance. `movetime` is a CEILING, so a fast
 *  desktop engine still reaches depth 16 well under it — this only bites the
 *  slow asm build, which is exactly where it must. */
const BATCH_POSITION_BUDGET_MS = 800;

/** 🔒 THE SWEEP IS A DRAFT; THE REVIEW IS THE ANALYSIS (David 2026-09-05:
 *  "decrease the depth for the batch and then dive deeper on the key moments
 *  once a single game is selected to be reviewed by the user — this is burning
 *  way too much battery and taking way too long").
 *
 *  The sweep's job is to find WHICH games and WHICH moments deserve a look. It
 *  walks every non-book ply ONCE, shallow, and stops. It does not re-search the
 *  swings it finds: on an amateur game the eval swings constantly, so a deep
 *  second pass was most of the sweep's runtime and all of its battery — spent
 *  producing precision for games the user may never open.
 *
 *  The deep search moved to where a person is actually waiting for it and has
 *  asked for it: the REVIEW of one selected game (see REVIEW_DEEP_DEPTH). */
/** 🔒 THE BUDGET IS THE DIAL, NOT THE DEPTH. We send `go depth N movetime B`
 *  and the engine stops at whichever lands first. On the asm.js build a phone
 *  runs, a middlegame position rarely reaches depth 12 inside 200ms — the clock
 *  wins — so the DEPTH ceiling mostly binds on DESKTOP, where the engine gets
 *  there in a fraction of the budget. Raising the ceiling 10 → 12 therefore
 *  costs the phone nothing and buys desktop a better curve for free, while the
 *  200ms is what actually governs the phone's battery. Tune the budget when the
 *  sweep costs too much; tune the depth when the curve is too coarse. */
const BATCH_SHALLOW_DEPTH = 12;
const BATCH_SHALLOW_BUDGET_MS = 200;

/** Ceiling on how many plies ONE review re-searches deep.
 *
 *  Without it the review's cost is set by how NOISY the shallow curve is rather
 *  than by how interesting the game is: the selector deepens any swing ≥
 *  TWO_PASS_SWING_CP (50cp), and a depth-12 eval still carries a few tens of
 *  centipawns of search noise, so a swingy game can nominate thirty-odd plies
 *  and quietly put the slowness back into the review. Ranking by swing size and
 *  stopping at the cap spends the deep budget on the biggest moments first.
 *
 *  Findings are never dropped to fit: a swing that is already mistake-sized (or
 *  touches a mate score) is deepened whatever the count — the cap only rations
 *  the ambiguous small ones. 12 plies × REVIEW_POSITION_BUDGET_MS bounds a
 *  typical review at well under a minute. */
const REVIEW_MAX_DEEP_PLIES = 24;
/* 24, not 12 (David's Alapin, audit 2026-09-06): the fixture's 6...Nb6 pair
 * swung 51cp shallow and was NEVER re-searched in five prod runs — not for
 * want of depth or budget, but because the game's later blunders (3.6-point
 * swings) filled all six pair slots first and the cap dropped the borderline
 * pair every time. Twelve pairs holds a game's certain swings AND its
 * borderline ones. The cost is bounded (24 × REVIEW_POSITION_BUDGET_MS) and,
 * since the sweep-then-deepen open below, runs behind an open review. */

/** Depth the REVIEW re-searches its key moments at.
 *
 *  `go depth N movetime B` stops at whichever limit lands first, so N is a
 *  CEILING and REVIEW_POSITION_BUDGET_MS is the cost bound: a quiet position
 *  that reaches N early hands its budget back, and a position that cannot
 *  reach N in B stops at B with whatever depth it got. Twelve key plies × B
 *  bounds the deep pass either way — and since 2026-09-06 that pass runs in
 *  the BACKGROUND behind an already-open review (CoachReviewSessionPage
 *  deepening), so it is no longer time the student waits for.
 *
 *  Why 16 and not 14 (David's Alapin fixture, 6...Nb6, native Stockfish):
 *    d14 → 52cp   (4.6% expected points: "good" under the 5% band)
 *    d16 → 128cp  (mistake)
 *    d18 → 98cp, d20 → 78cp, d22 → 69cp  (a clear inaccuracy, stably)
 *  The 2026-09-05 note that "a depth-14 → depth-18 eval moves ~10cp" is true
 *  of quiet positions and false of exactly the ones a review exists for: the
 *  verdict on the student's own key mistake FLIPPED between 14 and 16 and
 *  stayed flagged at every depth after. 14 was the one depth that graded it
 *  a good move. 16 = ANALYSIS_DEPTH, so a completed deep pass honestly earns
 *  the ANALYSIS_DEPTH stamp it already claims. Still below BEST_MOVE_DEPTH
 *  (18): the review is not the drill-solution search. */
const REVIEW_DEEP_DEPTH = 16;

/** Smallest cpLoss the SWEEP will call a slip.
 *
 *  A depth-10 eval carries roughly 30-50cp of search noise — the same size as
 *  INACCURACY_CP itself. So an "inaccuracy" read off two shallow evals is
 *  indistinguishable from the noise, and flagging it fills My Mistakes and the
 *  weakness profile with moves that were fine. The sweep therefore commits only
 *  to mistake-and-worse, which is well clear of its own noise floor. Real
 *  inaccuracies are surfaced by the review, which re-searches every moment that
 *  moved the eval at all (TWO_PASS_SWING_CP) at REVIEW_DEEP_DEPTH.
 *
 *  Lowering the sweep's depth without raising this floor would have been the
 *  quiet way to make the app FASTER and WRONGER. */
const BATCH_GRADE_FLOOR_CP = MISTAKE_CP;
/** Swing between adjacent SHALLOW evals that is CERTAINLY worth a deep look. */
export const TWO_PASS_SWING_CP = INACCURACY_CP;
/** Swing between adjacent SHALLOW evals that earns a deep re-search at all.
 *
 *  This sits BELOW the smallest verdict-changing swing on purpose. The old
 *  reasoning — "INACCURACY_CP is the smallest swing that changes a
 *  classification, so a smaller one cannot change the verdict" — is true of
 *  the DEEP eval and false of the SHALLOW one it was applied to: the sweep's
 *  own note above puts 30-50cp of search noise on a depth-10 read, so a real
 *  52cp inaccuracy routinely shows up as ~37cp shallow and was never looked at
 *  again. David's fixture (2026-09-05, Alapin 6...Nb6): native Stockfish reads
 *  it at 37cp (d10), 54 (d12), 52 (d14), 126 (d16) — the review called it GOOD
 *  because the shallow read fell under the bar and the deep pass never ran.
 *  Candidacy must clear the verdict threshold MINUS the noise, or the deep
 *  pass only ever confirms what the shallow one already knew. The cap
 *  (REVIEW_MAX_DEEP_PLIES) still bounds the cost; the ranking still spends it
 *  on the biggest swings first. */
export const DEEP_DIVE_CANDIDATE_CP = Math.round(INACCURACY_CP / 2);

/** NB this is now the REVIEW's key-moment selector (the sweep no longer runs a
 *  second pass). Because the threshold is INACCURACY_CP — the smallest swing
 *  that can change a classification — every ply the review could grade as
 *  anything other than `good` is re-searched deep. A quiet ply left shallow can
 *  only ever grade `good`, so the review's verdicts are all deep verdicts. */

/**
 * Indices (into `shallow`, i.e. FEN indices) to re-search deep: BOTH ends of any
 * adjacent pair whose swing reaches TWO_PASS_SWING_CP, or that touches a mate
 * score. Both ends, so the deep grade is computed from two evals of the SAME
 * depth. Pure; exported for the gate.
 */
export function selectCriticalPlies(
  shallow: readonly (number | null)[],
  from = 0,
  /** Ply budget. Omitted = take every qualifying pair (the sweep's old
   *  behaviour, and what the gates assert). See REVIEW_MAX_DEEP_PLIES. */
  maxPlies?: number,
): number[] {
  const pairs: { i: number; swing: number; certain: boolean }[] = [];
  for (let i = Math.max(0, from); i < shallow.length - 1; i++) {
    const a = shallow[i];
    const b = shallow[i + 1];
    if (a === null || b === null) continue;
    const swing = Math.abs(capEval(a) - capEval(b));
    const mateish = Math.abs(a) >= MATE_EVAL_THRESHOLD || Math.abs(b) >= MATE_EVAL_THRESHOLD;
    if (swing >= DEEP_DIVE_CANDIDATE_CP || mateish) {
      // "Certain" = already big enough to be a finding rather than curve noise,
      // so it is deepened even when the cap is spent.
      pairs.push({ i, swing, certain: mateish || swing >= MISTAKE_CP });
    }
  }

  const picked = new Set<number>();
  const take = (p: { i: number }): void => { picked.add(p.i); picked.add(p.i + 1); };
  if (maxPlies === undefined) {
    pairs.forEach(take);
  } else {
    pairs.filter((p) => p.certain).forEach(take);
    for (const p of pairs.filter((p) => !p.certain).sort((x, y) => y.swing - x.swing)) {
      if (picked.size >= maxPlies) break;
      take(p);
    }
  }
  return [...picked].sort((x, y) => x - y);
}

/** How many leading positions the BULK sweep may skip evaluating: the index of
 *  the first move that leaves the opening book (= `moves.length` if the whole
 *  game is theory).
 *
 *  Indexing: fens[i] is the position BEFORE move i, so move i's cpLoss needs
 *  evals[i] and evals[i+1]. Book moves 0..K-1 classify `book` without evals, but
 *  the first NON-book move K needs fens[K] — its "before" position — evaluated.
 *  Skipping exactly fens[0..K-1] keeps that intact. (David 2026-09-05: the
 *  theory plies are ~25-40% of a game's engine time spent on a known answer.)
 *  Tradeoff, accepted: a genuine blunder inside a DB-book line is no longer
 *  re-graded by the engine in the bulk sweep — it reads `book`. The REVIEW of an
 *  opened game still evaluates every ply and keeps that catch. */
function firstNonBookPly(moves: readonly string[]): number {
  for (let i = 0; i < moves.length; i++) {
    if (!isBookLine(moves.slice(0, i + 1))) return i;
  }
  return moves.length;
}

/** Consecutive position timeouts on ONE worker that mean it's wedged/dead (a
 *  live engine never times out this many in a row) — the batch then recycles it
 *  instead of grinding every remaining position through the reject. */
const WORKER_WEDGE_LIMIT = 3;

/** Thrown by analyzeGameOnWorker when its worker is wedged; the batch loop
 *  catches it, destroys + respawns the worker, and moves on (the game is left
 *  un-analyzed for the next sweep). */
/** What one game's analysis actually cost. Emitted per game so a sweep's speed
 *  is MEASURED rather than inferred.
 *
 *  🔒 WHY THIS EXISTS (David 2026-09-05, "add the audit tools"). The sweep
 *  audited nothing per game, so after a real run on his phone the only way to
 *  estimate throughput was to count `misconception-captured` side effects and
 *  read the gaps between them — which undercounts, because a game with no
 *  misconception finishes completely invisibly. That inference said ~10 games;
 *  he had actually analysed 13. A speed fix whose effect can only be guessed at
 *  cannot be verified, tuned, or defended. */
export interface GameAnalysisStats {
  /** Positions in the game (fens). */
  plies: number;
  /** Positions served from the per-FEN eval cache — no engine time spent. */
  fromCache: number;
  /** Positions the engine actually searched. */
  searched: number;
  /** Leading positions skipped as opening book. */
  skippedBook: number;
  /** Slips that earned a deep best-move search (the drill solutions). */
  refined: number;
}

export class WorkerWedgedError extends Error {
  constructor(gameId: string) {
    super(`Stockfish worker wedged during analysis of game ${gameId}`);
    this.name = 'WorkerWedgedError';
  }
}

/**
 * Evaluate every position of one game ACROSS a pool of workers.
 *
 * 🔒 THE REVIEW ANALYSED ONE POSITION AT A TIME, ON THE SLOWEST ENGINE WE SHIP.
 * The pool existed only for the BATCH sweep (`analyzeAllGames`), which is the
 * path nobody is waiting on. The single-game review — the one with a person
 * staring at a progress bar — walked its ~66 positions sequentially through the
 * singleton. Measured on David's iPhone: 216 seconds, and PostHog says 11 of
 * his 14 reviews were abandoned before they finished.
 *
 * A work QUEUE, not a fixed split: positions differ by an order of magnitude in
 * cost, so handing worker N every Nth position leaves one worker grinding a
 * tactical middlegame while the others idle. Each worker takes the next index
 * whenever it comes free.
 *
 * Returns null when no pool could be spawned — the caller falls back to the
 * sequential singleton, which is exactly today's behaviour and always works.
 */
async function evaluateFensPooled(
  fens: string[],
  onPosition?: (current: number, total: number) => void,
  /** Per-position movetime for the pool workers. Review keeps the 5s default;
   *  the bulk sweep passes BATCH_POSITION_BUDGET_MS. */
  budgetMs: number = REVIEW_POSITION_BUDGET_MS,
  /** Search depth for this pass. The sweep and the review's curve pass run
   *  shallow; only the review's key-moment dive runs deep. */
  depth: number = ANALYSIS_DEPTH,
): Promise<{ evals: (number | null)[]; achievedDepth: number } | null> {
  const size = Math.max(1, Math.min(WORKER_POOL_SIZE, fens.length));
  let workers: DedicatedWorker[] = [];
  try {
    workers = await acquirePool(size);
  } catch {
    // Pool unavailable on this device — the singleton path still works.
    return null;
  }

  const evals: (number | null)[] = fens.map(() => null);
  let achievedDepth = Number.POSITIVE_INFINITY;
  let next = 0;
  let done = 0;

  const run = async (w: DedicatedWorker): Promise<void> => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= fens.length) return;
      try {
        const a = await w.analyzePosition(fens[i], depth, budgetMs);
        evals[i] = a.evaluation;
        if (Number.isFinite(a.depth) && a.depth > 0) achievedDepth = Math.min(achievedDepth, a.depth);
      } catch {
        evals[i] = null; // one dead position must not sink the whole review
      }
      done += 1;
      onPosition?.(done, fens.length);
    }
  };

  try {
    await Promise.all(workers.map((w) => run(w)));
  } finally {
    releasePool(workers); // stay warm for the next review / sweep
  }
  return {
    evals,
    achievedDepth: Number.isFinite(achievedDepth) ? Math.min(achievedDepth, depth) : 0,
  };
}

// ─── Core Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze a single game with a dedicated worker.
 * Evaluates every position sequentially on this worker, then classifies each move.
 */
export async function analyzeGameOnWorker(
  game: GameRecord,
  worker: DedicatedWorker,
): Promise<{ annotations: MoveAnnotation[]; achievedDepth: number; stats: GameAnalysisStats } | null> {
  const { fens, moves } = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  // 🔒 BUDGET THE SEARCH HERE TOO, OR THE POOL FIX BECOMES A DATA BUG.
  //
  // This asked for an uncapped `go depth 16` against `analyzePosition`'s hard
  // 10s reject. That was survivable while the pool only ever ran the fast WASM
  // build — but the pool now resolves the build per device, so on iOS it runs
  // asm.js, where a complex middlegame does not reach depth 16 in ten seconds.
  //
  // The failure would have been SILENT and worse than the slowness it replaced:
  // a rejected position pushes `null`, a null eval pair classifies as `good`,
  // and the game is then written back `fullyAnalyzed`. Every move in a chunk of
  // the user's library marked fine, permanently, with nothing logged.
  //
  // With a budget the search returns the depth it reached instead of throwing,
  // and the caller stamps THAT — so a game analysed on a slow engine stays
  // re-analysable rather than being frozen shallow behind a depth-16 claim.
  // 🔒 WEDGED-WORKER GUARD (R1, David 2026-09-01 — "analysis stalls at 1/629,
  // Stop works but the loop doesn't advance"). A live engine ALWAYS resolves a
  // position inside its budget; a position REJECT means it blew the budget+4s.
  // When iOS kills a worker (memory pressure) it stops posting messages, so
  // EVERY remaining position then waits the full ~9s reject — a 40-move game
  // becomes ~6 min of dead waits and the batch looks frozen. Three straight
  // timeouts is a dead worker, not a hard position: bail so the caller RECYCLES
  // the worker instead of grinding the whole game (and every game after it, on
  // the same dead worker) through the timeout.
  let consecutiveTimeouts = 0;
  const search = async (
    i: number,
    depth: number,
    budgetMs: number,
  ): Promise<{ evaluation: number; bestMove: string; depth: number } | null> => {
    try {
      const r = await worker.analyzePosition(fens[i], depth, budgetMs);
      consecutiveTimeouts = 0;
      return r;
    } catch (e) {
      if (e instanceof Error && /timed out/i.test(e.message)) {
        if (++consecutiveTimeouts >= WORKER_WEDGE_LIMIT) throw new WorkerWedgedError(game.id);
      } else {
        consecutiveTimeouts = 0;
      }
      return null;
    }
  };

  // Skip the engine on opening-BOOK positions (David 2026-09-05, "still too
  // slow"): the first ~10-16 plies are theory and classify as `book` anyway, so
  // evaluating them is ~25-40% of a game's engine time spent on a known answer.
  // We stop skipping at the first NON-book move's "before" position (fens[K]),
  // which it needs for its cpLoss — see firstNonBookPly. A skipped position
  // stays null, and a null eval pair on a book move classifies `book` below.
  const skipBook = firstNonBookPly(moves);

  // ── EVAL CACHE: a position this device already scored is not re-searched. A
  // cached DEEP eval satisfies both passes at once. (positionEvalCache.ts)
  const cached = await lookupPositionEvals(fens, BATCH_SHALLOW_DEPTH);
  const toStore: EvalToStore[] = [];

  // ── THE SWEEP'S ONE PASS. Shallow, every non-book ply, then done. There is
  // deliberately no second pass here: see BATCH_SHALLOW_DEPTH.
  const evals: (number | null)[] = fens.map(() => null);
  const depthAt: number[] = fens.map(() => 0);
  for (let i = skipBook; i < fens.length; i++) {
    if (_abortAnalysis) return null;
    const hit = cached.get(i);
    if (hit) { evals[i] = hit.evaluation; depthAt[i] = hit.depth; continue; }
    const r = await search(i, BATCH_SHALLOW_DEPTH, BATCH_SHALLOW_BUDGET_MS);
    if (!r) continue;
    evals[i] = r.evaluation;
    depthAt[i] = r.depth;
    if (Number.isFinite(r.depth) && r.depth > 0) toStore.push({ fen: fens[i], evaluation: r.evaluation, depth: r.depth });
  }

  // Stamped with the depth the sweep actually reached — which is BELOW
  // ANALYSIS_DEPTH by design. That is the mechanism that makes the deep dive
  // happen: `gameNeedsAnalysis({ depthUpgrade: true })` sees a shallow stamp and
  // re-analyses the game when it is OPENED, and that re-analysis is the review's
  // deep pass. The sweep is a draft that says so in the record.
  let achievedDepth = Number.POSITIVE_INFINITY;
  for (let i = skipBook; i < fens.length; i++) {
    if (evals[i] !== null && depthAt[i] > 0) achievedDepth = Math.min(achievedDepth, depthAt[i]);
  }

  // Build annotations + collect best-move lookups for mistakes
  const annotations: MoveAnnotation[] = [];
  const mistakeIndices: number[] = [];
  // BOOK-move exemption (David 2026-08-28): a theory move is never an error.
  // Flips false the moment the played line leaves book; short-circuits the DB
  // scan for the rest of the game.
  let stillBook = true;

  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const isWhiteMove = moveIdx % 2 === 0;
    const color: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    const moveNumber = Math.floor(moveIdx / 2) + 1;

    const evalBefore = evals[moveIdx];
    const evalAfter = evals[moveIdx + 1];

    let classification: MoveClassification = 'good';

    const moveIsBook = stillBook && isBookLine(moves.slice(0, moveIdx + 1));
    if (!moveIsBook) stillBook = false;

    if (evalBefore !== null && evalAfter !== null) {
      // cpLoss is clamped through capEval so a mate score (±30000) can't
      // inflate the stored/aggregated centipawn-loss (David 2026-08-28:
      // "make sure the mistakes are accurate" — a single mate-conversion
      // was blowing up avgCpLoss). RAW evals still go to classifyCpLoss so
      // it keeps detecting the mate for brilliant/blunder grading.
      const cpLoss = isWhiteMove
        ? capEval(evalBefore) - capEval(evalAfter)
        : capEval(evalAfter) - capEval(evalBefore);
      const graded = classifyCpLoss(cpLoss, evalBefore, evalAfter, isWhiteMove, moves[moveIdx]?.includes('#'));
      // BOOK exemption (David 2026-08-28: "Move 1 or 2 shouldn't be auto
      // marked as mistakes … don't just code to never show an error in the
      // first 2 moves"). A theory move is not flagged for opening eval-NOISE
      // (inaccuracy / mistake magnitude) — but a genuine BLUNDER still
      // surfaces even in a "named" line: 2.Qh5 (Wayward Queen) is in the DB
      // yet drops 400cp, and the student should see that. So book downgrades
      // everything below a blunder; blunder/brilliant/great grade normally.
      // SHALLOW-NOISE FLOOR — see BATCH_GRADE_FLOOR_CP. A slip smaller than the
      // sweep's own search noise is not a finding, it IS the noise.
      const belowShallowFloor = graded === 'inaccuracy' && cpLoss < BATCH_GRADE_FLOOR_CP;
      if (moveIsBook && (graded === 'good' || graded === 'inaccuracy' || graded === 'mistake')) {
        classification = 'book';
      } else if (belowShallowFloor) {
        classification = 'good';
      } else {
        classification = graded;
        if (cpLoss >= BATCH_GRADE_FLOOR_CP && graded !== 'brilliant' && graded !== 'great' && graded !== 'good') {
          mistakeIndices.push(moveIdx);
        }
      }
    } else if (moveIsBook) {
      classification = 'book'; // theory move, evals unavailable — still not a mistake
    }

    annotations.push({
      moveNumber,
      color,
      san: moves[moveIdx],
      // Evals stored in CENTIPAWNS (White POV) — the unit Stockfish
      // returns natively and every downstream threshold (BLUNDER_CP,
      // MISS_EVAL_THRESHOLD, MIN_EVAL_SWING, winPercent's sigmoid
      // coefficient) is calibrated for. Pre-fix records that stored
      // pawn-units (evalAfter / 100) are flagged for re-analysis via
      // the missing `bestMoveEval` field in `gameNeedsAnalysis`.
      evaluation: evalAfter !== null ? evalAfter : null,
      bestMove: null,
      // `bestMoveEval` = engine's read of the position BEFORE this move
      // (i.e., what the player could have achieved with best play),
      // same cp/White-POV unit as `evaluation`. Shallow value for
      // non-mistakes; refined to BEST_MOVE_DEPTH for mistakes below.
      bestMoveEval: evalBefore !== null ? evalBefore : null,
      classification,
      comment: null,
    });
  }

  // Get best moves + refined evals for mistakes (deeper analysis)
  for (const moveIdx of mistakeIndices) {
    if (_abortAnalysis) return null;
    // A cached best-move search at this position is as good as running one.
    const hit = cached.get(moveIdx);
    if (hit?.bestMove && hit.depth >= BEST_MOVE_DEPTH) {
      annotations[moveIdx].bestMove = bestMoveEqualsPlayed(fens[moveIdx], moves[moveIdx], hit.bestMove) ? null : hit.bestMove;
      annotations[moveIdx].bestMoveEval = hit.evaluation;
      continue;
    }
    try {
      // Budgeted like the eval pass — this is the BULK sweep. An uncapped
      // depth-18 search here costs up to the ~10s hard reject PER MISTAKE on the
      // asm build, which is the other half of the "3 minutes a game" slowdown
      // (David 2026-09-05). The refined best move is re-deepened with the game
      // when it's next opened on a fast engine, same as the eval curve.
      const result = await worker.analyzePosition(fens[moveIdx], BEST_MOVE_DEPTH, BATCH_POSITION_BUDGET_MS);
      annotations[moveIdx].bestMove = bestMoveEqualsPlayed(fens[moveIdx], moves[moveIdx], result.bestMove)
        ? null
        : result.bestMove;
      // Overwrite the shallow bestMoveEval with the deeper-depth value
      // for this position. Same engine, deeper search — keeps the swing
      // math (detectMisses / detectMissedTactics) on the most reliable
      // number available for the moves where it actually matters.
      annotations[moveIdx].bestMoveEval = result.evaluation;
      if (Number.isFinite(result.depth) && result.depth > 0) {
        toStore.push({ fen: fens[moveIdx], evaluation: result.evaluation, depth: result.depth, bestMove: result.bestMove });
      }
    } catch {
      // Leave bestMove null + keep the shallow bestMoveEval
    }
  }

  if (toStore.length > 0) await storePositionEvals(toStore);

  return {
    annotations,
    achievedDepth: Number.isFinite(achievedDepth) ? Math.min(achievedDepth, ANALYSIS_DEPTH) : 0,
    stats: {
      plies: fens.length,
      fromCache: cached.size,
      searched: Math.max(0, fens.length - skipBook - cached.size),
      skippedBook: skipBook,
      refined: mistakeIndices.length,
    },
  };
}

/**
 * Fallback: analyze a single game with the singleton engine (no pool).
 */
async function analyzeGamePositions(
  game: GameRecord,
  onPosition?: (current: number, total: number) => void,
  /** Per-position time cap for BULK callers. When set, BOTH the pool pass and
   *  the sequential singleton fallback are budgeted (via analyzeWithBudget) —
   *  the native ios-native singleton has no SEARCH_BUDGET_MS entry, so without
   *  this it runs an uncapped depth-16 search (~1.5s/position, ~60s a game;
   *  David 2026-09-05: "4 games in 4 minutes — too slow"). The review path
   *  (analyzeSingleGame) leaves it undefined and keeps full depth. */
  positionBudgetMs?: number,
  /** Review's COLD open: walk the full curve (every ply, no opening gap) but
   *  skip the key-moment deep dive so the student is on the board in sweep
   *  time; the dive then runs behind the open review (CoachReviewSessionPage
   *  deepens because the stamped depth is shallow). */
  opts: { sweepOnly?: boolean } = {},
): Promise<{ annotations: MoveAnnotation[]; achievedDepth: number } | null> {
  const { fens, moves } = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  try {
    await stockfishEngine.initialize();
  } catch {
    return null;
  }

  // 🔒 RECORD THE DEPTH THE SEARCH ACTUALLY REACHED, NOT THE ONE WE ASKED FOR.
  //
  // `analyzePosition` is bounded by a per-variant `movetime` budget, so on a
  // slow engine the search returns whatever depth it got to when the clock ran
  // out — `ANALYSIS_DEPTH` is a ceiling, not a promise.
  //
  // Measured on David's iPhone 2026-08-11 (PostHog, his own review URL): iOS
  // routes to the asm.js build BY DESIGN — the WASM builds `call_indirect`-trap
  // on WebKit — and asm gets a 5s budget per position. His 66-position review
  // took 216s, ~3.3s a position: the searches were running to the clock, not
  // to depth 16.
  //
  // The record was then stamped `analysisDepth: ANALYSIS_DEPTH` regardless. So
  // an iPhone review claimed a depth it never reached, `gameNeedsAnalysis` read
  // it as current, and the game could NEVER be re-deepened — not on a desktop,
  // not ever. The shallow numbers were frozen in as if they were the deep ones.
  // Accuracy is computed off these evals, which is the metric he raised the
  // depth to fix in the first place.
  //
  // Stamping what we got means a game analysed on the phone is re-analysed when
  // it is next opened somewhere the full depth is reachable.
  // PARALLEL FIRST. The pool cuts the wait by its width (2 on a phone, up to 6
  // on desktop); the sequential singleton below is the fallback for any device
  // where the pool can't spawn — which is what every device did until the pool
  // stopped hardcoding a build iOS can't run.
  // 🔒 THE REVIEW IS WHERE THE DEEP SEARCH LIVES NOW (David 2026-09-05: "dive
  // deeper on the key moments once a single game is selected to be reviewed").
  //
  // The old review searched ALL ~66 plies at ANALYSIS_DEPTH with a 5s budget
  // each: 216 seconds measured on David's iPhone, of which the overwhelming
  // majority went on proving that quiet moves were quiet. PostHog said 11 of his
  // 14 reviews were abandoned before they finished.
  //
  // Now it walks the curve CHEAPLY — and mostly for free, because the sweep
  // already cached those very positions — then re-searches only the moments that
  // moved the eval, at REVIEW_DEEP_DEPTH, which is DEEPER than the old pass. Ten
  // positions get a harder look than sixty-six used to get.
  const isReview = positionBudgetMs === undefined;
  // BULK callers skip the engine on opening-book positions (see firstNonBookPly
  // + the note in analyzeGameOnWorker). The REVIEW keeps every ply, so its
  // eval-curve graph has no opening gap.
  const skipBook = isReview ? 0 : firstNonBookPly(moves);
  const curveBudgetMs = positionBudgetMs ?? BATCH_SHALLOW_BUDGET_MS;

  /** The cheap curve: one eval per ply. */
  const evals: (number | null)[] = fens.map(() => null);
  /** Deep re-searches, by ply. Null where the curve value still stands. */
  const deep: (number | null)[] = fens.map(() => null);
  /** Best move the deep dive found at each re-searched ply (UCI). The dive
   *  already ran a REVIEW_DEEP_DEPTH search at every flagged ply's "before"
   *  position, so the best-move refinement below can reuse it instead of
   *  spending a SECOND full-budget search per flagged ply — on the asm.js
   *  build that second search never reached BEST_MOVE_DEPTH anyway, so it
   *  ran the whole REVIEW_POSITION_BUDGET_MS every time (David 2026-09-05:
   *  "very long initial analysis"). */
  const deepBest: (string | null)[] = fens.map(() => null);
  /** The engine's principal variation (UCI) at each re-searched ply — persisted
   *  on flagged annotations so the fundamentals attributor can corroborate its
   *  board-proved verdict with the line the engine actually plays. */
  const deepPv: string[][] = fens.map(() => []);
  const depthAt: number[] = fens.map(() => 0);
  const toStore: EvalToStore[] = [];
  let achievedDepth = Number.POSITIVE_INFINITY;

  // ── CURVE PASS (cache-first). A position the sweep already scored costs
  // nothing here, which is why the review of a swept game starts near-instantly.
  const cached = await lookupPositionEvals(fens, BATCH_SHALLOW_DEPTH);
  cached.forEach((hit, i) => {
    if (i < skipBook) return;
    evals[i] = hit.evaluation;
    depthAt[i] = hit.depth;
    if (hit.depth >= REVIEW_DEEP_DEPTH) deep[i] = hit.evaluation;
  });
  const pendingIdx: number[] = [];
  for (let i = skipBook; i < fens.length; i++) if (evals[i] === null) pendingIdx.push(i);

  const pooled = pendingIdx.length === 0
    ? { evals: [] as (number | null)[], achievedDepth: BATCH_SHALLOW_DEPTH }
    : await evaluateFensPooled(pendingIdx.map((i) => fens[i]), onPosition, curveBudgetMs, BATCH_SHALLOW_DEPTH);
  if (pooled) {
    pendingIdx.forEach((i, k) => {
      const e = pooled.evals[k] ?? null;
      evals[i] = e;
      if (e !== null && pooled.achievedDepth > 0) {
        depthAt[i] = pooled.achievedDepth;
        toStore.push({ fen: fens[i], evaluation: e, depth: pooled.achievedDepth });
      }
    });
  } else {
    for (let i = 0; i < fens.length; i++) {
      onPosition?.(i + 1, fens.length);
      if (i < skipBook || evals[i] !== null) continue;
      const fen = fens[i];
      try {
        // Budgeted on BOTH paths now — the fast native engine otherwise runs the
        // curve pass uncapped. analyzeWithBudget force-stops at the budget and
        // recovers a dead worker, so neither path can crawl or hang.
        const analysis: StockfishAnalysis = await stockfishEngine.analyzeWithBudget(fen, BATCH_SHALLOW_DEPTH, curveBudgetMs);
        evals[i] = analysis.evaluation;
        if (Number.isFinite(analysis.depth) && analysis.depth > 0) {
          depthAt[i] = analysis.depth;
          toStore.push({ fen, evaluation: analysis.evaluation, depth: analysis.depth });
        }
      } catch {
        evals[i] = null;
      }
    }
  }

  // ── THE DEEP DIVE (review only): every moment the curve says could matter.
  // selectCriticalPlies picks BOTH ends of each swing, so a graded pair is
  // always two evals of the SAME depth — mixing a deep "before" with a shallow
  // "after" would read the depth difference itself as an inaccuracy.
  let deepDiveComplete = false;
  if (isReview && !opts.sweepOnly) {
    const keyPlies = selectCriticalPlies(evals, skipBook, REVIEW_MAX_DEEP_PLIES);
    let searched = 0;
    for (const i of keyPlies) {
      if (deep[i] !== null) { searched++; continue; }
      onPosition?.(fens.length, fens.length);
      try {
        const a = await stockfishEngine.analyzeWithBudget(fens[i], REVIEW_DEEP_DEPTH, REVIEW_POSITION_BUDGET_MS);
        deep[i] = a.evaluation;
        deepBest[i] = a.bestMove || null;
        deepPv[i] = a.topLines?.[0]?.moves?.slice(0, 8) ?? (a.bestMove ? [a.bestMove] : []);
        searched++;
        if (Number.isFinite(a.depth) && a.depth > 0) {
          depthAt[i] = Math.max(depthAt[i], a.depth);
          toStore.push({ fen: fens[i], evaluation: a.evaluation, depth: a.depth, bestMove: a.bestMove || null });
        }
      } catch {
        // Keep the curve value for this ply — a lost deep search costs
        // precision on one move, never the review.
      }
    }
    deepDiveComplete = searched === keyPlies.length;
  }

  for (let i = skipBook; i < fens.length; i++) {
    if (evals[i] !== null && depthAt[i] > 0) achievedDepth = Math.min(achievedDepth, depthAt[i]);
  }

  // PAIR-CONSISTENT grading (see the deep-dive note above).
  const bothDeep = (i: number): boolean => deep[i] !== null && deep[i + 1] !== null;
  const evalBeforeAt = (i: number): number | null => (bothDeep(i) ? deep[i] : evals[i]);
  const evalAfterAt = (i: number): number | null => (bothDeep(i) ? deep[i + 1] : evals[i + 1]);

  const annotations: MoveAnnotation[] = [];
  // BOOK-move exemption (David 2026-08-28): theory moves are never errors.
  let stillBook = true;
  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const isWhiteMove = moveIdx % 2 === 0;
    const color: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    const moveNumber = Math.floor(moveIdx / 2) + 1;

    const evalBefore = evalBeforeAt(moveIdx);
    const evalAfter = evalAfterAt(moveIdx);

    let classification: MoveClassification = 'good';
    let bestMove: string | null = null;
    // `refinedBestMoveEval` overrides `evalBefore` when a deeper analysis
    // succeeds for this mistake; otherwise we fall back to the shallow
    // pre-move eval (see annotation push below).
    let refinedBestMoveEval: number | null = null;

    const moveIsBook = stillBook && isBookLine(moves.slice(0, moveIdx + 1));
    if (!moveIsBook) stillBook = false;

    if (evalBefore !== null && evalAfter !== null) {
      // Clamp through capEval so a mate score can't inflate stored cpLoss
      // (see the matching note in the first annotation loop). RAW evals
      // still drive classifyCpLoss's mate/brilliant/blunder detection.
      const cpLoss = isWhiteMove
        ? capEval(evalBefore) - capEval(evalAfter)
        : capEval(evalAfter) - capEval(evalBefore);

      const graded = classifyCpLoss(cpLoss, evalBefore, evalAfter, isWhiteMove, moves[moveIdx]?.includes('#'));

      // BOOK exemption — theory suppresses opening eval-noise but a genuine
      // blunder still surfaces even in a named line (see the first loop's note).
      if (moveIsBook && (graded === 'good' || graded === 'inaccuracy' || graded === 'mistake')) {
        classification = 'book';
      } else {
        classification = graded;
        if (cpLoss >= INACCURACY_CP && graded !== 'brilliant' && graded !== 'great' && graded !== 'good') {
          const reused = deepBest[moveIdx];
          if (reused) {
            // The dive already searched this exact position deep — the move it
            // found IS the refinement. Same engine, same depth the verdict was
            // settled at; a second search here bought nothing but wall-clock.
            bestMove = bestMoveEqualsPlayed(fens[moveIdx], moves[moveIdx], reused) ? null : reused;
            refinedBestMoveEval = evalBefore;
          } else try {
            const bestAnalysis: StockfishAnalysis = await stockfishEngine.analyzeWithBudget(
              fens[moveIdx], BEST_MOVE_DEPTH, positionBudgetMs ?? REVIEW_POSITION_BUDGET_MS);
            bestMove = bestMoveEqualsPlayed(fens[moveIdx], moves[moveIdx], bestAnalysis.bestMove)
              ? null
              : bestAnalysis.bestMove;
            refinedBestMoveEval = bestAnalysis.evaluation;
            if (Number.isFinite(bestAnalysis.depth) && bestAnalysis.depth > 0) {
              toStore.push({ fen: fens[moveIdx], evaluation: bestAnalysis.evaluation, depth: bestAnalysis.depth, bestMove: bestAnalysis.bestMove });
            }
          } catch {
            // Leave bestMove null + keep the shallow bestMoveEval below
          }
        }
      }
    } else if (moveIsBook) {
      classification = 'book'; // theory move, evals unavailable — still not a mistake
    }

    // Persist the engine lines at a flagged ply: the punishment after the
    // played move (the dive at fens[moveIdx+1]) and the continuation after the
    // best move (the dive at fens[moveIdx], minus its first move).
    const flaggedHere = classification === 'inaccuracy' || classification === 'mistake' || classification === 'blunder';
    const pvAfterPlayed = deepPv[moveIdx + 1] ?? [];
    const pvAtBefore = deepPv[moveIdx] ?? [];
    const pvAfterBest = bestMove && pvAtBefore[0] && bestMoveEqualsUci(fens[moveIdx], bestMove, pvAtBefore[0]) ? pvAtBefore.slice(1) : [];
    annotations.push({
      moveNumber,
      color,
      san: moves[moveIdx],
      // Centipawns, White POV — same contract as analyzeGameOnWorker.
      evaluation: evalAfter !== null ? evalAfter : null,
      bestMove,
      // Deeper-depth value for refined mistakes; shallow `evalBefore`
      // otherwise. Both are cp/White-POV — same unit as `evaluation`.
      bestMoveEval: refinedBestMoveEval !== null ? refinedBestMoveEval
        : (evalBefore !== null ? evalBefore : null),
      classification,
      comment: null,
      ...(flaggedHere && (pvAfterPlayed.length || pvAfterBest.length) ? { pv: { afterPlayed: pvAfterPlayed, afterBest: pvAfterBest } } : {}),
    });
  }

  if (toStore.length > 0) await storePositionEvals(toStore);

  return {
    annotations,
    // WHAT THIS RUN COMMITS TO, which is not the same as the shallowest search
    // it ran. A completed review re-searched every moment that could change a
    // verdict at REVIEW_DEEP_DEPTH, so it claims ANALYSIS_DEPTH and
    // `gameNeedsAnalysis` leaves it alone — stamping the quiet plies' shallow
    // depth instead would re-run the whole analysis on every re-open. The sweep
    // claims only its shallow pass, which is what schedules the deep dive.
    // A game where every position threw measured nothing, so it claims nothing —
    // 0 reads as stale, which is exactly right.
    achievedDepth: deepDiveComplete
      ? ANALYSIS_DEPTH
      : (Number.isFinite(achievedDepth) ? Math.min(achievedDepth, ANALYSIS_DEPTH) : 0),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyze a single game and store the results. Returns existing annotations
 * if the game is already fully analyzed, otherwise runs Stockfish analysis.
 */
export async function analyzeSingleGame(
  gameId: string,
  onProgress?: (phase: string) => void,
  opts: { sweepOnly?: boolean } = {},
): Promise<MoveAnnotation[] | null> {
  const game = await db.games.get(gameId);
  if (!game) return null;

  // Already analyzed — return existing annotations
  if (!gameNeedsAnalysis(game)) {
    return game.annotations ?? null;
  }

  // The review is BLOCKED on this one game — pause the bulk batch so it
  // stops competing for the engine/CPU, and surface real per-move progress
  // (a minutes-long spinner with no counter reads as a hang).
  pauseBatchAnalysis();
  const reviewStartedAt = Date.now();
  try {
    onProgress?.('Analyzing positions with Stockfish…');
    const result = await analyzeGamePositions(game, (current, total) => {
      onProgress?.(`Analyzing move ${current} of ${total}…`);
    }, undefined, opts);
    if (!result) return null;
    const { annotations, achievedDepth } = result;

    // Store back to DB — stamped with the depth the search REACHED, so a game
    // analysed on a slow engine is re-deepened next time it is opened on a fast
    // one. See the note in `analyzeGamePositions`.
    await db.games.update(gameId, { annotations, fullyAnalyzed: true, analysisDepth: achievedDepth });

    // The OTHER half of the split (see BATCH_SHALLOW_DEPTH): the review is the
    // surface with a person watching a progress bar, and it was the one measured
    // at 216s before the rework. Measure it directly rather than by feel.
    void logAppAudit({
      kind: 'analysis-review-done',
      category: 'subsystem',
      source: 'gameAnalysisService.analyzeSingleGame',
      summary: `review of ${game.white} vs ${game.black} in ${((Date.now() - reviewStartedAt) / 1000).toFixed(1)}s — ${annotations.length} moves, depth=${achievedDepth}`,
    });

    return annotations;
  } finally {
    resumeBatchAnalysis();
  }
}

/**
 * Check if a game needs (re-)analysis. Uses the `fullyAnalyzed` flag
 * set by `analyzeAllGames` as the single source of truth. The old
 * heuristic (`annotations.length < moves.length / 2`) is kept as a
 * fallback for games imported before the flag existed — once the
 * flag is set, the heuristic is never consulted again.
 *
 * Also flags annotations produced before the `bestMoveEval` field
 * existed. Those records stored `evaluation` in pawn units (legacy
 * `/ 100` storage) — running the new cp-calibrated consumer math
 * against them would underreport every accuracy / swing by a factor
 * of 100. Re-running Stockfish normalises to centipawns and
 * populates `bestMoveEval` for the missed-tactic / missed-opportunity
 * surfaces. Master games and sample-seeded games already carry
 * pre-baked annotations in the correct unit, so they short-circuit
 * out of this branch via the earlier guards.
 */
export function gameNeedsAnalysis(
  game: GameRecord,
  opts: { depthUpgrade?: boolean } = {},
): boolean {
  // The depth-16 deepening is LAZY (David 2026-06-27: "Only new/opened
  // games"). A single-game open/import re-analyzes a depth-stale game
  // (`depthUpgrade` defaults true); the BACKGROUND batch sweeps pass
  // `depthUpgrade: false` so opening the depth bump does NOT re-crunch
  // every already-analyzed game (690 at once is the failure mode).
  const { depthUpgrade = true } = opts;
  if (game.isMasterGame) return false;
  if (!game.annotations || game.annotations.length === 0) return true;

  // Pre-`bestMoveEval` annotations are stale-unit (pawns) — re-analyze.
  // Hand-curated sample games carry the field; master games are gated
  // out above. Only real Stockfish-produced legacy records hit this.
  const first = game.annotations[0];
  if (first.bestMoveEval === undefined) return true;

  if (game.fullyAnalyzed === true) {
    // Re-analyze a fully-analyzed game whose eval curve was produced at a
    // shallower depth than we now use — the deeper search is the accuracy
    // fix. Records predating `analysisDepth` (depth 12) read as stale and
    // refresh once. (One-time per game; re-stamped on completion.) Gated
    // to the on-open path so the batch sweep never triggers it en masse.
    return depthUpgrade && (game.analysisDepth ?? 0) < ANALYSIS_DEPTH;
  }

  // Legacy fallback for games imported before the fullyAnalyzed flag.
  const { moves } = replayPgnToFens(game.pgn);
  if (moves.length === 0) return false;
  return game.annotations.length < moves.length / 2;
}

/**
 * Count games that are missing or have incomplete annotations.
 */
export async function countGamesNeedingAnalysis(): Promise<number> {
  const games = await db.games
    .filter((g) => gameNeedsAnalysis(g, { depthUpgrade: false }))
    .count();
  return games;
}

/**
 * Analyze ONLY the N most-recent unanalyzed games, sequentially, on
 * the singleton engine. Used by the /coach/teach kickoff so the
 * lesson can start the moment the games the coach actually references
 * are ready — instead of waiting for hundreds of older games to
 * finish via `analyzeAllGames`'s 6-worker pool.
 *
 * `onProgress({ current, total, label })` fires once before each game
 * and once after the batch completes. Returns the count actually
 * analyzed (≤ n).
 */
export async function analyzeRecentGames(
  n: number,
  onProgress?: (p: { current: number; total: number; label: string }) => void,
): Promise<number> {
  const allGames = await db.games
    .filter((g) => gameNeedsAnalysis(g, { depthUpgrade: false }))
    .toArray();

  if (allGames.length === 0) {
    onProgress?.({ current: 0, total: 0, label: 'No games to analyze.' });
    return 0;
  }

  const sorted = allGames.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });
  const batch = sorted.slice(0, Math.max(0, n));
  let analyzed = 0;

  for (let i = 0; i < batch.length; i++) {
    const game = batch[i];
    onProgress?.({
      current: i + 1,
      total: batch.length,
      label: `Analyzing game ${i + 1} of ${batch.length}…`,
    });
    try {
      const result = await analyzeGamePositions(game, undefined, BATCH_SHALLOW_BUDGET_MS);
      if (result && result.annotations.length > 0) {
        await db.games.update(game.id, {
          annotations: result.annotations, fullyAnalyzed: true, analysisDepth: result.achievedDepth,
        });
        analyzed++;
      }
    } catch (err) {
      console.warn('[analyzeRecentGames] failed for', game.id, err);
    }
  }
  onProgress?.({ current: batch.length, total: batch.length, label: 'Ready.' });
  return analyzed;
}

/**
 * How many games a single batch invocation analyzes before stopping.
 *
 * David 2026-09-05: a full library (his was 831 games) never finished in one
 * run on the phone — it either ground for hours or got interrupted by an iOS
 * suspend before the end. We analyze in bounded PACKAGES of 50 newest-first
 * and then STOP. Each analyzed game persists as it finishes and is filtered
 * out of the next `gameNeedsAnalysis` scan, so the next tap of the Analyze
 * Games button picks up the next 50 with no cursor to track. Bounded work,
 * visible completion, user-controlled cadence.
 */
export const ANALYSIS_PACKAGE_SIZE = 50;

/**
 * Batch-analyze up to ANALYSIS_PACKAGE_SIZE imported/played games that lack
 * annotations (newest-first). Spins up WORKER_POOL_SIZE dedicated Stockfish
 * workers, each analyzing a different game simultaneously for true parallel
 * throughput. Falls back to the singleton engine if worker creation fails.
 * After the package is analyzed, recomputes the weakness profile. Returns the
 * number of games actually analyzed in this package (≤ ANALYSIS_PACKAGE_SIZE).
 */
export async function analyzeAllGames(
  onProgress?: (progress: BatchAnalysisProgress) => void,
): Promise<number> {
  const allGames = await db.games
    .filter((g) => gameNeedsAnalysis(g, { depthUpgrade: false }))
    .toArray();

  // Newest games first (reverse chronological), then cap to one package. The
  // remainder is left un-annotated and picked up by the next invocation.
  const games = allGames.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  }).slice(0, ANALYSIS_PACKAGE_SIZE);

  if (games.length === 0) {
    await recomputeWeaknessFromGames();
    return 0;
  }

  // Listen for app going to background — iOS suspends workers, causing hangs
  _abortAnalysis = false;
  const handleVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      _abortAnalysis = true;
      console.log('[GameAnalysis] App backgrounded — aborting analysis');
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Try to spawn dedicated workers
  const workers: DedicatedWorker[] = [];
  // Every worker alive at the end goes back to the warm pool — including a
  // recycled replacement for one that wedged.
  const live = new Set<DedicatedWorker>();
  try {
    workers.push(...await acquirePool(WORKER_POOL_SIZE));
    workers.forEach((w) => live.add(w));
    console.log(`[GameAnalysis] ${workers.length} workers ready — analyzing ${games.length} games`);
  } catch {
    console.warn('[GameAnalysis] Worker pool failed, falling back to single engine');
    // AUDIT IT. This fallback was console-only, so when the asm pool timed out on
    // every iPhone (2026-09-05) the audit stream showed workers spawning and then
    // nothing — the single most important fact about the run was invisible. The
    // sequential singleton it falls to is slow (web asm) or wedges (native), so a
    // pool failure IS the "stuck at 1" symptom and must be self-identifying.
    void logAppAudit({
      kind: 'analysis-pool-fallback',
      category: 'subsystem',
      source: 'gameAnalysisService.analyzeAllGames',
      summary: `worker pool failed to spawn — falling back to the SEQUENTIAL singleton for ${games.length} games (this is the "stuck at 1" path)`,
    });
    workers.forEach((w) => w.destroy());
    workers.length = 0;
  }

  let analyzed = 0;
  let completed = 0;
  const sweepStartedAt = Date.now();
  const analyzedGameIds: string[] = [];

  // Per-game insight generation — runs INLINE as each game finishes analysis,
  // NOT batched at the very end. On a library with many games the end-of-run
  // batch rarely completes uninterrupted (iOS suspends the webview, the user
  // navigates away or locks the phone → `_abortAnalysis`), and the old batch
  // loop was gated behind `if (_abortAnalysis) break`, so it generated ZERO
  // puzzles even though dozens of games were already annotated — the empty
  // My Mistakes / Weaknesses bug despite a full game library (David 2026-06-06:
  // "many games imported… no errors to drill"). Generating per-game means every
  // analyzed game contributes its mistakes immediately and survives any
  // interruption. The username is needed so the mistake generator can tell
  // which side the student played in imported games (else 0 puzzles).
  const profile = useAppStore.getState().activeProfile;
  const chessComUsername = profile?.preferences.chessComUsername;
  const lichessUsername = profile?.preferences.lichessUsername;
  const generateInsightsForGame = async (
    gameId: string,
    source: GameRecord['source'],
    annotations: MoveAnnotation[],
  ): Promise<void> => {
    const username = source === 'chesscom' ? chessComUsername
      : source === 'lichess' ? lichessUsername
        : undefined; // coach games infer the side from "Stockfish Bot"
    try { await generateMistakePuzzlesFromGame(gameId, username); } catch { /* continue */ }
    // Thinking-Errors bucket — the bulk faucet (was interactive-only, so a
    // freshly analyzed library never filled the tab). Deterministic + free now.
    try { await autoAnalyzeGameMisconceptions(gameId, username); } catch { /* continue */ }
    try { await classifyTacticsFromGame(gameId); } catch { /* continue */ }
    if (profile && annotations.length > 0) {
      try { await detectBadHabitsFromGame(annotations, profile); } catch { /* continue */ }
    }
  };

  try {
    if (workers.length > 0) {
      // Parallel: each worker grabs the next game from the queue
      let nextGameIdx = 0;

      const processNextGame = async (initialWorker: DedicatedWorker): Promise<void> => {
        let worker = initialWorker;
        while (nextGameIdx < games.length && !_abortAnalysis) {
          await waitWhilePaused(); // a review's single-game analysis owns the CPU
          if (_abortAnalysis) break;
          const idx = nextGameIdx++;
          const game = games[idx];

          onProgress?.({
            currentGame: completed + 1,
            totalGames: games.length,
            currentGameName: `${game.white} vs ${game.black}`,
            phase: 'analyzing',
          });

          let worked: { annotations: MoveAnnotation[]; achievedDepth: number; stats: GameAnalysisStats } | null = null;
          const gameStartedAt = Date.now();
          try {
            worked = await analyzeGameOnWorker(game, worker);
          } catch (e) {
            if (e instanceof WorkerWedgedError) {
              // Dead worker → respawn a fresh one so it stops poisoning every
              // subsequent game with full-timeout waits. Leave THIS game
              // un-analyzed (not stamped fullyAnalyzed) so the next sweep retries
              // it; advance the counter so the batch keeps moving (the "stuck at
              // 1/629" fix). If respawn fails, drop this worker from the pool —
              // the other workers carry the batch.
              console.warn(`[GameAnalysis] worker wedged on ${game.id}; recycling`);
              live.delete(worker);
              try { worker.destroy(); } catch { /* already dead */ }
              try {
                worker = await spawnDedicatedWorker(nextGameIdx);
                live.add(worker);
              } catch {
                completed++;
                break;
              }
              completed++;
              continue;
            }
            throw e;
          }
          if (worked && worked.annotations.length > 0) {
            // Stamp what the search REACHED, not what it was asked for — the
            // same correction the review path got. A game analysed shallow on
            // a slow engine must stay re-analysable.
            await db.games.update(game.id, {
              annotations: worked.annotations, fullyAnalyzed: true, analysisDepth: worked.achievedDepth,
            });
            analyzedGameIds.push(game.id);
            analyzed++;
            // MEASURE the sweep (see GameAnalysisStats). One line per game, so
            // throughput, cache effectiveness and reached depth are all readable
            // straight off the audit stream instead of inferred from side effects.
            const st = worked.stats;
            void logAppAudit({
              kind: 'analysis-game-done',
              category: 'subsystem',
              source: 'gameAnalysisService.analyzeAllGames',
              summary: `game ${analyzed}/${games.length} in ${Date.now() - gameStartedAt}ms — ${st.plies} plies (${st.searched} searched, ${st.fromCache} cached, ${st.skippedBook} book), ${st.refined} refined, depth=${worked.achievedDepth}`,
            });
            // Generate this game's mistakes NOW — don't wait for the whole
            // batch to finish (it often never does on a big library).
            await generateInsightsForGame(game.id, game.source, worked.annotations);
          }
          completed++;
        }
      };

      await Promise.all(workers.map((w) => processNextGame(w)));
    } else {
      // Fallback: single engine, sequential
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by visibilitychange handler
      for (let i = 0; i < games.length && !_abortAnalysis; i++) {
        await waitWhilePaused(); // a review's single-game analysis owns the CPU
        if (_abortAnalysis) break;
        const game = games[i];
        onProgress?.({
          currentGame: i + 1,
          totalGames: games.length,
          currentGameName: `${game.white} vs ${game.black}`,
          phase: 'analyzing',
        });

        const result = await analyzeGamePositions(game, undefined, BATCH_SHALLOW_BUDGET_MS);
        if (result && result.annotations.length > 0) {
          await db.games.update(game.id, {
            annotations: result.annotations, fullyAnalyzed: true, analysisDepth: result.achievedDepth,
          });
          analyzedGameIds.push(game.id);
          analyzed++;
          await generateInsightsForGame(game.id, game.source, result.annotations);
        }
      }
    }
  } finally {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    releasePool([...live]); // stay warm for the next package
    // Run-level summary. Emitted in `finally` ON PURPOSE so a sweep the user
    // STOPS is measured too — David stopped his 2026-09-05 run at 13 of 50, and
    // without this the run's own record simply ended mid-air.
    const sweepMs = Date.now() - sweepStartedAt;
    const stopped = _abortAnalysis || _userCancelled;
    void logAppAudit({
      kind: 'analysis-sweep-summary',
      category: 'subsystem',
      source: 'gameAnalysisService.analyzeAllGames',
      summary: `${stopped ? 'STOPPED' : 'finished'} after ${analyzed}/${games.length} games in ${(sweepMs / 1000).toFixed(1)}s`
        + (analyzed > 0 ? ` — ${(sweepMs / analyzed / 1000).toFixed(1)}s/game` : '')
        + ` (${workers.length} workers, ${WORKER_POOL_SIZE} configured)`,
    });
  }

  onProgress?.({
    currentGame: games.length,
    totalGames: games.length,
    currentGameName: '',
    phase: 'computing_weaknesses',
  });

  // Mistake puzzles / tactic classification / bad-habit detection already ran
  // INLINE per game as each finished analysis (see generateInsightsForGame
  // above) — so even a run interrupted partway through has produced puzzles for
  // every game it did analyze. Just refresh the aggregate weakness profile.
  await recomputeWeaknessFromGames();
  // Keep the per-FEN eval cache bounded (oldest-first) — cheap count, rare trim.
  void prunePositionEvalCache();

  onProgress?.({
    currentGame: games.length,
    totalGames: games.length,
    currentGameName: '',
    phase: 'done',
  });

  return analyzed;
}

/**
 * Recompute the weakness profile and update the Zustand store.
 * Also updates Game ELO from the most recent imported game.
 */
async function recomputeWeaknessFromGames(): Promise<void> {
  const profile = useAppStore.getState().activeProfile;
  if (!profile) return;

  // NON-FATAL: the per-game mistake puzzles / tactic classifications already
  // persisted INLINE as each game finished (see generateInsightsForGame). This
  // is only the aggregate refresh at the tail of "Analyzing your games", so a
  // transient DB hiccup here must NOT sink the whole run — the analysis work is
  // already saved. A rejection escaping this used to crash the "Analyzing your
  // games" screen at the computing_weaknesses phase (David 2026-08-26, PostHog
  // "cursor that doesn't exist"). Root-fixed in computeWeaknessProfile (one
  // shared read transaction); this catch is the belt-and-suspenders.
  try {
    await updateEloFromImportedGames(profile);

    const weaknessProfile = await computeWeaknessProfile(profile);
    useAppStore.getState().setWeaknessProfile(weaknessProfile);

    const updatedProfile = await db.profiles.get(profile.id);
    if (updatedProfile) {
      useAppStore.getState().setActiveProfile(updatedProfile);
    }
  } catch (err) {
    void logAppAudit({
      kind: 'dexie-error',
      category: 'subsystem',
      source: 'gameAnalysisService.recomputeWeaknessFromGames',
      summary: 'aggregate weakness refresh failed (non-fatal — per-game analysis already saved)',
      details: err instanceof Error ? (err.stack ?? err.message) : String(err),
    });
  }
}

/**
 * Updates the player's Game ELO from their most recent imported game.
 * Looks at Lichess/Chess.com games to find the player's rating.
 */
async function updateEloFromImportedGames(profile: UserProfile): Promise<void> {
  const recentGames = await db.games
    .orderBy('date')
    .reverse()
    .limit(20)
    .toArray();

  const playerName = profile.name.toLowerCase();
  for (const game of recentGames) {
    if (game.source !== 'lichess' && game.source !== 'chesscom') continue;

    // Determine which side the player is on by matching name
    const isWhite = game.white.toLowerCase().includes(playerName)
      || playerName.includes(game.white.toLowerCase());
    const isBlack = game.black.toLowerCase().includes(playerName)
      || playerName.includes(game.black.toLowerCase());

    const playerElo = isWhite ? game.whiteElo : isBlack ? game.blackElo : null;
    if (playerElo && playerElo !== profile.currentRating) {
      await db.profiles.update(profile.id, { currentRating: playerElo });
      return;
    }
  }
}

// ─── Background Auto-Analysis ───────────────────────────────────────────────

let _backgroundRunning = false;

/**
 * Fire-and-forget: analyze all unanalyzed games in the background.
 * Safe to call multiple times — only one run at a time.
 * Called automatically after game imports.
 */
export function runBackgroundAnalysis(): void {
  if (_backgroundRunning) return;
  _backgroundRunning = true;
  _userCancelled = false; // a fresh run clears any prior user cancel

  const store = useAppStore.getState();
  store.setBackgroundAnalysis(true, 'Starting analysis...');

  void analyzeAllGames((progress) => {
    const label = progress.phase === 'computing_weaknesses'
      ? 'Computing weaknesses...'
      : progress.phase === 'done'
        ? null
        : `${progress.currentGame}/${progress.totalGames} — ${progress.currentGameName}`;
    useAppStore.getState().setBackgroundAnalysis(true, label);
  })
    .catch((err: unknown) => {
      console.warn('[GameAnalysis] Background analysis failed:', err);
    })
    .finally(() => {
      _backgroundRunning = false;
      useAppStore.getState().setBackgroundAnalysis(false, null);

      // If aborted due to backgrounding, auto-restart when app returns — but
      // NOT when the user explicitly cancelled (that must stay stopped).
      if (_abortAnalysis && !_userCancelled) {
        // App may already be visible again by the time we reach .finally()
        if (document.visibilityState === 'visible') {
          _abortAnalysis = false;
          // Defer to avoid synchronous re-entry
          setTimeout(() => runBackgroundAnalysis(), 500);
        } else {
          const resumeHandler = (): void => {
            if (document.visibilityState === 'visible') {
              document.removeEventListener('visibilitychange', resumeHandler);
              _abortAnalysis = false;
              runBackgroundAnalysis();
            }
          };
          document.addEventListener('visibilitychange', resumeHandler);
        }
      }
    });
}

/** Internals exposed for gating only.
 *
 *  `evaluateFensPooled` is the review's parallel eval curve and it cannot be
 *  reached from the public API in a test: jsdom has no `Worker`, so every
 *  existing test in `gameAnalysisService.test.ts` silently takes the sequential
 *  fallback. Its correctness — that the pool asks `resolveWorkerUrl` for the
 *  build rather than naming one, and that a work queue still returns each eval
 *  against the position it belongs to — is exactly what needs a gate.
 *  See `gameAnalysisPool.test.ts`. */
export const __testables = {
  evaluateFensPooled, POOL_SPAWN_TIMEOUT_MS, ASM_POOL_SPAWN_TIMEOUT_MS, WORKER_POOL_SIZE, resolveWorkerPoolSize,
  resetAnalysisPool, WARM_PING_TIMEOUT_MS, BATCH_SHALLOW_DEPTH, BATCH_SHALLOW_BUDGET_MS, BATCH_POSITION_BUDGET_MS,
  REVIEW_DEEP_DEPTH, REVIEW_POSITION_BUDGET_MS, BATCH_GRADE_FLOOR_CP, REVIEW_MAX_DEEP_PLIES,
};
