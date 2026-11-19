import { describe, expect, it } from 'vitest';
import { lateralRookDefence } from './lateralRookDefence';

// Danya have-check board rooks-on-the-seventh-revisited#1; the engine's top lines as dumped (White's view).
const L = [{"moves": ["c2b2", "b1a1", "b2a2", "a1b1", "d2b2", "b1c1", "b2g2", "c1b1", "a2b2", "b1c1"], "cp": -106, "mate": null}, {"moves": ["g7h6", "f7f8", "g8g7", "f8f7", "g7g6", "f1f6", "g6h5", "f7h7", "c2b2", "b1c1"], "cp": 0, "mate": null}, {"moves": ["g8h7", "f7g7", "h7h6", "g7b7", "c2b2", "b1c1", "c6c5", "f1f6", "h6g5", "b7g7"], "cp": 0, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('lateralRookDefence', () => {
  it('reads the Danya board', () => {
    const r = lateralRookDefence('6k1/pp3Rp1/2p1p2P/4P3/8/PP6/2rr2P1/1K3R2 b - - 0 33', L, 'b');
    expect(r?.from).toBe('d2');
    expect(r?.to).toBe('g2');
    expect(r?.guards).toBe('g7');
  });
  it('stays silent where the board does not have it', () => {
    expect(lateralRookDefence('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
