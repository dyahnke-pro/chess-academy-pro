import type { CoachGameMove, GameAccuracy, MoveClassificationCounts } from '../types';

/** Threshold above which Stockfish encodes checkmate. */
const MATE_THRESHOLD = 20000;

/**
 * Cap extreme evaluations (mate scores) so the win-percent sigmoid
 * stays in a sane range. Mate scores (±30000) cap to ±1500 — by then
 * winPercent already saturates at 0 or 100 anyway.
 */
export function capEval(evalCp: number): number {
  if (evalCp >= MATE_THRESHOLD) return 1500;
  if (evalCp <= -MATE_THRESHOLD) return -1500;
  return evalCp;
}

/**
 * Convert a centipawn evaluation (white's perspective) to a win
 * percentage in [0, 100]. Sigmoid coefficients match the published
 * lichess / chess.com models so a 200cp advantage maps to ~67%, a
 * 500cp advantage to ~85%, and a mate-by-threshold saturates near
 * 100%. Same constant lichess uses (0.00368208).
 *
 * Reference: https://lichess.org/page/accuracy
 */
export function winPercent(evalCp: number): number {
  const capped = capEval(evalCp);
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * capped)) - 1);
}

/**
 * Per-move accuracy from the win-percentage drop the moving side
 * caused. A move that loses 0% win-percent is 100% accurate; a move
 * that drops win-percent by 25 points is ~36% accurate; >40 points
 * floors near zero. Constants from lichess (which match chess.com's
 * documented method).
 *
 *   delta  0  → 100.0
 *   delta  5  →  79.4
 *   delta 10  →  62.9
 *   delta 20  →  39.6
 *   delta 30  →  24.7
 *   delta 50  →   8.5
 */
export function accuracyFromWinDelta(deltaPct: number): number {
  const delta = Math.max(0, deltaPct);
  const raw = 103.1668 * Math.exp(-0.04354 * delta) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

/**
 * Per-move accuracy from raw centipawn loss. Kept for backwards
 * compatibility with callers that haven't migrated to the
 * win-percent path. New code should compute win-percent deltas and
 * call accuracyFromWinDelta directly.
 *
 * @deprecated use winPercent + accuracyFromWinDelta instead.
 */
export function cpLossToAccuracy(cpLoss: number): number {
  // Approximate the new formula by routing through win-percent. We
  // use eval=0 as a baseline so the delta = winPercent(0) -
  // winPercent(-cpLoss) is the moving-side's drop. This keeps any
  // legacy caller producing numbers consistent with calculateAccuracy.
  const before = winPercent(0);
  const after = winPercent(-Math.max(0, cpLoss));
  return accuracyFromWinDelta(before - after);
}

/**
 * Harmonic mean — chess.com's published aggregator for game accuracy.
 * Gives extra weight to bad moves: a single 10% accuracy move drags
 * the average down more than the arithmetic mean would. This is why
 * a game can have many "good" moves and still end up at 70% accuracy
 * after one or two blunders.
 *
 * Edge case: harmonic mean blows up when any value is 0. We clamp
 * the per-move accuracy to a small floor (1) to keep the math
 * well-defined while still penalizing blunders heavily.
 */
function harmonicMean(values: number[]): number {
  if (values.length === 0) return 0;
  let reciprocalSum = 0;
  for (const v of values) {
    reciprocalSum += 1 / Math.max(1, v);
  }
  return values.length / reciprocalSum;
}

/**
 * Calculate per-side accuracy using chess.com's published algorithm:
 * win-percentage delta per move → exponential-decay accuracy → harmonic
 * mean over the side's moves. Replaces the older raw-centipawn-loss
 * model that returned 100% on games with real mistakes (because cp
 * loss didn't account for "winning by enough that a 50cp slip
 * doesn't matter").
 *
 * Convention: `move.moveNumber` is PLY-indexed (1=White ply 1,
 * 2=Black ply 1, 3=White ply 2, …) — same as CoachGamePage's
 * moveCountRef. Color is derived as `moveNumber % 2 === 1`.
 */
export function calculateAccuracy(moves: CoachGameMove[]): GameAccuracy {
  const whiteAccs: number[] = [];
  const blackAccs: number[] = [];

  for (const move of moves) {
    if (move.classification === 'book') continue;
    if (move.evaluation === null || move.preMoveEval === null) continue;

    const isWhiteMove = move.moveNumber % 2 === 1;

    // Win-percent must be from the moving side's perspective. Eval
    // is always from White's perspective, so flip for Black.
    const winBefore = isWhiteMove
      ? winPercent(move.preMoveEval)
      : 100 - winPercent(move.preMoveEval);
    const winAfter = isWhiteMove
      ? winPercent(move.evaluation)
      : 100 - winPercent(move.evaluation);

    const moveAcc = accuracyFromWinDelta(winBefore - winAfter);

    if (isWhiteMove) whiteAccs.push(moveAcc);
    else blackAccs.push(moveAcc);
  }

  return {
    white: whiteAccs.length > 0 ? Math.round(harmonicMean(whiteAccs) * 10) / 10 : 0,
    black: blackAccs.length > 0 ? Math.round(harmonicMean(blackAccs) * 10) / 10 : 0,
    moveCount: whiteAccs.length + blackAccs.length,
  };
}

/**
 * Count moves by classification for one side. Filters by color via
 * the same ply-indexed `moveNumber % 2` convention as
 * `calculateAccuracy`. Coach (opponent) moves are excluded — the
 * pills always show the player's own moves only.
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
 * Detect missed opportunities: positions where the opponent made a
 * mistake/blunder but the player failed to capitalize (eval swung
 * back toward equal). Returns the count of misses.
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

    const isPlayerMove = playerColor === 'white'
      ? currentMove.moveNumber % 2 === 1
      : currentMove.moveNumber % 2 === 0;
    if (!isPlayerMove) continue;
    if (currentMove.isCoachMove) continue;

    const opponentClassification = prevMove.classification;
    if (opponentClassification !== 'mistake' && opponentClassification !== 'blunder') continue;

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
