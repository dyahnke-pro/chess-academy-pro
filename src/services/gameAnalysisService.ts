import { Capacitor } from '@capacitor/core';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine } from './stockfishEngine';
import { computeWeaknessProfile } from './weaknessAnalyzer';
import { generateMistakePuzzlesFromGame } from './mistakePuzzleService';
import { autoAnalyzeGameMisconceptions } from './autoAnalyzeGame';
import { detectBadHabitsFromGame } from './coachFeatureService';
import { classifyTacticsFromGame } from './tacticClassifierService';
import { useAppStore } from '../stores/appStore';
import type { GameRecord, MoveAnnotation, MoveClassification, StockfishAnalysis, UserProfile } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BatchAnalysisProgress {
  currentGame: number;
  totalGames: number;
  currentGameName: string;
  phase: 'analyzing' | 'computing_weaknesses' | 'done';
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ANALYSIS_DEPTH = 12;
const BEST_MOVE_DEPTH = 18;
const BLUNDER_CP = 300;
const MISTAKE_CP = 100;
const INACCURACY_CP = 50;
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
const INIT_TIMEOUT_MS = 45_000;

// Abort signal for background suspension
let _abortAnalysis = false;

// ─── Helpers ────────────────────────────────────────────────────────────────

// MATE_EVAL_THRESHOLD is now exported from engineConstants so all
// subsystems share the same value. Local alias kept for readability.
import { MATE_EVAL_THRESHOLD, MATE_EVAL_VALUE } from './engineConstants';

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

function classifyCpLoss(
  cpLoss: number,
  evalBefore?: number | null,
  evalAfter?: number | null,
  isPlayerWhiteMove?: boolean,
): MoveClassification {
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

  if (cpLoss >= BLUNDER_CP) return 'blunder';
  if (cpLoss >= MISTAKE_CP) return 'mistake';
  if (cpLoss >= INACCURACY_CP) return 'inaccuracy';
  if (cpLoss <= -150) return 'brilliant';
  if (cpLoss <= -10) return 'great';
  if (cpLoss <= 10) return 'good';
  return 'good';
}

function replayPgnToFens(pgn: string): { fens: string[]; moves: string[] } {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  const moves: string[] = [];
  try {
    chess.loadPgn(pgn);
    const history = chess.history();
    chess.reset();
    for (const move of history) {
      chess.move(move);
      fens.push(chess.fen());
      moves.push(move);
    }
  } catch {
    // Return what we have
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

  analyzePosition(fen: string, depth: number): Promise<{ evaluation: number; bestMove: string }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Analysis timed out'));
      }, 10_000);

      const blackToMove = fen.split(' ')[1] === 'b';
      let lastEval = 0;

      const handler = (event: MessageEvent<string>): void => {
        const data = event.data;

        if (data.startsWith('info ')) {
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
          resolve({ evaluation: lastEval * flip, bestMove: bmMatch[1] });
        }
      };

      try {
        this.worker.addEventListener('message', handler);
        this.worker.postMessage('ucinewgame');
        this.worker.postMessage(`position fen ${fen}`);
        this.worker.postMessage(`go depth ${depth}`);
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
function spawnDedicatedWorker(index: number): Promise<DedicatedWorker> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Worker ${index} init timed out`));
    }, INIT_TIMEOUT_MS);

    try {
      const worker = new Worker('/stockfish/stockfish-18-lite-single.js');

      worker.onerror = (ev: Event | ErrorEvent) => {
        clearTimeout(timeoutId);
        const ee = ev as ErrorEvent;
        const detail =
          ee.error instanceof Error ? ee.error.message : ee.message;
        reject(
          new Error(
            `Worker ${index} failed to load${detail ? `: ${detail}` : ''}`,
          ),
        );
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

// ─── Core Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze a single game with a dedicated worker.
 * Evaluates every position sequentially on this worker, then classifies each move.
 */
async function analyzeGameOnWorker(
  game: GameRecord,
  worker: DedicatedWorker,
): Promise<MoveAnnotation[] | null> {
  const { fens, moves } = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  // Build eval curve: evaluate every position sequentially on this worker
  const evals: (number | null)[] = [];
  for (const fen of fens) {
    if (_abortAnalysis) return null;
    try {
      const result = await worker.analyzePosition(fen, ANALYSIS_DEPTH);
      evals.push(result.evaluation);
    } catch {
      evals.push(null);
    }
  }

  // Build annotations + collect best-move lookups for mistakes
  const annotations: MoveAnnotation[] = [];
  const mistakeIndices: number[] = [];

  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const isWhiteMove = moveIdx % 2 === 0;
    const color: 'white' | 'black' = isWhiteMove ? 'white' : 'black';
    const moveNumber = Math.floor(moveIdx / 2) + 1;

    const evalBefore = evals[moveIdx];
    const evalAfter = evals[moveIdx + 1];

    let classification: MoveClassification = 'good';

    if (evalBefore !== null && evalAfter !== null) {
      const cpLoss = isWhiteMove
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;
      classification = classifyCpLoss(cpLoss, evalBefore, evalAfter, isWhiteMove);
      if (cpLoss >= INACCURACY_CP && classification !== 'brilliant' && classification !== 'great' && classification !== 'good') {
        mistakeIndices.push(moveIdx);
      }
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

  return annotations;
}

/**
 * Fallback: analyze a single game with the singleton engine (no pool).
 */
async function analyzeGamePositions(game: GameRecord): Promise<MoveAnnotation[] | null> {
  const { fens, moves } = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  try {
    await stockfishEngine.initialize();
  } catch {
    return null;
  }

  const evals: (number | null)[] = [];
  for (const fen of fens) {
    try {
      const analysis: StockfishAnalysis = await stockfishEngine.analyzePosition(fen, ANALYSIS_DEPTH);
      evals.push(analysis.evaluation);
    } catch {
      evals.push(null);
    }
  }

  const annotations: MoveAnnotation[] = [];
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

    if (evalBefore !== null && evalAfter !== null) {
      const cpLoss = isWhiteMove
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;

      classification = classifyCpLoss(cpLoss, evalBefore, evalAfter, isWhiteMove);

      if (cpLoss >= INACCURACY_CP && classification !== 'brilliant' && classification !== 'great' && classification !== 'good') {
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

  return annotations;
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

  onProgress?.('Analyzing positions with Stockfish…');
  const annotations = await analyzeGamePositions(game);
  if (!annotations) return null;

  // Store back to DB
  await db.games.update(gameId, { annotations, fullyAnalyzed: true });

  return annotations;
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
export function gameNeedsAnalysis(game: GameRecord): boolean {
  if (game.isMasterGame) return false;
  if (!game.annotations || game.annotations.length === 0) return true;

  // Pre-`bestMoveEval` annotations are stale-unit (pawns) — re-analyze.
  // Hand-curated sample games carry the field; master games are gated
  // out above. Only real Stockfish-produced legacy records hit this.
  const first = game.annotations[0];
  if (first.bestMoveEval === undefined) return true;

  if (game.fullyAnalyzed === true) return false;

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
    .filter((g) => gameNeedsAnalysis(g))
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
    .filter((g) => gameNeedsAnalysis(g))
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
      const annotations = await analyzeGamePositions(game);
      if (annotations && annotations.length > 0) {
        await db.games.update(game.id, { annotations, fullyAnalyzed: true });
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
    .filter((g) => gameNeedsAnalysis(g))
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

      const processNextGame = async (worker: DedicatedWorker): Promise<void> => {
        while (nextGameIdx < games.length && !_abortAnalysis) {
          const idx = nextGameIdx++;
          const game = games[idx];

          onProgress?.({
            currentGame: completed + 1,
            totalGames: games.length,
            currentGameName: `${game.white} vs ${game.black}`,
            phase: 'analyzing',
          });

          const annotations = await analyzeGameOnWorker(game, worker);
          if (annotations && annotations.length > 0) {
            await db.games.update(game.id, { annotations, fullyAnalyzed: true });
            analyzedGameIds.push(game.id);
            analyzed++;
            // Generate this game's mistakes NOW — don't wait for the whole
            // batch to finish (it often never does on a big library).
            await generateInsightsForGame(game.id, game.source, annotations);
          }
          completed++;
        }
      };

      await Promise.all(workers.map((w) => processNextGame(w)));
    } else {
      // Fallback: single engine, sequential
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- mutated by visibilitychange handler
      for (let i = 0; i < games.length && !_abortAnalysis; i++) {
        const game = games[i];
        onProgress?.({
          currentGame: i + 1,
          totalGames: games.length,
          currentGameName: `${game.white} vs ${game.black}`,
          phase: 'analyzing',
        });

        const annotations = await analyzeGamePositions(game);
        if (annotations && annotations.length > 0) {
          await db.games.update(game.id, { annotations, fullyAnalyzed: true });
          analyzedGameIds.push(game.id);
          analyzed++;
          await generateInsightsForGame(game.id, game.source, annotations);
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

  // Update Game ELO from the most recent imported game with rating data
  await updateEloFromImportedGames(profile);

  const weaknessProfile = await computeWeaknessProfile(profile);
  useAppStore.getState().setWeaknessProfile(weaknessProfile);

  const updatedProfile = await db.profiles.get(profile.id);
  if (updatedProfile) {
    useAppStore.getState().setActiveProfile(updatedProfile);
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

      // If aborted due to backgrounding, auto-restart when app returns
      if (_abortAnalysis) {
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
