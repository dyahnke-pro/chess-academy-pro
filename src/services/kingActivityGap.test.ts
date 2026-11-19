import { describe, expect, it } from 'vitest';
import { kingActivityGap } from './kingActivityGap';

// Danya have-check board beginner-chess-strategy#6; the engine's top lines as dumped (White's view).
const L = [{"moves": ["c3c2", "d3c2", "h7g6", "d6d7", "h6h5", "c2c3", "f7f6", "c3d4", "g6f7", "d7d8r"], "cp": 517, "mate": null}, {"moves": ["h7g6", "d6d7", "c3c2", "d3c2", "g6f6", "d7d8r", "f6g6", "c2c3", "f7f5", "c3d4"], "cp": 520, "mate": null}, {"moves": ["h7g8", "d6d7", "f7f5", "d7d8r", "g8f7", "d8c8", "c3c2", "d3c2", "f7e6", "c2c3"], "cp": 525, "mate": null}];
// Negative control: rooks-on-the-seventh-revisited#0.
const N = [{"moves": ["g7a7", "f8g8", "a7a8", "g8h7", "a8a6", "h7g7", "g1f2", "g7f7", "f2g3", "f7e7"], "cp": 511, "mate": null}, {"moves": ["g7f7", "f8g8", "f7g7", "g8f8", "g7a7", "f8g8", "a7a8", "g8h7", "a8a6", "h7g7"], "cp": 511, "mate": null}, {"moves": ["h7h8", "f8g7", "h8a8", "g7f6", "g1f2", "f6e5", "f2e2", "e5e4", "e2d1", "e4e5"], "cp": 499, "mate": null}];

describe('kingActivityGap', () => {
  it('reads the Danya board', () => {
    const r = kingActivityGap('8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2', L, 'b');
    expect(r?.activeKing).toBe('d3');
    expect(r?.text).toContain('yours on h7');
  });
  it('stays silent where the board does not have it', () => {
    expect(kingActivityGap('r4k2/6RR/8/8/8/8/8/6K1 w - - 0 1', N, 'w')).toBeNull();
  });
});
