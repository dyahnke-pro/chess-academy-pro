// 🔒 THE LIBRARY IS NEVER HELD WHOLE (2026-11-26). /weaknesses got an App Store
// user's web view killed on every open: the page, its analyse button and the
// readers under them each ran `db.games…toArray()`, so a phone held several
// whole copies of a big library at once (measured on 1,000 analysed games:
// +742 MB of JS heap on open). Every reader /weaknesses starts now walks the
// library through `scanGames`, a page of full records at a time. This test
// fails on the old code: the readers called `db.games.filter` / `toArray`
// straight off the table and held every row in one array.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';

vi.mock('../stores/appStore', () => ({
  useAppStore: {
    getState: () => ({
      activeProfile: { id: 'main', name: 'student', currentRating: 1200, puzzleRating: 1200, preferences: { chessComUsername: 'student' } },
      setBackgroundAnalysis: () => undefined,
      setActiveProfile: () => undefined,
    }),
  },
}));

import { SCAN_PAGE_SIZE } from './gameScan';
import { getOverviewInsights, getOpeningInsights, getMistakeInsights, getTacticInsights, getAnalysisCounts } from './gameInsightsService';
import { planAnalysisBatch } from './gameAnalysisService';
import { getHomeOpeningRankings, __resetHomeOpeningCacheForTests } from './homeOpeningService';
import { getUnifiedWeaknessProfile } from './weaknessSpine';

const GAMES = SCAN_PAGE_SIZE * 4 + 7;

function seedGames(): Promise<unknown> {
  return db.games.bulkAdd(Array.from({ length: GAMES }, (_, i) => buildGameRecord({
    id: `g${i}`, white: i % 2 ? 'student' : `opp${i}`, black: i % 2 ? `opp${i}` : 'student',
    result: i % 3 === 0 ? '1-0' : '0-1', date: `2026-0${1 + (i % 9)}-1${i % 9}`,
    // Half imported and waiting, half analysed — both kinds the page reads.
    annotations: i % 2 ? null : [
      { moveNumber: 1, color: 'white', san: 'e4', evaluation: 30, bestMove: null, bestMoveEval: 30, classification: 'good', comment: null },
      { moveNumber: 1, color: 'black', san: 'e5', evaluation: 25, bestMove: null, bestMoveEval: 25, classification: 'good', comment: null },
    ],
    fullyAnalyzed: i % 2 === 0,
    isMasterGame: false,
  })));
}

describe('what /weaknesses reads on open holds one page of games, never the library', () => {
  beforeEach(async () => {
    await db.delete(); await db.open();
    await db.profiles.put({ id: 'main', name: 'student', preferences: { chessComUsername: 'student' } } as never);
    await seedGames();
    __resetHomeOpeningCacheForTests();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('no reader materialises the games table, and no page holds more than SCAN_PAGE_SIZE records', async () => {
    const whole = [vi.spyOn(db.games, 'toArray'), vi.spyOn(db.games, 'filter'), vi.spyOn(db.games, 'orderBy')];
    const pages = vi.spyOn(db.games, 'bulkGet');
    const [overview, , , , counts, plan] = await Promise.all([
      getOverviewInsights(), getOpeningInsights(), getMistakeInsights(), getTacticInsights(),
      getAnalysisCounts(), planAnalysisBatch(), getHomeOpeningRankings({ force: true }), getUnifiedWeaknessProfile(),
    ]);
    for (const spy of whole) expect(spy).not.toHaveBeenCalled();
    // Every game was still read — a scan that read nothing would also hold nothing.
    expect(overview.totalGames).toBe(GAMES);
    expect(counts.totalGames).toBe(GAMES);
    expect(plan.waiting).toBeGreaterThan(0);
    const sizes = pages.mock.calls.map((c) => (c[0] as unknown[]).length);
    expect(sizes.length).toBeGreaterThan(0);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(SCAN_PAGE_SIZE);
  });
});
