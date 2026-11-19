import { describe, expect, it } from 'vitest';
import { urgentStrike } from './urgentStrike';

// Danya have-check board the-greek-gift-sacrifice-lives-on#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];
// Negative control: beginner-chess-strategy#6.
const N = [{"moves": ["c3c2", "d3c2", "h7g6", "d6d7", "h6h5", "c2c3", "f7f6", "c3d4", "g6f7", "d7d8r"], "cp": 517, "mate": null}, {"moves": ["h7g6", "d6d7", "c3c2", "d3c2", "g6f6", "d7d8r", "f6g6", "c2c3", "f7f5", "c3d4"], "cp": 520, "mate": null}, {"moves": ["h7g8", "d6d7", "f7f5", "d7d8r", "g8f7", "d8c8", "c3c2", "d3c2", "f7e6", "c2c3"], "cp": 525, "mate": null}];

describe('urgentStrike', () => {
  it('reads the Danya board', () => {
    const r = urgentStrike('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', L, 'w');
    expect(r?.strike).toBe('Bxh7+');
    expect(r?.text).toContain('your bishop on d3 is gone');
  });
  it('stays silent where the board does not have it', () => {
    expect(urgentStrike('8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2', N, 'b')).toBeNull();
  });
});
