import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { formationChoice } from './pawnJudgement';

// The formation half "choosing between pawn moves" (missed computers, 2026-10-08).
const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };

describe('formationChoice', () => {
  const fen = fenAfter(['e4', 'a6', 'd3', 'a5']); // White: e4 + d3; c4 would not chain, f4 would not chain
  it('names the engine pawn move that builds a formation when the played one built nothing', () => {
    const g = fenAfter(['d3', 'a6', 'f3', 'a5']); // e4 would make the d3-e4-f3 triangle
    const r = formationChoice(g, 'h3', 'w', 'e4', 80, 'h3');
    // The pawns it joins by their files; d3, e4 and f3 lit, not read out.
    expect(r?.text).toBe('Of the pawn moves, e4 was the one: it makes a pawn triangle with your d- and f-pawns, and h3 links no pawns.');
  });
  it('held, it names a pawn shape, never a bare "triangle" (prod Learn audit 2026-11-09)', () => {
    const g = fenAfter(['d3', 'a6', 'f3', 'a5']);
    expect(formationChoice(g, 'h3', 'w', 'e4', 80, 'h3')?.heldForm?.text).toBe('h3 links no pawns. Another pawn move would make a pawn triangle.');
  });
  it('silent when the choice cost nothing', () => {
    expect(formationChoice(fen, 'h3', 'w', 'c4', 0, 'h3')).toBeNull();
  });
  it('silent when the played move builds a formation too', () => {
    const g = fenAfter(['d3', 'a6', 'f3', 'a5']);
    expect(formationChoice(g, 'e4', 'w', 'h3', 80, 'e4')).toBeNull();
  });
});
