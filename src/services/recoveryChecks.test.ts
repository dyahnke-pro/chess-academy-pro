// THE RECOVERY CHECKS, BOARD STATES (2026-11-26): after a mistake, what the
// board asks of the student when the material is not the problem — a trapped
// piece, a pin, loose pieces, a king in the middle, the development, a
// cramping pawn. Each state is said only when its own check holds on the
// board. Boards from Danya's videos.
import { describe, expect, it } from 'vitest';
import { boardStateFills, pinOn, REPAIRS } from './mistakeLesson';
import { Chess } from 'chess.js';

describe('the six board states, each checked on a real board', () => {
  it('a trapped piece: the bishop on f3 has no square', () => {
    expect(boardStateFills('piece-trapped', 'r4rk1/pp3p2/3pp2b/2q1n3/4P1p1/1B2NbN1/P1P2PP1/1RQ2RK1 w - - 2 25', 'b'))
      .toEqual({ tPiece: 'bishop', target: 'f3' });
  });

  it('a pin: their bishop on b4 pins the knight on c3 to the king', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/4p3/1b1PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 1 5';
    expect(boardStateFills('pinned-piece', fen, 'w')).toEqual({ tPiece: 'knight', target: 'c3', opPiece: 'bishop', opSq: 'b4' });
  });

  it('no pin when the pinned piece can take the pinner', () => {
    // The rook on f8 stands between the queen on d8 and the king on h8, and takes it.
    expect(pinOn(new Chess('r2Q1r1k/1pb2ppB/p1p5/4n3/8/P3PPB1/1P3P1P/3RK2R b K - 0 19'), 'b')).toBeNull();
  });

  it('loose pieces: two pieces out in play, nothing guarding either', () => {
    expect(boardStateFills('loose-pieces', '2R2r2/p2Nkp2/1p2pq2/3p1p1Q/1P1P4/P6P/5PP1/6K1 b - - 0 29', 'w'))
      .toEqual({ a: 'rook on c8', b: 'knight on d7' });
    // Rooks at home on move two are not loose.
    expect(boardStateFills('loose-pieces', 'rnbqkbnr/pppp1ppp/8/4p3/8/1P6/P1PPPPPP/RNBQKBNR w KQkq - 0 2', 'b')).toBeNull();
  });

  it('a king in the middle: only once it matters', () => {
    expect(boardStateFills('king-in-centre', 'r3kb1r/ppp2pp1/2n1bnq1/3p3p/4p2P/1P2N1P1/PBPPPPB1/RN1Q1RK1 b kq - 0 10', 'b')).toEqual({ target: 'e8' });
    expect(boardStateFills('king-in-centre', 'rnbqkbnr/pppp1ppp/8/4p3/8/1P6/P1PPPPPP/RNBQKBNR w KQkq - 0 2', 'b')).toBeNull();
  });

  it('behind in development by two pieces', () => {
    expect(boardStateFills('behind-in-development', 'rnbqkb1r/1p3ppp/p2p1n2/4p3/3NP3/2N5/PPP1BPPP/R1BQK2R w KQkq - 0 7', 'b'))
      .toEqual({ tPiece: 'knight', target: 'b8' });
  });

  it('a cramping pawn a pawn of yours can hit: their pawn on d4, your c-pawn', () => {
    expect(boardStateFills('pawn-lever', 'r1bqkbnr/pppp1ppp/2n5/8/3pP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4', 'w')).toEqual({ pawn: 'd4' });
  });

  it('every board state has its five phrasings and its sources', () => {
    for (const st of ['king-in-centre', 'behind-in-development', 'piece-trapped', 'pinned-piece', 'pawn-lever', 'loose-pieces'] as const) {
      expect(REPAIRS[st].stems.length).toBe(5);
      expect(REPAIRS[st].sources.length).toBeGreaterThan(0);
    }
  });
});
