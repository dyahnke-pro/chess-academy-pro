/**
 * THE AUDIT CHECKS A FUNCTION NO STUDENT EVER REACHES.
 *
 * `bucketPipelineAudit` proves "a captured mistake is drillable" through
 * `misconceptionService.mapTagToDrills`. Its own header claims it reads "the
 * SAME stores + read-layer the app uses at runtime … not a parallel
 * re-implementation that can drift."
 *
 * For the drill half that is false. `mapTagToDrills` has ZERO production
 * callers — the audit invents its only caller. The surface a student actually
 * reaches (`WeaknessTagDrillPage`) goes through
 * `mistakePuzzleService.getMisconceptionDrillPuzzles`, which SKIPS any record
 * missing `bestSan`/`playedSan`. `mapTagToDrills` keeps them.
 *
 * So a tag whose rows lack a best move reads DRILLABLE to the audit and shows
 * "No drillable positions yet" to the student — which is precisely the
 * `COUNTED_NO_DRILL` / `DRILL_PLAN_EMPTY` pair the audit exists to catch,
 * structurally unable to fire for the real surface.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { mapTagToDrills } from './misconceptionService';
import { getMisconceptionDrillPuzzles } from './mistakePuzzleService';
import type { MisconceptionTagRecord } from '../types';

const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 4 3';

function row(over: Partial<MisconceptionTagRecord>): MisconceptionTagRecord {
  return {
    id: `mt-${Math.random().toString(36).slice(2)}`,
    tag: 'missed-tactic',
    source: 'auto-analysis',
    createdAt: Date.now(),
    fen: FEN,
    ...over,
  } as MisconceptionTagRecord;
}

describe('the drill join the audit checks is not the one the student reaches', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('a row with no bestSan reads DRILLABLE to the audit and EMPTY to the student', async () => {
    await db.misconceptionTags.add(row({ playedSan: 'Nf6', bestSan: undefined }));

    const auditSees = await mapTagToDrills('missed-tactic');
    const studentGets = await getMisconceptionDrillPuzzles('missed-tactic');

    // What bucketPipelineAudit grades: a non-empty plan → no COUNTED_NO_DRILL.
    expect(auditSees?.positions.length).toBe(1);
    // What the student actually gets: the empty state.
    expect(studentGets.length).toBe(0);
  });

  it('the same divergence on a missing playedSan', async () => {
    await db.misconceptionTags.add(row({ playedSan: undefined, bestSan: 'Bc5' }));

    expect((await mapTagToDrills('missed-tactic'))?.positions.length).toBe(1);
    expect((await getMisconceptionDrillPuzzles('missed-tactic')).length).toBe(0);
  });

  it('a complete row agrees on both paths — so the divergence is the missing field, not the wiring', async () => {
    await db.misconceptionTags.add(row({ playedSan: 'Nf6', bestSan: 'Bc5' }));

    expect((await mapTagToDrills('missed-tactic'))?.positions.length).toBe(1);
    expect((await getMisconceptionDrillPuzzles('missed-tactic')).length).toBe(1);
  });
});
