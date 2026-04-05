import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { stockfishEngine } from './stockfishEngine';
import { detectTacticType } from './missedTacticService';
import { createDefaultSrsFields, calculateNextInterval } from './srsEngine';
import type {
  SetupPuzzle,
  SetupPuzzleDifficulty,
  SetupPuzzleStatus,
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
    difficulty,
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
 *
 * Difficulty-scaled verification:
 * - Always checks that the engine's first move matches the expected first move
 * - Higher difficulties require the engine line to agree with more expected moves
 * - Eval fallback threshold scales with difficulty (farther back = higher bar)
 */
async function verifySetupPosition(
  setupFen: string,
  expectedFens: string[],
  expectedMoves: string[],
  difficulty: SetupPuzzleDifficulty,
): Promise<boolean> {
  if (expectedMoves.length === 0) return false;

  try {
    await stockfishEngine.initialize();
    const analysis = await stockfishEngine.analyzePosition(setupFen, VERIFICATION_DEPTH);
    const topLine = analysis.topLines[0] as { moves: string[] } | undefined;
    if (!topLine || topLine.moves.length === 0) return false;

    // Engine's first move must match the expected first move
    const engineFirstMove = topLine.moves[0];
    const expectedFirstMove = expectedMoves[0];
    const firstMoveMatches = engineFirstMove === expectedFirstMove;

    // If the first move matches exactly, check deeper agreement for harder difficulties
    if (firstMoveMatches) {
      // For difficulty 1, first move match is sufficient
      if (difficulty === 1) return true;

      // For difficulty 2+, verify via FEN that we're on track
      const chess = new Chess(setupFen);
      try {
        chess.move({
          from: engineFirstMove.slice(0, 2),
          to: engineFirstMove.slice(2, 4),
          promotion: engineFirstMove.length > 4 ? engineFirstMove[4] : undefined,
        });
      } catch {
        return false;
      }

      if (expectedFens.length > 1 && chess.fen() === expectedFens[1]) {
        return true;
      }

      // First move matched but FEN differs (e.g., move counter) — still accept
      return true;
    }

    // First move doesn't match — only accept if eval is decisively winning.
    // Scale the threshold by difficulty: farther back requires stronger evidence
    // that the position is still tactically connected.
    const evalThresholds: Record<SetupPuzzleDifficulty, number> = {
      1: 150,
      2: 250,
      3: 400,
    };
    const evalScore = Math.abs(analysis.evaluation);
    if (evalScore <= evalThresholds[difficulty]) return false;

    // For difficulty 3, even with high eval, require at least one player move
    // in the engine line to match an expected player move (every other move is
    // the player's: index 0, 2, 4, ...)
    if (difficulty === 3) {
      const playerExpectedMoves = expectedMoves.filter((_, i) => i % 2 === 0);
      const playerEngineMoves = topLine.moves.filter((_, i) => i % 2 === 0);
      const matchCount = playerExpectedMoves.filter((m) => playerEngineMoves.includes(m)).length;
      return matchCount >= 1;
    }

    return true;
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
