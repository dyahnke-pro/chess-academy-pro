// The course engine's read is a function of the position (WO-COURSE-01 D): the
// same board searched fresh and searched after other searches — a restricted
// one included — gives the same move and the same score. Before the clear, the
// hash a run left behind decided later moves (…f6?? for …Nd7 after 505 lines).
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { Chess } from 'chess.js';
import { Engine, ENGINE_PATH } from './engine.mjs';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const NE5 = fenAfter(['e4', 'c6', 'Nf3', 'd5', 'd4', 'dxe4', 'Ne5']);

describe.runIf(existsSync(ENGINE_PATH))('engine reads do not depend on what was searched before', () => {
  it('a board read after other searches reads as it does fresh', async () => {
    const fresh = new Engine();
    const used = new Engine();
    try {
      const clean = await fresh.analyse(NE5, { depth: 12 });
      await used.analyse(fenAfter(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5']), { depth: 12 });
      await used.analyse(NE5, { depth: 12, searchmoves: ['f7f6'] });
      await used.analyse(fenAfter(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']), { depth: 12, searchmoves: ['h7h6'] });
      const after = await used.analyse(NE5, { depth: 12 });
      expect(after).toEqual(clean);
      expect(clean.best).toBe('b8d7');
    } finally {
      fresh.quit();
      used.quit();
    }
  }, 120_000);
});
