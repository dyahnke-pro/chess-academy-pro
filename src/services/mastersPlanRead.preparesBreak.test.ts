// A move's job read off the masters' plan: 2.a3 in the Sicilian covers b4,
// the break masters push (David 2026-10-27 — the a3 said nothing).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { preparesBreakBeat, type MastersPlanRead } from './mastersPlanRead';

const fenAfter = (sans: string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};

const PLAN: MastersPlanRead = {
  games: 606,
  white: { san: 'b4', square: 'b4', from: 'b2', share: 0.56 },
  black: null,
  whitePiece: null, blackPiece: null, whiteCastle: null, blackCastle: null,
};

describe('preparesBreakBeat', () => {
  it('names the break the move covers, from each seat', () => {
    const before = fenAfter(['e4', 'c5']);
    expect(preparesBreakBeat(before, 'a3', PLAN, false))
      .toBe('They play a3 — it prepares b4: their pawn on a3 covers b4, and masters push b4 in 56% of their games from here.');
    expect(preparesBreakBeat(before, 'a3', PLAN, true))
      .toBe('You play a3 — it prepares b4: your pawn on a3 covers b4, and masters push b4 in 56% of their games from here.');
  });

  it('says nothing for a move that does not cover the break square', () => {
    expect(preparesBreakBeat(fenAfter(['e4', 'c5']), 'h3', PLAN, false)).toBeNull();
  });

  it('says nothing when the move IS the break, or there is no plan', () => {
    expect(preparesBreakBeat(fenAfter(['e4', 'c5']), 'b4', PLAN, false)).toBeNull();
    expect(preparesBreakBeat(fenAfter(['e4', 'c5']), 'a3', null, false)).toBeNull();
  });
});
