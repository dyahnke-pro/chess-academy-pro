import { describe, expect, it } from 'vitest';
import { coordinationGap } from './coordinationGap';

// Danya have-check board the-knockout-blow#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d5c6", "b4f8", "h2h3", "g4h5", "c6c3", "h7h6", "c3d2", "h6g5", "f4g5", "a8c8"], "cp": 315, "mate": null}, {"moves": ["h2h3", "g4h3", "e1e3", "h3c8", "f4f5", "e8e3", "b6e3", "g7g6", "e3d4"], "cp": 302, "mate": null}, {"moves": ["e1g1", "g4e2", "f4f5", "e2b5", "g1g4", "b5d5", "d1d5", "e8e1", "b1a2", "b4e7"], "cp": 284, "mate": null}];
// Negative control: the-art-of-maneuvering#0.
const N = [{"moves": ["e2d2", "b6b5", "c3e2", "e8c8", "f4d5", "b7d5", "e4d5", "f7f5", "e2f4", "f5g4"], "cp": 29, "mate": null}, {"moves": ["h1g1", "b6b5", "b2b4", "e8c8", "c3d5", "e7d5", "e4d5", "h7g8", "e2d2", "c5c4"], "cp": 15, "mate": null}, {"moves": ["e2d1", "e8c8", "d1d2", "b6b5", "c3d5", "e7d5", "e4d5", "c8e8", "b2b4", "d7c7"], "cp": 9, "mate": null}];

describe('coordinationGap', () => {
  it('reads the Danya board', () => {
    const r = coordinationGap('r3r1k1/5ppp/pB6/P2Q2P1/1b3Pq1/1Pp5/2P4P/1K1RR3 w - - 0 27', L, 'w');
    expect(r?.text).toContain('Your pieces work together');
  });
  it('stays silent where the board does not have it', () => {
    expect(coordinationGap('4rr2/pb1qnpbk/1p1p2pp/2p1n3/4PNP1/P1NPB2P/1PP1QRB1/5R1K w - - 0 21', N, 'w')).toBeNull();
  });
});
