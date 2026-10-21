import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { buildMistakePuzzle } from '../test/factories';
import { collapseDuplicateRecordRows, reconcileMisconceptionRules } from './misconceptionRulesBackfill';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import type { MisconceptionTagRecord } from '../types';

// #130: the copies racing passes already wrote are collapsed, once per device.
const FEN = 'r1bqkbnr/pppp1ppp/2n5/4Q3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 3';
const row = (over: Partial<MisconceptionTagRecord>): MisconceptionTagRecord => ({
  id: `r-${Math.random()}`, tag: 'hung-material', source: 'auto-analysis', createdAt: 100, fen: FEN, playedSan: 'Qxe5+',
  status: 'open', masteryHits: 0, sourceGameId: 'g1', grade: 'blunder', cpLoss: 700, counted: false, ...over,
});

describe('one slip, one row (#130)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('collapses copies of one slip to the counted one; a live capture and another slip stay', async () => {
    await db.misconceptionTags.bulkPut([
      row({ id: 'copy-1', createdAt: 101 }),
      row({ id: 'copy-2', createdAt: 102, counted: true }),
      row({ id: 'copy-3', createdAt: 100 }),
      row({ id: 'other-skill', tag: 'missed-tactic' }),
      row({ id: 'live', source: 'discussion-practice' }),
      row({ id: 'other-game', sourceGameId: 'g2' }),
    ]);
    await db.mistakePuzzles.bulkPut([
      buildMistakePuzzle({ id: 'p-new', sourceGameId: 'g1', fen: FEN, playerMoveSan: 'Qxe5+', attempts: 0, createdAt: '2026-10-20T19:16:00Z' }),
      buildMistakePuzzle({ id: 'p-tried', sourceGameId: 'g1', fen: FEN, playerMoveSan: 'Qxe5+', attempts: 3, createdAt: '2026-10-20T19:16:01Z' }),
    ]);
    expect(await collapseDuplicateRecordRows()).toEqual({ rows: 2, puzzles: 1 });
    expect((await db.misconceptionTags.toArray()).map((x) => x.id).sort()).toEqual(['copy-2', 'live', 'other-game', 'other-skill']);
    expect((await db.mistakePuzzles.toArray()).map((p) => p.id)).toEqual(['p-tried']);
  });

  it('the boot pass collapses them once per device', async () => {
    await db.misconceptionTags.bulkPut([row({ id: 'a' }), row({ id: 'b', createdAt: 99 })]);
    const first = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(first.collapsed).toBe(1);
    expect((await db.misconceptionTags.toArray()).map((x) => x.id)).toEqual(['b']);
    await db.misconceptionTags.put(row({ id: 'c' }));
    const second = await reconcileMisconceptionRules(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(second.collapsed).toBe(0);
  });
});
