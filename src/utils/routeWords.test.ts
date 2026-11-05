import { describe, it, expect } from 'vitest';
import { routeVerb, routeNoun, routeOnward } from './routeWords';


describe('a piece not there yet (hard-question walk 2026-10-11)', () => {
  it('"take the rook when it arrives there" — no seat word (it is said of either side), never "take the rook that lands there"', () => {
    const s = routeVerb({ name: 'rook', path: ['d1', 'g1', 'g7'], takes: 'rook that lands' });
    expect(s).toBe('walk the rook on d1 round to g7, by way of g1, and take the rook when it arrives there');
    expect(routeNoun({ name: 'knight', path: ['f3', 'e5'], takes: 'pawn' })).toBe('getting the knight to e5, to take the pawn there');
  });
});

describe('routeOnward — the rest of a route after the move that named it', () => {
  it('says neither the piece nor a square the move already said (David 2026-11-05)', () => {
    // "The stronger move was Qg3 — it would walk the queen on f4 round to c3,
    // by way of g3" read the move's own square back out.
    expect(routeOnward({ name: 'queen', path: ['g3', 'c3'], takes: 'pawn' })).toBe('head on to c3, and take the pawn there');
    expect(routeOnward({ name: 'bishop', path: ['e6', 'c4', 'd3'] })).toBe('head on to d3, by way of c4');
  });
});
