// Why this road and not the other — on REAL master counts (the live-explorer
// fixture built by scripts/build-opening-story-fixture.mjs).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { roadReason, deniedSquares, mainReplyLine } from './openingRoads';
import type { MovesAt } from './mastersPlanRead';
import type { LocalDbMove } from './masterPlayLookup';

const fixture = JSON.parse(readFileSync('src/services/__fixtures__/opening-story-masters.json', 'utf8')) as { positions: Record<string, LocalDbMove[]> };
const movesAt: MovesAt = (fen) => fixture.positions[fen.split(' ').slice(0, 4).join(' ')] ?? null;
const FORK = 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3'.split(' ');
const fenOf = (sans: readonly string[]): string => { const c = new Chess(); sans.forEach((m) => c.move(m)); return c.fen(); };

describe('roadReason — what each road allows', () => {
  it('the Najdorf over the Classical: what …a6 takes away, and how masters meet the other road', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', altSan: 'Nc6', altName: 'Sicilian Defense: Classical Variation', student: 'b', movesAt })?.text)
      .toBe('…a6 takes b5 away from their knights on d4 and c3, and their bishop on f1. The other main road, the Classical, is mostly met by the Richter-Rauzer, with Bg5.');
  });
  it('a score gap of under three points is not said (Najdorf 47.4 vs Classical 47.1)', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', altSan: 'Nc6', altName: 'Sicilian Defense: Classical Variation', student: 'b', movesAt })?.text).not.toMatch(/master games/);
  });
  it('a real score gap closes the reason (Najdorf 47.4 vs Dragon 41.9 for Black)', () => {
    expect(roadReason({ prefix: FORK, chosenSan: 'a6', altSan: 'g6', altName: 'Sicilian Defense: Dragon Variation', student: 'b', movesAt })?.text)
      .toMatch(/In master games your road has held up better\.$/);
  });
  it('the alternative\'s reply is dropped when masters answer the chosen move the same way (both 2…d6 and 2…Nc6 meet d4)', () => {
    const r = roadReason({ prefix: ['e4', 'c5', 'Nf3'], chosenSan: 'd6', altSan: 'Nc6', altName: 'Sicilian Defense: Old Sicilian', student: 'b', movesAt });
    expect(r?.text).toBe('…d6 takes e5 away from their knight on f3.');
  });
  it('no reason computed → null, never filler or a bare score', () => {
    // …e6 takes away no square a piece of theirs could use, and with no masters
    // data the alternative's answer is unknown: nothing is said.
    expect(roadReason({ prefix: ['e4', 'c5', 'Nf3'], chosenSan: 'e6', altSan: 'Qa5', altName: 'Sicilian Defense', student: 'b', movesAt: () => null })).toBeNull();
  });
});

describe('the pieces', () => {
  it('only a pawn move takes squares away', () => {
    expect(deniedSquares(fenOf(FORK), 'a6', 'b').map((d) => d.square)).toEqual(['b5']);
    expect(deniedSquares(fenOf(FORK), 'Nc6', 'b')).toEqual([]);
  });
  it('a square another pawn already covers is not "taken away" (French …c6: d5 is the e6 pawn\'s already)', () => {
    expect(deniedSquares(fenOf(['e4', 'e6', 'd4', 'd5', 'Nc3']), 'c6', 'b').map((d) => d.square)).toEqual(['b5']);
  });
  it('the main reply must be a real share and open a NEW named line', () => {
    expect(mainReplyLine([...FORK, 'Nc6'], movesAt)?.san).toBe('Bg5');
  });
});
