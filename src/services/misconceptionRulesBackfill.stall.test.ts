import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord } from '../test/factories';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';

// David's phone, 2026-10-20 ("Still not filled in!"): the one-price revision
// put all 344 analysed games behind an engine re-price, and each game's
// board-only record waited behind it — on a phone engine that stalls, so the
// heat map never filled. The board pass must finish with the engine silent.
vi.mock('./refutedAlternative', () => {
  const stall = (): Promise<never> => new Promise(() => undefined);
  return { SINGLETON_SCORER: new Proxy({}, { get: () => stall }), BACKGROUND_SCORER: new Proxy({}, { get: () => stall }) };
});

describe('the skill record fills before the engine re-price', () => {
  // The pass imports the classifier and the record writers on first use; load
  // them here, so the timeout measures the pass and not the module transform
  // (~14 s of this test's 15, which a loaded machine pushed past 30 s).
  beforeAll(async () => {
    await import('./misconceptionRulesBackfill');
    await import('./autoAnalyzeGame');
  }, 120_000);

  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('every analysed game is read off its stored analysis while the engine never answers', async () => {
    const { reconcileMisconceptionRules, onRebuildProgress, POSITIVE_HALF_REV } = await import('./misconceptionRulesBackfill');
    const ann = [{ moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good' as const, comment: null }];
    await db.games.bulkPut([
      buildGameRecord({ id: 'old', fullyAnalyzed: true, date: '2026-05-01', annotations: ann }),
      buildGameRecord({ id: 'new', fullyAnalyzed: true, date: '2026-10-19', annotations: ann }),
    ]);
    const boardPassDone = new Promise<void>((resolve) => {
      const off = onRebuildProgress((p) => { if (p === null) { off(); resolve(); } });
    });
    void reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    await boardPassDone;
    for (const id of ['old', 'new']) {
      const g = await db.games.get(id);
      expect(g?.positiveHalfRev, id).toBe(POSITIVE_HALF_REV);
      expect(g?.recordPriceRev, `${id} is still waiting on the engine`).toBeUndefined();
    }
  }, 30_000);

  it('the newest game is read first, so the recent weeks fill first', async () => {
    const { gamesBehindPositiveHalf } = await import('./misconceptionRulesBackfill');
    const ann = [{ moveNumber: 1, color: 'white' as const, san: 'e4', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good' as const, comment: null }];
    await db.games.bulkPut([
      buildGameRecord({ id: 'a', fullyAnalyzed: true, date: '2025-03-01', annotations: ann }),
      buildGameRecord({ id: 'b', fullyAnalyzed: true, date: '2026-10-19', annotations: ann }),
      buildGameRecord({ id: 'c', fullyAnalyzed: true, date: '2026-06-01', annotations: ann }),
    ]);
    expect(await gamesBehindPositiveHalf()).toEqual(['b', 'c', 'a']);
  });
});
