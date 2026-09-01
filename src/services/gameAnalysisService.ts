import { Capacitor } from '@capacitor/core';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine, resolveWorkerUrl } from './stockfishEngine';
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
const BEST_MOVE_DEPTH = 18;
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
function resolveWorkerPoolSize(): number {
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  let isNative = false;
  try { isNative = Capacitor.isNativePlatform(); } catch { /* web */ }
  if (isNative) {
    // Phone: never more than 2, always leave cores for the UI + voice.
    return Math.max(1, Math.min(2, cores - 2));
  }
  // Desktop web: keep it quick but don't hog every core.
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

function spawnDedicatedWorker(index: number): Promise<DedicatedWorker> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Worker ${index} init timed out`));
    }, POOL_SPAWN_TIMEOUT_MS);

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

/** Per-position search budget for the REVIEW's eval curve, mirroring the
 *  singleton's variant budgets. A slow engine must be capped or a single deep
 *  position eats the whole wait. */
const REVIEW_POSITION_BUDGET_MS = 5_000;

/** Consecutive position timeouts on ONE worker that mean it's wedged/dead (a
 *  live engine never times out this many in a row) — the batch then recycles it
 *  instead of grinding every remaining position through the reject. */
const WORKER_WEDGE_LIMIT = 3;

/** Thrown by analyzeGameOnWorker when its worker is wedged; the batch loop
 *  catches it, destroys + respawns the worker, and moves on (the game is left
 *  un-analyzed for the next sweep). */
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
): Promise<{ evals: (number | null)[]; achievedDepth: number } | null> {
  const size = Math.max(1, Math.min(WORKER_POOL_SIZE, fens.length));
  let workers: DedicatedWorker[] = [];
  try {
    workers = await Promise.all(
      Array.from({ length: size }, (_, i) => spawnDedicatedWorker(i)),
    );
  } catch {
    // Pool unavailable on this device — the singleton path still works.
    workers.forEach((w) => w.destroy());
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
        const a = await w.analyzePosition(fens[i], ANALYSIS_DEPTH, REVIEW_POSITION_BUDGET_MS);
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
    workers.forEach((w) => w.destroy());
  }
  return {
    evals,
    achievedDepth: Number.isFinite(achievedDepth) ? Math.min(achievedDepth, ANALYSIS_DEPTH) : 0,
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
): Promise<{ annotations: MoveAnnotation[]; achievedDepth: number } | null> {
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
  const evals: (number | null)[] = [];
  let achievedDepth = Number.POSITIVE_INFINITY;
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
  for (const fen of fens) {
    if (_abortAnalysis) return null;
    try {
      const result = await worker.analyzePosition(fen, ANALYSIS_DEPTH, REVIEW_POSITION_BUDGET_MS);
      evals.push(result.evaluation);
      consecutiveTimeouts = 0;
      if (Number.isFinite(result.depth) && result.depth > 0) {
        achievedDepth = Math.min(achievedDepth, result.depth);
      }
    } catch (e) {
      evals.push(null);
      if (e instanceof Error && /timed out/i.test(e.message)) {
        if (++consecutiveTimeouts >= WORKER_WEDGE_LIMIT) throw new WorkerWedgedError(game.id);
      } else {
        consecutiveTimeouts = 0;
      }
    }
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
      if (moveIsBook && (graded === 'good' || graded === 'inaccuracy' || graded === 'mistake')) {
        classification = 'book';
      } else {
        classification = graded;
        if (cpLoss >= INACCURACY_CP && graded !== 'brilliant' && graded !== 'great' && graded !== 'good') {
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
    try {
      const result = await worker.analyzePosition(fens[moveIdx], BEST_MOVE_DEPTH);
      annotations[moveIdx].bestMove = bestMoveEqualsPlayed(fens[moveIdx], moves[moveIdx], result.bestMove)
        ? null
        : result.bestMove;
      // Overwrite the shallow bestMoveEval with the deeper-depth value
      // for this position. Same engine, deeper search — keeps the swing
      // math (detectMisses / detectMissedTactics) on the most reliable
      // number available for the moves where it actually matters.
      annotations[moveIdx].bestMoveEval = result.evaluation;
    } catch {
      // Leave bestMove null + keep the shallow bestMoveEval
    }
  }

  return {
    annotations,
    achievedDepth: Number.isFinite(achievedDepth) ? Math.min(achievedDepth, ANALYSIS_DEPTH) : 0,
  };
}

/**
 * Fallback: analyze a single game with the singleton engine (no pool).
 */
async function analyzeGamePositions(
  game: GameRecord,
  onPosition?: (current: number, total: number) => void,
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
  let evals: (number | null)[];
  let achievedDepth = Number.POSITIVE_INFINITY;
  const pooled = await evaluateFensPooled(fens, onPosition);
  if (pooled) {
    evals = pooled.evals;
    achievedDepth = pooled.achievedDepth;
  } else {
    evals = [];
    for (const fen of fens) {
      onPosition?.(evals.length + 1, fens.length);
      try {
        const analysis: StockfishAnalysis = await stockfishEngine.analyzePosition(fen, ANALYSIS_DEPTH);
        evals.push(analysis.evaluation);
        if (Number.isFinite(analysis.depth) && analysis.depth > 0) {
          achievedDepth = Math.min(achievedDepth, analysis.depth);
        }
      } catch {
        evals.push(null);
      }
    }
  }

  const annotations: MoveAnnotation[] = [];
  // BOOK-move exemption (David 2026-08-28): theory moves are never errors.
  let stillBook = true;
  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const isWhiteMove = moveIdx % 2 === 0;
    const color: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    const moveNumber = Math.floor(moveIdx / 2) + 1;

    const evalBefore = evals[moveIdx];
    const evalAfter = evals[moveIdx + 1];

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
          try {
            const bestAnalysis: StockfishAnalysis = await stockfishEngine.analyzePosition(fens[moveIdx], BEST_MOVE_DEPTH);
            bestMove = bestMoveEqualsPlayed(fens[moveIdx], moves[moveIdx], bestAnalysis.bestMove)
              ? null
              : bestAnalysis.bestMove;
            refinedBestMoveEval = bestAnalysis.evaluation;
          } catch {
            // Leave bestMove null + keep the shallow bestMoveEval below
          }
        }
      }
    } else if (moveIsBook) {
      classification = 'book'; // theory move, evals unavailable — still not a mistake
    }

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
    });
  }

  return {
    annotations,
    // A game where every position threw measured nothing, so it claims nothing —
    // 0 reads as stale, which is exactly right.
    achievedDepth: Number.isFinite(achievedDepth) ? Math.min(achievedDepth, ANALYSIS_DEPTH) : 0,
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
  try {
    onProgress?.('Analyzing positions with Stockfish…');
    const result = await analyzeGamePositions(game, (current, total) => {
      onProgress?.(`Analyzing move ${current} of ${total}…`);
    });
    if (!result) return null;
    const { annotations, achievedDepth } = result;

    // Store back to DB — stamped with the depth the search REACHED, so a game
    // analysed on a slow engine is re-deepened next time it is opened on a fast
    // one. See the note in `analyzeGamePositions`.
    await db.games.update(gameId, { annotations, fullyAnalyzed: true, analysisDepth: achievedDepth });

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
      const result = await analyzeGamePositions(game);
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
 * Batch-analyze all imported/played games that lack annotations.
 * Spins up WORKER_POOL_SIZE dedicated Stockfish workers, each analyzing
 * a different game simultaneously for true parallel throughput.
 * Falls back to the singleton engine if worker creation fails.
 * After all games are analyzed, recomputes the weakness profile.
 */
export async function analyzeAllGames(
  onProgress?: (progress: BatchAnalysisProgress) => void,
): Promise<number> {
  const allGames = await db.games
    .filter((g) => gameNeedsAnalysis(g, { depthUpgrade: false }))
    .toArray();

  // Analyze newest games first (reverse chronological)
  const games = allGames.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

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
  try {
    const spawnPromises: Promise<DedicatedWorker>[] = [];
    for (let i = 0; i < WORKER_POOL_SIZE; i++) {
      spawnPromises.push(spawnDedicatedWorker(i));
    }
    workers.push(...await Promise.all(spawnPromises));
    console.log(`[GameAnalysis] ${workers.length} workers ready — analyzing ${games.length} games`);
  } catch {
    console.warn('[GameAnalysis] Worker pool failed, falling back to single engine');
    workers.forEach((w) => w.destroy());
    workers.length = 0;
  }

  let analyzed = 0;
  let completed = 0;
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

          let worked: { annotations: MoveAnnotation[]; achievedDepth: number } | null = null;
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
              try { worker.destroy(); } catch { /* already dead */ }
              try {
                worker = await spawnDedicatedWorker(nextGameIdx);
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
            // Generate this game's mistakes NOW — don't wait for the whole
            // batch to finish (it often never does on a big library).
            await generateInsightsForGame(game.id, game.source, worked.annotations);
          }
          completed++;
        }
        // A recycled worker isn't in the tracked `workers[]`, so the outer
        // cleanup won't reach it — destroy it here when this lane is done.
        if (worker !== initialWorker) { try { worker.destroy(); } catch { /* already dead */ } }
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

        const result = await analyzeGamePositions(game);
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
    workers.forEach((w) => w.destroy());
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
export const __testables = { evaluateFensPooled, POOL_SPAWN_TIMEOUT_MS };
