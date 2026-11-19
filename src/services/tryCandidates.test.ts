import { describe, it, expect } from 'vitest';
import { planTries } from './tryCandidates';

// Each board is Danya's, and each expected try is the one he weighs out loud.
describe("the plan's direct try (WO-PICTURE-01 P2)", () => {
  it('endgame attacks #3: "the immediate 29.Qc5 leads nowhere" — the queen hits the weak b5 pawn', () => {
    const t = planTries('6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29');
    expect(t).toContainEqual(expect.objectContaining({ san: 'Qc5', why: 'target', target: 'b5' }));
  });

  it('the positional rook lift #2: "I was itching to play 25...c4" — the lever on b3', () => {
    const t = planTries('2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25');
    expect(t).toContainEqual(expect.objectContaining({ san: 'c4', why: 'target' }));
  });

  it('the art of maneuvering #1: "a frontal assault against the e6 pawn"', () => {
    const t = planTries('2b1rrk1/6pp/p2bpn2/2p1N1B1/2Pp1P2/3B4/PP2R1PP/4R1K1 w - - 0 24');
    expect(t).toContainEqual(expect.objectContaining({ why: 'target', target: 'e6' }));
  });

  it('no tries in check, and none against a side with no weak pawn and the kings on one wing', () => {
    expect(planTries('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3')).toEqual([]);
    expect(planTries('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toEqual([]);
  });
});

describe('every quiet try, no cap (G4.5)', () => {
  it('two pieces that can newly hit the same weak pawn are both tries', () => {
    // Their isolated pawn on d5: the knight (Ne1-c3 is not quiet here, Nd4 hits
    // nothing), the rook to d1 and the queen to d2 each newly hit it.
    const fen = '6k1/5ppp/8/3p4/8/5N2/5PPP/2R1Q1K1 w - - 0 1';
    const tries = planTries(fen).filter((t) => t.target === 'd5');
    const pieces = new Set(tries.map((t) => t.san[0]));
    expect(pieces.size).toBeGreaterThan(1);
  });
});
