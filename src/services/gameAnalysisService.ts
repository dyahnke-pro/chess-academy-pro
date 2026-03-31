import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine } from './stockfishEngine';
import { computeWeaknessProfile } from './weaknessAnalyzer';
import { useAppStore } from '../stores/appStore';
import type { GameRecord, MoveAnnotation, MoveClassification, StockfishAnalysis } from '../types';

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
const WORKER_POOL_SIZE = 4;
const INIT_TIMEOUT_MS = 45_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyCpLoss(cpLoss: number): MoveClassification {
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
      }, 30_000);

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
              ? (scoreValue > 0 ? 30000 : -30000)
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

      this.worker.addEventListener('message', handler);
      this.worker.postMessage('ucinewgame');
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  destroy(): void {
    this.worker.postMessage('stop');
    this.worker.terminate();
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
      classification = classifyCpLoss(cpLoss);
      if (cpLoss >= INACCURACY_CP) {
        mistakeIndices.push(moveIdx);
      }
    }

    annotations.push({
      moveNumber,
      color,
      san: moves[moveIdx],
      evaluation: evalAfter !== null ? evalAfter / 100 : null,
      bestMove: null,
      classification,
      comment: null,
    });
  }

  // Get best moves for mistakes (deeper analysis)
  for (const moveIdx of mistakeIndices) {
    try {
      const result = await worker.analyzePosition(fens[moveIdx], BEST_MOVE_DEPTH);
      annotations[moveIdx].bestMove = result.bestMove;
    } catch {
      // Leave bestMove null
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

    if (evalBefore !== null && evalAfter !== null) {
      const cpLoss = isWhiteMove
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;

      classification = classifyCpLoss(cpLoss);

      if (cpLoss >= INACCURACY_CP) {
        try {
          const bestAnalysis: StockfishAnalysis = await stockfishEngine.analyzePosition(fens[moveIdx], BEST_MOVE_DEPTH);
          bestMove = bestAnalysis.bestMove;
        } catch {
          // Leave bestMove null
        }
      }
    }

    annotations.push({
      moveNumber,
      color,
      san: moves[moveIdx],
      evaluation: evalAfter !== null ? evalAfter / 100 : null,
      bestMove,
      classification,
      comment: null,
    });
  }

  return annotations;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check if a game needs (re-)analysis.
 * Games with no annotations or only partial annotations (from detectBlunders,
 * which only records mistakes, not every move) need full Stockfish analysis.
 */
function gameNeedsAnalysis(game: GameRecord): boolean {
  if (game.isMasterGame) return false;
  if (!game.annotations || game.annotations.length === 0) return true;

  // detectBlunders() creates sparse annotations (only mistakes/blunders).
  // A fully analyzed game has one annotation per half-move.
  // If annotations cover less than half the game's moves, it's partial.
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
 * Batch-analyze all imported/played games that lack annotations.
 * Spins up WORKER_POOL_SIZE dedicated Stockfish workers, each analyzing
 * a different game simultaneously for true parallel throughput.
 * Falls back to the singleton engine if worker creation fails.
 * After all games are analyzed, recomputes the weakness profile.
 */
export async function analyzeAllGames(
  onProgress?: (progress: BatchAnalysisProgress) => void,
): Promise<number> {
  const games = await db.games
    .filter((g) => gameNeedsAnalysis(g))
    .toArray();

  if (games.length === 0) {
    await recomputeWeaknessFromGames();
    return 0;
  }

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

  try {
    if (workers.length > 0) {
      // Parallel: each worker grabs the next game from the queue
      let nextGameIdx = 0;

      const processNextGame = async (worker: DedicatedWorker): Promise<void> => {
        while (nextGameIdx < games.length) {
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
            await db.games.update(game.id, { annotations });
            analyzed++;
          }
          completed++;
        }
      };

      await Promise.all(workers.map((w) => processNextGame(w)));
    } else {
      // Fallback: single engine, sequential
      for (let i = 0; i < games.length; i++) {
        const game = games[i];
        onProgress?.({
          currentGame: i + 1,
          totalGames: games.length,
          currentGameName: `${game.white} vs ${game.black}`,
          phase: 'analyzing',
        });

        const annotations = await analyzeGamePositions(game);
        if (annotations && annotations.length > 0) {
          await db.games.update(game.id, { annotations });
          analyzed++;
        }
      }
    }
  } finally {
    workers.forEach((w) => w.destroy());
  }

  onProgress?.({
    currentGame: games.length,
    totalGames: games.length,
    currentGameName: '',
    phase: 'computing_weaknesses',
  });

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
 */
async function recomputeWeaknessFromGames(): Promise<void> {
  const profile = useAppStore.getState().activeProfile;
  if (!profile) return;

  const weaknessProfile = await computeWeaknessProfile(profile);
  useAppStore.getState().setWeaknessProfile(weaknessProfile);

  const updatedProfile = await db.profiles.get(profile.id);
  if (updatedProfile) {
    useAppStore.getState().setActiveProfile(updatedProfile);
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

  void analyzeAllGames()
    .catch((err: unknown) => {
      console.warn('[GameAnalysis] Background analysis failed:', err);
    })
    .finally(() => {
      _backgroundRunning = false;
    });
}
