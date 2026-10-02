import { describe, it, expect } from 'vitest';
import { planChoice } from './planChooser';
import { readFileSync } from 'node:fs';
import { aimWalkableNow } from './planArc';

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

describe('Learn walk 2026-10-02, ply 22 — no "outpost" on a square a pawn holds', () => {
  it('never names the outpost on h5 while White\'s pawn stands there', () => {
    const fen = 'r1bq1rk1/1p2nppp/3b1n2/pPpp2PP/P2P4/2P2P2/5K2/RNBQ1BNR b - - 0 12';
    // Black to move; White-POV evals (Black is better here).
    const lines = [
      { moves: ['e7f5', 'g5f6', 'f5g3', 'f2g2', 'g3h1', 'g2h1', 'd8f6', 'd1e1', 'c8f5', 'e1f2'], evaluation: -157 },
      { moves: ['f6e8', 'f1d3', 'g7g6', 'b1d2', 'e8g7', 'd2f1', 'c5d4'], evaluation: -148 },
    ];
    const r = planChoice(fen, lines, 'black', { fenBefore: 'r1bq1rk1/1p2nppp/3b1n2/pPpp3P/P2P2P1/2P2P2/5K2/RNBQ1BNR w - c6 0 12', san: 'g5' });
    expect(r?.text ?? '').not.toMatch(/outpost on h5/);
  });
  it('h5 is no outpost on that board, and the chooser holds every outpost to the board', () => {
    const fen = 'r1bq1rk1/1p2nppp/3b1n2/pPpp2PP/P2P4/2P2P2/5K2/RNBQ1BNR b - - 0 12';
    expect(aimWalkableNow({ id: 'outpost:h5', kind: 'outpost', squares: ['h5'], goal: 'h5', phrase: 'the outpost on h5' } as never, fen, 'b')).toBe(false);
    expect(readFileSync('src/services/planChooser.ts', 'utf8')).toMatch(/a\.kind !== 'outpost' \|\| aimWalkableNow\(a, fen, seat\)/);
  });
});
