import { describe, expect, it } from 'vitest';
import { theirWorstPiece } from './theirWorstPiece';

// Danya have-check board mastering-intuition-part-1#1; the engine's top lines as dumped (White's view).
const L = [{"moves": ["c4c5", "d6d4", "d1d4", "d8d4", "e3b3", "d4d8", "f3h5", "g8f8", "a5a6", "f8e7"], "cp": 124, "mate": null}, {"moves": ["e3d3", "c6c5", "f3a8", "d8a8", "d4d5", "g8h7", "g2f3", "a8d8", "f3e4", "h7g6"], "cp": 50, "mate": null}, {"moves": ["e3b3", "c6c5", "f3a8", "d8a8", "d1h1", "d6d8", "d4c5", "a8c8", "b3h3", "g8f8"], "cp": 32, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('theirWorstPiece', () => {
  it('reads the Danya board', () => {
    const r = theirWorstPiece('b2r2k1/p4pp1/2prp3/P5P1/2PP4/4RB2/5PK1/3R4 w - - 0 37', 'w', L[0].moves);
    expect(r?.square).toBe('a8');
    expect(r?.text).toContain('Their worst piece is the bishop on a8');
  });
  it('stays silent where the board does not have it', () => {
    expect(theirWorstPiece('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', 'w', N[0].moves)).toBeNull();
  });
});
