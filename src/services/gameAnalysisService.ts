import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine } from './stockfishEngine';
import { computeWeaknessProfile } from './weaknessAnalyzer';
import { useAppStore } from '../stores/appStore';
import type { GameRecord, MoveAnnotation, MoveClassification } from '../types';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BatchAnalysisProgress {
  currentGame: number;
  totalGames: number;
  currentGameName: string;
  phase: 'analyzing' | 'computing_weaknesses' | 'done';
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ANALYSIS_DEPTH = 12;
const BLUNDER_CP = 300;
const MISTAKE_CP = 100;
const INACCURACY_CP = 50;

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

// ─── Core Analysis ──────────────────────────────────────────────────────────

/**
 * Analyze a single game with Stockfish and write full MoveAnnotation[] to the game record.
 * Evaluates every position to build a complete eval curve, then classifies each move.
 */
async function analyzeGamePositions(game: GameRecord): Promise<MoveAnnotation[] | null> {
  const { fens, moves } = replayPgnToFens(game.pgn);
  if (fens.length < 2) return null;

  try {
    await stockfishEngine.initialize();
  } catch {
    return null;
  }

  // Build eval curve: evaluate every position
  const evals: (number | null)[] = [];
  for (const fen of fens) {
    try {
      const analysis = await stockfishEngine.analyzePosition(fen, ANALYSIS_DEPTH);
      evals.push(analysis.evaluation);
    } catch {
      evals.push(null);
    }
  }

  // Generate annotations for every move
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
      // cpLoss from the moving player's perspective
      const cpLoss = isWhiteMove
        ? evalBefore - evalAfter
        : evalAfter - evalBefore;

      classification = classifyCpLoss(cpLoss);

      // Get best move for non-good moves
      if (cpLoss >= INACCURACY_CP) {
        try {
          const bestAnalysis = await stockfishEngine.analyzePosition(fens[moveIdx], 18);
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
 * Runs Stockfish on each position and writes MoveAnnotation[] back to the game record.
 * After all games are analyzed, recomputes the weakness profile.
 */
export async function analyzeAllGames(
  onProgress?: (progress: BatchAnalysisProgress) => void,
): Promise<number> {
  const games = await db.games
    .filter((g) => !g.isMasterGame && (g.annotations === null || g.annotations.length === 0))
    .toArray();

  if (games.length === 0) {
    // Even with no new games to analyze, recompute weakness profile from existing data
    await recomputeWeaknessFromGames();
    return 0;
  }

  let analyzed = 0;

  for (let i = 0; i < games.length; i++) {
    const game = games[i];
    const gameName = `${game.white} vs ${game.black}`;

    onProgress?.({
      currentGame: i + 1,
      totalGames: games.length,
      currentGameName: gameName,
      phase: 'analyzing',
    });

    const annotations = await analyzeGamePositions(game);
    if (annotations && annotations.length > 0) {
      await db.games.update(game.id, { annotations });
      analyzed++;
    }
  }

  // Recompute weakness profile with the new annotation data
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

  // Reload updated profile from DB (skillRadar was updated by computeWeaknessProfile)
  const updatedProfile = await db.profiles.get(profile.id);
  if (updatedProfile) {
    useAppStore.getState().setActiveProfile(updatedProfile);
  }
}
