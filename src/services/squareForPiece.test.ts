import { describe, expect, it } from 'vitest';
import { squareForPiece } from './squareForPiece';

// Danya have-check board weak-squares-who-cares#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d3b3", "g8h8", "d4f3", "d8e8", "e4e5", "f6e5", "f4e5", "c8e6", "c2c4", "d6e7"], "cp": 14, "mate": null}, {"moves": ["a1e1", "d8e7", "f4f5", "c8d7", "e3f4", "c6c5", "f4d6", "c7d6", "d4e2", "a8e8"], "cp": 9, "mate": null}, {"moves": ["d3c4", "g8h8", "d4f3", "d8e8", "e3c5", "c8g4", "c5d6", "c7d6", "h2h3", "g4f3"], "cp": 8, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('squareForPiece', () => {
  it('reads the Danya board', () => {
    const r = squareForPiece('r1bq1rk1/1pp3pp/p1pb1p2/8/3NPP2/3QB3/PPP3PP/R4RK1 w - - 0 14', L, 'w');
    expect(r?.push).toBe('f5');
    expect(r?.hole).toBe('e5');
    expect(r?.buried).toBe('c8');
  });
  it('stays silent where the board does not have it', () => {
    expect(squareForPiece('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
