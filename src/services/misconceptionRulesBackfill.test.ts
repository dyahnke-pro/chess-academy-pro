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
  // The backfill imports the analysis module lazily; its first cold
  // transform takes several seconds under test (see gameAnalysisService.unload.test).
  }, 30_000);

  it('a newly logged row carries the current revision', async () => {
    const { logMisconception } = await import('./misconceptionService');
    const rec = await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: row({}).fen, sourceGameId: 'g9' });
    expect(rec?.rulesRev).toBe(MISCONCEPTION_RULES_REV);
  });
});

describe('analysed games are read once for the green half (2026-10-13)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });
  it('an analysed game behind the revision is found, read, stamped — and not read again', async () => {
    const { gamesBehindPositiveHalf, POSITIVE_HALF_REV } = await import('./misconceptionRulesBackfill');
    await db.games.bulkPut([
      buildGameRecord({ id: 'a1', fullyAnalyzed: true, annotations: [{ moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good', comment: null }] }),
      buildGameRecord({ id: 'a2', fullyAnalyzed: false, annotations: [] }),
      buildGameRecord({ id: 'sample-x', fullyAnalyzed: true, annotations: [{ moveNumber: 1, color: 'white', san: 'e4', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good', comment: null }] }),
    ]);
    expect(await gamesBehindPositiveHalf()).toEqual(['a1']);
    await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect((await db.games.get('a1'))?.positiveHalfRev).toBe(POSITIVE_HALF_REV);
    expect(await gamesBehindPositiveHalf()).toEqual([]);
  // The backfill imports the analysis module lazily; its first cold
  // transform takes several seconds under test (see gameAnalysisService.unload.test).
  }, 30_000);
});

describe('a completed pass is one read per boot (David 2026-10-13: "Every app start it analyzes games?")', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });
  it('after the pass completes, the next boot never scans games or rows', async () => {
    await db.games.put(buildGameRecord({ id: 'g1', annotations: [] }));
    await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(await db.meta.get('misconception-rules-backfill')).toBeDefined();
    // A row written by OLD code would be behind — but nothing writes behind
    // after this build, and the done mark means the scan is not paid again.
    await db.misconceptionTags.put(row({ id: 'late', sourceGameId: 'g1' }));
    const next = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(next.games).toBe(0);
  // The backfill imports the analysis module lazily; its first cold
  // transform takes several seconds under test (see gameAnalysisService.unload.test).
  }, 30_000);
});
