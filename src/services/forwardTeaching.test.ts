import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { computePieceRoute, isKnightOutpost } from './forwardTeaching';

describe('computePieceRoute (Phase 1 — knight → supported outpost)', () => {
  it('routes a knight to a supported hole (b1 → c3 → d5, backed by e4)', () => {
    // White Nb1 + e4 pawn; d5 is a hole (Black has no c/e pawns to challenge)
    // supported by e4. Nearest route: b1 → c3 → d5.
    const fen = '4k3/p4p2/8/8/4P3/8/8/1N2K3 w - - 0 1';
    const route = computePieceRoute(fen, 'b1');
    expect(route).not.toBeNull();
    expect(route?.piece).toBe('n');
    expect(route?.target).toBe('d5');
    expect(route?.route).toEqual(['c3', 'd5']);
    // The why names the outpost + its pawn backer, board-true.
    expect(route?.why).toMatch(/d5/);
    expect(route?.why).toMatch(/outpost/i);
    expect(route?.why).toMatch(/e-pawn/);
  });

  it('returns null when there is no supported outpost to head for', () => {
    // Knight but no friendly pawns → nothing supports an outpost.
    const fen = '4k3/8/8/8/8/8/8/1N2K3 w - - 0 1';
    expect(computePieceRoute(fen, 'b1')).toBeNull();
  });

  it('returns null for a non-knight square (Phase 1 is knights only)', () => {
    const fen = '4k3/8/8/8/4P3/8/8/1B2K3 w - - 0 1';
    expect(computePieceRoute(fen, 'b1')).toBeNull(); // a bishop
    expect(computePieceRoute(fen, 'e4')).toBeNull(); // a pawn
    expect(computePieceRoute(fen, 'a1')).toBeNull(); // empty
  });

  it('rejects a square an enemy pawn can still challenge (not a hole)', () => {
    // d5 is defended by e4, but a Black c-pawn on c7 can play ...c6 to hit d5.
    const chess = new Chess('4k3/2p2p2/8/8/4P3/8/8/1N2K3 w - - 0 1');
    expect(isKnightOutpost(chess, 'd5', 'w')).toBe(false);
  });

  it('accepts a genuine supported hole', () => {
    const chess = new Chess('4k3/p4p2/8/8/4P3/8/8/1N2K3 w - - 0 1');
    expect(isKnightOutpost(chess, 'd5', 'w')).toBe(true);
  });

  it('works symmetrically for Black (…d4 outpost backed by …e5)', () => {
    // Black Nb8 + e5 pawn; d4 is a hole backed by e5, White has no c/e pawns.
    const fen = '1n2k3/8/8/4p3/8/8/P4P2/4K3 b - - 0 1';
    const route = computePieceRoute(fen, 'b8');
    expect(route).not.toBeNull();
    expect(route?.target).toBe('d4');
    expect(route?.route).toEqual(['c6', 'd4']);
  });
});
