import { describe, it, expect } from 'vitest';
import { planChoice } from './planChooser';

// Same board, dated move 12 — a plan choice is taught once the opening is played.
const FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 12';
const EARLY = FEN.replace(/ 12$/, ' 4');
const A = ['d2d3', 'f8c5', 'c2c3', 'd7d6', 'b1d2', 'a7a6', 'd2f1', 'e8g8', 'f1g3'];
const B = ['b1c3', 'f8c5', 'd2d3', 'd7d6', 'c1g5', 'h7h6', 'g5h4', 'g7g5', 'h4g3'];

describe('the plan chooser (census #52)', () => {
  it('two different plans that come out level: choose the one you understand', () => {
    expect(planChoice(FEN, [{ moves: A, evaluation: 30 }, { moves: B, evaluation: 20 }], 'white', null)?.text)
      .toMatch(/^Two plans hold here — getting the knight to f1, by way of d2, or getting the bishop to h4, by way of g5\./);
  });
  it('a clear gap names the stronger plan and what the other costs', () => {
    expect(planChoice(FEN, [{ moves: A, evaluation: 130 }, { moves: B, evaluation: 20 }], 'white', null)?.text)
      .toMatch(/the stronger is getting the knight to f1, by way of d2; getting the bishop to h4, by way of g5 falls about 1\.1 pawns short\.$/);
  });
  it('silent in the grey zone, on a mate, or with one line (negative controls)', () => {
    expect(planChoice(FEN, [{ moves: A, evaluation: 80 }, { moves: B, evaluation: 20 }], 'white', null)).toBeNull();
    // Too early in the game: silent (walk 2026-09-30, game 2).
    expect(planChoice(EARLY, [{ moves: A, evaluation: 30 }, { moves: B, evaluation: 20 }], 'white', null)).toBeNull();
    expect(planChoice(FEN, [{ moves: A, evaluation: 0, mate: 3 }, { moves: B, evaluation: 20 }], 'white', null)).toBeNull();
    expect(planChoice(FEN, [{ moves: A, evaluation: 30 }], 'white', null)).toBeNull();
  });
});

describe('planChoice — never mid-combination', () => {
  it('when the best line opens with a capture, it is calculation, not a plan (pass-2 walk 2026-09-30)', () => {
    const fen = 'r1b2rk1/pp2ppbp/2np1np1/q1pP4/2P5/1PNBPN2/PB3PPP/R2QK2R b KQ - 0 10';
    const out = planChoice(fen, [
      { moves: ['f6d5', 'c4d5', 'g7c3', 'b2c3'], evaluation: -270 },
      { moves: ['c6b4', 'e1g1', 'b4d3', 'd1d3'], evaluation: 0 },
    ], 'black', null);
    expect(out).toBeNull();
  });
});
