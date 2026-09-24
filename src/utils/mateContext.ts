// mateContext — a leaf (no imports), so a surface can read whose mate it is
// without importing a fact computer.

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
): { missedMate: number | null; allowedMate: number | null } {
  const sign = moverColor === 'white' ? 1 : -1;
  const preMate = pre?.isMate && pre.mateIn !== null ? pre.mateIn * sign : null;
  const postMate = post?.isMate && post.mateIn !== null ? post.mateIn * sign : null;
  const stillMating = postMate !== null && postMate > 0;
  const missedMate = preMate !== null && preMate > 0 && !wasBest && !stillMating ? Math.abs(preMate) : null;
  const allowedMate = postMate !== null && postMate < 0 ? Math.abs(postMate) : null;
  return { missedMate, allowedMate };
}
