import { describe, expect, it } from 'vitest';
import { leverPasser } from './leverPasser';

// Danya have-check board pawn-endgames-a-practical-guide#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["f5f4", "a4a5", "b6a5", "b4a5", "f4f3", "g2f3", "h5h4", "a5a6", "d6c7", "a6a7"], "cp": -232, "mate": null}, {"moves": ["b6b5", "a4b5", "f5f4", "c4d4", "e4e3", "f2e3", "f4f3", "g2f3", "h5h4", "e3e4"], "cp": 13, "mate": null}, {"moves": ["d6c6", "c4d4", "c6d6", "a4a5", "b6b5", "a5a6", "d6c7", "d4e5", "f5f4", "g3f4"], "cp": 393, "mate": null}];
// Negative control: in-pursuit-of-zugzwang#0.
const N = [{"moves": ["d5c4", "c8d8", "c4d4", "d8e7", "d4c5", "e7e6", "c5b6", "e6f5", "c6c7", "f5g5"], "cp": 3630, "mate": null}, {"moves": ["d5d4", "c8d8", "d4c4", "d8e7", "c4c5", "e7e6", "c5b6", "e6f5", "b6a6", "f5g5"], "cp": 3599, "mate": null}, {"moves": ["d5e5", "c8c7", "e5d5", "c7c8", "d5d4", "c8d8", "d4c4", "d8e7", "c4c5", "e7e6"], "cp": 3599, "mate": null}];

describe('leverPasser', () => {
  it('reads the Danya board', () => {
    const r = leverPasser('8/8/1p1k4/5ppp/PPK1p3/6P1/5PP1/8 b - - 0 40', L, 'b');
    expect(r?.lever).toBe('a5');
    expect(r?.text).toContain('passed pawn on the a-file');
  });
  it('stays silent where the board does not have it', () => {
    expect(leverPasser('2k5/8/p1P5/P2K4/8/8/8/8 w - - 0 1', N, 'w')).toBeNull();
  });
});
