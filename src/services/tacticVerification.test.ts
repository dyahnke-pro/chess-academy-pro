// Tempo + SEE fork verification — proves a detected fork is a LIVE win, a real
// THREAT, or unproven, with no engine (chess.js + SEE only, exact for material).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { verifyForkOnBoard } from './tacticVerification';

describe('verifyForkOnBoard', () => {
  it('LIVE: owner to move, knight forks two undefended rooks → wins material', () => {
    const fen = '6k1/8/2r3r1/4N3/8/8/8/6K1 w - - 0 1';
    const v = verifyForkOnBoard(fen, 'e5', ['c6', 'g6']);
    expect(v.status).toBe('live');
    expect(v.winnableTargets.sort()).toEqual(['c6', 'g6']);
    expect(v.winsPoints).toBe(5); // both rooks winnable → collects at least one
  });

  it('drops a tempo-blind false positive: both forked knights are pawn-defended (SEE ≤ 0)', () => {
    const fen = '6k1/1p5p/2n3n1/4N3/8/8/8/6K1 w - - 0 1';
    const v = verifyForkOnBoard(fen, 'e5', ['c6', 'g6']);
    expect(v.status).toBe('none'); // knight-for-knight nets nothing → not a win
  });

  it('THREAT: knight just moved, defender to move can’t save both rooks', () => {
    const fen = '6k1/8/2r3r1/4N3/8/8/8/6K1 b - - 0 1';
    const v = verifyForkOnBoard(fen, 'e5', ['c6', 'g6']);
    expect(v.status).toBe('threat');
    expect(v.winsPoints).toBeGreaterThanOrEqual(2); // wins at least the exchange
  });

  it('NOT a threat when a single reply saves everything (defender captures the forker)', () => {
    const fen = '6k1/8/2r3r1/4N3/8/8/1b6/7K b - - 0 1'; // Bb2 can play Bxe5, removing the forker
    expect(new Chess(fen).moves({ verbose: true }).some((m) => m.from === 'b2' && m.to === 'e5')).toBe(true);
    const v = verifyForkOnBoard(fen, 'e5', ['c6', 'g6']);
    expect(v.status).toBe('none');
  });

  it('ROYAL FORK: check + attack a rook — defender must escape check, rook falls', () => {
    const fen = '2r3k1/4N3/8/8/8/8/8/6K1 b - - 0 1'; // Ne7+ also hits Rc8
    expect(new Chess(fen).inCheck()).toBe(true);
    const v = verifyForkOnBoard(fen, 'e7', ['g8', 'c8']); // g8 = enemy king (excluded)
    expect(v.status).toBe('threat');
    expect(v.winsPoints).toBe(5);
  });

  it('returns none when fewer than two real (non-king) targets remain', () => {
    const fen = '6k1/8/2r5/4N3/8/8/8/6K1 w - - 0 1'; // only a rook on c6
    expect(verifyForkOnBoard(fen, 'e5', ['c6', 'd4']).status).toBe('none'); // d4 empty
  });

  it('safe on a malformed FEN', () => {
    expect(verifyForkOnBoard('not a fen', 'e5', ['c6', 'g6']).status).toBe('none');
  });
});
