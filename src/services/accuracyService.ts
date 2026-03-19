import type { CoachGameMove, GameAccuracy, MoveClassificationCounts } from '../types';

/**
 * Convert centipawn evaluation to win probability (0 to 1).
 * Uses the logistic model: winProb = 1 / (1 + 10^(-eval/400))
 */
function evalToWinProb(evalCp: number): number {
  return 1 / (1 + Math.pow(10, -evalCp / 400));
}

/**
 * Calculate accuracy scores for both players.
 * Uses a win-probability delta approach similar to chess.com's CAPS2.
 */
export function calculateAccuracy(moves: CoachGameMove[]): GameAccuracy {
  let whiteAccuracySum = 0;
  let whiteCount = 0;
  let blackAccuracySum = 0;
  let blackCount = 0;

  for (const move of moves) {
    // Skip coach moves for the opponent side, skip book moves, skip missing data
    if (move.classification === 'book') continue;
    if (move.evaluation === null || move.bestMoveEval === null) continue;
    if (move.preMoveEval === null) continue;

    // Determine which color this move is
    // Even moveNumber = white's move (1-indexed: 1=white, 2=black, 3=white...)
    const isWhiteMove = move.moveNumber % 2 === 1;

    // Win probability before and after the move, from the moving side's perspective
    const signForSide = isWhiteMove ? 1 : -1;
    const winProbBefore = evalToWinProb(move.preMoveEval * signForSide);
    const winProbBest = evalToWinProb(move.bestMoveEval * signForSide);
    const winProbAfter = evalToWinProb(move.evaluation * signForSide);

    // Per-move accuracy: ratio of win probability retained vs best move
    // If the player played the best move, accuracy = 100%
    // If the player's move is much worse, accuracy drops toward 0%
    let moveAccuracy: number;
    if (winProbBest <= 0.01) {
      // Position was already lost — any move is "accurate" since there's nothing to lose
      moveAccuracy = 100;
    } else {
      // How much win probability did the player retain compared to the best move?
      moveAccuracy = Math.max(0, Math.min(100, (winProbAfter / winProbBest) * 100));
    }

    if (isWhiteMove) {
      whiteAccuracySum += moveAccuracy;
      whiteCount++;
    } else {
      blackAccuracySum += moveAccuracy;
      blackCount++;
    }
  }

  return {
    white: whiteCount > 0 ? Math.round(whiteAccuracySum / whiteCount * 10) / 10 : 0,
    black: blackCount > 0 ? Math.round(blackAccuracySum / blackCount * 10) / 10 : 0,
    moveCount: whiteCount + blackCount,
  };
}

/**
 * Count moves by classification for one side.
 */
export function getClassificationCounts(
  moves: CoachGameMove[],
  playerColor: 'white' | 'black',
): MoveClassificationCounts {
  const counts: MoveClassificationCounts = {
    brilliant: 0,
    great: 0,
    good: 0,
    book: 0,
    miss: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  };

  for (const move of moves) {
    if (move.isCoachMove) continue;
    if (!move.classification) continue;

    // Filter by player color: odd moveNumber = white, even = black
    const isWhiteMove = move.moveNumber % 2 === 1;
    if ((playerColor === 'white' && !isWhiteMove) || (playerColor === 'black' && isWhiteMove)) {
      continue;
    }

    const key = move.classification;
    if (key in counts) {
      counts[key]++;
    }
  }

  return counts;
}

/**
 * Detect missed opportunities: positions where the opponent made a mistake/blunder
 * but the player failed to capitalize (eval swung back toward equal).
 * Returns the count of misses.
 */
const MISS_EVAL_THRESHOLD = 50;

export function detectMisses(
  moves: CoachGameMove[],
  playerColor: 'white' | 'black',
): number {
  let missCount = 0;

  for (let i = 1; i < moves.length; i++) {
    const prevMove = moves[i - 1];
    const currentMove = moves[i];

    // We're looking at the player's move (currentMove) after the opponent's mistake (prevMove)
    const isPlayerMove = playerColor === 'white'
      ? currentMove.moveNumber % 2 === 1
      : currentMove.moveNumber % 2 === 0;
    if (!isPlayerMove) continue;
    if (currentMove.isCoachMove) continue;

    // Check if the opponent's previous move was a mistake or blunder
    const opponentClassification = prevMove.classification;
    if (opponentClassification !== 'mistake' && opponentClassification !== 'blunder') continue;

    // Check if the player failed to capitalize: their move lost significant eval
    if (currentMove.evaluation === null || currentMove.bestMoveEval === null) continue;

    const sign = playerColor === 'white' ? 1 : -1;
    const evalAfterPlayerMove = currentMove.evaluation * sign;
    const bestEvalForPlayer = currentMove.bestMoveEval * sign;
    const cpLost = bestEvalForPlayer - evalAfterPlayerMove;

    if (cpLost >= MISS_EVAL_THRESHOLD) {
      missCount++;
    }
  }

  return missCount;
}
