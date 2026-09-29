import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildUserProfile, buildGameRecord } from '../test/factories';

// 🔒 THE WEAKNESSES FREEZE (2026-09-29). getTacticInsights ran the tactic
// classifier over every mistake of every analysed game, synchronously, on every
// open of /weaknesses — thousands of calls on a ~930-game library, and the app
// froze on a phone. It now READS the classifiedTactics cache (filled in the
// background by backfillClassifiedTactics) and must never classify inline.
//
// The earlier regression this file held (David 2026-09-09: an EMPTY cache read
// as "0 missed / 100% awareness") stays closed a different way: games not yet
// in the cache are COUNTED as pending, so a partial number is labelled partial.
const detect = vi.fn(() => 'fork' as const);
vi.mock('./missedTacticService', async (orig) => {
  const actual = await orig<typeof import('./missedTacticService')>();
  return { ...actual, detectTacticType: (...a: unknown[]) => (detect as unknown as (...x: unknown[]) => string)(...a) };
});

const ANN = [
  { moveNumber: 1, san: 'e4', color: 'white', classification: 'mistake', evaluation: -200, bestMove: 'd2d4' },
] as never;

describe('getTacticInsights reads the cache and never classifies inline', () => {
  beforeEach(async () => {
    detect.mockClear();
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', name: 'hero', preferences: { chessComUsername: 'hero' } }));
  });

  it('reports cached missed tactics and counts unclassified games as pending', { timeout: 20000 }, async () => {
    await db.games.bulkPut([
      buildGameRecord({ id: 'g1', white: 'hero', black: 'foe', result: '1-0', pgn: '1. e4 e5 1-0', annotations: ANN, tacticsClassified: true }),
      buildGameRecord({ id: 'g2', white: 'hero', black: 'foe', result: '1-0', pgn: '1. e4 e5 1-0', annotations: ANN }),
    ]);
    await db.classifiedTactics.put({
      id: 'ct-g1-12', sourceGameId: 'g1', moveIndex: 12,
      fen: '8/8/8/8/8/8/8/8 w - - 0 1', bestMoveUci: 'd1d5', bestMoveSan: 'Qxd5',
      playerMoveUci: '', playerMoveSan: 'Ke2', playerColor: 'white',
      tacticType: 'fork', evalSwing: 320,
      explanation: 'Missed fork', opponentName: 'foe', gameDate: '2026-01-01',
      openingName: 'Test', puzzleAttempts: 0, puzzleSuccesses: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const { getTacticInsights } = await import('./gameInsightsService');
    const insights = await getTacticInsights();
    expect(detect).not.toHaveBeenCalled();                // the freeze: zero classifier calls on read
    expect(insights.foundVsMissed.missed).toBe(1);
    expect(insights.awarenessRate).toBeLessThan(100);
    expect(insights.worstMisses[0].san).toBe('Ke2');
    expect(insights.gamesPendingClassification).toBe(1); // g2 is not in the cache yet — said, not hidden
  });
});
