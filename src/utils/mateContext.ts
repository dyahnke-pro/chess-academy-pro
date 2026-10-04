// mateContext — a leaf (imports only the leaf constants), so a surface can read
// whose mate it is without importing a fact computer.
import { SHORT_MATE_MOVES } from '../services/engineConstants';

/** WHOSE MATE IT IS — the one derivation every mover-grading path uses.
 *
 *  An engine mate score is signed from WHITE's side (positive = White mates).
 *  David's hand walk of a Naroditsky game (2026-09-24) caught the Learn page
 *  passing `mateIn` through whenever ANY mate was on the board: with a forced
 *  mate FOR the student, every mating move was graded "a blunder … Qa4 was the
 *  move — it would stop the mate". Here the sign decides:
 *  - MISSED: the mover had a mate before and no longer has one after.
 *  - ALLOWED: after the move, the OPPONENT has the mate.
 *  A move that keeps its own forced mate missed nothing, whatever its length. */
export function mateContext(
  pre: { isMate: boolean; mateIn: number | null } | null | undefined,
  post: { isMate: boolean; mateIn: number | null } | null | undefined,
  moverColor: 'white' | 'black',
  wasBest = false,
): { missedMate: number | null; allowedMate: number | null; bestMate: number | null } {
  const sign = moverColor === 'white' ? 1 : -1;
  const preMate = pre?.isMate && pre.mateIn !== null ? pre.mateIn * sign : null;
  const postMate = post?.isMate && post.mateIn !== null ? post.mateIn * sign : null;
  const stillMating = postMate !== null && postMate > 0;
  // MISSED only when the mate given up was SHORT: a longer one can sit past the
  // horizon of the read after the move (clean-pass walk 2026-10-04, 37.h3 kept
  // a mate in 14 while the best move's was 11), so its absence there proves
  // nothing. Same rule as the review's `classifyCpLoss`.
  const missedMate = preMate !== null && preMate > 0 && preMate <= SHORT_MATE_MOVES && !wasBest && !stillMating ? preMate : null;
  const allowedMate = postMate !== null && postMate < 0 ? Math.abs(postMate) : null;
  // The best move's own forced mate, when the board had one for the mover —
  // the reason a better move is better is then the mate, never a line read
  // cut short of it (clean-pass re-walk 2026-10-04, G1 31.Qxe4+: "Rc7+ was
  // cleaner — it would swing pieces toward their king" two moves after
  // "There's a forced mate here, starting with Rc7+").
  const bestMate = preMate !== null && preMate > 0 && !wasBest ? Math.abs(preMate) : null;
  return { missedMate, allowedMate, bestMate };
}
