// Walk 2026-10-04 #15: "Analyze 50 of 937 games" started a batch of 184. The
// label read the package CAP; the picker runs every home-opening game past it
// (A2). The label now reads the planned batch from the same picker.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { openingKeyFor } from './openingKey';

vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { id: 'main', name: 'S', preferences: { chessComUsername: 'student' } }, setBackgroundAnalysis: () => undefined }) },
}));
vi.mock('./homeOpeningService', () => ({
  getHomeOpenings: async () => ({ white: null, black: { family: 'Pirc Defense', key: 'b07-pirc-defense', games: 63, score: 0.49, source: 'computed', chosenAt: 0 } }),
}));

import { planAnalysisBatch, analyzeLabel, ANALYSIS_PACKAGE_SIZE } from './gameAnalysisService';

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const ITALIAN = openingKeyFor('C50', 'Italian Game');

describe('planAnalysisBatch + analyzeLabel', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('the label names the batch the run will actually take, past the cap', async () => {
    const home = ANALYSIS_PACKAGE_SIZE + 30;
    await db.games.bulkAdd([
      ...Array.from({ length: home }, (_, i) => buildGameRecord({ id: `p${i}`, openingId: PIRC, white: 'opp', black: 'student', result: '0-1', annotations: null })),
      ...Array.from({ length: 100 }, (_, i) => buildGameRecord({ id: `o${i}`, openingId: ITALIAN, white: 'student', black: 'opp', result: '1-0', annotations: null })),
    ]);
    const plan = await planAnalysisBatch();
    expect(plan.waiting).toBe(home + 100);
    expect(plan.batch).toBe(home);
    expect(plan.homeCount).toBe(home);
    // The old label said `Analyze ${ANALYSIS_PACKAGE_SIZE} of …`.
    expect(analyzeLabel('Analyze', plan.batch, plan.waiting)).toBe(`Analyze ${home} of ${home + 100} games`);
  });

  it('one tap that clears everything just names the count', () => {
    expect(analyzeLabel('Analyze', 12, 12)).toBe('Analyze 12 games');
    expect(analyzeLabel('Analyze', 1, 1)).toBe('Analyze 1 game');
    expect(analyzeLabel('Analyze', 50, 831)).toBe('Analyze 50 of 831 games');
  });

  it('nothing waiting → an empty plan', async () => {
    expect(await planAnalysisBatch()).toEqual({ waiting: 0, batch: 0, homeCount: 0 });
  });
});
