import { describe, expect, it } from 'vitest';
import { urgentStrike } from './urgentStrike';

// Danya have-check board the-greek-gift-sacrifice-lives-on#3; the engine's top lines as dumped (White's view).
const L = [{"moves": ["d3h7", "g8h7", "f3g5", "h7g6", "e2g4", "f7f5", "g4g3", "g6f6", "c1f4", "f6e7"], "cp": 63, "mate": null}, {"moves": ["f1e1", "c5d3", "e2d3", "b6c5", "c1f4", "c5f5", "d3f5", "e6f5", "f4d6", "f8d8"], "cp": 1, "mate": null}, {"moves": ["f3g5", "c5d3", "e2d3", "f7f5", "c1f4", "c8b7", "f1e1", "f8f6", "a1c1", "b7d5"], "cp": -4, "mate": null}];
// Negative control: beginner-chess-strategy#6.
const N = [{"moves": ["c3c2", "d3c2", "h7g6", "d6d7", "h6h5", "c2c3", "f7f6", "c3d4", "g6f7", "d7d8r"], "cp": 517, "mate": null}, {"moves": ["h7g6", "d6d7", "c3c2", "d3c2", "g6f6", "d7d8r", "f6g6", "c2c3", "f7f5", "c3d4"], "cp": 520, "mate": null}, {"moves": ["h7g8", "d6d7", "f7f5", "d7d8r", "g8f7", "d8c8", "c3c2", "d3c2", "f7e6", "c2c3"], "cp": 525, "mate": null}];

describe('urgentStrike', () => {
  it('reads the Danya board', () => {
    const r = urgentStrike('r1b2rk1/5pbp/1q2p3/1pn5/3p4/3B1N2/PP2QPPP/R1B2RK1 w - - 0 16', L, 'w');
    expect(r?.strike).toBe('Bxh7+');
    expect(r?.text).toContain('your bishop on d3 is gone');
  });
  it('stays silent where the board does not have it', () => {
    expect(urgentStrike('8/5ppk/3P3p/8/8/2pK3P/5PP1/8 b - - 0 2', N, 'b')).toBeNull();
  });
  // queen-the-supporting-actress#2 — Danya: "White must act immediately - Black
  // needs only one more move (...Ke7 or ...Nd3+) to consolidate". Rh7 stays
  // legal after Kb1 Ng6; the moment is gone all the same.
  const T = [{ moves: ['h1h7', 'f7f6', 'f4h6', 'd8d7'], cp: -14, mate: null }, { moves: ['c1b1', 'e5g6', 'f4d6', 'c7d6'], cp: -131, mate: null }, { moves: ['f4g5', 'e5g6', 'g5d8', 'c7d8'], cp: -167, mate: null }];
  const TAL = 'r1br1knQ/2q2pp1/p2bp3/1p1pn3/5B2/1NN2P2/PPP5/2KR1B1R w - - 0 23';
  it('a quiet strike at the king whose moment the slow move gives away', () => {
    const r = urgentStrike(TAL, T, 'w');
    expect(r?.strike).toBe('Rh7');
    expect(r?.text).toContain('Spend it on Kb1 and they get the move they need, Ng6');
  });
  it('the reply is the other side\'s when they strike', () => {
    expect(urgentStrike(TAL, T, 'b')?.text).toContain('Spend it on Kb1 and you get the move you need');
  });
  it('a slow move under a pawn worse leaves the door open', () => {
    const close = [T[0], { ...T[1], cp: -60 }, { ...T[2], cp: -70 }];
    expect(urgentStrike(TAL, close, 'w')).toBeNull();
  });
});
