import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { planSteps, planStepsText } from './planSteps';

const after = (...sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('planSteps — the plan in the engine line, said as one idea', () => {
  it('QGD: after e3, Bd3 and Qc2 line up on h7 and the king castles', () => {
    // 1.d4 Nf6 2.c4 e6 3.Nc3 d5 4.Nf3 Be7 5.e3 — line …O-O Bd3 b6 Qc2 Bb7 O-O
    const p = planSteps(after('d4', 'Nf6', 'c4', 'e6', 'Nc3', 'd5', 'Nf3', 'Be7', 'e3'), ['e8g8', 'f1d3', 'b7b6', 'd1c2', 'c8b7', 'e1g1'], null);
    expect(p?.steps.map((s) => s.san)).toEqual(['Bd3', 'Qc2', 'O-O']);
    expect(p?.aim).toBe('h7');
    expect(planStepsText(p!, 'your')).toBe('Your plan from here: Bd3, Qc2 and then castling, the pieces lining up on their pawn on h7.');
  });

  it('says nothing when the line is a fight (a capture in its first plies)', () => {
    expect(planSteps(after('e4', 'e5', 'Nf3', 'Nc6', 'd4'), ['e5d4', 'f3d4', 'g8f6', 'b1c3'], null)).toBeNull();
  });

  it('says nothing for two moves that build nothing together', () => {
    // 1.e4 e5 2.Nf3 — line …Nc6 a3 a6 h3 h6: no aim, no break, no castling
    expect(planSteps(after('e4', 'e5', 'Nf3'), ['b8c6', 'a2a3', 'a7a6', 'h2h3', 'h7h6'], null)).toBeNull();
  });

  it('says nothing for development alone ("Bc5, castling … to finish developing" was filler)', () => {
    expect(planSteps(after('e4', 'e5', 'Nf3', 'Nc6', 'Bc4'), ['f8c5', 'e1g1', 'g8f6', 'd2d3'], null)).toBeNull();
  });

  it('the break is named once, in its place among the steps', () => {
    const p = planSteps(after('d4', 'd5', 'Nf3'), ['g8f6', 'c2c4', 'e7e6', 'b1c3'], null);
    expect(p && planStepsText(p, 'your')).toBe('Your plan from here: the c4 break and then Nc3.');
  });

  it("their plan aims at YOUR piece: the owner is said from the student's seat", () => {
    const p = planSteps(after('d4', 'Nf6', 'c4', 'e6', 'Nc3', 'd5', 'Nf3', 'Be7', 'e3'), ['e8g8', 'f1d3', 'b7b6', 'd1c2', 'c8b7', 'e1g1'], null);
    expect(p && planStepsText(p, 'their')).toBe('Their plan from here: Bd3, Qc2 and then castling, the pieces lining up on your pawn on h7.');
  });

  it("a plan tied only by the break this move prepares is the move's own job — quiet", () => {
    // 1.e4 c5 2.c3: c3 prepares d4. Line …Nf6 e5 Nd5 d4: the break d4 is c3's own job.
    const fen = after('e4', 'c5', 'Nf3', 'Nc6', 'c3');
    const line = ['g8f6', 'f1d3', 'd7d6', 'd3c2', 'e7e6', 'd2d4'];
    expect(planSteps(fen, line, null)).not.toBeNull();
    expect(planSteps(fen, line, 'c2c3')).toBeNull();
  });
});
