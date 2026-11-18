// The good- and bad-piece notes read what a piece DOES from its square
// (Danya's article boards, 2026-11-18 — FENs only, never his words).
import { describe, it, expect } from 'vitest';
import { findPieceQuality } from './positionReadingService';

const at = (fen: string, sq: string) => findPieceQuality(fen).filter((q) => q.square === sq);

describe('a rim knight at work is not the problem piece', () => {
  it('the-discovered-check-reloaded #0: Nh6 beside their king on g7', () => {
    expect(at('1r3b2/1bp2pkp/p1q2npN/1p1n2B1/7Q/2P1N2P/PPB2PP1/4R1K1 w - - 0 24', 'h6')).toEqual([]);
  });
  it('the-positional-queen-sacrifice #0: Nh5 hitting f6 in front of their king', () => {
    expect(at('b1r5/2r1kp2/3p1p1p/1pq1pP1N/4PbPP/pPPR4/P1B1Q3/1K1R4 w - - 0 31', 'h5')).toEqual([]);
  });
  it('positive control: a rim knight that does nothing is still bad (weak-squares-who-cares #0, Na6)', () => {
    expect(at('r1bq1rk1/pp6/n2p1p1b/2pPp2p/2P1P1nN/P1N3B1/1P2BPP1/R2Q1RK1 b - - 0 18', 'a6')).toMatchObject([{ quality: 'bad', kind: 'rim-knight' }]);
  });
});

describe('a pinned piece is never the best-placed one', () => {
  it('mastering-the-queen-sacrifice #1: the f7 rook pinned to g8 by the b3 queen has no file note', () => {
    expect(at('3b2k1/1q3rp1/1p1B3p/1Pp2b2/4n3/1Q2P3/P4PPP/R2R2K1 b - - 0 27', 'f7')).toEqual([]);
  });
  it('positive control: with the queen off the diagonal the rook has the half-open f-file', () => {
    expect(at('3b2k1/1q3rp1/1p1B3p/1Pp2b2/4n3/4P3/PQ3PPP/R2R2K1 b - - 0 27', 'f7')).toMatchObject([{ quality: 'good', kind: 'semi-open-file' }]);
  });
  it('a rook pinned along its own file still uses that file', () => {
    // White rook e2 pinned on the e-file by the e5 rook to the e1 king: it still slides on the e-file.
    expect(at('6k1/4pppp/8/4r3/8/8/4R3/4K3 w - - 0 1', 'e2')).toMatchObject([{ quality: 'good', kind: 'semi-open-file' }]);
  });
});
