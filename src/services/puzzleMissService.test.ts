import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { recordPuzzleMiss, PUZZLE_MISS_SEVERITY_CAP, puzzleMisconceptionTag, logPuzzleMisconception } from './puzzleMissService';

describe('a failed puzzle reaches the misconception bucket at once', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('maps through the existing joins: tactic motif → missed-tactic, defensive → missed threat', () => {
    expect(puzzleMisconceptionTag(['crushing', 'fork', 'middlegame'])).toBe('missed-tactic');
    expect(puzzleMisconceptionTag(['defensiveMove', 'endgame'])).toBe('missed-opponents-threat');
    expect(puzzleMisconceptionTag(['endgame', 'rookEndgame', 'crushing'])).toBeNull(); // no tag describes it — skip
  });

  it('logs a display row, source puzzle, never double-counting the spine', async () => {
    const fen = '7R/1p4r1/1kp1P3/1p4p1/1q3nBp/2Q2N1P/1P3PP1/6K1 b - - 4 33';
    expect(await logPuzzleMisconception({ puzzleId: '0CCT1', themes: ['fork', 'middlegame'], fen, bestSan: 'Ne2+' })).toBe(true);
    const rows = await db.misconceptionTags.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tag: 'missed-tactic', source: 'puzzle', fen, bestSan: 'Ne2+', counted: false });
  });

  it('skips a puzzle with no mapping', async () => {
    expect(await logPuzzleMisconception({ puzzleId: 'x', themes: ['endgame'], fen: '8/8/8/8/8/8/8/K6k w - - 0 1', bestSan: null })).toBe(false);
    expect(await db.misconceptionTags.count()).toBe(0);
  });
});
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
