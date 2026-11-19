import { describe, it, expect } from 'vitest';
import { planPosed } from './moveInsight';

// Danya, the positional rook lift #2 (Black to play): the plan of the board is
// the rook's road Rd7–f7 at f2. Stockfish's three lines (depth 16, White's seat).
const FEN = '2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25';
const LINES = [
  { evaluation: -126, mate: null, moves: ['c8b8', 'e1e2', 'd8d7', 'd1a1', 'b8c8', 'e2e1', 'c8c7', 'e1f1', 'd7f7'] },
  { evaluation: -121, mate: null, moves: ['g6f6', 'd3d4', 'e5d4', 'c3d4', 'g5g4', 'd4d5', 'g4f3', 'd5e6'] },
  { evaluation: -110, mate: null, moves: ['d8d7', 'd1a1', 'c8b8', 'e1e2', 'g6f7', 'a1f1', 'a6a5', 'f1a1'] },
];

describe('the plan, both ways (planPosed)', () => {
  it('playing the line that starts the plan poses it (held on a clean move)', () => {
    expect(planPosed(FEN, 'c8b8', 0, LINES)).toEqual([{ tag: 'no-plan', posedImportance: 65 }]);
  });
  it('a costly move off the plan poses it (broken)', () => {
    expect(planPosed(FEN, 'c5c4', 60, LINES)).toEqual([{ tag: 'no-plan', posedImportance: 65 }]);
  });
  it('a clean move off the plan is no evidence either way — never a false green', () => {
    expect(planPosed(FEN, 'g6f6', 5, LINES)).toEqual([]);
  });
  it('no lines (an imported game\'s clean move) poses nothing', () => {
    expect(planPosed(FEN, 'c8b8', 0, [])).toEqual([]);
  });
});
