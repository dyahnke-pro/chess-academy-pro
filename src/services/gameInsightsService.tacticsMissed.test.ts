import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';

// Regression (David 2026-09-09, live): the /weaknesses Tactics tab showed
// "100% tactical awareness / 0 missed" on a device with 933 analyzed games,
// because getTacticInsights read the classifiedTactics CACHE — only written at
// analyze-time and never backfilled, so games analyzed before the classifier was
// wired counted 0 missed. The fix derives missed tactics LIVE from each game's
// annotations via deriveMissedTacticsForGame. This test proves the tab reports
// missed tactics even when the classifiedTactics store is EMPTY.
vi.mock('./tacticClassifierService', async (orig) => {
  const actual = await orig<typeof import('./tacticClassifierService')>();
  return {
    ...actual,
    deriveMissedTacticsForGame: vi.fn(() => [
      {
        id: 'ct-live-1', sourceGameId: 'g1', moveIndex: 12,
        fen: '8/8/8/8/8/8/8/8 w - - 0 1', bestMoveUci: 'd1d5', bestMoveSan: 'Qxd5',
        playerMoveUci: '', playerMoveSan: 'Ke2', playerColor: 'white' as const,
        tacticType: 'fork' as const, evalSwing: 320,
        explanation: 'Missed fork', opponentName: 'foe', gameDate: '2026-01-01',
        openingName: 'Test', puzzleAttempts: 0, puzzleSuccesses: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ]),
  };
});

describe('getTacticInsights derives missed tactics live (empty classifiedTactics cache)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', name: 'hero', preferences: { chessComUsername: 'hero' } }));
  });

  it('reports missed tactics + a sub-100% awareness rate with an EMPTY cache', { timeout: 20000 }, async () => {
    // Empty classifiedTactics store — the old code path would show 0 missed / 100%.
    expect(await db.classifiedTactics.count()).toBe(0);
    await db.games.put(buildGameRecord({
      id: 'g1', white: 'hero', black: 'foe', result: '1-0',
      pgn: '1. e4 e5 2. Nf3 Nc6 1-0',
      annotations: [
        { moveNumber: 1, san: 'e4', color: 'white', classification: 'good', evaluation: 0.2 },
      ] as never,
    }));

    const { getTacticInsights } = await import('./gameInsightsService');
    const insights = await getTacticInsights();
    expect(insights.foundVsMissed.missed).toBe(1);       // came from the live helper, not the cache
    expect(insights.awarenessRate).toBeLessThan(100);    // no longer a false 100%
    const fork = insights.missedByType.find((t) => t.type === 'fork');
    expect(fork?.count).toBe(1);
    expect(insights.worstMisses.length).toBeGreaterThan(0);
    expect(insights.worstMisses[0].san).toBe('Ke2');     // carried through from the derived tactic
  });
});
