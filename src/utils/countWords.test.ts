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
      if (/>=\s*\d+\s*\?\s*'(a piece|a rook|the queen|the exchange[^']*)'/.test(src)) bad.push(f);
    }
    expect(bad).toEqual([]);
  });
});
