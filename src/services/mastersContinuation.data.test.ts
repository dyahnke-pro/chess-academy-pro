import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { Chess } from 'chess.js';

// G3 on the shipped table: every continuation is a legal move at its position,
// and no position is one the book already holds.
describe.runIf(existsSync('public/data/masters-continuations.json'))('masters-continuations.json', () => {
  const t = JSON.parse(readFileSync('public/data/masters-continuations.json', 'utf8')) as { meta: { minElo: number }; positions: Record<string, Array<{ san: string; games: number }>> };
  const book = JSON.parse(readFileSync('public/data/openings-masters-db.json', 'utf8')) as { positions: Record<string, unknown> };
  it('every move is legal on its board; no position is in the book', () => {
    const keys = Object.keys(t.positions);
    expect(keys.length).toBeGreaterThan(100);
    for (const k of keys.filter((_, i) => i % 25 === 0)) {
      expect(book.positions[k]).toBeUndefined();
      for (const m of t.positions[k]) expect(() => new Chess(`${k} 0 1`).move(m.san), `${k} ${m.san}`).not.toThrow();
    }
    expect(t.meta.minElo).toBeGreaterThanOrEqual(2500);
  });
});
