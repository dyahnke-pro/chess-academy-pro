import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { recordPuzzleMiss, PUZZLE_MISS_SEVERITY_CAP } from './puzzleMissService';
import { aggregatePuzzleMisses, PUZZLE_MISS_OPEN_MS, getUnifiedWeaknessProfile } from './weaknessSpine';

describe('puzzle misses — weaker evidence for the weakness spine', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('a missed puzzle is recorded with its motif', async () => {
    expect(await recordPuzzleMiss({ puzzleId: 'p1', themes: ['fork', 'middlegame'], fen: '8/8/8/8/8/8/8/K6k w - - 0 1', rating: 1400, surface: 'drill' })).toBe(true);
    const rows = await db.puzzleMisses.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].tacticType).toBe('fork');
  });

  it('folds into the SAME motif row as game misses, at lower severity', () => {
    const now = Date.now();
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, puzzleId: `p${i}`, tacticType: 'fork' as const, themes: ['fork'], fen: '', rating: 1500, surface: 'classic' as const, recordedAt: now - i * 1000 }));
    const [w] = aggregatePuzzleMisses(rows, now);
    expect(w.key).toBe('analysis:tactic:fork');
    expect(w.openCount).toBe(30);
    expect(w.severity).toBe(PUZZLE_MISS_SEVERITY_CAP); // capped below the game rows' 95
    expect(w.positions).toEqual([]);
    expect(w.gameIds).toEqual([]);
  });

  it('old misses stop being open; unmapped themes are dropped, never guessed', () => {
    const now = Date.now();
    const out = aggregatePuzzleMisses([
      { id: 'a', puzzleId: 'a', tacticType: 'pin', themes: ['pin'], fen: '', rating: 1200, surface: 'master', recordedAt: now - PUZZLE_MISS_OPEN_MS - 1 },
      { id: 'b', puzzleId: 'b', tacticType: null, themes: ['endgame'], fen: '', rating: 1200, surface: 'master', recordedAt: now },
    ], now);
    expect(out).toHaveLength(1);
    expect(out[0].openCount).toBe(0);
    expect(out[0].total).toBe(1);
  });

  it('reaches the unified weakness profile', async () => {
    await recordPuzzleMiss({ puzzleId: 'p1', themes: ['skewer'], fen: '', rating: 1500, surface: 'classic' });
    const profile = await getUnifiedWeaknessProfile();
    expect(profile.some((w) => w.key === 'analysis:tactic:skewer' && w.openCount === 1)).toBe(true);
  });
});
