import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { planSteps, planStepsText } from './planSteps';
import { stepsOf } from './boardPlan';

// THE PLAN IS SAID AGAINST THE BOARD NOW (Danya narration test 2026-11-19):
// every piece, square and target a plan names is checked on the board the
// student is looking at, never one the engine's line only reaches. Real
// boards, their saved engine lines.
const play = (fen: string, uci: string): string => { const c = new Chess(fen); c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }); return c.fen(); };

describe('planSteps — the board now', () => {
  it('the art of maneuvering #0: no road onto f4 while a knight of yours stands there', () => {
    const fen = '4rr2/pb1qnpbk/1p1p2pp/2p1n3/4PNP1/P1NPB2P/1PP1QRB1/5R1K w - - 0 21';
    const line = 'e2d2 b6b5 c3e2 e8c8 f4d5 b7d5 e4d5 f7f5 e2f4 f5g4'.split(' ');
    expect(planSteps(play(fen, line[0]), line.slice(1), line[0], 3, true, true)).toBeNull();
    // negative control: the same road on a board with e2 and f4 empty is a road
    const empty = '4rr2/pb1qnpbk/1p1p2pp/2p1n3/4P1P1/P1NPB2P/1PPQ1RB1/5R1K w - - 0 21';
    const road = planSteps(play(empty, 'h1g1'), 'b6b5 c3e2 e8c8 e2f4'.split(' '), 'h1g1', 3, false, true);
    expect(road?.maneuver?.route).toEqual(['e2', 'f4']);
  });

  it('endgame attacks part 2 #3: a check first is a fight, and Qd4 is where the queen already stands', () => {
    const fen = '6k1/1q3pp1/5n1p/1p3P2/p2Qp3/2P1P1P1/1P5P/5BK1 w - - 0 29';
    const line = 'd4d8 g8h7 d8d4 b7a6 d4c5 a4a3 b2a3 a6a4 f1e2 a4c2'.split(' ');
    expect(planSteps(play(fen, line[0]), line.slice(1), line[0], 3, true, true)).toBeNull();
  });

  it('modern chess technique #2: "Rb5, Rb8 and then Rb5" is a shuffle, not a plan', () => {
    const fen = '2b5/p3k3/2p1p1p1/PrN4p/1P1R1P1P/3K2P1/8/8 w - - 0 55';
    const line = 'd3d2 b5b8 d2d3 b8b5 d3c3 b5b8 c3b3 b8b5 b3a4 b5b8'.split(' ');
    const b = new Chess(fen); b.move({ from: 'd3', to: 'd2' }); b.move({ from: 'b5', to: 'b8' });
    expect(planSteps(b.fen(), line.slice(2), line[1], 3, true, true)).toBeNull();
  });

  it('how to win equal positions #1: the plan is the best line\'s, and no piece it only brings is a target', () => {
    const fen = 'r2r2k1/qp3ppp/1np1p1b1/p7/P2P2N1/2P5/1P1QBPPP/R4RK1 w - - 0 22';
    const lines = [
      { moves: 'g4e5 b6d7 e5g6 h7g6 d2c2 a7b6 h2h4 a8c8 f1d1 c6c5'.split(' ') },
      { moves: 'f1e1 b6d7 e2f3 d7c5 d2e2 c5d3 e1d1 d3f4 e2e3 f4d5'.split(' ') },
    ];
    expect(stepsOf(fen, lines, 'your')).toBeNull();
    // the second line's own plan, read on its own, named a knight on d3 that
    // is not on the board: the aim is dropped with it
    const p = planSteps(play(fen, 'f1e1'), lines[1].moves.slice(1), 'f1e1', 3, true, true);
    expect(p ? planStepsText(p, 'your') : '').not.toMatch(/knight on d3/);
  });

  it('negative control: the QGD plan aimed at h7 still speaks', () => {
    const c = new Chess(); for (const s of ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'd5', 'Nf3', 'Be7', 'e3']) c.move(s);
    const p = planSteps(c.fen(), ['e8g8', 'f1d3', 'b7b6', 'd1c2', 'c8b7', 'e1g1'], null);
    expect(p?.aim).toBe('h7');
  });
});
