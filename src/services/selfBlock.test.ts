import { describe, expect, it } from 'vitest';
import { selfBlock } from './selfBlock';

// Danya have-check board the-importance-of-solving-studies#2; the engine's top lines as dumped (White's view).
const L = [{"moves": ["b2h8", "c2d3", "a1b2", "d3f5", "b2c3", "a8b7", "c3d4", "b7c6", "d4e5", "c6d7"], "cp": 113, "mate": null}, {"moves": ["d3d4", "a8b8", "b2c1", "b8c7", "a1b2", "c2e4", "c1g5", "c7d7", "b2c1", "d7e8"], "cp": 33, "mate": null}, {"moves": ["a1a2", "c2d3", "a2b3", "e6e5", "b3c3", "d3e4", "c3c4", "a8b7", "b2e5", "b7c6"], "cp": 12, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('selfBlock', () => {
  it('reads the Danya board', () => {
    const r = selfBlock('k7/8/4p3/7P/8/3P4/1Bb4P/K7 w - - 0 1', L, 'w');
    expect(r?.best).toBe('Bh8');
    expect(r?.blocking).toBe(5);
    expect(r?.text).toContain('g7');
  });
  it('stays silent where the board does not have it', () => {
    expect(selfBlock('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
