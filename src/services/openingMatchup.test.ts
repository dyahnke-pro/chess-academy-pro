import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { resolveOpeningMatchup, inferMatchupColor } from './openingMatchup';

describe('inferMatchupColor', () => {
  it('classifies defenses as Black, systems/opening as White', () => {
    expect(inferMatchupColor("King's Indian Defense")).toBe('black');
    expect(inferMatchupColor('Sicilian Defense: Dragon Variation')).toBe('black');
    expect(inferMatchupColor('French Defense')).toBe('black');
    expect(inferMatchupColor('London System')).toBe('white');
    expect(inferMatchupColor('English Opening')).toBe('white');
  });

  it('treats "Attack" systems as White even inside a Black-named family', () => {
    // The bug: "King's Indian ATTACK" matched the king's-indian pattern and
    // was mis-tagged Black, so "KIA vs Sicilian" read as Black-vs-Black.
    expect(inferMatchupColor("King's Indian Attack")).toBe('white');
    expect(inferMatchupColor('Caro-Kann Defense: Panov Attack')).toBe('white');
  });
});

describe('resolveOpeningMatchup', () => {
  it('returns null for a non-matchup (no separator)', () => {
    expect(resolveOpeningMatchup('Sicilian Defense')).toBeNull();
    expect(resolveOpeningMatchup('teach me the Vienna')).toBeNull();
  });

  it('teaches a real named line for "KIA vs Sicilian dragon" (David 2026-07-18)', () => {
    const m = resolveOpeningMatchup('KIA vs Sicilian dragon');
    expect(m?.kind).toBe('line');
    expect(m?.whiteName).toBe("King's Indian Attack");
    expect(m?.blackName).toBe('Sicilian Defense: Dragon Variation');
    expect(m?.canonicalName).toBe("King's Indian Attack: Sicilian Variation");
    expect((m?.moves?.length ?? 0)).toBeGreaterThanOrEqual(10);
  });

  it('the resolved line is a legal, gap-free chess game (G3 — DB-grounded moves)', () => {
    const m = resolveOpeningMatchup('KIA vs the Sicilian');
    expect(m?.kind).toBe('line');
    const g = new Chess();
    for (const san of m?.moves ?? []) {
      expect(g.moves()).toContain(san); // every move legal from the prior position
      g.move(san);
    }
    expect(g.history().length).toBe(m?.moves?.length);
  });

  it('handles "versus" / "against" and a leading article on each side', () => {
    expect(resolveOpeningMatchup('London against the KID')?.kind).toBe('line');
    expect(resolveOpeningMatchup('Caro-Kann versus the Panov')?.kind).toBe('line');
  });

  it('flags two SAME-colour openings as incompatible (can\'t face each other)', () => {
    const m = resolveOpeningMatchup('Najdorf vs Dragon');
    expect(m?.kind).toBe('incompatible');
    expect(m?.reason).toMatch(/both Black openings/i);
  });

  it('flags a pair with no book matchup honestly, never an invented hybrid', () => {
    // Italian (1.e4 e5) and the Sicilian (1.e4 c5) cannot both occur.
    const m = resolveOpeningMatchup('Italian vs Sicilian');
    expect(m?.kind).toBe('incompatible');
    expect(m?.reason).toMatch(/don't have a standard book line|common matchup/i);
    expect(resolveOpeningMatchup('Ruy Lopez vs French')?.kind).toBe('incompatible');
  });

  it('returns null when a side cannot be resolved (falls back to normal flow)', () => {
    expect(resolveOpeningMatchup('asdfgh vs qwerty')).toBeNull();
  });
});
