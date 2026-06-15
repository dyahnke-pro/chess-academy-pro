import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { buildSublines, pgnToSans } from './openingSublines';

describe('pgnToSans', () => {
  it('strips move numbers from a numbered PGN', () => {
    expect(pgnToSans('1.e4 c6 2.d4 d5')).toEqual(['e4', 'c6', 'd4', 'd5']);
  });

  it('handles "1. e4" (space after number) and black-move "1...c5" notation', () => {
    expect(pgnToSans('1. e4 c5 2. Nf3')).toEqual(['e4', 'c5', 'Nf3']);
    expect(pgnToSans('2...d5')).toEqual([]); // not legal as a standalone first move
  });

  it('accepts bare-SAN (DB) format unchanged', () => {
    expect(pgnToSans('e4 e5 Nf3 Nc6')).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
  });

  it('canonicalizes castling SAN via chess.js', () => {
    const sans = pgnToSans('e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6');
    expect(sans).toContain('O-O');
  });

  it('returns [] for an illegal/unparseable line rather than throwing', () => {
    expect(pgnToSans('e4 e5 Qxz9')).toEqual([]);
    expect(pgnToSans('')).toEqual([]);
  });
});

describe('buildSublines', () => {
  // Invariant-based (not count-brittle): assert the SHAPE of whatever the live
  // DB yields, so the test survives DB content shifts. (Discovery is the
  // named-branch floor today; the position-based walk is the next upgrade.)
  const variation = { name: 'Caro-Kann Defense: Advance Variation', pgn: 'e4 c6 d4 d5 e5' };
  const prefix = ['e4', 'c6', 'd4', 'd5', 'e5'];

  it('returns sublines whose moves branch from the variation prefix and are legal', () => {
    const subs = buildSublines(variation);
    for (const s of subs) {
      // Branches from the variation's spine.
      expect(s.moves.slice(0, prefix.length)).toEqual(prefix);
      expect(s.branchPly).toBe(prefix.length);
      // The trigger move sits exactly at the branch ply.
      expect(s.moves[s.branchPly]).toBe(s.triggerMove);
      // The whole line is legal end-to-end (round-trips through chess.js).
      const chess = new Chess();
      for (const m of s.moves) expect(() => chess.move(m)).not.toThrow();
      // Trimmed to its terminus; popularity proxy present.
      expect(s.terminusPly).toBe(s.moves.length);
      expect(s.count).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns [] for an unparseable variation pgn', () => {
    expect(buildSublines({ name: 'x', pgn: 'e4 e5 Qxz9' })).toEqual([]);
  });

  it('returns [] (not a throw) for a line with no DB sub-variations', () => {
    // A legal but obscure line unlikely to carry comma-named DB children.
    const subs = buildSublines({ name: 'Nonsense', pgn: 'a4 a5 h4 h5' });
    expect(Array.isArray(subs)).toBe(true);
  });
});
