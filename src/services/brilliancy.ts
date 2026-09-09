/**
 * brilliancy — THE single source of truth for "is this move a real brilliancy,
 * and WHY" (David 2026-09-09: "Can the app answer why a move was brilliant? And
 * can it identify brilliant moves?").
 *
 * Before this, "brilliant" was decided two different, unreconciled ways, and
 * NEITHER required a sacrifice:
 *   - `gameAnalysisService.classifyCpLoss` (batch review, PERSISTED tag): a big
 *     eval GAIN or a found mate. This over-fires — grabbing the swing after the
 *     opponent blunders got tagged "brilliant" though it was just the punish.
 *   - `moveRating.classifyMoveFull` (live play-flash): the engine's best move
 *     when the 2nd-best is ≥150cp worse (the "only move"), or a found mate.
 * A true brilliancy (chess.com "!!") is the essence neither captured: the
 * BEST/ONLY move that SACRIFICES material and is NOT losing. This module owns
 * that rule so every surface that *identifies or explains* a brilliancy asks the
 * same question, and the coach can say WHY (G0 — the reason is computed here from
 * the board + engine, the model only phrases it).
 *
 * The PERSISTED coarse move-quality tag in `classifyCpLoss` is deliberately left
 * alone (changing its meaning would silently re-count every already-analyzed
 * game with no migration — the CLAUDE.md "bridge, don't destructively merge
 * persisted data" rule). This detector is the sharp, canonical signal the coach
 * VOICES; `classifyMoveFull` delegates its eval-only arms here so the two LIVE
 * definitions are genuinely one.
 */
import { describeSacrifice } from './groundedAnswer';

/** How much worse the 2nd-best line must be for a non-sacrifice "only move" to
 *  count as brilliant. Matches the historical `classifyMoveFull` threshold. */
export const ONLY_MOVE_GAP_CP = 150;
/** A brilliancy must not be losing. A sound sacrifice keeps the ENGINE eval
 *  (which already credits the compensation) at least roughly level; an unsound
 *  "sac" tanks the eval and is correctly excluded here. */
export const NOT_LOSING_FLOOR_CP = -50;

export type BrilliancyKind = 'sacrifice' | 'only-move' | 'mate';

export interface Brilliancy {
  brilliant: boolean;
  kind: BrilliancyKind | null;
  /** The board-true sacrifice phrase ("sacrifices the knight on d5") when the
   *  brilliancy is a sacrifice — reused verbatim in the WHY. */
  sacrificePhrase: string | null;
}

const NOT_BRILLIANT: Brilliancy = { brilliant: false, kind: null, sacrificePhrase: null };

/**
 * detectBrilliancy — decide whether the played move is a true brilliancy.
 *
 * All eval inputs are already flipped to the STUDENT's perspective (positive =
 * good for the mover). The rule: the move must be the engine's best AND not
 * losing, then it is brilliant if it forces mate, OR nets a real sacrifice
 * (board-true via describeSacrifice — sound because the engine still rates it
 * best), OR is the only move (2nd-best ≥ ONLY_MOVE_GAP_CP worse). A sacrifice
 * that ALSO mates is framed as a sacrifice (the sharper teaching point).
 *
 * `fenBefore`/`san` are optional: without them the sacrifice arm is skipped
 * (the caller has only evals — e.g. the play-flash classifier), leaving the
 * mate + only-move arms, which is exactly the pre-existing eval-only definition.
 */
export function detectBrilliancy(input: {
  isBest: boolean;
  /** Engine eval AFTER the move, student-POV centipawns. Null → unknown, treated
   *  as not-losing only when a forced mate for the student is flagged. */
  evalAfterStudentCp: number | null;
  /** The student has a forced mate after the move. */
  postForcedMateForStudent: boolean;
  /** best-line eval minus 2nd-best-line eval, student-POV cp (>= 0). Optional. */
  onlyMoveGapCp?: number | null;
  /** For the sacrifice arm — the position before the move + the move in SAN. */
  fenBefore?: string;
  san?: string;
}): Brilliancy {
  if (!input.isBest) return NOT_BRILLIANT;

  const notLosing = input.postForcedMateForStudent
    || (input.evalAfterStudentCp !== null && input.evalAfterStudentCp >= NOT_LOSING_FLOOR_CP);
  if (!notLosing) return NOT_BRILLIANT;

  const sac = input.fenBefore && input.san ? describeSacrifice(input.fenBefore, input.san) : null;

  // A sound sacrifice is the sharpest brilliancy — frame it as one even when it
  // also delivers mate.
  if (sac) return { brilliant: true, kind: 'sacrifice', sacrificePhrase: sac };
  if (input.postForcedMateForStudent) return { brilliant: true, kind: 'mate', sacrificePhrase: null };
  if (input.onlyMoveGapCp !== null && input.onlyMoveGapCp !== undefined && input.onlyMoveGapCp >= ONLY_MOVE_GAP_CP) {
    return { brilliant: true, kind: 'only-move', sacrificePhrase: null };
  }
  return NOT_BRILLIANT;
}

/**
 * describeBrilliancy — the grounded WHY line for a detected brilliancy. Every
 * clause is board/engine-true (the sacrifice phrase from describeSacrifice, the
 * soundness from isBest + not-losing, the mate from the engine). Returns null
 * when the move is not brilliant, so callers stay silent rather than praising.
 */
export function describeBrilliancy(b: Brilliancy, playedSan: string): string | null {
  if (!b.brilliant) return null;
  switch (b.kind) {
    case 'sacrifice':
      return `${playedSan} is brilliant — it ${b.sacrificePhrase}, and the engine still rates it the best move, so the sacrifice is sound.`;
    case 'mate':
      return `${playedSan} is brilliant — it forces checkmate.`;
    case 'only-move':
      return `${playedSan} is brilliant — it's the only move that holds the position; every alternative is far worse.`;
    default:
      return null;
  }
}
