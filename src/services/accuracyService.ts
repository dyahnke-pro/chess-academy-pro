import type { CoachGameMove, GameAccuracy, MoveClassificationCounts } from '../types';

/** Threshold above which Stockfish encodes checkmate */
const MATE_THRESHOLD = 20000;

/**
 * Cap extreme evaluations (mate scores) to a fixed ceiling so that
 * centipawn-loss calculations stay meaningful. Mate scores (±30000)
 * are capped to ±1500 — any loss above ~500 cp already floors accuracy.
 */
export function capEval(evalCp: number): number {
  if (evalCp >= MATE_THRESHOLD) return 1500;
  if (evalCp <= -MATE_THRESHOLD) return -1500;
  return evalCp;
}

/**
 * Convert centipawn loss into a per-move accuracy score (0–100).
 *
 * Uses an exponential decay: accuracy = 103.1668 · e^(−0.009 · cpLoss) − 3.1668
 *
 * Calibration (per-move):
 *   cpLoss   0 → 100%    (perfect move)
 *   cpLoss  10 →  91%    (slight inaccuracy)
 *   cpLoss  25 →  79%    (inaccuracy)
 *   cpLoss  50 →  62%    (significant inaccuracy)
 *   cpLoss 100 →  38%    (mistake)
 *   cpLoss 200 →  14%    (big mistake)
 *   cpLoss 300 →   4%    (blunder)
 *
 * This produces realistic game averages:
 *   Strong play  → 80–95%
 *   Good play    → 70–85%
 *   Intermediate → 55–75%
 *   Beginner     → 35–60%
 */
export function cpLossToAccuracy(cpLoss: number): number {
  const raw = 103.1668 * Math.exp(-0.009 * cpLoss) - 3.1668;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Calculate accuracy scores for both players using centipawn loss.
 *
 * For each move, computes how many centipawns the player lost compared
 * to the position before their move. This penalizes inaccurate play
 * equally regardless of whether the position is winning or equal —
 * a 100 cp loss is a 100 cp loss whether you're +5 or ±0.
 */
export function calculateAccuracy(moves: CoachGameMove[]): GameAccuracy {
  let whiteAccuracySum = 0;
  let whiteCount = 0;
  let blackAccuracySum = 0;
  let blackCount = 0;

  for (const move of moves) {
    // Skip book moves and moves with missing eval data
    if (move.classification === 'book') continue;
    if (move.evaluation === null || move.preMoveEval === null) continue;

    // Determine which color this move is
    // Odd moveNumber = white's move (1=white, 2=black, 3=white...)
    const isWhiteMove = move.moveNumber % 2 === 1;

    // Compute centipawn loss from the moving side's perspective.
    // Evals are always from white's perspective, so for black we flip the sign.
    const sign = isWhiteMove ? 1 : -1;
    const evalBefore = capEval(move.preMoveEval) * sign;
    const evalAfter = capEval(move.evaluation) * sign;
    const cpLoss = Math.max(0, evalBefore - evalAfter);

    const moveAccuracy = cpLossToAccuracy(cpLoss);

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
