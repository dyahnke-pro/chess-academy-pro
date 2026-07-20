import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { sacrificeCompensation } from './reviewSacrifice';

/** FEN after playing the SAN prefix (the position the sac lands in). */
function fenAfter(sans: string[]): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
}

const OPERA = ['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4', 'dxe5', 'Bxf3', 'Qxf3', 'dxe5', 'Bc4', 'Nf6', 'Qb3', 'Qe7', 'Nc3', 'c6', 'Bg5', 'b5', 'Nxb5'];

describe('sacrificeCompensation (David 2026-07-20 — teach the sac, don\'t assert it)', () => {
  it('names the board-true compensation for the Opera knight sac', () => {
    // After 10.Nxb5: Black king stuck on e8, d-file open, White far ahead in
    // development — the concrete reasons the knight is worth giving.
    const clauses = sacrificeCompensation(fenAfter(OPERA), 'w', 60);
    expect(clauses.some((c) => /stuck in the cent/i.test(c))).toBe(true);
    expect(clauses.some((c) => /ahead in development/i.test(c))).toBe(true);
    // A winning eval (>=100) → the "already on top" verdict.
    const winning = sacrificeCompensation(fenAfter(OPERA), 'w', 250);
    expect(winning.some((c) => /already on top/i.test(c))).toBe(true);
  });

  it('emits no false compensation from the starting position (nothing is stuck)', () => {
    const clauses = sacrificeCompensation(new Chess().fen(), 'w', 0);
    expect(clauses.some((c) => /stuck in the cent/i.test(c))).toBe(false);
    expect(clauses.some((c) => /ahead in development/i.test(c))).toBe(false);
  });

  it('every clause is a plain string with no move/piece/square invented (G0 shape)', () => {
    const clauses = sacrificeCompensation(fenAfter(OPERA), 'w', 60);
    // The clauses never mention a specific SAN or "engine" (voice rules).
    for (const c of clauses) {
      expect(c).not.toMatch(/\bengine\b/i);
      expect(c).not.toMatch(/\b[NBRQK][a-h]?x?[a-h][1-8]\b/); // no SAN tokens
    }
  });
});
