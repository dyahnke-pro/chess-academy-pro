// THE BETTER MOVE IS SAID BY WHAT IT WINS, NOT BY WHERE ITS PIECE WALKS
// (David 2026-11-18, the Learn preview: "head on to f6, and take the pawn when
// it arrives" was said where the same line threatens mate; "take the knight on
// f4" where Bxf4 wins it outright). The reasons were picked by a fixed order —
// the line's route reading first — so a concrete win the error computer also
// had never spoke. Positions from the 800 Colle replay
// (`learn-replay-games.json`), engine lines as stored there.
import { describe, it, expect } from 'vitest';
import { errorWhy, NO_SECOND_READ } from './inaccuracyCall';

const base = {
  secondReads: NO_SECOND_READ,
  moverColor: 'white' as const,
  missedMate: null, allowedMate: null, bestMate: null,
  priorMove: null, replySan: null, namesBetterMove: true,
};

describe('errorWhy — the better move by value', () => {
  it('a capture is still said by what it takes (20.Qxf4: Bxf4 and Qxf4 both take the knight back)', () => {
    const ew = errorWhy({
      ...base, costCp: 152, quality: 'mistake',
      fenBefore: 'r1b1r1k1/5ppp/pq2p3/1p1p2B1/3p1n2/2P3Q1/PP3PPP/R3R1K1 w - - 0 20',
      playedSan: 'Qxf4', bestSan: 'Bxf4',
      bestLineUci: ['g5f4', 'f7f6', 'c3d4', 'b6d4', 'a1c1', 'c8d7', 'f4h6', 'e8e7', 'g3d6', 'e7f7'],
      replyLineUci: ['f7f6', 'g5f6', 'g7f6', 'f4f6', 'a8a7', 'e1e5', 'a7g7', 'e5g5'],
    });
    expect(ew.reason).not.toMatch(/\bwin a knight\b/);
  });

  it('a better move that threatens mate is said as the mate threat (24.Bg5, Qe5 was there)', () => {
    const ew = errorWhy({
      ...base, costCp: 253, quality: 'mistake',
      fenBefore: '2r1r1k1/1b3p1p/pq2p1pB/1p1p4/8/2P3Q1/P4PPP/R3R1K1 w - - 0 24',
      playedSan: 'Bg5', bestSan: 'Qe5',
      bestLineUci: ['g3e5', 'f7f6', 'e5f6', 'c8c7', 'e1e5', 'd5d4', 'e5g5', 'b6d6'],
      replyLineUci: ['b6c7', 'g3h4', 'c7c4', 'h4h6', 'c4c3', 'a1c1', 'c3d4', 'e1d1'],
    });
    expect(ew.reason).toMatch(/mate/);
    expect(ew.reason).toMatch(/g7/);
    expect(ew.reason).not.toMatch(/head on to/);
  });

  it('a capture better move names the piece it takes (16.Qg3, Rxe5 was there)', () => {
    const ew = errorWhy({
      ...base, costCp: 217, quality: 'mistake',
      fenBefore: 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16',
      playedSan: 'Qg3', bestSan: 'Rxe5',
      bestLineUci: ['e1e5', 'g5f6', 'c3d4', 'f8g6', 'h5f6', 'g7f6', 'e5h5', 'e6e5', 'g4g3', 'e5e4'],
      replyLineUci: ['e5g6', 'c1g5', 'f7f6', 'g5d2', 'd4c3', 'd2c3', 'e6e5', 'f2f4'],
    });
    expect(ew.reason).toMatch(/knight on e5/);
  });
});

// A GUESS AT WHAT THE MOVE WAS AIMING AT IS NEVER THE WHY OF A MOVE THAT
// MISSED SOMETHING (Danya's speedrun, 25.Ne5, 1.6 pawns: "That eyed the pawn
// on f7, but the king holds it" — the cost was Rc2's line winning a queen for
// a rook and a pawn; nobody took on f7). The held-by-defender reading explains
// an illusory threat; when the better move wins material, the miss is the why.
describe('errorWhy — the eyed-but-held guess yields to a real miss', () => {
  it('25.Ne5: no "eyed the pawn on f7"', () => {
    const ew = errorWhy({
      ...base, costCp: 162, quality: 'mistake',
      secondReads: { best: [['c1c2', 'b8d7', 'h6c1', 'd7f6', 'c2c7', 'g8g2', 'g1g2', 'f6e4', 'c7a7', 'e4d6']], reply: [['b8d7', 'h6h7', 'g8f8', 'h7h5', 'd7f6', 'h5e2', 'f6d7', 'e2b5', 'f8g8', 'b5c6', 'g8g7', 'c1c3', 'a7a6']] },
      fenBefore: '1n1qk1r1/p4p2/1p2pP1Q/3p1p1p/1P1P4/P4N1P/5PP1/2R3K1 w - - 1 25',
      playedSan: 'Ne5', bestSan: 'Rc2',
      bestLineUci: ['c1c2', 'b8d7', 'h6c1', 'd7f6', 'c2c8', 'e8e7', 'c8d8', 'e7d8', 'f3e5', 'g8g2', 'g1g2', 'f6h7', 'e5f7', 'd8d7', 'f7e5', 'd7e8'],
      replyLineUci: ['b8d7', 'h6h7', 'g8f8', 'h7h5', 'd7e5', 'd4e5', 'd8d7', 'h5h6', 'f8g8', 'h6d2', 'd7b7', 'd2d4', 'e8d7'],
    });
    expect(ew.failed ?? '').not.toMatch(/eyed/);
  });
});
