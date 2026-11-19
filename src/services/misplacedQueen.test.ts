import { describe, expect, it } from 'vitest';
import { misplacedQueen } from './misplacedQueen';

// Danya have-check board how-to-win-equal-positions#1; the engine's top lines as dumped (White's view).
const L = [{"moves": ["g4e5", "b6d7", "e5g6", "h7g6", "d2c2", "a7b6", "h2h4", "a8c8", "f1d1", "c6c5"], "cp": 24, "mate": null}, {"moves": ["f1e1", "b6d7", "e2f3", "d7c5", "d2e2", "c5d3", "e1d1", "d3f4", "e2e3", "f4d5"], "cp": 23, "mate": null}, {"moves": ["h2h4", "a7b8", "f1d1", "g6f5", "g4e5", "b8c7", "g2g4", "f5e4", "d2e3", "e4c2"], "cp": 22, "mate": null}];
// Negative control: the-art-of-maneuvering#0.
const N = [{"moves": ["e2d2", "b6b5", "c3e2", "e8c8", "f4d5", "b7d5", "e4d5", "f7f5", "e2f4", "f5g4"], "cp": 29, "mate": null}, {"moves": ["h1g1", "b6b5", "b2b4", "e8c8", "c3d5", "e7d5", "e4d5", "h7g8", "e2d2", "c5c4"], "cp": 15, "mate": null}, {"moves": ["e2d1", "e8c8", "d1d2", "b6b5", "c3d5", "e7d5", "e4d5", "c8e8", "b2b4", "d7c7"], "cp": 9, "mate": null}];

describe('misplacedQueen', () => {
  it('reads the Danya board', () => {
    const r = misplacedQueen('r2r2k1/qp3ppp/1np1p1b1/p7/P2P2N1/2P5/1P1QBPPP/R4RK1 w - - 0 22', L, 'w');
    expect([r?.from, r?.to]).toEqual(['a7', 'b8']);
    expect(r?.text).toContain('Their queen on a7 is misplaced');
  });
  it('stays silent where the board does not have it', () => {
    expect(misplacedQueen('4rr2/pb1qnpbk/1p1p2pp/2p1n3/4PNP1/P1NPB2P/1PP1QRB1/5R1K w - - 0 21', N, 'w')).toBeNull();
  });
});
