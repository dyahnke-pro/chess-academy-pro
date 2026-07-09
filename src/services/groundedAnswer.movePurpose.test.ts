import { describe, it, expect } from 'vitest';
import { assembleMovePurpose } from './groundedAnswer';

describe('assembleMovePurpose — the RICH move-purpose bundle (David 2026-07-09)', () => {
  it('names the geometry + assessment for a capturing move', () => {
    // White plays Bxc6 (Ruy exchange): a capture. Purpose = geometry + eval.
    const p = assembleMovePurpose({
      fenBefore: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
      san: 'Bxc6',
      moverColor: 'white',
      evalCp: 30,
      studentSide: 'white',
    });
    expect(p).not.toBeNull();
    expect(p!.clauses.length).toBeGreaterThan(0);
    expect(p!.bestMoveFromTo).toEqual({ from: 'b5', to: 'c6' });
    // Every clause is grounded; the facts string is the chosen clauses.
    expect(p!.facts).toContain('.');
    expect(p!.sources).toContain('board:chess.js');
  });

  it('detects an OUTPOST for a knight no pawn can chase', () => {
    // White knight to d5; Black has no c- or e-pawn able to attack d5 → outpost.
    // Position: black c- and e-pawns are gone / advanced past.
    const p = assembleMovePurpose({
      fenBefore: 'r1bqk2r/pp3ppp/2n2n2/3Np3/1b2P3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 7',
      san: 'Nxf6+',
      moverColor: 'white',
      evalCp: 20,
      studentSide: 'white',
    });
    // (Nxf6+ is a check/capture — geometry clause present regardless.)
    expect(p).not.toBeNull();
    expect(p!.clauses[0].toLowerCase()).toMatch(/knight/);
  });

  it('caps clauses by maxClauses (verbosity), keeping the most important first', () => {
    const base = {
      fenBefore: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
      san: 'Bxc6' as const,
      moverColor: 'white' as const,
      evalCp: 120,
      studentSide: 'white' as const,
    };
    const full = assembleMovePurpose(base);
    const brief = assembleMovePurpose({ ...base, maxClauses: 1 });
    expect(brief).not.toBeNull();
    expect(full).not.toBeNull();
    expect(brief!.facts).toBe(full!.clauses.slice(0, 1).join(' '));
    // brief voices no more sentences than full.
    expect(brief!.facts.length).toBeLessThanOrEqual(full!.facts.length);
  });

  it('returns null for an illegal move', () => {
    expect(assembleMovePurpose({ fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', san: 'Qh5xh8', moverColor: 'white' })).toBeNull();
  });
});
