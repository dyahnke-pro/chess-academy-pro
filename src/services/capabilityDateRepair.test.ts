import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/schema';
import { plyOfFen, redateGameRows, repairCapabilityDates } from './capabilityDateRepair';
import { IMMEDIATE_BACKFILL_SCHEDULE } from './backfillSchedule';
import { gamePlayedAt } from './autoAnalyzeGame';
import type { CapabilityEvidenceRecord } from './capabilityEvidence';

const row = (id: string, fen: string, recordedAt: number, outcome: 'held' | 'broken' = 'held'): CapabilityEvidenceRecord => ({
  id, tag: 'missed-opponents-threat', outcome, fen, playedSan: 'e4', posedImportance: 80, recordedAt, origin: 'review', prompted: false, sourceGameId: 'g1',
});

beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

describe('evidence from a past game carries the game\'s date (David\'s record, 2026-10-19)', () => {
  it('reads the ply off the position', () => {
    expect(plyOfFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(0);
    expect(plyOfFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe(1);
    expect(plyOfFen('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3')).toBe(4);
  });

  it('reads imported PGN dates', () => {
    expect(gamePlayedAt({ date: '2025.03.04' })).toBe(Date.parse('2025-03-04'));
    expect(gamePlayedAt({ date: '' })).toBeUndefined();
  });

  it('re-dates rows stamped by a later re-read, in move order, and leaves live rows', () => {
    const played = Date.parse('2025-03-04');
    const later = played + 90 * 86_400_000;
    const fixed = redateGameRows([
      row('late', 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3', later, 'broken'),
      row('early', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', later + 5),
      row('live', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', played + 60_000),
    ], played);
    expect(fixed.map((r) => r.id)).toEqual(['late', 'early']);
    expect(fixed.find((r) => r.id === 'early')!.recordedAt).toBeLessThan(fixed.find((r) => r.id === 'late')!.recordedAt);
    expect(fixed.every((r) => r.recordedAt - played < 86_400_000)).toBe(true);
  });

  it('repairs the stored record once', async () => {
    const played = Date.parse('2025-03-04');
    await db.games.put({ id: 'g1', date: '2025.03.04', pgn: '', white: 'a', black: 'b', result: '1-0', eco: null, whiteElo: null, blackElo: null, source: 'chesscom', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null } as never);
    await db.capabilityEvidence.bulkPut([row('x', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', played + 200 * 86_400_000)]);
    expect(await repairCapabilityDates(IMMEDIATE_BACKFILL_SCHEDULE)).toEqual({ games: 1, rows: 1 });
    expect((await db.capabilityEvidence.get('x'))!.recordedAt).toBe(played + 1);
    expect(await repairCapabilityDates(IMMEDIATE_BACKFILL_SCHEDULE)).toEqual({ games: 0, rows: 0 });
  });
});
