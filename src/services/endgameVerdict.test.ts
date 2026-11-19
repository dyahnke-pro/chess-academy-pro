import { describe, expect, it } from 'vitest';
import { endgameVerdict } from './endgameVerdict';

// Danya have-check board rooks-on-the-seventh-revisited#0; the engine's top lines as dumped (White's view).
const L = [{"moves": ["g7a7", "f8g8", "a7a8", "g8h7", "a8a6", "h7g7", "g1f2", "g7f7", "f2g3", "f7e7"], "cp": 511, "mate": null}, {"moves": ["g7f7", "f8g8", "f7g7", "g8f8", "g7a7", "f8g8", "a7a8", "g8h7", "a8a6", "h7g7"], "cp": 511, "mate": null}, {"moves": ["h7h8", "f8g7", "h8a8", "g7f6", "g1f2", "f6e5", "f2e2", "e5e4", "e2d1", "e4e5"], "cp": 499, "mate": null}];
// Negative control: the-greek-gift-sacrifice-lives-on#3.
const N = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];

describe('endgameVerdict', () => {
  it('reads the Danya board', () => {
    const r = endgameVerdict('r4k2/6RR/8/8/8/8/8/6K1 w - - 0 1', L, 'w');
    expect(r?.kind).toBe('checksRepeat');
    expect(r?.text).toContain('Rf7+ Kg8 Rfg7+ Kf8');
  });
  it('stays silent where the board does not have it', () => {
    expect(endgameVerdict('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', N, 'w')).toBeNull();
  });
  // magnus-carlsens-best-endgame-wins#0 — Danya: "there seems to be no
  // conceivable way to make progress"; Magnus's ...a5 "does not threaten anything".
  const M = [{ moves: ['e6d7', 'd4b3', 'a6a5', 'e2f1', 'd7a4', 'b3d4', 'b7c5', 'f1e2'], cp: -3, mate: null }];
  it('a pawn move that touches no pawn is maneuvering, not a break', () => {
    expect(endgameVerdict('8/1n6/pp1kb1p1/5p1p/2PNp2P/P1K1P1P1/4BP2/8 b - - 0 50', M, 'b')?.kind).toBe('noProgress');
  });
  // queen-the-supporting-actress#2: Tal's attack reads level, and with queens on
  // six quiet moves are an attack, not a dead board.
  it('with queens on, a level board is no endgame verdict', () => {
    const T = [{ moves: ['h1h7', 'f7f6', 'f4h6', 'd8d7', 'b3d4', 'd7f7'], cp: -14, mate: null }];
    expect(endgameVerdict('r1br1knQ/2q2pp1/p2bp3/1p1pn3/5B2/1NN2P2/PPP5/2KR1B1R w - - 0 23', T, 'w')).toBeNull();
  });
});
