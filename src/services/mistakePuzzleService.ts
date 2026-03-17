import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { createDefaultSrsFields, calculateNextInterval } from './srsEngine';
import { stockfishEngine } from './stockfishEngine';
import type {
  MistakePuzzle,
  MistakeClassification,
  MistakePuzzleSourceMode,
  MistakePuzzleStatus,
  SrsGrade,
  GameRecord,
  MoveAnnotation,
} from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const CP_LOSS_THRESHOLD = 50;
const MASTERY_REPETITIONS = 3;

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `mp_${timestamp}_${random}`;
}

const PROMPT_TEXT: Record<MistakeClassification, string> = {
  inaccuracy: 'You had a better option here. Can you find it?',
  mistake: 'This move cost you. What should you have played?',
  blunder: 'Oops — this was a serious mistake. Find the best move.',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyCpLoss(cpLoss: number): MistakeClassification {
  if (cpLoss >= 300) return 'blunder';
  if (cpLoss >= 100) return 'mistake';
  return 'inaccuracy';
}

function sourceFromGameSource(source: string): MistakePuzzleSourceMode | null {
  if (source === 'coach') return 'coach';
  if (source === 'lichess') return 'lichess';
  if (source === 'chesscom') return 'chesscom';
  return null;
}

function uciToSan(fen: string, uci: string): string {
  try {
    const chess = new Chess(fen);
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const move = chess.move({ from, to, promotion });
    return move.san;
  } catch {
    return uci;
  }
}

function replayPgnToFens(pgn: string): string[] {
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  try {
    chess.loadPgn(pgn);
    const moves = chess.history();
    chess.reset();
    for (const move of moves) {
      chess.move(move);
      fens.push(chess.fen());
    }
  } catch {
    // If PGN fails to load, return what we have
  }
  return fens;
}

function determinePlayerColor(
  game: GameRecord,
  username?: string,
): 'white' | 'black' | null {
  if (game.source === 'coach') {
    if (game.white === 'Stockfish Bot') return 'black';
    if (game.black === 'Stockfish Bot') return 'white';
    return null;
  }
  if (username) {
    if (game.white.toLowerCase() === username.toLowerCase()) return 'white';
    if (game.black.toLowerCase() === username.toLowerCase()) return 'black';
  }
  return null;
}

// ─── Generation ─────────────────────────────────────────────────────────────

/**
 * Generate mistake puzzles from a completed game.
 * For coach games, annotations already have bestMove — extraction is instant.
 * For imported games with eval-only annotations (bestMove: null), runs Stockfish.
 */
export async function generateMistakePuzzlesFromGame(
  gameId: string,
  username?: string,
): Promise<number> {
  const metaKey = `mistakes_generated_${gameId}`;
  const existing = await db.meta.get(metaKey);
  if (existing?.value === 'true') return 0;

  const game = await db.games.get(gameId);
  if (!game || !game.annotations || game.annotations.length === 0) return 0;

  const sourceMode = sourceFromGameSource(game.source);
  if (!sourceMode) return 0;

  const playerColor = determinePlayerColor(game, username);
  if (!playerColor) return 0;

  const fens = replayPgnToFens(game.pgn);
  if (fens.length < 2) return 0;

  const srsDefaults = createDefaultSrsFields();
  const now = new Date().toISOString();
  const puzzles: MistakePuzzle[] = [];

  // Build a map from (moveNumber, color) → annotation for quick lookup
  const annotationMap = new Map<string, MoveAnnotation>();
  for (const ann of game.annotations) {
    annotationMap.set(`${ann.moveNumber}-${ann.color}`, ann);
  }

  // Walk through annotations to find player mistakes
  for (const annotation of game.annotations) {
    if (annotation.color !== playerColor) continue;

    const isQualifying =
      annotation.classification === 'inaccuracy' ||
      annotation.classification === 'mistake' ||
      annotation.classification === 'blunder';
    if (!isQualifying) continue;

    // Calculate the FEN index: move 1 white = index 0 (before) → 1 (after),
    // move 1 black = index 1 (before) → 2 (after), etc.
    const fenIndex = (annotation.moveNumber - 1) * 2 + (annotation.color === 'black' ? 1 : 0);
    if (fenIndex < 0 || fenIndex >= fens.length) continue;

    const fen = fens[fenIndex]; // position BEFORE the bad move

    // Determine cpLoss from eval data
    let cpLoss: number | null = null;
    if (annotation.evaluation !== null) {
      // Find the annotation for the move right before this one
      let prevEval: number | null = null;
      for (const ann of game.annotations) {
        const annIdx = (ann.moveNumber - 1) * 2 + (ann.color === 'black' ? 1 : 0);
        if (annIdx === fenIndex - 1) {
          prevEval = ann.evaluation;
          break;
        }
      }

      if (prevEval !== null) {
        // Eval is from white's perspective in coach games
        if (playerColor === 'white') {
          cpLoss = Math.round(Math.max(0, (prevEval - annotation.evaluation) * 100));
        } else {
          cpLoss = Math.round(Math.max(0, (annotation.evaluation - prevEval) * 100));
        }
      }
    }

    // For imported games, detectBlunders already gives us eval in pawns
    // and classifies the drop. Use the classification to estimate cpLoss if needed.
    if (cpLoss === null) {
      if (annotation.classification === 'blunder') cpLoss = 350;
      else if (annotation.classification === 'mistake') cpLoss = 175;
      else cpLoss = 75;
    }

    if (cpLoss < CP_LOSS_THRESHOLD) continue;

    // Get bestMove — either from annotation or via Stockfish
    let bestMove = annotation.bestMove;
    if (!bestMove) {
      try {
        const analysis = await stockfishEngine.analyzePosition(fen, 18);
        bestMove = analysis.bestMove;
      } catch {
        continue; // Skip if Stockfish fails
      }
    }
    if (!bestMove) continue;

    const bestMoveSan = uciToSan(fen, bestMove);
    const classification = classifyCpLoss(cpLoss);

    // Determine player's move in UCI format from annotation SAN
    let playerMove = '';
    try {
      const chess = new Chess(fen);
      const move = chess.move(annotation.san);
      playerMove = move.from + move.to + (move.promotion ?? '');
    } catch {
      playerMove = annotation.san;
    }

    puzzles.push({
      id: generateId(),
      fen,
      playerMove,
      bestMove,
      bestMoveSan,
      cpLoss,
      classification,
      moveNumber: annotation.moveNumber,
      sourceGameId: gameId,
      sourceMode,
      playerColor,
      promptText: PROMPT_TEXT[classification],
      createdAt: now,
      srsInterval: srsDefaults.interval,
      srsEaseFactor: srsDefaults.easeFactor,
      srsRepetitions: srsDefaults.repetitions,
      srsDueDate: srsDefaults.dueDate,
      srsLastReview: null,
      status: 'unsolved',
      attempts: 0,
      successes: 0,
    });
  }

  if (puzzles.length > 0) {
    await db.mistakePuzzles.bulkAdd(puzzles);
  }

  await db.meta.put({ key: metaKey, value: 'true' });
  return puzzles.length;
}

/**
 * Batch-generate mistake puzzles for multiple imported games.
 * Runs sequentially to avoid overloading Stockfish.
 */
export async function generateMistakePuzzlesForBatch(
  gameIds: string[],
  username: string,
): Promise<number> {
  let total = 0;
  for (const id of gameIds) {
    total += await generateMistakePuzzlesFromGame(id, username);
  }
  return total;
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getMistakePuzzlesDue(
  limit: number = 20,
): Promise<MistakePuzzle[]> {
  const today = new Date().toISOString().split('T')[0];
  return db.mistakePuzzles
    .where('srsDueDate')
    .belowOrEqual(today)
    .limit(limit)
    .toArray();
}

export async function getMistakePuzzlesByGame(
  gameId: string,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('sourceGameId')
    .equals(gameId)
    .toArray();
}

export async function getMistakePuzzlesByClassification(
  classification: MistakeClassification,
): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles
    .where('classification')
    .equals(classification)
    .toArray();
}

export async function getAllMistakePuzzles(): Promise<MistakePuzzle[]> {
  return db.mistakePuzzles.toArray();
}

// ─── Grading ────────────────────────────────────────────────────────────────

export async function gradeMistakePuzzle(
  id: string,
  grade: SrsGrade,
  correct: boolean,
): Promise<void> {
  const puzzle = await db.mistakePuzzles.get(id);
  if (!puzzle) return;

  const srs = calculateNextInterval(
    grade,
    puzzle.srsInterval,
    puzzle.srsEaseFactor,
    puzzle.srsRepetitions,
  );

  const newAttempts = puzzle.attempts + 1;
  const newSuccesses = correct ? puzzle.successes + 1 : puzzle.successes;

  let newStatus: MistakePuzzleStatus = puzzle.status;
  if (correct && puzzle.status === 'unsolved') {
    newStatus = 'solved';
  }
  if (correct && srs.repetitions >= MASTERY_REPETITIONS) {
    newStatus = 'mastered';
  }
  if (!correct && puzzle.status !== 'mastered') {
    newStatus = puzzle.successes > 0 ? 'solved' : 'unsolved';
  }

  await db.mistakePuzzles.update(id, {
    srsInterval: srs.interval,
    srsEaseFactor: srs.easeFactor,
    srsRepetitions: srs.repetitions,
    srsDueDate: srs.dueDate,
    srsLastReview: new Date().toISOString().split('T')[0],
    status: newStatus,
    attempts: newAttempts,
    successes: newSuccesses,
  });
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteMistakePuzzle(id: string): Promise<void> {
  await db.mistakePuzzles.delete(id);
}

// ─── Stats ──────────────────────────────────────────────────────────────────

export interface MistakePuzzleStats {
  total: number;
  unsolved: number;
  solved: number;
  mastered: number;
  byClassification: {
    inaccuracy: number;
    mistake: number;
    blunder: number;
  };
  dueCount: number;
}

export async function getMistakePuzzleStats(): Promise<MistakePuzzleStats> {
  const all = await db.mistakePuzzles.toArray();
  const today = new Date().toISOString().split('T')[0];

  const stats: MistakePuzzleStats = {
    total: all.length,
    unsolved: 0,
    solved: 0,
    mastered: 0,
    byClassification: { inaccuracy: 0, mistake: 0, blunder: 0 },
    dueCount: 0,
  };

  for (const p of all) {
    if (p.status === 'unsolved') stats.unsolved++;
    else if (p.status === 'solved') stats.solved++;
    else stats.mastered++;

    stats.byClassification[p.classification]++;

    if (p.srsDueDate <= today) stats.dueCount++;
  }

  return stats;
}
