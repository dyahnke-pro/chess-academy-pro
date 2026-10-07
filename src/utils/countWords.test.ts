import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { countWords } from './countWords';

describe('material by count alone', () => {
  it('names only what a count can prove', () => {
    expect(countWords(1)).toBe('a pawn');
    expect(countWords(2)).toBe('two pawns');
    expect(countWords(3)).toBe('3 points');
    expect(countWords(4, { unit: true })).toBe('4 points of material');
  });

  // GATE: a point count may not pick a piece's name (clean-pass walk
  // VRUh4Qgh: "a piece up" for the exchange and a pawn). The ternary shape
  // `>= 3 ? 'a piece'` is how each site did it; none may come back.
  it('no service names a piece from a point threshold', () => {
    const dir = join(__dirname, '../services');
    const bad: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
      const src = readFileSync(join(dir, f), 'utf8');
      if (/>=\s*\d+\s*(\?|\)\s*return)\s*'(up )?(a piece|a rook|a queen|the queen|the exchange[^']*)'/.test(src)) bad.push(f);
      // …and the template form (narratedContinuation, 2026-10-07: `if (m >= 3)
      // return \`${side} is up a piece.\``) that dodged the quote above.
      if (/>=\s*\d+\s*\)\s*return\s*`[^`]*\b(up a piece|a rook's worth|a whole queen|up the exchange)/.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});

describe('boardEdgeWords — the one board namer', () => {
  it('names a piece only when the board shows that piece', async () => {
    const { boardEdgeWords } = await import('./countWords');
    expect(boardEdgeWords('4k3/8/8/8/8/8/8/3NK3 w - - 0 1', 'w', 3)).toBe('a piece');
    expect(boardEdgeWords('3bk3/8/8/8/8/8/P7/R3K3 w - - 0 1', 'w', 3)).toBe('the exchange and a pawn');
    expect(boardEdgeWords('4k3/7p/8/8/8/8/8/1N1NK3 w - - 0 1', 'w', 5)).toBe('5 points');
    expect(boardEdgeWords('r3k3/8/8/8/8/8/8/3QK3 w - - 0 1', 'w', 4)).toBe('4 points');
    expect(boardEdgeWords('4k3/8/8/8/8/8/PPP5/4K3 w - - 0 1', 'w', 3)).toBe('three pawns');
    // A settled lead the board does not show yet is said by count.
    expect(boardEdgeWords('4k3/8/8/8/8/8/8/4K3 w - - 0 1', 'w', 3)).toBe('3 points');
    expect(boardEdgeWords('4k3/8/8/3n4/8/8/8/4K3 w - - 0 1', 'b', 3)).toBe('a piece');
  });
});

describe('routeWords — the one route phraser', () => {
  it('renders noun and verb forms from data, cut at first arrival', async () => {
    const { routeNoun, routeVerb, routeWaypoints } = await import('./routeWords');
    expect(routeWaypoints(['g8', 'f6', 'g4', 'f2', 'g4'])).toEqual(['f6']);
    expect(routeNoun({ name: 'knight', path: ['b1', 'd2', 'f3', 'e5'] })).toBe('getting the knight to e5, by way of d2 and f3');
    expect(routeNoun({ name: 'knight', path: ['c6', 'b4', 'a2'], takes: 'pawn' })).toBe('getting the knight to a2, by way of b4, to take the pawn there');
    expect(routeVerb({ name: 'bishop', path: ['f4', 'e5', 'c7'] })).toBe('walk the bishop on f4 round to c7, by way of e5');
  });

  // GATE: no reader parses a route back out of its own sentence.
  it('no service regex-parses route prose', () => {
    const dir = join(__dirname, '../services');
    const bad: string[] = [];
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue;
      const src = readFileSync(join(dir, f), 'utf8');
      if (/\/\^?(walk the |getting the \(|.*by way of)/.test(src.replace(/^\s*(\/\/|\*).*$/gm, ''))) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});
