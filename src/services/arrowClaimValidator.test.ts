import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { validateArrowClaims, synthesizeMissingArrows } from './arrowClaimValidator';

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

describe('synthesizeMissingArrows (Bug E enforcement)', () => {
  // Live audit 2026-05-19 Finding 70: at the Danish Gambit FEN
  // (Black to move after 1.e4 e5 2.d4 exd4 3.c3), the coach mentioned
  // "dxc3 Nxc3" in prose with no arrow markers. The validator caught
  // it; the synthesizer now appends arrows for both moves.
  const DANISH_FEN =
    'rnbqkbnr/pppp1ppp/8/8/3pP3/2P5/PP3PPP/RNBQKBNR b KQkq - 0 3';

  it('appends arrow markers for the live-audit Danish Gambit failure', () => {
    const response = 'After **dxc3 Nxc3**, White has open lines and a tempo.';
    const v = validateArrowClaims(response);
    expect(v.violations.length).toBeGreaterThan(0);
    const syn = synthesizeMissingArrows(response, DANISH_FEN, v.violations, Chess, 'green');
    expect(syn.synthesized).toContain('dxc3');
    expect(syn.synthesized).toContain('Nxc3');
    expect(syn.text).toContain('[BOARD: arrow:d4-c3:green]');
    expect(syn.text).toContain('[BOARD: arrow:b1-c3:green]');
  });

  it('returns the response unchanged when no violations', () => {
    const response = 'A position with no SAN mentions.';
    const syn = synthesizeMissingArrows(response, DANISH_FEN, [], Chess, 'green');
    expect(syn.text).toBe(response);
    expect(syn.synthesized).toEqual([]);
  });

  it('reports failed-to-synthesize SANs when they are illegal at the given FEN', () => {
    // At the starting position, "Bxh7" is illegal — no bishop can
    // reach h7 in one move.
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const response = 'You could play Bxh7 here for the Greek gift sacrifice.';
    const v = validateArrowClaims(response);
    expect(v.violations.length).toBeGreaterThan(0);
    const syn = synthesizeMissingArrows(response, startFen, v.violations, Chess, 'green');
    expect(syn.failed).toContain('Bxh7');
    expect(syn.synthesized).not.toContain('Bxh7');
  });

  it('survives an invalid FEN by reporting every SAN as failed', () => {
    const response = 'dxc3 then Nxc3.';
    const v = validateArrowClaims(response);
    const syn = synthesizeMissingArrows(response, 'NOT A FEN', v.violations, Chess, 'green');
    expect(syn.synthesized).toEqual([]);
    expect(syn.failed.length).toBeGreaterThan(0);
  });

  it('uses the requested arrow color', () => {
    const response = 'After dxc3 the c-file opens.';
    const v = validateArrowClaims(response);
    const syn = synthesizeMissingArrows(response, DANISH_FEN, v.violations, Chess, 'blue');
    expect(syn.text).toContain('[BOARD: arrow:d4-c3:blue]');
  });
});
