import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine } from './stockfishEngine';
import { detectTacticType } from './missedTacticService';
import { createDefaultSrsFields, calculateNextInterval } from './srsEngine';
import type {
  SetupPuzzle,
  SetupPuzzleDifficulty,
  SetupPuzzleStatus,
  TacticType,
  MistakePuzzle,
  SrsGrade,
} from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────

const VERIFICATION_DEPTH = 14;

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `sp_${timestamp}_${random}`;
}

// ─── Setup Puzzle Generation ───────────────────────────────────────────────

/**
 * Given a mistake puzzle (where a tactic was missed), backtrack through the
 * source game to create a setup puzzle. The player starts 1-3 moves BEFORE
 * the tactic and must find the preparatory moves.
 */
export async function generateSetupPuzzle(
  mistake: MistakePuzzle,
  difficulty: SetupPuzzleDifficulty,
): Promise<SetupPuzzle | null> {
  const game = await db.games.get(mistake.sourceGameId);
  if (!game) return null;

  // Replay the game to get FENs at each position
  const chess = new Chess();
  const fens: string[] = [chess.fen()];
  const moves: string[] = [];

  try {
    chess.loadPgn(game.pgn);
    const history = chess.history();
    chess.reset();
    for (const move of history) {
      chess.move(move);
      fens.push(chess.fen());
      moves.push(move);
    }
  } catch {
    return null;
  }

  // Find the position index where the tactic was missed
  // The mistake's FEN is the position BEFORE the player's bad move
  const tacticIndex = fens.findIndex((f) => f === mistake.fen);
  if (tacticIndex < 0) return null;

  // Backtrack by `difficulty` half-moves (each difficulty = 1 prep move by the player)
  // We need to go back 2*difficulty half-moves (player move + opponent response per step)
  const backtrackHalfMoves = difficulty * 2;
  const setupIndex = tacticIndex - backtrackHalfMoves;

  if (setupIndex < 0) return null;

  const setupFen = fens[setupIndex];

  // Verify via Stockfish that the best line from the setup position
  // still leads through the tactic
  const isValid = await verifySetupPosition(
    setupFen,
    fens.slice(setupIndex, tacticIndex + 1),
    moves.slice(setupIndex, tacticIndex),
  );

  if (!isValid) return null;

  // Build the solution: moves from setup to tactic position
  const solutionMoves = moves.slice(setupIndex, tacticIndex).join(' ');

  // The tactic finish: the best move at the tactic position
  const tacticMoves = mistake.moves || mistake.bestMove;

  const tacticType = detectTacticType(mistake.fen, mistake.bestMove);

  const srsDefaults = createDefaultSrsFields();

  return {
    id: generateId(),
    setupFen,
    solutionMoves,
    tacticFen: mistake.fen,
    tacticMoves,
    tacticType,
    difficulty,
    sourceGameId: mistake.sourceGameId,
    sourceMistakePuzzleId: mistake.id,
    playerColor: mistake.playerColor,
    openingName: mistake.openingName,
    srsInterval: srsDefaults.interval,
    srsEaseFactor: srsDefaults.easeFactor,
    srsRepetitions: srsDefaults.repetitions,
    srsDueDate: srsDefaults.dueDate,
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Verify that Stockfish's best line from the setup position leads through
 * the same tactic. This ensures the prep moves are genuinely preparatory.
 */
async function verifySetupPosition(
  setupFen: string,
  expectedFens: string[],
  expectedMoves: string[],
): Promise<boolean> {
  if (expectedMoves.length === 0) return false;

  try {
    await stockfishEngine.initialize();
    const analysis = await stockfishEngine.analyzePosition(setupFen, VERIFICATION_DEPTH);
    const topLine = analysis.topLines[0] as { moves: string[] } | undefined;
    if (!topLine || topLine.moves.length === 0) return false;

    // Check if the engine's best line starts with a move that leads toward
    // the tactic position. We allow some flexibility — the engine might find
    // a slightly different path to the same tactic.
    const chess = new Chess(setupFen);
    try {
      const uci = topLine.moves[0];
      chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
    } catch {
      return false;
    }

    // If the resulting FEN matches the next expected position, the line is valid
    if (expectedFens.length > 1 && chess.fen() === expectedFens[1]) {
      return true;
    }

    // Also accept if the engine evaluation is strongly winning (the tactic works)
    const evalScore = Math.abs(analysis.evaluation);
    return evalScore > 150;
  } catch {
    return false;
  }
}

// ─── Queue Building ────────────────────────────────────────────────────────

/**
 * Build a queue of setup puzzles at the given difficulty.
 * Generates from the user's mistake puzzles on demand.
 */
export async function buildSetupPuzzleQueue(
  count: number = 10,
  difficulty: SetupPuzzleDifficulty,
): Promise<SetupPuzzle[]> {
  // First check for existing setup puzzles at this difficulty
  const existing = await db.setupPuzzles
    .filter((sp) => sp.difficulty === difficulty && sp.status !== 'mastered')
    .limit(count)
    .toArray();

  if (existing.length >= count) {
    return existing.slice(0, count);
  }

  // Generate more from mistake puzzles
  const result = [...existing];
  const existingSourceIds = new Set(existing.map((sp) => sp.sourceMistakePuzzleId));

  // Get mistake puzzles that have tactical content
  const candidates = await db.mistakePuzzles
    .filter((m) => m.cpLoss >= 100 && m.sourceGameId !== '')
    .toArray();

  // Filter to those with known source games and not already used
  const usable = candidates.filter(
    (m) => !existingSourceIds.has(m.id) && m.sourceGameId,
  );

  for (const mistake of usable) {
    if (result.length >= count) break;

    const puzzle = await generateSetupPuzzle(mistake, difficulty);
    if (puzzle) {
      await db.setupPuzzles.add(puzzle);
      result.push(puzzle);
    }
  }

  return result;
}

// ─── Grading ───────────────────────────────────────────────────────────────

/**
 * Grade a setup puzzle attempt with SRS scheduling.
 */
export async function gradeSetupPuzzle(
  id: string,
  grade: SrsGrade,
  correct: boolean,
): Promise<void> {
  const puzzle = await db.setupPuzzles.get(id);
  if (!puzzle) return;

  const srs = calculateNextInterval(
    grade,
    puzzle.srsInterval,
    puzzle.srsEaseFactor,
    puzzle.srsRepetitions,
  );

  const newAttempts = puzzle.attempts + 1;
  const newSuccesses = correct ? puzzle.successes + 1 : puzzle.successes;

  let newStatus: SetupPuzzleStatus = puzzle.status;
  if (correct && puzzle.status === 'unsolved') {
    newStatus = 'solved';
  }
  if (correct && newSuccesses >= 3) {
    newStatus = 'mastered';
  }

  await db.setupPuzzles.update(id, {
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
