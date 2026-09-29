// Trade quality, fenced on real positions from the 2026-09-27 hand walks.
// Every verdict below was read against its board by hand; the negative
// controls are the three the first draft got wrong.
import { describe, it, expect } from 'vitest';
import { readTrade, findTradeTarget } from './tradeQuality';

describe('readTrade — a trade judged by the pieces, not the points', () => {
  it('good: takes off their best piece (rook on your seventh)', () => {
    const r = readTrade('2n5/2R5/1rNp1B1k/p2Pp3/P3P3/7p/1r3P1N/1R3K2 w - - 0 33', 'Rxb2', 'b');
    expect(r?.call).toBe('good');
    expect(r?.text).toBe('Their Rxb2 is a good trade for them — it takes off your best piece, the rook on the seventh rank.');
  });
  it('good: the student takes off their open-file rook', () => {
    const r = readTrade('r1Rk1b1r/1p1P1ppp/p4q2/1B3n2/1P3B2/1P6/4NPPP/3QK2R b K - 1 25', 'Rxc8', 'b');
    expect(r?.text).toBe('Rxc8 is a good trade — it takes off their best piece, the rook on the open file.');
  });
  it('doubled pawns are not "a good trade" for the side that is behind — both halves are said', () => {
    const r = readTrade('rn2k1nr/pp1b1ppp/1b1p1q2/1N2p3/4P3/3PBN2/PPP2PPP/R2QK2R w KQkq - 3 9', 'Bxb6', 'b');
    expect(r?.call).toBe('behind');
    expect(r?.text).toBe('After their Bxb6, taking back doubles your pawns, but you\'re still 2 points ahead — and every trade brings your ending closer.');
  });
  it('NEGATIVE: the Najdorf — Nxe5 after …Nxe5 won a pawn is not "good for them" — you stay a pawn up (hand walk 2026-09-27)', () => {
    // 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Nf3 Nc6 7.e5 Nxe5
    const fen = 'r1bqkb1r/1p2pppp/p2p1n2/4n3/8/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 8';
    expect(readTrade(fen, 'Nxe5', 'b')?.text).toBe('After their Nxe5, taking back doubles your pawns, but you\'re still a pawn ahead — and every trade brings your ending closer.');
  });
  it('good: taking back leaves an isolated pawn (queenless — not "king cover")', () => {
    const r = readTrade('r5k1/pR6/5p1p/2p1bn1r/2P4B/3P2P1/PP3PK1/5R2 b - - 0 25', 'Nxh4+', 'b');
    expect(r?.text).toBe('Nxh4+ is a good trade — taking back leaves their pawn on h4 isolated.');
  });
  it('ahead: every trade helps the side with more material', () => {
    expect(readTrade('2r1kb1r/pp1b1ppp/5q2/3PNn2/1PB5/1P6/3BNPPP/R2QK2R w KQk - 7 19', 'Nxd7', 'b')?.call).toBe('ahead');
    expect(readTrade('r1b1r1k1/5ppp/pq2p1n1/1p1p2B1/3p1N2/2P3Q1/PP3PPP/R3R1K1 b - - 1 19', 'Nxf4', 'b')?.text)
      .toMatch(/while you're ahead/);
  });
  it('NEGATIVE: an outpost knight traded for a pawn-wrecking recapture is mixed — silent', () => {
    expect(readTrade('rn4k1/pp4p1/3b1n1p/2pN3r/2P4B/3P2P1/PP3P2/R4R1K w - - 1 20', 'Nxf6+', 'b')).toBeNull();
  });
  it('NEGATIVE: no "king defender" in a queenless ending', () => {
    expect(readTrade('7R/p4kr1/2K2p2/2p1b3/2Pr3P/8/PP3P2/6R1 w - - 3 37', 'Rxg7+', 'b')).toBeNull();
  });
  it('the engine has the last word: no "poor" on a sound move, no "good" on a mistake', () => {
    const fen = 'r5k1/pR6/5p1p/2p1bn1r/2P4B/3P2P1/PP3PK1/5R2 b - - 0 25';
    expect(readTrade(fen, 'Nxh4+', 'b', 250)).toBeNull();
    expect(readTrade(fen, 'Nxh4+', 'b', 10)?.call).toBe('good');
  });
  it('NEGATIVE: a capture that simply wins material is not a trade', () => {
    // Nothing can take back on h4 after Nxh4 here.
    expect(readTrade('rnbqkb1r/pppppppp/8/8/7n/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 1', 'Nxh4', 'w')).toBeNull();
  });
});

describe('findTradeTarget — their best piece for your worst', () => {
  it('stays silent without a route to the trade', () => {
    expect(findTradeTarget('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')).toBeNull();
  });
});
