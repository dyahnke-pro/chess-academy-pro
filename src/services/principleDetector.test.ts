import { describe, it, expect } from 'vitest';
import { detectPrincipleViolations } from './principleDetector';

const ids = (sans: string[]): string[] => detectPrincipleViolations(sans).map((v) => v.id);

describe('principleDetector', () => {
  it('flags an early queen sortie (Scholar-mate try)', () => {
    expect(ids(['e4', 'e5', 'Qh5'])).toContain('early-queen-sortie');
  });

  it('does not flag a normal developing move', () => {
    expect(ids(['e4', 'e5', 'Nf3'])).toEqual([]);
    expect(ids(['e4', 'c5', 'Nf3', 'd6', 'd4'])).toEqual([]);
  });

  it('flags the same knight moving twice while others sit home', () => {
    expect(ids(['e4', 'e5', 'Nf3', 'Nc6', 'Ng5'])).toContain('same-piece-twice');
  });

  it('does not flag a re-move that captures', () => {
    // Nxe5 captures — concrete chess, not tempo-waste by definition here.
    expect(ids(['e4', 'e5', 'Nf3', 'Nc6', 'Nxe5'])).not.toContain('same-piece-twice');
  });

  it('flags a wing-pawn grab with an uncastled king', () => {
    // 1.e4 b5 2.Bxb5 — bishop grabs the b5 wing pawn, white king on e1.
    expect(ids(['e4', 'b5', 'Bxb5'])).toContain('wing-pawn-grab-uncastled');
  });

  it('flags early edge-pawn pushes with the center unresolved', () => {
    expect(ids(['h4'])).toContain('early-edge-pawns');
  });

  it('stays quiet past the opening scope', () => {
    const long = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6', 'c3', 'O-O', 'h3', 'Na5', 'Bc2', 'c5', 'd4', 'Qc7', 'Nbd2', 'Qb6', 'Qe2'];
    expect(detectPrincipleViolations(long)).toEqual([]);
  });

  it('returns [] on an illegal history instead of guessing', () => {
    expect(detectPrincipleViolations(['e4', 'e4'])).toEqual([]);
  });
});
