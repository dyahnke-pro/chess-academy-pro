// opponentGap — the take-advantage-of-the-gap (G0). When the throttled opponent
// UNDER-PLAYS its ideal and hands the student something, flag it — subtly (David
// 2026-08-27, doc §4.0b): the miss is the hook, "he let you off — look here",
// board-nudge only, never the move. Gated so we DON'T cry wolf: only a real gift
// (a concrete eval swing in the student's favour) with a concrete follow-up.
//
// Reuses what we already computed: the opponent's IDEAL (opponentIntent, from the
// pre-move fan) and the post-move analysis (the student's now-position). No new
// search. G0: the swing and the best follow-up are Stockfish; this only decides
// whether the gap is worth pointing at.
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0b.
import type { StockfishAnalysis } from '../types';
import type { OpponentIntent } from './opponentIntent';

/** A gift of at least this many pawns (student POV) is worth pointing at. */
const GIFT_CP = 120;

export interface OpponentGap {
  /** How much the opponent's actual move gave the student, in cp (student POV). */
  gainCp: number;
  /** The student's best move now (UCI) — the opportunity, for the lead-the-eye
   *  arrow. The prose never names it (guide-don't-tell). */
  opportunityUci: string;
  /** The square the arrow should land on (the opportunity's destination). */
  toSquare: string;
}

/**
 * Detect a real gift. Compares the eval AFTER the opponent's actual move to the
 * eval their IDEAL would have left — both student-POV — and requires the swing to
 * clear GIFT_CP AND a concrete best follow-up to exist. Returns null when the
 * opponent played their best, when the deviation cost them nothing usable, or when
 * inputs are missing (no cry-wolf).
 */
export function detectOpponentGap(input: {
  opponentIntent: OpponentIntent | null;
  /** The opponent's ACTUAL move, UCI. */
  opponentPlayedUci: string;
  /** Analysis of the position AFTER the opponent's actual move (student to move).
   *  `evaluation` is white-POV; `bestMove` is the student's opportunity. */
  analysisAfter: Pick<StockfishAnalysis, 'evaluation' | 'bestMove' | 'isMate' | 'mateIn'>;
  studentColor: 'w' | 'b';
}): OpponentGap | null {
  // `opponentPlayedUci` is part of the contract (the caller has it) but the gap is
  // decided on the RESULTING eval, not the move string — so it isn't read here.
  const { opponentIntent, analysisAfter, studentColor } = input;
  const ideal = opponentIntent?.plans[0];
  if (!ideal) return null;

  // If the opponent played their ideal first move, there's no gap.
  // (opponentIntent stores the ideal as SAN; compare on the eval instead — the
  // caller passes the actual UCI, and we only care whether the RESULT is better
  // for the student than the ideal would have been.)
  const sign = studentColor === 'w' ? 1 : -1;
  const whitePovNow = analysisAfter.isMate
    ? ((analysisAfter.mateIn ?? 0) > 0 ? 100000 : -100000)
    : analysisAfter.evaluation;
  const studentEvalNow = whitePovNow * sign;
  // The ideal line's eval is white-POV in OpponentPlan.evalCp → student POV.
  const studentEvalIfIdeal = ideal.evalCp * sign;

  const gainCp = studentEvalNow - studentEvalIfIdeal;
  if (gainCp < GIFT_CP) return null;                // not a real gift
  if (!analysisAfter.bestMove) return null;         // no concrete follow-up
  // A won-game "gift" (already crushing) is not a teaching moment — cap it.
  if (Math.abs(studentEvalIfIdeal) >= 600) return null;

  return {
    gainCp,
    opportunityUci: analysisAfter.bestMove,
    toSquare: analysisAfter.bestMove.slice(2, 4),
  };
}

/** The subtle nudge — guide-don't-tell: names NO move, leads the eye with the
 *  arrow the caller draws from `toSquare`. */
export function opponentGapClause(_gap: OpponentGap): string {
  return `he let you off there — there's a chance right here if you can spot it.`;
}
