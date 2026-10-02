// Walk 6, R6: "You're now threatening Nxd5 — it wins their queen" on every ply
// a queen was merely attacked, then LEADING the ply at nine points of stakes.
// A capture threat is a win only when no reply saves the piece.
import { describe, it, expect } from 'vitest';
import { detectNewThreat, captureThreatIsAnswerable } from './groundedAnswer';

describe('a capture threat the victim walks away from is not a win', () => {
  it('a knight attacking a queen with open squares is answerable → no threat named', () => {
    // 1.e4 d5 2.exd5 Qxd5 — White plays Nc3, hitting the queen; she has squares.
    const before = 'rnb1kbnr/ppp1pppp/8/3q4/8/8/PPPP1PPP/RNBQKBNR w KQkq - 0 3';
    const after = 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 3';
    expect(captureThreatIsAnswerable(after, 'w')).toBe(true);
    expect(detectNewThreat(before, after, 'w')).toBeNull();
  });

  it('a pinned piece that cannot be saved is still a threat', () => {
    // Black knight on e5 pinned to the king by the rook on e1, hit by the d4 pawn.
    expect(captureThreatIsAnswerable('4k3/8/8/4n3/3P4/8/8/4R1K1 b - - 0 1', 'w')).toBe(false);
  });
});

// Review walk 2026-10-01 (game 173903420240, ply 45): 23.Qxc7 took the queen
// and was told "you're now threatening Qxd8+ — it wins their rook on d8 and
// forks the king and their rook on e7" while …Rxc7 takes the queen back.
describe('a threat from a piece they can simply take is no threat', () => {
  it('Qxc7 threatens nothing — the queen is recaptured', () => {
    const before = '3r2k1/2q1rpp1/p1p1pn1p/1p2Q3/3P4/P4N1P/1PP2PP1/3RR1K1 w - - 3 23';
    const after = '3r2k1/2Q1rpp1/p1p1pn1p/1p6/3P4/P4N1P/1PP2PP1/3RR1K1 b - - 0 23';
    expect(detectNewThreat(before, after, 'w')).toBeNull();
  });
});
