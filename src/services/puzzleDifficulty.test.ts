import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { difficultyFeatures, estimatePuzzleRating, ratingFromFeatures } from './puzzleDifficulty';

const FORK_SOLVER = (() => { const c = new Chess('r3k3/1p6/4N3/8/8/8/8/4K3 b - - 0 1'); c.move('b5'); return c.fen(); })();

describe('puzzleDifficulty — computed features', () => {
  it('reads depth, forcing-ness and endgame off the board', () => {
    const f = difficultyFeatures(FORK_SOLVER, ['e6c7', 'e8d8', 'c7a8'], null, null);
    expect(f.solverPlies).toBe(2);
    expect(f.quietFirst).toBe(false); // Nc7+ is a check
    expect(f.allForcing).toBe(true);  // Nc7+, Nxa8 — check then capture
    expect(f.endgame).toBe(true);
    expect(f.sacrificeFirst).toBe(false);
  });

  it('a quiet first move and a sacrifice are recognised', () => {
    // Quiet: 1.e4 from the start position.
    const q = difficultyFeatures(new Chess().fen(), ['e2e4'], null, null);
    expect(q.quietFirst).toBe(true);
    // Sacrifice: Bxf7+ from the Italian shape — the bishop lands where the king takes it.
    const c = new Chess();
    for (const m of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']) c.move(m);
    const s = difficultyFeatures(c.fen(), ['c4f7'], null, null);
    expect(s.sacrificeFirst).toBe(true);
  });

  it('rating grows with depth, quietness, sacrifice and concept rarity; clamps to 600–3000', () => {
    const base = { solverPlies: 1, quietFirst: false, sacrificeFirst: false, allForcing: true, endgame: false, mateIn: null, conceptId: 'fork' };
    const r1 = ratingFromFeatures(base, 'tactic');
    const r2 = ratingFromFeatures({ ...base, solverPlies: 3 }, 'tactic');
    const r3 = ratingFromFeatures({ ...base, solverPlies: 3, quietFirst: true, allForcing: false }, 'tactic');
    const r4 = ratingFromFeatures({ ...base, solverPlies: 4, quietFirst: true, allForcing: false, sacrificeFirst: true, conceptId: 'lucena', endgame: true }, 'technique');
    expect(r1).toBeLessThan(r2);
    expect(r2).toBeLessThan(r3);
    expect(r3).toBeLessThan(r4);
    expect(r1).toBeGreaterThanOrEqual(600);
    expect(r4).toBeLessThanOrEqual(3000);
  });

  it('estimatePuzzleRating never throws on a bad line', () => {
    expect(estimatePuzzleRating('not a fen', ['zzzz'], null).rating).toBeGreaterThanOrEqual(600);
  });
});
