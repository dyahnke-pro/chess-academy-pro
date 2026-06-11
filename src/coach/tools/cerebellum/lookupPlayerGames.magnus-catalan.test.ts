import { describe, it, expect } from 'vitest';
import { lookupPlayerGamesTool } from './lookupPlayerGames';

/**
 * Regression for the David 2026-06-11 "show me a game that magnus played
 * the catalan" bug. Carlsen's Catalan wins live in the reference set under
 * openingId "queens-pawn" with variationLabel "Catalan g3" (he WIELDS it).
 * Asking by the name "magnus" + "Catalan Opening" MUST surface those games
 * — and MUST exclude the "vs Catalan g3" games where he FACED it.
 */
describe('lookup_player_games — Magnus Catalan', () => {
  it('returns Carlsen WIELDING the Catalan when asked by name', async () => {
    const res = await lookupPlayerGamesTool.execute({
      player: 'magnus',
      openingName: 'Catalan Opening',
      limit: 6,
    });
    expect(res.ok).toBe(true);
    const games = (res.result as { games: Array<{ studentSide: string; variationLabel: string; result: string }> }).games;
    expect(games.length).toBeGreaterThan(0);
    // He wields the Catalan with White — never the games where he faced it.
    for (const g of games) {
      expect(g.studentSide).toBe('white');
      expect(g.variationLabel.toLowerCase()).not.toMatch(/^vs\b/);
    }
  });

  it('resolves "carlsen" too (the app player id)', async () => {
    const res = await lookupPlayerGamesTool.execute({
      player: 'carlsen',
      openingName: 'Catalan',
      limit: 6,
    });
    const games = (res.result as { games: unknown[] }).games;
    expect(games.length).toBeGreaterThan(0);
  });
});
