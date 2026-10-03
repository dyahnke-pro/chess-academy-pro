// Learn walk oct3c (2026-10-03): a recapture is not a trade the mover chose.
import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

describe('a recapture is not the idea (walk oct3c, 4.Qe2)', () => {
  const FEN = 'r1bqkbnr/pp1p1ppp/2n1p3/2p1P3/2B5/8/PPPP1PPP/RNBQK1NR w KQkq - 1 4';
  it('Nf3 …Qc7 O-O …Nxe5 Nxe5: Black started that trade — not "trade off the knight"', () => {
    const r = betterMoveReason(FEN, 'Qe2', 'Nf3',
      ['g1f3', 'd8c7', 'e1g1', 'c6e5', 'f3e5', 'c7e5', 'f1e1', 'e5f4'], 'white', null);
    expect(r ?? '').not.toMatch(/trade off/);
  });
  it('the mover opening the exchange still reads as its trade (positive control)', () => {
    // Bxc6 takes first on c6: that trade is White's own.
    const r = betterMoveReason('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4', 'O-O', 'Bxc6',
      ['b5c6', 'd7c6', 'e1g1', 'f7f6', 'd2d4', 'e5d4', 'f3d4', 'c6c5'], 'white', null);
    expect(r ?? '').toMatch(/trade off|take the knight/);
  });
});

describe('"still hanging" reads the line, not "is it attacked" (walk oct3c, 2.Bb5+)', () => {
  it('d5 is defended — exd5 Qxd5 is a trade, so it is not "hanging"', async () => {
    const { callInaccuracy } = await import('./inaccuracyCall');
    const call = callInaccuracy({ priorMove: null, replyLineUci: [], replySan: null,
      fenBefore: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      playedSan: 'Bb5+', bestSan: 'exd5',
      bestLineUci: ['e4d5', 'd8d5', 'b1c3', 'd5d8', 'd2d4', 'g8f6', 'g1f3', 'e7e6'],
      cpLoss: 120, side: 'coach', dictated: true, moverColor: 'white' });
    expect(call?.said ?? '').not.toMatch(/still hanging/);
  });
});


describe('king cover is the one shield rule (walk oct3d, 11.Nxe5)', () => {
  it('…dxe5 from d6, in front of the king on e8, is king cover', async () => {
    const { readTrade } = await import('./tradeQuality');
    const r = readTrade('r1q1k1nr/p1p1bppp/1p1p4/3Pn3/8/2P2NP1/PP2QP1P/RNB1K2R w KQkq - 0 11', 'Nxe5', 'w', null, null);
    expect(r?.text ?? '').toMatch(/king's cover/);
  });
  it('NEGATIVE: a pawn three ranks in front of the king is not its cover', async () => {
    const { recaptureDamage } = await import('./tradeQuality');
    const { Chess } = await import('chess.js');
    // After Nxg4, Black's only recapture is …fxg4 from f5 — three ranks in
    // front of the king on g8, outside the shield.
    const after = new Chess('3q2k1/5p1p/8/5p2/6n1/4N3/5PPP/3Q2K1 w - - 0 1');
    after.move('Nxg4');
    expect(recaptureDamage(after, 'g4')).not.toBe('king-cover');
  });
});

describe('no capture is read off a board where the other side is in check (walk oct3e, 10.Bb5+)', () => {
  // After 10.Bb5+, Black to move and in check. f7 is hit by Ne5 and Qf3 and
  // held by the queen and the king; Black answers the check first.
  const FEN = 'rnb1k2r/p3qpbp/1p2p1pn/1B1pN3/6P1/1P3Q2/P1PP1P1P/RNB1K2R b KQkq - 2 10';
  it('the f7 pawn is not "winnable" for White on that board', async () => {
    const { signedLegalSeeFor, legalSeeGainFor, asIfToMove } = await import('./positionReadingService');
    expect(asIfToMove(FEN, 'w')).toBeNull();
    expect(signedLegalSeeFor(FEN, 'f7', 'w')).toBe(0);
    expect(legalSeeGainFor(FEN, 'f7', 'w')).toBe(0);
  });
  it('NEGATIVE CONTROL: no check — the flip stands and a real hang still reads', async () => {
    const { signedLegalSeeFor } = await import('./positionReadingService');
    // Black to move, not in check; the knight on g5 hangs to the queen.
    expect(signedLegalSeeFor('r1bqkbnr/pppp1ppp/2n5/6N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5', 'g5', 'b')).toBeGreaterThan(0);
  });
});
