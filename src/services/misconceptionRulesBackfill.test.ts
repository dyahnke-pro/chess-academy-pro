import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';
import { MISCONCEPTION_RULES_REV } from '../data/misconceptionTags';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import { gamesBehindRules, reconcileMisconceptionRules } from './misconceptionRulesBackfill';
import type { MisconceptionTagRecord } from '../types';

// 2026-10-13: a classifier rules change reached new rows only; the stored
// record kept the old tags. Rows behind the rules revision are re-read once.
const row = (over: Partial<MisconceptionTagRecord>): MisconceptionTagRecord => ({
  id: `r-${Math.random()}`, tag: 'hung-material', source: 'auto-analysis', createdAt: 1,
  fen: '4k3/8/8/4p3/8/5N2/8/4K3 w - - 0 1', playedSan: 'Nd4', status: 'open', masteryHits: 0, ...over,
});

describe('misconception rows follow the classifier rules', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('finds only auto-analysis rows behind the revision', async () => {
    await db.misconceptionTags.bulkPut([
      row({ id: 'stale', sourceGameId: 'g1' }),
      row({ id: 'current', sourceGameId: 'g2', rulesRev: MISCONCEPTION_RULES_REV }),
      row({ id: 'asked', sourceGameId: 'g3', source: 'discussion-practice' }),
    ]);
    expect(await gamesBehindRules()).toEqual(['g1']);
  });

  it('a pass stamps every row it visited, so the next boot does nothing', async () => {
    await db.games.put(buildGameRecord({ id: 'g1', annotations: [] }));
    await db.misconceptionTags.put(row({ id: 'stale', sourceGameId: 'g1' }));
    const first = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(first.games).toBe(1);
    expect((await db.misconceptionTags.get('stale'))?.rulesRev).toBe(MISCONCEPTION_RULES_REV);
    const second = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(second.games).toBe(0);
  });

  it('a newly logged row carries the current revision', async () => {
    const { logMisconception } = await import('./misconceptionService');
    const rec = await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: row({}).fen, sourceGameId: 'g9' });
    expect(rec?.rulesRev).toBe(MISCONCEPTION_RULES_REV);
  });
});
