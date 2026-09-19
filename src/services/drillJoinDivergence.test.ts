/**
 * THE AUDIT AND THE STUDENT MUST AGREE ABOUT WHAT IS DRILLABLE.
 *
 * WHAT WAS WRONG (2026-09-19). `bucketPipelineAudit` proved "a captured mistake
 * is drillable" through `misconceptionService.mapTagToDrills` — a function with
 * ZERO production callers. The audit invented its own only caller, so for the
 * drill half it was exactly the "parallel re-implementation that can drift" its
 * own header promised it was not.
 *
 * The student's real path, `mistakePuzzleService.getMisconceptionDrillPuzzles`,
 * skips rows missing `bestSan`/`playedSan`; `mapTagToDrills` kept them. So a tag
 * whose rows carried no best move read DRILLABLE to the audit and rendered "No
 * drillable positions yet" on `WeaknessTagDrillPage` — `DRILL_PLAN_EMPTY` was
 * structurally unable to fire at the exact place the dead end was.
 *
 * THE FIX: the audit now grades the shipped path, and `mapTagToDrills` is
 * deleted so there is one join, not two. This file is the regression gate —
 * every case asserts the AUDIT's verdict against what the STUDENT would get.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { logMisconception } from './misconceptionService';
import { getMisconceptionDrillPuzzles } from './mistakePuzzleService';
import { auditBucketPipeline, type BucketAuditCode } from './bucketPipelineAudit';

/** After 1.e4 c5 — White to move. `Nf3` is legal here; `Nxe5` is NOT. */
const FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

/** No `puzzleThemes`, so the ONLY drill route is the student's own positions. */
const OWN_POSITIONS_ONLY = 'neglected-development';
/** Carries `puzzleThemes`, so it stays drillable with no positions at all. */
const THEMED = 'missed-tactic';

async function drillEmptyCodes(): Promise<BucketAuditCode[]> {
  const report = await auditBucketPipeline();
  return report.violations.filter((v) => v.code === 'DRILL_PLAN_EMPTY').map((v) => v.code);
}

describe('the audit grades the drill route the student actually takes', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('FIRES when the student would see the empty state (no best move, no themes)', async () => {
    await logMisconception({ tag: OWN_POSITIONS_ONLY, source: 'auto-analysis', fen: FEN, playedSan: 'h3' });

    // What the student gets: nothing.
    expect(await getMisconceptionDrillPuzzles(OWN_POSITIONS_ONLY)).toHaveLength(0);
    // What the audit now says: the same thing. Before the fix this was silent.
    expect(await drillEmptyCodes()).toContain('DRILL_PLAN_EMPTY');
  });

  it('STAYS SILENT when the row really does build a drill', async () => {
    await logMisconception({ tag: OWN_POSITIONS_ONLY, source: 'auto-analysis', fen: FEN, playedSan: 'h3', bestSan: 'Nf3' });

    expect(await getMisconceptionDrillPuzzles(OWN_POSITIONS_ONLY)).toHaveLength(1);
    expect(await drillEmptyCodes()).not.toContain('DRILL_PLAN_EMPTY');
  });

  it('STAYS SILENT for a themed tag even with no own positions — the other real route', async () => {
    await logMisconception({ tag: THEMED, source: 'auto-analysis', fen: FEN, playedSan: 'h3' });

    expect(await getMisconceptionDrillPuzzles(THEMED)).toHaveLength(0);
    expect(await drillEmptyCodes()).not.toContain('DRILL_PLAN_EMPTY');
  });
});
