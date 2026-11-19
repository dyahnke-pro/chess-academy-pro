import { describe, expect, it } from 'vitest';
import { queenKnightNet } from './queenKnightNet';

// Danya have-check board the-blitz-chess-manifesto#1; the engine's top lines as dumped (White's view).
const L = [{"moves": ["b5c7", "e8f8", "h7f7", "d7f7", "c7e6", "f8e7", "a4a7", "e7e6", "a7f7", "e6d6"], "cp": 539, "mate": null}, {"moves": ["b5c3", "g8f8", "a4d7", "d8d7", "c3a4", "c5c4", "a4b6", "d7a7", "b3c4", "e5c7"], "cp": 35, "mate": null}, {"moves": ["b5a3", "d7a4", "b3a4", "g8g7", "h7h1", "e8e7", "a3c4", "e5c7", "f1b1", "d8a8"], "cp": 19, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('queenKnightNet', () => {
  it('reads the Danya board', () => {
    const r = queenKnightNet('3rk1r1/3q1p1R/6p1/1Np1b3/Q7/1P2P3/P3K3/5R2 w - - 0 32', L, 'w');
    expect(r?.king).toBe('f8');
    expect(r?.text).toContain('queen');
  });
  it('stays silent where the board does not have it', () => {
    expect(queenKnightNet('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
