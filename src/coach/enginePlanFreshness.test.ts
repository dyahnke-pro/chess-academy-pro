/**
 * A PLAN ABOUT ANOTHER POSITION IS NOT A PLAN.
 *
 * The 2026-08-16 coach-tab audit asked Learn three questions about one board,
 * with no move played between them, and got:
 *
 *   best-move  "The best move is Nc3 … Black is winning (about 2.9 points)."
 *   why-best   "The engine plays Nc3 … Black is winning (about 2.9 points)."
 *   plan       "Your plan: e4, then d4, then Nc3 … White is slightly better
 *               (about 0.5 points)."
 *
 * e4 was already on the board and +0.5 is the starting-position eval, so the
 * plan lane was describing move one while the other two lanes described the
 * live position — a 2.4-pawn contradiction the student sees seconds apart.
 *
 * The cause was that an engine plan carried no record of the position it was
 * computed for, so `if (!resolvedEnginePlan)` short-circuited the rebuild and a
 * surface-supplied stale plan went straight to the grounded answer. The cure is
 * selection, not validation (G0): stamp the FEN, and drop a plan that is not
 * about this board so it gets recomputed.
 */
import { describe, it, expect } from 'vitest';
import { enginePlanIsForBoard } from './coachService';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

describe('enginePlanIsForBoard', () => {
  it('keeps a plan computed for the board in front of the student', () => {
    expect(enginePlanIsForBoard({ fen: AFTER_E4 }, AFTER_E4)).toBe(true);
  });

  it('drops a plan computed for a different position — the 4.9-vs-0.5 bug', () => {
    // The exact shape of the defect: a start-position plan offered up on a
    // board that has moved on. Dropping it here is what makes the rebuild run.
    expect(enginePlanIsForBoard({ fen: START }, AFTER_E4)).toBe(false);
  });

  it('treats a plan with no position as usable rather than dropping it', () => {
    // `fen` is newly required on the type. Refusing unstamped plans would
    // silently disable the plan lane on any surface still building one by
    // hand — a regression wearing the costume of a fix.
    expect(enginePlanIsForBoard({}, AFTER_E4)).toBe(true);
  });

  it('cannot judge freshness with no board, so it does not pretend to', () => {
    expect(enginePlanIsForBoard({ fen: START }, undefined)).toBe(true);
  });

  it('has nothing to keep when there is no plan', () => {
    expect(enginePlanIsForBoard(undefined, AFTER_E4)).toBe(false);
  });

  it('compares the whole FEN, so the same placement at a different turn is not a match', () => {
    // Side-to-move, castling and en-passant all change what the best plan is;
    // a placement-only comparison would call two different positions equal.
    const blackToMove = START.replace(' w ', ' b ');
    expect(enginePlanIsForBoard({ fen: blackToMove }, START)).toBe(false);
  });
});
