import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db/schema';
import { fileTakenBackMiss, type TakenBackReads, type TakenBackRow } from './takenBackPuzzles';

const audit = vi.hoisted(() => ({ rows: [] as Array<{ kind: string; details?: string }> }));
vi.mock('./appAuditor', () => ({ logAppAudit: (e: { kind: string; details?: string }) => { audit.rows.push(e); return Promise.resolve(); } }));
const verdicts = (): TakenBackRow[] => audit.rows.filter((e) => e.kind === 'taken-back-puzzle').map((e) => JSON.parse(e.details ?? '{}') as TakenBackRow);
import type { StockfishAnalysis } from '../types';

// A MISS THE COACH STOPPED AND THE STUDENT TOOK BACK STILL GOES TO THE PUZZLES
// (David 2026-10-23). Real Dexie (fake-indexeddb); the engine's reads are
// stubbed so the grade under test is exactly the one the assertions name.

/** 1.e4 e5 2.Nf3, Black to move; the best is …Nc6. */
const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const GAME = 'g-taken-back';

const read = (bestMove: string, evaluation: number, moves: string[] = [bestMove]): StockfishAnalysis => ({
  bestMove, evaluation, isMate: false, mateIn: null, depth: 14, nodesPerSecond: 0,
  topLines: [{ rank: 1, evaluation, moves, mate: null }],
} as unknown as StockfishAnalysis);

/** The played move costs `cost` cp: White-POV scores 0 (best) vs `cost` (played). */
const reads = (cost: number): TakenBackReads => ({
  read: async (fen) => (fen === FEN ? read('b8c6', 0, ['b8c6', 'f1b5', 'a7a6']) : read('f3e5', cost)),
  price: async () => ({ costCp: cost, scores: { bestWhiteCp: 0, playedWhiteCp: cost }, settled: true }),
});

const puzzles = () => db.mistakePuzzles.where('sourceGameId').equals(GAME).toArray();

describe('a miss the coach stopped and the student took back is filed to the mistake puzzles', () => {
  beforeEach(async () => { await db.mistakePuzzles.clear(); await db.games.clear(); audit.rows.length = 0; });

  it('a blunder taken back: one puzzle with the move, the best and the best line', async () => {
    const p = await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: GAME }, reads(500));
    expect(p).not.toBeNull();
    const [row] = await puzzles();
    expect([row.fen, row.playerMoveSan, row.bestMoveSan]).toEqual([FEN, 'Qh4', 'Nc6']);
  });
  it('one puzzle per position per game: a second miss at the same board files nothing', async () => {
    await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: GAME }, reads(500));
    expect(await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qg5', gameId: GAME }, reads(500))).toBeNull();
    expect((await puzzles()).length).toBe(1);
  });
  it('twins: an inaccuracy; the engine\'s own best move; no game; a move the engine could not price', async () => {
    expect(await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'a6', gameId: GAME }, reads(60)), 'an inaccuracy').toBeNull();
    expect(await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Nc6', gameId: GAME }, reads(500)), 'the best move').toBeNull();
    expect(await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: null }, reads(500)), 'no game').toBeNull();
    const unpriced: TakenBackReads = { ...reads(500), price: async () => null };
    expect(await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: GAME }, unpriced), 'unpriced is never a guess').toBeNull();
    expect((await puzzles()).length).toBe(0);
  });

  it('every call logs the app\'s own verdict with its grade — the row an audit holds the puzzles to', async () => {
    await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: GAME }, reads(500));
    await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qg5', gameId: GAME }, reads(500));
    await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'a6', gameId: GAME }, reads(60));
    await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: GAME }, { ...reads(500), price: async () => null });
    await fileTakenBackMiss({ fenBefore: FEN, playedSan: 'Qh4', gameId: null }, reads(500));
    expect(verdicts().map((r) => [r.san, r.verdict, r.severity])).toEqual([
      ['Qh4', 'filed', 'blunder'],
      ['Qg5', 'duplicate', 'blunder'],
      ['a6', 'not-a-mistake', 'inaccuracy'],
      ['Qh4', 'unpriced', null],
      ['Qh4', 'no-game', null],
    ]);
    const [filed] = verdicts();
    expect([filed.fen, filed.cpLoss, filed.bestSan, filed.gameId]).toEqual([FEN, 500, 'Nc6', GAME]);
  });
});
