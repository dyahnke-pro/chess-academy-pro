import type { CoachGameMove, GamePhase, PhaseAccuracy } from '../types';

/**
 * Piece material values for endgame detection.
 * Counts only non-pawn, non-king pieces by value.
 */
const PIECE_VALUES: Record<string, number> = {
  q: 9, Q: 9,
  r: 5, R: 5,
  b: 3, B: 3,
  n: 3, N: 3,
  p: 1, P: 1,
};

/** Endgame threshold — total material (excluding kings) at or below this is endgame */
const ENDGAME_MATERIAL_THRESHOLD = 13;

/** Opening cutoff — moves at or below this number are considered opening */
const OPENING_MOVE_CUTOFF = 10;

/**
 * Count total material on the board from a FEN string (excluding kings).
 */
export function countMaterial(fen: string): number {
  const ranks = fen.split(' ')[0];
  let total = 0;
  for (const char of ranks) {
    if (char in PIECE_VALUES) {
      total += PIECE_VALUES[char];
    }
  }
  return total;
}

/**
 * Classify the game phase for a given position.
 *
 * - `opening`: moveNumber ≤ 10
 * - `endgame`: total piece material ≤ 13 (excluding kings)
 * - `middlegame`: everything else
 *
 * Note: moveNumber is 1-indexed (move 1, move 2, etc.)
 * where odd = white's move, even = black's move.
 * We use the chess "full move" number: Math.ceil(moveNumber / 2).
 */
export function classifyPhase(fen: string, moveNumber: number): GamePhase {
  const fullMoveNumber = Math.ceil(moveNumber / 2);

  if (fullMoveNumber <= OPENING_MOVE_CUTOFF) {
    return 'opening';
  }

  const material = countMaterial(fen);
  if (material <= ENDGAME_MATERIAL_THRESHOLD) {
    return 'endgame';
  }

  return 'middlegame';
}

/**
 * Win probability from centipawn evaluation (logistic model).
 * Duplicated from accuracyService to avoid circular deps.
 */
function evalToWinProb(evalCp: number): number {
  return 1 / (1 + Math.pow(10, -evalCp / 400));
}

/**
 * Compute accuracy + mistake counts per game phase for a given player color.
 */
export function getPhaseBreakdown(
  moves: CoachGameMove[],
  playerColor: 'white' | 'black',
): PhaseAccuracy[] {
  const phases: Record<GamePhase, { accuracySum: number; count: number; mistakes: number }> = {
    opening: { accuracySum: 0, count: 0, mistakes: 0 },
    middlegame: { accuracySum: 0, count: 0, mistakes: 0 },
    endgame: { accuracySum: 0, count: 0, mistakes: 0 },
  };

  for (const move of moves) {
    // Skip coach moves
    if (move.isCoachMove) continue;

    // Filter by player color: odd moveNumber = white, even = black
    const isWhiteMove = move.moveNumber % 2 === 1;
    if ((playerColor === 'white' && !isWhiteMove) || (playerColor === 'black' && isWhiteMove)) {
      continue;
    }

    // Need evaluations for accuracy
    if (move.evaluation === null || move.bestMoveEval === null || move.preMoveEval === null) {
      continue;
    }

    const phase = classifyPhase(move.fen, move.moveNumber);
    const bucket = phases[phase];

    // Compute per-move accuracy (same formula as accuracyService)
    const signForSide = isWhiteMove ? 1 : -1;
    const winProbBefore = evalToWinProb(move.preMoveEval * signForSide);
    const winProbBest = evalToWinProb(move.bestMoveEval * signForSide);
    const winProbAfter = evalToWinProb(move.evaluation * signForSide);

    let moveAccuracy: number;
    if (winProbBest <= 0.001) {
      moveAccuracy = 100;
    } else {
      const bestDelta = Math.abs(winProbBest - winProbAfter);
      moveAccuracy = Math.max(0, Math.min(100, 100 * (1 - bestDelta / Math.max(winProbBefore, 0.001))));
    }

    bucket.accuracySum += moveAccuracy;
    bucket.count++;

    // Count mistakes (inaccuracy, mistake, blunder)
    const cls = move.classification;
    if (cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder') {
      bucket.mistakes++;
    }
  }

  return (['opening', 'middlegame', 'endgame'] as GamePhase[]).map((phase) => {
    const bucket = phases[phase];
    return {
      phase,
      accuracy: bucket.count > 0 ? Math.round(bucket.accuracySum / bucket.count * 10) / 10 : 0,
      moveCount: bucket.count,
      mistakes: bucket.mistakes,
    };
  });
}
