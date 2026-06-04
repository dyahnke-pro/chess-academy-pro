// Slip detection — the layered "should the coach ask why?" gate (David
// 2026-05-21). A move warrants a misconception prompt only when it is
// off-book AND actually worse — teach, don't nag. While the student is
// following theory, stay silent; the moment they leave book into a worse
// move (or drop eval once out of book), the coach engages. Shared by the
// live faucet (Discussion Practice) and the review faucets.

/** Centipawn-loss thresholds (mover's perspective). Aligned with the
 *  game-import blunder scan (BLUNDER_THRESHOLD_CP = 150). */
export const SLIP_CP = {
  inaccuracy: 50,
  mistake: 100,
  blunder: 200,
} as const;

export type SlipSeverity = 'inaccuracy' | 'mistake' | 'blunder';

export interface SlipInput {
  /** Still inside known opening theory at this move? */
  inBook: boolean;
  /** The theory move expected here, when inBook. */
  bookMoveSan?: string;
  /** The move actually played. */
  playedSan: string;
  /** Eval before the move, mover's perspective, in centipawns. */
  evalBeforeCp?: number;
  /** Eval after the move, mover's perspective, in centipawns. */
  evalAfterCp?: number;
  /** Is this a line the student SHOULD know (learned / SRS-active) or a
   *  general principle? The count-against rule: only these become
   *  weaknesses; first-exposure theory is "not learned yet", not a slip
   *  to count. */
  learned: boolean;
}

export interface SlipResult {
  /** Fire the "why did you play that?" prompt? */
  isSlip: boolean;
  /** Why it fired. `left-book` = departed theory into something worse;
   *  `eval-drop` = already off-book and the eval fell. */
  reason: 'left-book' | 'eval-drop' | null;
  severity: SlipSeverity | null;
  /** Centipawns lost vs the position before the move (>=0 = worse). */
  cpLoss: number;
  /** Whether this slip should COUNT as a weakness (the learned gate).
   *  A real slip on an unlearned line still surfaces a one-line teach,
   *  but is not logged to the weakness bucket. */
  shouldCount: boolean;
}

function severityFor(cpLoss: number): SlipSeverity | null {
  if (cpLoss >= SLIP_CP.blunder) return 'blunder';
  if (cpLoss >= SLIP_CP.mistake) return 'mistake';
  if (cpLoss >= SLIP_CP.inaccuracy) return 'inaccuracy';
  return null;
}

/** Rating-adaptive interjection bar (David 2026-06-04): the coach's
 *  "why did you play that?" question gets PICKIER as the player improves —
 *  don't nag a beginner about every inaccuracy, but a 2000+ player wants the
 *  sharper feedback.
 *    - beginner     (< 1000):    blunders only
 *    - intermediate (1000–2000): mistakes + blunders
 *    - advanced     (> 2000):    inaccuracies + mistakes + blunders
 *  The slip is still CAPTURED to the weakness bucket below the bar — this
 *  governs only whether to INTERRUPT with the spoken question. Defaults the
 *  rating to 1200 (intermediate) when unknown. */
export function slipWarrantsInterjection(cpLoss: number, rating: number | undefined | null): boolean {
  const r = rating ?? 1200;
  if (r > 2000) return cpLoss >= SLIP_CP.inaccuracy;
  if (r >= 1000) return cpLoss >= SLIP_CP.mistake;
  return cpLoss >= SLIP_CP.blunder;
}

/** Decide whether a played move is a slip worth teaching. Pure logic —
 *  callers supply book status (opening DB) + evals (Stockfish). */
export function detectSlip(input: SlipInput): SlipResult {
  const none: SlipResult = { isSlip: false, reason: null, severity: null, cpLoss: 0, shouldCount: false };

  // Following the book move is never a slip.
  if (input.inBook && input.bookMoveSan && input.playedSan === input.bookMoveSan) {
    return none;
  }

  const cpLoss =
    input.evalBeforeCp !== undefined && input.evalAfterCp !== undefined
      ? input.evalBeforeCp - input.evalAfterCp
      : 0;
  const severity = severityFor(cpLoss);
  if (!severity) return none;

  // Off-book is implied either by leaving theory this move (inBook but
  // not the book move) or by already being past book (!inBook).
  const reason: SlipResult['reason'] = input.inBook ? 'left-book' : 'eval-drop';
  return {
    isSlip: true,
    reason,
    severity,
    cpLoss,
    shouldCount: input.learned,
  };
}
