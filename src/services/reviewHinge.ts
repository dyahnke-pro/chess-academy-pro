// reviewHinge — the turning point's "what it hinged on", in the RETROSPECTIVE
// register (G0). Phase 5 of the coach plan (doc §12.5).
//
// The review register is DISTINCT + LOCKED (David 2026-07-19): past-tense, about
// the student's own finished game — NOT the in-game present-tense voice. So this
// does NOT reuse the `positionFacts` clauses (those are live-voice); it takes the
// same COMPUTED facts (the load-bearing piece via perturbation; a standing threat
// via the null-move probe) and phrases them retrospectively: "the position was
// leaning on your knight — that's what the moment turned on."
//
// Needs only the turning-point FEN + a static-eval fn (no MultiPV / topLines), so
// it works with review's per-ply data.
import { computeLeansOn, type EvalBoardFn } from './perturbation';
import { computeMustDefend } from './threatOut';

const PNAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

/**
 * A retrospective one-liner naming what the turning point hinged on, or '' when
 * nothing computes. Prefers the load-bearing piece (what the position leaned on);
 * falls back to a standing threat that had to be met.
 */
export async function computeTurningPointHinge(input: {
  fenBefore: string;
  studentColor: 'w' | 'b';
  evalBoard: EvalBoardFn;
}): Promise<string> {
  const { fenBefore, studentColor, evalBoard } = input;
  try {
    const leansOn = await computeLeansOn(fenBefore, studentColor, evalBoard);
    if (leansOn) {
      return `The position was leaning on your ${leansOn.piece} on ${leansOn.square} — that's what the moment turned on.`;
    }
  } catch { /* the hinge is a bonus, never a blocker */ }
  try {
    const md = computeMustDefend(fenBefore, studentColor);
    if (md.net >= 3 && md.pieces[0]) {
      const p = md.pieces[0];
      return `There was a threat to meet first here — the ${PNAME[p.piece.toLowerCase()] ?? 'piece'} on ${p.square} was hanging.`;
    }
  } catch { /* ignore */ }
  return '';
}
