import { describe, expect, it } from 'vitest';
import { tactify } from './tactify';

// Danya have-check board how-to-win-equal-positions#2; the engine's top lines as dumped (White's view).
const L = [{"moves": ["g1g2", "h7h5", "h2h4", "e7c6", "e2c2", "c6d8", "e3d5", "f8g7", "b3b4", "d8b7"], "cp": 10, "mate": null}, {"moves": ["g1f1", "d7h3", "f1g1", "h3d7", "g1g2", "h7h5", "h2h3", "e7c6", "e2c2", "c6d8"], "cp": 10, "mate": null}, {"moves": ["h2h4", "h7h5", "g1g2", "e7c6", "e2c2", "c6d8", "b3b4", "a5b4", "c3b4", "b6b5"], "cp": 8, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('tactify', () => {
  it('reads the Danya board', () => {
    const r = tactify('4nk2/2pqn2p/1p3pp1/p3p3/P1N1P3/1PP1N1P1/4QP1P/6K1 w - - 0 27', L, 'w');
    expect(r?.move).toBe('h4');
    expect(r?.text).toContain('brings a pawn at their king on f8');
  });
  it('stays silent where the board does not have it', () => {
    expect(tactify('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
