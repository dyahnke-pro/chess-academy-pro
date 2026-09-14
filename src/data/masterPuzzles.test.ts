import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Chess } from 'chess.js';

/**
 * Master Level pool integrity (docs/plans/2026-09-14-adaptive-reach-ladder.md P3).
 * The elite CC0 pool is pulled by scripts/build-master-puzzles.mjs from the
 * Lichess public DB into public/data/master-puzzles.json (lazy-fetched, NOT
 * bundled). This gate proves it stays CC0-shaped, elite, legal, and multi-move-
 * favored so the Master ladder always has real material.
 */
interface MasterPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  openingTags: string | null;
  popularity: number;
  nbPlays: number;
}

const MULTI_MOVE = new Set(['long', 'veryLong', 'mateIn2', 'mateIn3', 'mateIn4', 'mateIn5']);

const pool: MasterPuzzle[] = JSON.parse(
  readFileSync(resolve(__dirname, '../../public/data/master-puzzles.json'), 'utf8'),
) as MasterPuzzle[];

describe('master-puzzles.json integrity', () => {
  it('has a substantial pool', () => {
    expect(pool.length).toBeGreaterThanOrEqual(2000);
  });

  it('every puzzle is elite (rating >= 2400) and within the pool ceiling', () => {
    for (const p of pool) {
      expect(p.rating).toBeGreaterThanOrEqual(2400);
      expect(p.rating).toBeLessThanOrEqual(3200);
    }
  });

  it('FAVORS multi-move sequences (>= 60% carry a long/veryLong/mateIn2+ theme)', () => {
    const multi = pool.filter((p) => p.themes.some((t) => MULTI_MOVE.has(t))).length;
    expect(multi / pool.length).toBeGreaterThanOrEqual(0.6);
  });

  it('represents the top of the elite band (some >= 2700)', () => {
    expect(pool.filter((p) => p.rating >= 2700).length).toBeGreaterThan(100);
  });

  it('has unique ids and the required shape', () => {
    const ids = new Set(pool.map((p) => p.id));
    expect(ids.size).toBe(pool.length);
    for (const p of pool.slice(0, 200)) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.fen).toBe('string');
      expect(p.moves.length).toBeGreaterThan(0);
      expect(Array.isArray(p.themes)).toBe(true);
    }
  });

  it("every sampled puzzle's first move is legal from its FEN (chess.js)", () => {
    // Lichess convention: the FEN is the position before the opponent's setup
    // move; the first UCI move must be legal from it.
    let checked = 0;
    for (let i = 0; i < pool.length; i += 25) {
      const p = pool[i];
      const uci = p.moves.split(' ')[0];
      const c = new Chess(p.fen);
      const move = c.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.slice(4) || undefined,
      });
      expect(move, `illegal first move ${uci} in ${p.id} (${p.fen})`).not.toBeNull();
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
  });
});
