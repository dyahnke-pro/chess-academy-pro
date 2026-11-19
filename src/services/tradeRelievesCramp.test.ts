import { describe, expect, it } from 'vitest';
import { tradeRelievesCramp } from './tradeRelievesCramp';

// Danya have-check board positional-combinations#0; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d6h2", "g1h1", "d7b6", "c4f1", "c8f5", "e4f5", "h2f4", "c1f4", "c7f4", "g2g3"], "cp": -14, "mate": null}, {"moves": ["d6f8", "c1g5", "h7h6", "g5h4", "f6h5", "c2d2", "d7b6", "c4e2", "c8f5", "e4f5"], "cp": 7, "mate": null}, {"moves": ["d6e5", "f2f4", "e5f4", "c1f4", "c7f4", "f5d6", "e8f8", "c4f7", "f8f7", "c2b3"], "cp": 10, "mate": null}];
// Negative control: mysterious-gm-moves#3.
const N = [{"moves": ["g2f3", "a7a5", "f3e2", "b7b5", "e2d1", "g7g6", "h5h6", "f7g7", "d1c2", "g8h8"], "cp": 71, "mate": null}, {"moves": ["g2h3", "g7g6", "h5h6", "b7b5", "h3g2", "g8h8", "f1e1", "f7g7", "g2f3", "f8g8"], "cp": 60, "mate": null}, {"moves": ["g1h2", "b7b5", "g2f3", "a7a5", "h2g2", "f8b8", "g2g1", "f5f4", "g3g4", "b8f8"], "cp": 56, "mate": null}];

describe('tradeRelievesCramp', () => {
  it('reads the Danya board', () => {
    const r = tradeRelievesCramp('r1b1r1k1/1pqn1ppp/p1pb1n2/5N2/2B1P3/2N4P/PPQ2PP1/R1BR2K1 b - - 0 14', L, 'b');
    expect(r?.trade).toBe('Bxf5');
    expect(r?.text).toContain('knight on f5');
  });
  it('stays silent where the board does not have it', () => {
    expect(tradeRelievesCramp('5rk1/pp2qrpp/4b3/3pPp1Q/2pP3P/P1P3P1/1P3RB1/5RK1 w - - 0 25', N, 'w')).toBeNull();
  });
});
