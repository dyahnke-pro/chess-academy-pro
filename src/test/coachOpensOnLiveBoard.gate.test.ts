// THE COACH OPENS ON THE LIVE BOARD (prod audit 2026-10-14): a second game in
// the same Learn mount froze at the start. `startOpeningPlay` reset the board
// and then checked the render-stable `history`, which still held game one's
// moves in that tick, so White never moved. Both openers (a named opening and
// "take a seat") compare the LIVE fen to the board the game started on.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
const body = (name: string): string => {
  const i = src.indexOf(`const ${name} = useCallback(`);
  expect(i, name).toBeGreaterThan(0);
  return src.slice(i, src.indexOf('}, [', i));
};

describe('the coach opens on the live board, never the render-stable history', () => {
  for (const fn of ['startOpeningPlay', 'takeSeat']) {
    it(fn, () => {
      const b = body(fn);
      expect(b).toMatch(/const startedOn = gameRef\.current\.fen;/);
      expect(b).toMatch(/gameRef\.current\.fen === startedOn/);
      expect(b.slice(b.indexOf('const startedOn'))).not.toMatch(/history\.length === 0/);
    });
  }
});

describe('a new game forgets the said-once definitions too (second-game audit 2026-10-14)', () => {
  it('resetPerGameMemory renews the game\'s story through the one door', () => {
    const i = src.indexOf('const resetPerGameMemory = useCallback(');
    const b = src.slice(i, src.indexOf('}, []);', i));
    expect(b).toMatch(/learnMemRef\.current\.newGame\(\);/);
    // The definitions are the story's, and the memory's newGame renews it.
    const mem = readFileSync('src/services/learnMemory.ts', 'utf8');
    const ng = mem.indexOf('newGame(): void {');
    expect(mem.slice(ng, mem.indexOf('\n    },', ng))).toContain('story.newGame(mintGameId())');
  });
});
