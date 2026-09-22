import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { reconcileTacticTypes, IMMEDIATE_BACKFILL_SCHEDULE, PRODUCTION_BACKFILL_SCHEDULE, TACTIC_TYPE_REV } from './tacticTypeBackfill';
import { detectTacticType } from './missedTacticService';
import { bucketForMistake } from './weaknessSpine';
import type { ClassifiedTactic, MistakePuzzle, TacticType } from '../types';

/** A royal fork: the knight on d3 hops to e5 and hits the king on d7 and the
 *  rook on c6 at once. The unified classifier reads it as `fork`; the retired
 *  geometry tag on the seeded row says `skewer` — the exact class of stale tag
 *  N0 exists to correct. */
const FORK_FEN = '8/3k4/2r5/8/8/3N4/8/6K1 w - - 0 1';
const FORK_UCI = 'd3e5';

function puzzle(over: Partial<MistakePuzzle>): MistakePuzzle {
  return {
    id: over.id ?? 'p1',
    fen: FORK_FEN,
    playerMove: 'd3c5',
    playerMoveSan: 'Nc5',
    bestMove: FORK_UCI,
    bestMoveSan: 'Ne5+',
    moves: FORK_UCI,
    cpLoss: 300,
    classification: 'blunder',
    gamePhase: 'endgame',
    moveNumber: 40,
    sourceGameId: 'g1',
    sourceMode: 'lichess',
    playerColor: 'white',
    promptText: '',
    narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    createdAt: new Date().toISOString(),
    opponentName: null,
    gameDate: null,
    openingName: null,
    evalBefore: null,
    srsInterval: 1,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: new Date().toISOString(),
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
    ...over,
  };
}

function tactic(over: Partial<ClassifiedTactic>): ClassifiedTactic {
  return {
    id: over.id ?? 't1',
    sourceGameId: 'g1',
    moveIndex: 40,
    fen: FORK_FEN,
    bestMoveUci: FORK_UCI,
    bestMoveSan: 'Ne5+',
    playerMoveUci: 'd3c5',
    playerMoveSan: 'Nc5',
    playerColor: 'white',
    tacticType: 'skewer',
    evalSwing: 300,
    explanation: '',
    opponentName: null,
    gameDate: null,
    openingName: null,
    puzzleAttempts: 0,
    puzzleSuccesses: 0,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('tacticTypeBackfill — persisted tags are re-tagged through the ONE unified classifier (N0)', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('the fixture really is a fork to the unified classifier (so the test cannot pass vacuously)', () => {
    expect(detectTacticType(FORK_FEN, FORK_UCI)).toBe('fork');
  });

  it('a stale geometry tag is replaced by the unified tag, and the weakness bucket follows', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'stale', tacticType: 'skewer' as TacticType }));
    await db.classifiedTactics.put(tactic({ id: 'stale-t', tacticType: 'skewer' }));

    const r = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r).toMatchObject({ scanned: 2, recomputed: 2, changed: 2, flagged: 0, skippedByDesign: 0 });

    const p = (await db.mistakePuzzles.get('stale'))!;
    expect(p.tacticType).toBe('fork');
    expect(p.tacticTypeRev).toBe(TACTIC_TYPE_REV);
    expect(bucketForMistake(p).clusterId).toBe('analysis:tactic:fork');

    const t = (await db.classifiedTactics.get('stale-t'))!;
    expect(t.tacticType).toBe('fork');
    expect(t.tacticTypeRev).toBe(TACTIC_TYPE_REV);
  });

  it('is idempotent — a second boot recomputes nothing', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'p', tacticType: 'skewer' as TacticType }));
    await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    const again = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(again).toMatchObject({ scanned: 1, recomputed: 0, changed: 0 });
  });

  it('a row whose tacticType is null BY DESIGN (positional motif) stays null — rev stamped only', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'trade', tacticType: null, positionalMotif: 'unfavorable-trade' }));
    const r = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r.skippedByDesign).toBe(1);
    const p = (await db.mistakePuzzles.get('trade'))!;
    expect(p.tacticType).toBeNull();
    expect(p.tacticTypeRev).toBe(TACTIC_TYPE_REV);
    expect(bucketForMistake(p).clusterId).toBe('analysis:transform:unfavorable-trade');
  });

  it('a row with missing/illegal inputs KEEPS its tag and is flagged — never guessed', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'bad', fen: '', tacticType: 'pin' as TacticType }));
    await db.classifiedTactics.put(tactic({ id: 'bad-t', bestMoveUci: 'xx', tacticType: 'pin' }));
    const r = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r.flagged).toBe(2);
    expect((await db.mistakePuzzles.get('bad'))!.tacticType).toBe('pin');
    expect((await db.mistakePuzzles.get('bad'))!.tacticTypeFlag).toBe('no-inputs');
    expect((await db.classifiedTactics.get('bad-t'))!.tacticType).toBe('pin');
  });

  it('a row already carrying the correct unified tag is left unchanged apart from the rev', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'ok', tacticType: 'fork' as TacticType }));
    const r = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r).toMatchObject({ recomputed: 1, changed: 0 });
  });

  it('a synced row arriving later with a stale rev is re-tagged on the next boot', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'first', tacticType: 'skewer' as TacticType }));
    await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    await db.mistakePuzzles.put(puzzle({ id: 'synced', tacticType: 'skewer' as TacticType, tacticTypeRev: 'older-rev' }));
    const r = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(r).toMatchObject({ recomputed: 1, changed: 1 });
    expect((await db.mistakePuzzles.get('synced'))!.tacticType).toBe('fork');
  });

  // ── THE 2026-09-22 FREEZE (David's iPhone, first launch of the bundle that
  //    carried this backfill): ~260 ms per row, thousands of rows, one
  //    synchronous loop at boot, nothing persisted until the end, restarted from
  //    zero by every force-quit. Three contracts, each one of the three defects.
  it('YIELDS between rows — the thread is handed back once per stale row, never once per boot', async () => {
    for (let i = 0; i < 7; i += 1) await db.mistakePuzzles.put(puzzle({ id: `y${i}`, tacticType: 'skewer' as TacticType }));
    await db.mistakePuzzles.put(puzzle({ id: 'fresh', tacticType: 'fork', tacticTypeRev: TACTIC_TYPE_REV }));
    let yields = 0;
    await reconcileTacticTypes({ startDelayMs: 0, batch: 3, yieldBetweenRows: async () => { yields += 1; } });
    expect(yields).toBe(6); // 7 stale rows → 6 gaps; the fresh row costs nothing
  });

  it('PERSISTS per batch — a force-quit mid-run keeps every finished batch, and the next run only walks the rest', async () => {
    for (let i = 0; i < 25; i += 1) await db.mistakePuzzles.put(puzzle({ id: `k${String(i).padStart(2, '0')}`, tacticType: 'skewer' as TacticType }));
    let rows = 0;
    const killed = reconcileTacticTypes({
      startDelayMs: 0, batch: 10,
      yieldBetweenRows: async () => { rows += 1; if (rows === 14) throw new Error('force-quit'); },
    });
    await expect(killed).rejects.toThrow('force-quit');
    const kept = (await db.mistakePuzzles.toArray()).filter((p) => p.tacticTypeRev === TACTIC_TYPE_REV).length;
    expect(kept).toBe(10); // the first batch landed before the kill; the second was in flight and is lost, never half-written
    const again = await reconcileTacticTypes(IMMEDIATE_BACKFILL_SCHEDULE);
    expect(again.recomputed).toBe(15);
    expect((await db.mistakePuzzles.toArray()).every((p) => p.tacticTypeRev === TACTIC_TYPE_REV)).toBe(true);
  });

  it('STARTS LATE in production — the first paint and the OTA launch-install go first', () => {
    expect(PRODUCTION_BACKFILL_SCHEDULE.startDelayMs).toBeGreaterThanOrEqual(5_000);
    expect(PRODUCTION_BACKFILL_SCHEDULE.batch).toBeLessThanOrEqual(10);
  });

  it('a device whose rows all carry the rev reads two tables and touches nothing', async () => {
    await db.mistakePuzzles.put(puzzle({ id: 'done', tacticType: 'fork', tacticTypeRev: TACTIC_TYPE_REV }));
    let yields = 0;
    const r = await reconcileTacticTypes({ startDelayMs: 0, batch: 10, yieldBetweenRows: async () => { yields += 1; } });
    expect(r).toMatchObject({ scanned: 1, recomputed: 0 });
    expect(yields).toBe(0);
  });
});
