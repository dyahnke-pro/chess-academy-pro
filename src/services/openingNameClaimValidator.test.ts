import { describe, it, expect } from 'vitest';
import { validateOpeningNameClaims } from './openingNameClaimValidator';

describe('validateOpeningNameClaims', () => {
  it('flags a fabricated opening name that does not resolve in the DB', () => {
    // "Flarbgon" is not a real opening — the canonical Lichess DB has no
    // entry for it, so the gate flags the fabrication. (Note: many
    // plausible-sounding names ARE real — e.g. the Saduleto Variation of the
    // QGA exists — which is exactly why this resolves against the DB, not a
    // hand-list.)
    const r = validateOpeningNameClaims('This transposes into the Flarbgon Gambit, a sharp line.');
    expect(r.hasAnyNameClaim).toBe(true);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].name).toBe('Flarbgon');
    expect(r.violations[0].match).toBe('the Flarbgon Gambit');
  });

  it('does NOT flag a real, resolvable opening name', () => {
    // Najdorf resolves via the alias map → Sicilian Defense: Najdorf Variation.
    const r = validateOpeningNameClaims('We are heading into the Najdorf Variation now.');
    expect(r.hasAnyNameClaim).toBe(true);
    expect(r.violations).toHaveLength(0);
  });

  it('does NOT flag a bare sub-variation descriptor that needs parent context', () => {
    // "Exchange Variation" alone often doesn't resolve standalone — but it's a
    // real descriptor, not a fabrication, so the gate must not flag it.
    const r = validateOpeningNameClaims('White chooses the Exchange Variation.');
    expect(r.violations).toHaveLength(0);
  });

  it('ignores lowercase generic prose ("the main line", "the attack on f7")', () => {
    const r = validateOpeningNameClaims('Follow the main line and watch the attack on f7.');
    expect(r.hasAnyNameClaim).toBe(false);
    expect(r.violations).toHaveLength(0);
  });

  it('does not match a name inside a tool marker', () => {
    const r = validateOpeningNameClaims('[[ACTION:start_walkthrough_for_opening {"name":"the Saduleto Variation"}]] Let us begin.');
    expect(r.violations).toHaveLength(0);
  });

  it('never throws — returns a clean result on odd input', () => {
    expect(() => validateOpeningNameClaims('')).not.toThrow();
    expect(validateOpeningNameClaims('').violations).toHaveLength(0);
  });
});
