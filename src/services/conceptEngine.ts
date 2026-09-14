/**
 * conceptEngine — the ONE shared computer that reads a board and returns the
 * teachable concept(s) present, computed and ranked (never authored-from-the-LLM;
 * G0). Exposed everywhere the coach lives so a concept is taught the same way on
 * puzzles AND during live gameplay (docs/plans/2026-09-14-computed-concept-
 * detectors.md).
 *
 * This file grows across P1: side calculators (here) → concept renderer →
 * `conceptForBoard` router (ranked, multi-concept). Kept dependency-light and
 * pure so every surface can call it synchronously.
 */

export type Side = 'white' | 'black';

/** Side to move in a FEN. */
export function sideToMove(fen: string): Side {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

/**
 * The side that SOLVES a Lichess-style puzzle. Lichess FENs sit one ply before
 * the opponent's setup move (`solutionUci[0]`), so the solver is the side OPPOSITE
 * the FEN's side-to-move. This is the side the puzzle's resource belongs to — the
 * one whose concept we teach and frame as "you".
 */
export function solvingSide(fen: string): Side {
  return sideToMove(fen) === 'white' ? 'black' : 'white';
}

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };

/** Non-king material balance, white minus black, in pawns. */
export function materialBalance(fen: string): number {
  let bal = 0;
  for (const ch of fen.split(' ')[0]) {
    const v = VAL[ch.toLowerCase()];
    if (!v) continue;
    bal += ch === ch.toUpperCase() ? v : -v;
  }
  return bal;
}

/**
 * The stronger side by raw material, or 'balanced' within ~1 pawn. Used to frame
 * an endgame-technique concept toward the side trying to convert. A tie in
 * material (opposition, zugzwang, fortress) returns 'balanced' — those concepts
 * are framed by side-to-move / the solution instead.
 */
export function strongerSide(fen: string): Side | 'balanced' {
  const bal = materialBalance(fen);
  if (bal >= 1) return 'white';
  if (bal <= -1) return 'black';
  return 'balanced';
}

/**
 * The side a concept should be FRAMED for ("you" in narration). On a puzzle it's
 * the solver; when a solution is absent (live board) it's the stronger side, and
 * when material is level it's the side to move (whoever is about to act on the
 * idea). Callers on the student's own board pass `studentSide` to override.
 */
export function framingSide(
  fen: string,
  opts: { hasSolution?: boolean; studentSide?: Side } = {},
): Side {
  if (opts.studentSide) return opts.studentSide;
  if (opts.hasSolution) return solvingSide(fen);
  const stronger = strongerSide(fen);
  return stronger === 'balanced' ? sideToMove(fen) : stronger;
}
