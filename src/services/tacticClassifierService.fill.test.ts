import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { backfillClassifiedTactics, classifyTacticsFromGame } from './tacticClassifierService';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import { TACTIC_TYPE_REV } from './tacticTypeBackfill';
import { buildGameRecord } from '../test/factories';
import type { MoveAnnotation } from '../types';

// The background fill that replaced the inline derivation on /weaknesses
// (2026-09-29). A game is classified ONCE — including games with zero missed
// tactics, which the old "rows exist?" check re-derived forever.
const SANS = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Nf3'];
function annotations(blunder: boolean): MoveAnnotation[] {
  const c = new Chess();
  return SANS.map((san, i) => {
    c.move(san);
    return {
      moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
      evaluation: i === 6 ? (blunder ? -50 : 190) : i === 5 ? 200 : 20,
      bestMove: i === 6 ? 'h5f7' : null, bestMoveEval: null,
      classification: i === 6 && blunder ? 'blunder' : 'good', comment: null,
    };
  });
}
const PGN = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Nf3 *';

describe('backfillClassifiedTactics', () => {
  beforeEach(async () => { await db.delete(); await db.open(); });

  it('classifies each unclassified game once, marks zero-tactic games, and is idempotent', async () => {
    await db.games.bulkPut([
      buildGameRecord({ id: 'miss', pgn: PGN, studentSide: 'white', annotations: annotations(true) }),
      buildGameRecord({ id: 'clean', pgn: PGN, studentSide: 'white', annotations: annotations(false) }),
      buildGameRecord({ id: 'raw', pgn: PGN, studentSide: 'white', annotations: [] }),
    ]);
    const seen: number[] = [];
    const found = await backfillClassifiedTactics({ schedule: IMMEDIATE_BACKFILL_SCHEDULE, onGame: (d) => seen.push(d) });
    expect(found).toBe(1);
    expect(seen).toEqual([1, 2]);                                   // unanalysed game skipped
    expect((await db.games.get('miss'))?.tacticsClassifiedRev).toBe(TACTIC_TYPE_REV);
    expect((await db.games.get('clean'))?.tacticsClassifiedRev).toBe(TACTIC_TYPE_REV); // zero tactics, still stamped
    expect((await db.games.get('raw'))?.tacticsClassifiedRev).toBeUndefined();
    expect(await db.classifiedTactics.count()).toBe(1);

    const again: number[] = [];
    await backfillClassifiedTactics({ schedule: IMMEDIATE_BACKFILL_SCHEDULE, onGame: (d) => again.push(d) });
    expect(again).toEqual([]);                                      // nothing re-derived on the next open
  });

  it('is single-flight: a second caller joins the running fill', async () => {
    await db.games.put(buildGameRecord({ id: 'miss', pgn: PGN, studentSide: 'white', annotations: annotations(true) }));
    const a = backfillClassifiedTactics({ schedule: IMMEDIATE_BACKFILL_SCHEDULE });
    const b = backfillClassifiedTactics({ schedule: IMMEDIATE_BACKFILL_SCHEDULE });
    expect(b).toBe(a);
    await a;
  });

  it('force re-derives after a fresh analysis and keeps the drill counters', async () => {
    await db.games.put(buildGameRecord({ id: 'miss', pgn: PGN, studentSide: 'white', annotations: annotations(true) }));
    await classifyTacticsFromGame('miss');
    const [row] = await db.classifiedTactics.toArray();
    await db.classifiedTactics.update(row.id, { puzzleAttempts: 3, puzzleSuccesses: 2 });

    expect(await classifyTacticsFromGame('miss')).toBe(0);          // already classified → no work
    expect(await classifyTacticsFromGame('miss', { force: true })).toBe(1);
    const after = await db.classifiedTactics.get(row.id);
    expect(after?.puzzleAttempts).toBe(3);
    expect(after?.puzzleSuccesses).toBe(2);

    // Re-analysis that no longer flags the move drops the stale row.
    await db.games.update('miss', { annotations: annotations(false) });
    await classifyTacticsFromGame('miss', { force: true });
    expect(await db.classifiedTactics.count()).toBe(0);
  });

  it('stores the FOUND tactic types too, classified by the move the student played', async () => {
    // 1.e4 e5 2.Qh5 Nc6 3.Bc4 Nf6?? 4.Qxf7# — the mate is marked brilliant.
    const c = new Chess();
    const sans = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#'];
    const anns: MoveAnnotation[] = sans.map((san, i) => {
      c.move(san);
      return {
        moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
        evaluation: 20, bestMove: null, bestMoveEval: null,
        classification: i === 6 ? 'brilliant' : 'good', comment: null,
      };
    });
    await db.games.put(buildGameRecord({ id: 'find', pgn: '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0', studentSide: 'white', annotations: anns }));
    await classifyTacticsFromGame('find');
    const g = await db.games.get('find');
    expect(g?.foundTacticTypes).toEqual(['checkmate']);
  });

  it('a classifier revision the game was not stamped at re-classifies it', async () => {
    await db.games.put(buildGameRecord({ id: 'old', pgn: PGN, studentSide: 'white', annotations: annotations(true), tacticsClassifiedRev: 'an-older-classifier' }));
    const seen: number[] = [];
    await backfillClassifiedTactics({ schedule: IMMEDIATE_BACKFILL_SCHEDULE, onGame: (d) => seen.push(d) });
    expect(seen).toEqual([1]);
    expect((await db.games.get('old'))?.tacticsClassifiedRev).toBe(TACTIC_TYPE_REV);
  });
});
