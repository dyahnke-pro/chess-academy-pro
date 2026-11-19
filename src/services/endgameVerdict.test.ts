import { describe, expect, it } from 'vitest';
import { endgameVerdict } from './endgameVerdict';

// Danya have-check board rooks-on-the-seventh-revisited#0; the engine's top lines as dumped (White's view).
const L = [{"moves": ["g7a7", "f8g8", "a7a8", "g8h7", "a8a6", "h7g7", "g1f2", "g7f7", "f2g3", "f7e7"], "cp": 511, "mate": null}, {"moves": ["g7f7", "f8g8", "f7g7", "g8f8", "g7a7", "f8g8", "a7a8", "g8h7", "a8a6", "h7g7"], "cp": 511, "mate": null}, {"moves": ["h7h8", "f8g7", "h8a8", "g7f6", "g1f2", "f6e5", "f2e2", "e5e4", "e2d1", "e4e5"], "cp": 499, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('endgameVerdict', () => {
  it('reads the Danya board', () => {
    const r = endgameVerdict('r4k2/6RR/8/8/8/8/8/6K1 w - - 0 1', L, 'w');
    expect(r?.kind).toBe('checksRepeat');
    expect(r?.text).toContain('Rf7+ Kg8 Rfg7+ Kf8');
  });
  it('stays silent where the board does not have it', () => {
    expect(endgameVerdict('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
