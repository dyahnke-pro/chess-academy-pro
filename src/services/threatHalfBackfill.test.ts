import { describe, it, expect, beforeEach } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';
import { THREAT_HALF_REV } from '../data/misconceptionTags';
import { gamesBehindThreatHalf } from './misconceptionRulesBackfill';
import { recordThreatHalfForGame } from './autoAnalyzeGame';
import type { GameRecord, MoveAnnotation } from '../types';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';

// OS-4 backfill: an analysed game records the INCOMING half of each motif once
// per THREAT_HALF_REV, graded by the board AND the engine numbers the
// annotation already carries, persisted per game so a killed app keeps every
// finished game.

/** The Fried Liver to move six; the student is Black. */
const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7'];

/** One annotation per move; `last` grades Black's sixth move (White POV). */
function game(id: string, reply: string, last: { bestMoveEval: number; evaluation: number }): GameRecord {
  const c = new Chess();
  const anns: MoveAnnotation[] = [];
  for (const [i, san] of [...LINE, reply].entries()) {
    c.move(san);
    const final = i === LINE.length;
    anns.push({
      moveNumber: Math.floor(i / 2) + 1, color: i % 2 === 0 ? 'white' : 'black', san,
      evaluation: final ? last.evaluation : 0, bestMove: null, bestMoveEval: final ? last.bestMoveEval : 0,
      classification: 'good', comment: null,
    });
  }
  return buildGameRecord({ id, pgn: c.pgn(), white: 'Opp', black: 'Player2', source: 'lichess', fullyAnalyzed: true, annotations: anns });
}

const forkRows = async (id: string): Promise<CapabilityEvidenceRecord[]> => (await db.capabilityEvidence.toArray()).filter((r) => r.sourceGameId === id && r.tag === 'missed-their-fork');

describe('the threat half of an analysed game', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('takes the forker (…Kxf7): one HELD fork row, origin review, unprompted — and the game is stamped', async () => {
    await db.games.put(game('held', 'Kxf7', { bestMoveEval: 80, evaluation: 90 }));
    expect(await recordThreatHalfForGame('held', 'Player2')).toBeGreaterThan(0);
    const rows = await forkRows('held');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ outcome: 'held', origin: 'review', prompted: false, playedSan: 'Kxf7' });
    expect((await db.games.get('held'))?.threatHalfRev).toBe(THREAT_HALF_REV);
  }, 30_000);

  it('ignores the fork (…Be6) and the engine agrees it cost a piece: BROKEN', async () => {
    await db.games.put(game('broken', 'Be6', { bestMoveEval: 80, evaluation: 450 }));
    await recordThreatHalfForGame('broken', 'Player2');
    expect((await forkRows('broken'))[0]).toMatchObject({ outcome: 'broken', posedImportance: 90 });
  }, 30_000);

  it('the same …Be6 where the engine says it cost nothing is no fork question at all', async () => {
    await db.games.put(game('holds', 'Be6', { bestMoveEval: 80, evaluation: 85 }));
    await recordThreatHalfForGame('holds', 'Player2');
    expect(await forkRows('holds')).toHaveLength(0);
  }, 30_000);

  it('a decided game (already ±5 pawns) poses no motif question', async () => {
    await db.games.put(game('decided', 'Be6', { bestMoveEval: 900, evaluation: 1300 }));
    await recordThreatHalfForGame('decided', 'Player2');
    expect(await forkRows('decided')).toHaveLength(0);
  }, 30_000);

  it('once per revision: a second read writes nothing and duplicates nothing', async () => {
    await db.games.put(game('once', 'Kxf7', { bestMoveEval: 80, evaluation: 90 }));
    await recordThreatHalfForGame('once', 'Player2');
    expect(await recordThreatHalfForGame('once', 'Player2')).toBe(0);
    expect(await forkRows('once')).toHaveLength(1);
  }, 30_000);

  it('a simulated force-quit keeps the finished game: only the unread one is still behind', async () => {
    await db.games.bulkPut([game('done', 'Kxf7', { bestMoveEval: 80, evaluation: 90 }), game('next', 'Kxf7', { bestMoveEval: 80, evaluation: 90 })]);
    expect((await gamesBehindThreatHalf()).sort()).toEqual(['done', 'next']);
    await recordThreatHalfForGame('done', 'Player2');
    // …the app is killed here; the next boot finds:
    expect(await gamesBehindThreatHalf()).toEqual(['next']);
    expect(await forkRows('done')).toHaveLength(1);
  }, 30_000);
});
