// A PLAN ARROW IS READ AS "PLAY THIS" — so it is drawn only when the move is
// SAFE on the board the student is looking at (David's Learn game, 2026-09-27,
// 21:41: a green arrow f3→d3 with the black queen on c4 — Qd3 hangs the queen to
// …Qxd3. The engine line played Qd3 LATER, after the queen had left c4; the
// arrow checked only that the move was legal now).
import { describe, it, expect } from 'vitest';
import { planFromUci } from './lookaheadPlan';
import { planMarks } from './planMarks';
import type { LookaheadPlan } from './lookaheadPlan';

const FEN = 'r4bkr/pb1p2p1/1p6/1P2P1B1/2q1P3/2P2Q2/1P4PP/5R1K w - - 0 23';

function marksFor(pv: string[]): ReturnType<typeof planMarks> {
  const plan = planFromUci(FEN, pv, 'white') as LookaheadPlan;
  expect(plan).not.toBeNull();
  const saidParts = [
    { squares: plan.theirs.spokenClauses.flatMap((c) => c.squares), side: 'theirs' as const },
    { squares: plan.mine.spokenClauses.flatMap((c) => c.squares), side: 'mine' as const },
    { squares: ['d3'], side: 'mine' as const },
  ];
  return planMarks({ plan, saidParts, fen: FEN, studentColor: 'white' });
}

describe('plan arrows are safe on the board they are drawn on', () => {
  it('no f3→d3 while the queen on c4 takes it', () => {
    const m = marksFor(['f1e1', 'c4e6', 'f3d3', 'e6e5', 'd3d7', 'e5g5']);
    expect(m.arrows.map((a) => `${a.startSquare}-${a.endSquare}`)).not.toContain('f3-d3');
    // The square is still named, so it keeps its highlight.
    expect(m.highlights.map((h) => h.square)).toContain('d3');
  });
});
