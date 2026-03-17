import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { getCachedAnalysis, saveCachedAnalysis, clearAnalysisCache } from './reviewAnalysisCache';
import type { AnalysisCacheEntry, CoachGameMove } from '../types';

function buildMove(overrides: Partial<CoachGameMove> = {}): CoachGameMove {
  return {
    moveNumber: 1,
    san: 'e4',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    isCoachMove: false,
    commentary: '',
    evaluation: 30,
    classification: 'good',
    expanded: false,
    bestMove: 'e2e4',
    bestMoveEval: 30,
    preMoveEval: 0,
    ...overrides,
  };
}

function buildEntry(overrides: Partial<AnalysisCacheEntry> = {}): AnalysisCacheEntry {
  return {
    gameId: 'game-1',
    moves: [buildMove()],
    depth: 18,
    analyzedAt: '2026-03-16T00:00:00.000Z',
    ...overrides,
  };
}

describe('reviewAnalysisCache', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('returns undefined for missing entries', async () => {
    const result = await getCachedAnalysis('nonexistent');
    expect(result).toBeUndefined();
  });

  it('saves and retrieves an analysis cache entry', async () => {
    const entry = buildEntry();
    await saveCachedAnalysis(entry);

    const result = await getCachedAnalysis('game-1');
    expect(result).toBeDefined();
    expect(result?.gameId).toBe('game-1');
    expect(result?.moves).toHaveLength(1);
    expect(result?.moves[0].san).toBe('e4');
    expect(result?.depth).toBe(18);
  });

  it('overwrites existing entries with same gameId', async () => {
    await saveCachedAnalysis(buildEntry({ depth: 12 }));
    await saveCachedAnalysis(buildEntry({ depth: 20 }));

    const result = await getCachedAnalysis('game-1');
    expect(result?.depth).toBe(20);
  });

  it('clears a specific entry by gameId', async () => {
    await saveCachedAnalysis(buildEntry({ gameId: 'game-1' }));
    await saveCachedAnalysis(buildEntry({ gameId: 'game-2' }));

    await clearAnalysisCache('game-1');

    expect(await getCachedAnalysis('game-1')).toBeUndefined();
    expect(await getCachedAnalysis('game-2')).toBeDefined();
  });

  it('clears all entries when no gameId provided', async () => {
    await saveCachedAnalysis(buildEntry({ gameId: 'game-1' }));
    await saveCachedAnalysis(buildEntry({ gameId: 'game-2' }));

    await clearAnalysisCache();

    expect(await getCachedAnalysis('game-1')).toBeUndefined();
    expect(await getCachedAnalysis('game-2')).toBeUndefined();
  });

  it('preserves hintShown data in cached moves', async () => {
    const moveWithHint = buildMove({
      hintShown: {
        moveIndex: 5,
        level: 2,
        nudgeText: 'Look for a fork!',
        arrowSquares: ['e4d5'],
      },
    });
    await saveCachedAnalysis(buildEntry({ moves: [moveWithHint] }));

    const result = await getCachedAnalysis('game-1');
    expect(result?.moves[0].hintShown).toEqual({
      moveIndex: 5,
      level: 2,
      nudgeText: 'Look for a fork!',
      arrowSquares: ['e4d5'],
    });
  });
});
