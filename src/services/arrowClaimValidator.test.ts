import { describe, it, expect } from 'vitest';
import { validateArrowClaims } from './arrowClaimValidator';

describe('validateArrowClaims', () => {
  it('returns empty when the response has no SAN and no arrow', () => {
    const r = validateArrowClaims('Solid developmental move. Both sides finish development naturally.');
    expect(r.mentionedSans).toEqual([]);
    expect(r.violations).toEqual([]);
  });

  it('flags a SAN mention without a matching arrow', () => {
    const r = validateArrowClaims('Watch out — White has Nf3 next which attacks the queen.');
    expect(r.mentionedSans).toContain('Nf3');
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].san).toBe('Nf3');
  });

  it('accepts a SAN mention when the arrow destination matches', () => {
    const r = validateArrowClaims(
      'Watch out — White has Nf3 next. [BOARD: arrow:g1-f3:green]',
    );
    expect(r.mentionedSans).toContain('Nf3');
    expect(r.arrowMarkers).toHaveLength(1);
    expect(r.violations).toHaveLength(0);
  });

  it('accepts pawn captures (exd5) when the destination has an arrow', () => {
    const r = validateArrowClaims('White plays exd5 grabbing the center. [BOARD: arrow:e4-d5:green]');
    expect(r.violations).toHaveLength(0);
  });

  it('accepts check-tagged SAN (Bxh7+) with matching arrow', () => {
    const r = validateArrowClaims('Sacrifice with Bxh7+ — classic Greek gift. [BOARD: arrow:c1-h7:red]');
    expect(r.violations).toHaveLength(0);
  });

  it('skips descriptive square references ("the e4 square")', () => {
    const r = validateArrowClaims('The e4 square is the heart of the center.');
    expect(r.mentionedSans).toEqual([]);
    expect(r.violations).toEqual([]);
  });

  it('skips "on a4" / "at e5" descriptive uses', () => {
    const r = validateArrowClaims('White\'s knight on a4 is offside; Black plays at e5 by force.');
    expect(r.violations.filter((v) => v.san === 'a4').length).toBe(0);
    expect(r.violations.filter((v) => v.san === 'e5').length).toBe(0);
  });

  it('catches multiple SANs without arrows in the same response', () => {
    const r = validateArrowClaims(
      'White plays Nf3, then Bc4, then O-O — full Italian setup.',
    );
    const sans = r.violations.map((v) => v.san);
    expect(sans).toContain('Nf3');
    expect(sans).toContain('Bc4');
  });

  it('castling (O-O) does not trigger a violation even without an arrow', () => {
    const r = validateArrowClaims('White castles with O-O to safety.');
    // Castling is in mentionedSans but excluded from violations
    // (no specific destination square to arrow).
    expect(r.violations.find((v) => v.san === 'O-O')).toBeUndefined();
  });

  it("matches David's audit pattern: brain says 'I played Nc3' without [BOARD: arrow:b1-c3:green]", () => {
    const r = validateArrowClaims(
      "I played Nc3, attacking the queen and forcing her to retreat.",
    );
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].san).toBe('Nc3');
  });

  it('matches the same brain response WITH the arrow → no violation', () => {
    const r = validateArrowClaims(
      "I played Nc3 [BOARD: arrow:b1-c3:green], attacking the queen and forcing her to retreat.",
    );
    expect(r.violations).toHaveLength(0);
  });

  it('does not double-count squares inside the marker itself', () => {
    // The marker [BOARD: arrow:e2-e4:green] contains "e2" and "e4".
    // Without strip-markers logic those would count as SAN mentions
    // without arrows (circular).
    const r = validateArrowClaims(
      'e4 grabs the center. [BOARD: arrow:e2-e4:green]',
    );
    expect(r.violations).toHaveLength(0);
  });
});
