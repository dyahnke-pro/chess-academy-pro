import { describe, expect, it } from 'vitest';
import { kingInOpen } from './kingInOpen';

// Danya have-check board the-discovered-check-reloaded#2; the engine's top lines as dumped (White's view).
const L = [{"moves": ["e2e4", "f6h7", "b2b4", "c7c6", "c5c6", "f5h3", "b4b5", "g5h6", "b5a6", "g6g7"], "cp": 321, "mate": null}, {"moves": ["c5d4", "g6g7", "c6f3", "g5g6", "d4e5", "g7e7", "h2h3", "c7c5", "e5e3", "e6e5"], "cp": 157, "mate": null}, {"moves": ["b2b4", "g6g7", "c5d6", "g7e7", "d6e7", "c7e7", "f4d4", "e6e5", "d4d6", "e5e4"], "cp": 146, "mate": null}];
// Negative control: the-discovered-check-reloaded#1.
const N = [{"moves": ["h4h3", "d7f8", "h3f3", "e7g5", "h6g5", "d8d4", "f3f6", "e6e5", "g5h6", "f8e6"], "cp": 124, "mate": null}, {"moves": ["c2c4", "c6c5", "h4h3", "d7f8", "d4d5", "e6d5", "g5f7", "g8f7", "h6f8", "f7g8"], "cp": 74, "mate": null}, {"moves": ["c2c3", "c6c5", "h4h3", "d7f8", "g5h7", "b7g2", "h3g2", "g8h7", "h6e3", "b6b5"], "cp": 63, "mate": null}];

describe('kingInOpen', () => {
  it('reads the Danya board', () => {
    const r = kingInOpen('8/2r5/p1B1pnq1/2Q2bkp/2Pp1R2/3P2P1/PP2P2P/6K1 w - - 0 34', L, 'w');
    expect(r?.king).toBe('g5');
    expect(r?.text).toContain('Their king on g5 is out in the open');
  });
  it('stays silent where the board does not have it', () => {
    expect(kingInOpen('3rr1k1/1bqnbp1p/ppp1p1pB/6N1/3P3Q/3B4/PPP2PPP/3RR1K1 w - - 0 18', N, 'w')).toBeNull();
  });
  // miracle-on-the-chess-board#3 — Danya: "both sides are experiencing major
  // problems with king placement". One queen with three checks counts.
  it('one queen with three checks against a king with no pawns is an open king', () => {
    const M = [{ moves: ['f1g1', 'd6d5'], cp: 38, mate: null }];
    const r = kingInOpen('5Q2/5p1p/1pPr2p1/6k1/8/3pP2P/2q2PP1/3R1K2 w - - 0 44', M, 'w');
    expect(r?.king).toBe('g5');
    expect(r?.text).toContain('queen on f8 has');
  });
  // A centre king that can still castle belongs to the centre-king read; one
  // that lost the right has no shelter coming.
  it('a centre king with no castling rights left is read; one that can still castle is not', () => {
    const E = [{ moves: ['a1a2'], cp: 0, mate: null }];
    expect(kingInOpen('3qk3/8/8/8/8/8/3P4/R3K2R w - - 0 30', E, 'w')?.king).toBe('e1');
    expect(kingInOpen('3qk3/8/8/8/8/8/3P4/R3K2R w KQ - 0 30', E, 'w')).toBeNull();
  });
});
