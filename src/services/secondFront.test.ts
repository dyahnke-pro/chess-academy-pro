import { describe, expect, it } from 'vitest';
import { secondFront } from './secondFront';

// Danya have-check board mysterious-gm-moves#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["g2f3", "a7a5", "f3e2", "b7b5", "e2d1", "g7g6", "h5h6", "f7g7", "d1c2", "g8h8"], "cp": 71, "mate": null}, {"moves": ["g2h3", "g7g6", "h5h6", "b7b5", "h3g2", "g8h8", "f1e1", "f7g7", "g2f3", "f8g8"], "cp": 60, "mate": null}, {"moves": ["g1h2", "b7b5", "g2f3", "a7a5", "h2g2", "f8b8", "g2g1", "f5f4", "g3g4", "b8f8"], "cp": 56, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('secondFront', () => {
  it('reads the Danya board', () => {
    const r = secondFront('5rk1/pp2qrpp/4b3/3pPp1Q/2pP3P/P1P3P1/1P3RB1/5RK1 w - - 0 25', L, 'w');
    expect(r?.lever).toBe('b3');
    expect(r?.target).toBe('c4');
    expect(r?.text).toContain('second front');
  });
  it('stays silent where the board does not have it', () => {
    expect(secondFront('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
