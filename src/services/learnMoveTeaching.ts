/**
 * learnMoveTeaching — grounded per-move "why" for the LEARN surface
 * (`/coach/teach`), ported from the post-game review's better-move engine
 * (task #26 Phase B, David 2026-07-22: port the review coach into Learn).
 *
 * Pure board facts (G0/G3): no LLM, no engine — every claim is computed from
 * chess.js, so nothing can be invented or overstated. Returns null when the
 * position deserves silence (empty > generic > invented).
 *
 * REGISTER: this module is used ONLY where the STUDENT is the mover (a drill /
 * find-the-move / guided-play answer), so the "your move" seat framing that
 * `explainBestMoveGrounded` produces is CORRECT here. Do NOT reuse it for the
 * passive Watch walkthrough narration, where the mover is White/Black in a demo
 * game and there is no "you" — that path needs a side-reframed overlay (the
 * two-register law of 2026-07-19).
 */
import { Chess } from 'chess.js';
import { explainBestMoveGrounded } from './groundedAnswer';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';

/**
 * When the student plays `tried` in a drill but the taught move is `expected`,
 * build the grounded correction: WHY the right move is right, and what the
 * played move let slip. Prefers `explainBestMoveGrounded` (contrasts played vs
 * best — its `costClause` names the concrete consequence of the slip), falling
 * back to the structural "why the move is strong" note. Returns null for
 * silence when neither computer finds a board-true idea.
 */
export function buildDrillWrongTeaching(
  drillFen: string,
  tried: string,
  expected: string,
): string | null {
  try {
    const probe = new Chess(drillFen);
    const expMv = probe.move(expected);
    if (!expMv) return null;
    const expectedUci = `${expMv.from}${expMv.to}${expMv.promotion ?? ''}`;
    const moverColor: 'white' | 'black' =
      drillFen.split(' ')[1] === 'b' ? 'black' : 'white';
    return (
      explainBestMoveGrounded(drillFen, tried, expectedUci, moverColor) ??
      buildReviewMoveTeaching(drillFen, expected)
    );
  } catch {
    return null;
  }
}
