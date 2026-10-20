import { describe, it, expect } from 'vitest';
import { routeVerb, routeNoun } from './routeWords';


describe('a piece not there yet (hard-question walk 2026-10-11)', () => {
  it('"take the rook when it arrives there" — no seat word (it is said of either side), never "take the rook that lands there"', () => {
    const s = routeVerb({ name: 'rook', path: ['d1', 'g1', 'g7'], takes: 'rook that lands' });
    expect(s).toBe('walk the rook on d1 round to g7, by way of g1, and take the rook when it arrives there');
    expect(routeNoun({ name: 'knight', path: ['f3', 'e5'], takes: 'pawn' })).toBe('getting the knight to e5, to take the pawn there');
  });
});
