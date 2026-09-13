// Tempo + SEE fork verification — proves a detected fork is a LIVE win, a real
// THREAT, or unproven, with no engine (chess.js + SEE only, exact for material).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { verifyForkOnBoard } from './tacticVerification';

describe('verifyForkOnBoard', () => {
  it('LIVE: owner to move, knight forks two undefended rooks → wins material', () => {
    // NB king on a1 (off the g-file). The old fixture put the white king on g1,
    // where the g6 rook checks it on the open g-file — an accidental check the
    // geometric SEE ignored but the pin/legality-aware verifier correctly reacts
    // to (only the check-resolving Nxg6 is legal). Moving the king off the file
    // tests the fork intent without the artifact (2026-09-13 pin-aware sweep).
    const fen = '6k1/8/2r3r1/4N3/8/8/8/K7 w - - 0 1';
    const v = verifyForkOnBoard(fen, 'e5', ['c6', 'g6']);
    expect(v.status).toBe('live');
    expect(v.winnableTargets.sort()).toEqual(['c6', 'g6']);
    expect(v.winsPoints).toBe(5); // both rooks winnable → collects at least one
  });

  it('LIVE: a FULLY PINNED forker wins nothing → none (2026-09-13 pin-aware fix)', () => {
    // White Ne5 geometrically forks Qc6 + Rg6 but is pinned to Ke1 by Re8 — it
    // has no legal move, so the "fork" is fake. The old geometric SEE returned
    // live/winsPoints 5; the pin-aware verifier returns none.
    const fen = '4r1k1/8/2q3r1/4N3/8/8/8/4K3 w - - 0 1';
    expect(new Chess(fen).moves({ verbose: true }).some((m) => m.from === 'e5')).toBe(false);
    expect(verifyForkOnBoard(fen, 'e5', ['c6', 'g6']).status).toBe('none');
  });

  it('drops a tempo-blind false positive: both forked knights are pawn-defended (SEE ≤ 0)', () => {
    const fen = '6k1/1p5p/2n3n1/4N3/8/8/8/6K1 w - - 0 1';
    const v = verifyForkOnBoard(fen, 'e5', ['c6', 'g6']);
    expect(v.status).toBe('none'); // knight-for-knight nets nothing → not a win
  });

  it('THREAT: knight just moved, defender to move can’t save both rooks', () => {
    // The white king is shielded (Bf1 blocks the 1st rank, g2 blocks the g-file)
    // so NEITHER rook can escape WITH a check — the honest condition for a
    // guaranteed threat. The old fixture (king g1) left white in check on
    // black's move, an illegal-position artifact the geometric SEE ignored.
    const fen = '6k1/8/2r3r1/4N3/8/8/6PP/5B1K b - - 0 1';
    expect(new Chess(fen).moves({ verbose: true }).some((m) => m.san.includes('+'))).toBe(false);
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
