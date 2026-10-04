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
