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

// ─── Lightweight Worker Pool ────────────────────────────────────────────────

interface PoolWorker {
  worker: Worker;
  busy: boolean;
}

interface PoolAnalysisResult {
  evaluation: number;
  bestMove: string;
  isMate: boolean;
  depth: number;
}

/**
 * A pool of Stockfish Web Workers for parallel analysis.
 * Each worker handles one position at a time; the pool distributes work.
 */
class StockfishPool {
  private workers: PoolWorker[] = [];
  private initialized = false;

  async initialize(size: number): Promise<void> {
    if (this.initialized) return;

    const promises: Promise<void>[] = [];

    for (let i = 0; i < size; i++) {
      promises.push(this.spawnWorker(i));
    }

    await Promise.all(promises);
    this.initialized = true;
    console.log(`[StockfishPool] ${this.workers.length} workers ready`);
  }

  private spawnWorker(index: number): Promise<void> {
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
            // Only need 1 PV line for batch analysis (faster)
            worker.postMessage('setoption name MultiPV value 1');
            this.workers.push({ worker, busy: false });
            resolve();
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

  /**
   * Analyze a single position with an available worker from the pool.
   * Waits for a free worker if all are busy.
   */
  async analyzePosition(fen: string, depth: number): Promise<PoolAnalysisResult> {
    const poolWorker = await this.acquireWorker();

    try {
      return await this.runAnalysis(poolWorker, fen, depth);
    } finally {
      poolWorker.busy = false;
    }
  }

  private acquireWorker(): Promise<PoolWorker> {
    const free = this.workers.find((w) => !w.busy);
    if (free) {
      free.busy = true;
      return Promise.resolve(free);
    }

    // Poll until a worker frees up
    return new Promise((resolve) => {
      const check = (): void => {
        const available = this.workers.find((w) => !w.busy);
        if (available) {
          available.busy = true;
          resolve(available);
        } else {
          setTimeout(check, 5);
        }
      };
      setTimeout(check, 5);
    });
  }

  private runAnalysis(poolWorker: PoolWorker, fen: string, depth: number): Promise<PoolAnalysisResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Analysis timed out'));
      }, 30_000);

      const blackToMove = fen.split(' ')[1] === 'b';
      let lastEval = 0;
      let isMate = false;
      let lastDepth = 0;
      let bestMove = '';

      const handler = (event: MessageEvent<string>): void => {
        const data = event.data;

        // Parse info lines for eval
        if (data.startsWith('info ')) {
          const depthMatch = /depth (\d+)/.exec(data);
          const scoreMatch = /score (cp|mate) (-?\d+)/.exec(data);
          if (depthMatch && scoreMatch) {
            lastDepth = parseInt(depthMatch[1]);
            const scoreType = scoreMatch[1];
            const scoreValue = parseInt(scoreMatch[2]);
            if (scoreType === 'mate') {
              isMate = true;
              lastEval = scoreValue > 0 ? 30000 : -30000;
            } else {
              isMate = false;
              lastEval = scoreValue;
            }
          }
        }

        // bestmove signals completion
        const bmMatch = /^bestmove (\S+)/.exec(data);
        if (bmMatch) {
          clearTimeout(timeoutId);
          poolWorker.worker.removeEventListener('message', handler);
          bestMove = bmMatch[1];

          // Normalize to white's perspective
          const flip = blackToMove ? -1 : 1;

          resolve({
            evaluation: lastEval * flip,
            bestMove,
            isMate,
            depth: lastDepth,
          });
        }
      };

      poolWorker.worker.addEventListener('message', handler);
      poolWorker.worker.postMessage('ucinewgame');
      poolWorker.worker.postMessage(`position fen ${fen}`);
      poolWorker.worker.postMessage(`go depth ${depth}`);
    });
  }

  destroy(): void {
    for (const pw of this.workers) {
      pw.worker.postMessage('stop');
      pw.worker.terminate();
    }
    this.workers = [];
    this.initialized = false;
  }
}

// ─── Core Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze a single game: evaluate every position, then classify each move.
 * Uses a worker pool for parallel position evaluation.
 */
async function analyzeGameWithPool(
  game: GameRecord,
  pool: StockfishPool,
): Promise<MoveAnnotation[] | null> {
  const { fens, moves } = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  // Evaluate all positions in parallel via the pool
  const evalPromises = fens.map((fen) =>
    pool.analyzePosition(fen, ANALYSIS_DEPTH)
      .then((r) => r.evaluation)
      .catch(() => null as number | null),
  );
  const evals = await Promise.all(evalPromises);

  // Generate annotations for every move
  const annotations: MoveAnnotation[] = [];
  const bestMovePromises: Array<{
    moveIdx: number;
    promise: Promise<string | null>;
  }> = [];

  for (let moveIdx = 0; moveIdx < moves.length; moveIdx++) {
    const evalBefore = evals[moveIdx];
    const evalAfter = evals[moveIdx + 1];

    if (evalBefore !== null && evalAfter !== null) {
      const isWhiteMove = moveIdx % 2 === 0;
      const cpLoss = isWhiteMove
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;

      if (cpLoss >= INACCURACY_CP) {
        bestMovePromises.push({
          moveIdx,
          promise: pool.analyzePosition(fens[moveIdx], BEST_MOVE_DEPTH)
            .then((r) => r.bestMove)
            .catch(() => null),
        });
      }
    }
  }

  // Resolve all best-move lookups in parallel
  const bestMoveResults = await Promise.all(
    bestMovePromises.map(async (entry) => ({
      moveIdx: entry.moveIdx,
      bestMove: await entry.promise,
    })),
  );
  const bestMoveMap = new Map(bestMoveResults.map((r) => [r.moveIdx, r.bestMove]));

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
      bestMove = bestMoveMap.get(moveIdx) ?? null;
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
 * Count games that are missing annotations and could be analyzed.
 */
export async function countGamesNeedingAnalysis(): Promise<number> {
  const games = await db.games
    .filter((g) => !g.isMasterGame && (g.annotations === null || g.annotations.length === 0))
    .count();
  return games;
}

/**
 * Batch-analyze all imported/played games that lack annotations.
 * Spins up a pool of WORKER_POOL_SIZE Stockfish workers for parallel analysis.
 * Falls back to the singleton engine if pool creation fails.
 * After all games are analyzed, recomputes the weakness profile.
 */
export async function analyzeAllGames(
  onProgress?: (progress: BatchAnalysisProgress) => void,
): Promise<number> {
  const games = await db.games
    .filter((g) => !g.isMasterGame && (g.annotations === null || g.annotations.length === 0))
    .toArray();

  if (games.length === 0) {
    await recomputeWeaknessFromGames();
    return 0;
  }

  // Try to create a parallel worker pool
  let pool: StockfishPool | null = null;
  try {
    pool = new StockfishPool();
    await pool.initialize(WORKER_POOL_SIZE);
  } catch {
    console.warn('[GameAnalysis] Worker pool failed, falling back to single engine');
    pool?.destroy();
    pool = null;
  }

  let analyzed = 0;

  try {
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      const gameName = `${game.white} vs ${game.black}`;

      onProgress?.({
        currentGame: i + 1,
        totalGames: games.length,
        currentGameName: gameName,
        phase: 'analyzing',
      });

      const annotations = pool
        ? await analyzeGameWithPool(game, pool)
        : await analyzeGamePositions(game);

      if (annotations && annotations.length > 0) {
        await db.games.update(game.id, { annotations });
        analyzed++;
      }
    }
  } finally {
    pool?.destroy();
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
