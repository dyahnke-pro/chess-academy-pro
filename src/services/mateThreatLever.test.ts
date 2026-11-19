import { describe, expect, it } from 'vitest';
import { mateThreatLever } from './mateThreatLever';

// Danya have-check board never-trust-your-opponent#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["e5f3", "e2f3", "d8h4", "h2h3", "c8h3", "f1d1", "d6h2", "g1f1", "a8c8", "c2d3"], "cp": -112, "mate": null}, {"moves": ["d8f6", "c1b2", "c8f5", "c2d2", "f5e4", "f3e5", "d6e5", "b2e5", "f6e5", "e2d3"], "cp": 27, "mate": null}, {"moves": ["c8g4", "f3d4", "g4d7", "h2h3", "a8c8", "c2d2", "d8e7", "c1b2", "d6b4", "d2d1"], "cp": 36, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('mateThreatLever', () => {
  it('reads the Danya board', () => {
    const r = mateThreatLever('r1bq1rk1/pp3ppp/3b4/3pn3/8/1P2PN2/P1Q1BPPP/R1B2RK1 b - - 0 12', L, 'b');
    expect(r?.move).toBe('Qh4');
    expect(r?.mate).toBe('Qxh2#');
    expect(r?.gain).toBeGreaterThanOrEqual(1);
  });
  it('stays silent where the board does not have it', () => {
    expect(mateThreatLever('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
