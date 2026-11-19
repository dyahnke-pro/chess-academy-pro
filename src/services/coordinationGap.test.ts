import { describe, expect, it } from 'vitest';
import { coordinationGap } from './coordinationGap';

// Danya have-check board the-knockout-blow#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d5c6", "b4f8", "h2h3", "g4h5", "c6c3", "h7h6", "c3d2", "h6g5", "f4g5", "a8c8"], "cp": 315, "mate": null}, {"moves": ["h2h3", "g4h3", "e1e3", "h3c8", "f4f5", "e8e3", "b6e3", "g7g6", "e3d4"], "cp": 302, "mate": null}, {"moves": ["e1g1", "g4e2", "f4f5", "e2b5", "g1g4", "b5d5", "d1d5", "e8e1", "b1a2", "b4e7"], "cp": 284, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3 (Danya's read there is the
// sacrifice; the-art-of-maneuvering#0, the old control, is a board where he SAYS
// Black is well coordinated, so it could not be a control).
const N = [{ moves: ['d3h7', 'g8h7', 'f3g5', 'h7g6'], cp: 63, mate: null }, { moves: ['f1e1', 'c5d3', 'e2d3', 'b6c5'], cp: 1, mate: null }];

describe('coordinationGap', () => {
  it('reads the Danya board', () => {
    const r = coordinationGap('r3r1k1/5ppp/pB6/P2Q2P1/1b3Pq1/1Pp5/2P4P/1K1RR3 w - - 0 27', L, 'w');
    expect(r?.text).toContain('Your pieces work together');
  });
  it('stays silent where the board does not have it', () => {
    expect(coordinationGap('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
});
