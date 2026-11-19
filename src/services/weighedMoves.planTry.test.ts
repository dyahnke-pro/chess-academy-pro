import { describe, it, expect } from 'vitest';
import { standingRefutations } from './weighedMoves';
import { planTries } from './tryCandidates';

// Danya, endgame attacks #3: "the immediate 29.Qc5 leads nowhere after
// 29...Qd7! 30.Qxb5 Qd2". Stockfish lines (depth 16), White's seat.
const FEN = '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29';
const best = { evaluation: -7, mate: null, moves: ['f1e2', 'b7e7', 'e2b5', 'a4a3', 'b2a3'] };
const qc5 = { evaluation: -92, mate: null, moves: ['d4c5', 'b7d7', 'c5b5', 'd7d2', 'b5e2', 'd2c1', 'g1f2', 'f6d5'] };

describe("the plan's direct try, refuted by what became of its target", () => {
  it('Qc5 is weighed for the b5 pawn, met by …Qd7, and wins only the pawn', () => {
    const plan = planTries(FEN);
    const considered = new Map(plan.map((t) => [t.uci, { why: 'plan' as const, target: t.target }]));
    const out = standingRefutations({ fen: FEN, student: 'w', rating: 1400, reads: [best, qc5], considered });
    const t = out.find((x) => x.san === 'Qc5');
    expect(t?.text).toMatch(/Qc5 .*b5.*…Qd7/);
    expect(t?.text).toMatch(/wins their pawn on b5, and that is all/);
  });

  it('NEGATIVE CONTROL: the same move, not weighed for the plan, is under the eye\'s pawn bar and stays silent', () => {
    const out = standingRefutations({ fen: FEN, student: 'w', rating: 1400, reads: [best, qc5] });
    expect(out.find((x) => x.san === 'Qc5')).toBeUndefined();
  });
});
