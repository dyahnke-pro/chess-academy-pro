// THE COACH'S OWN MISTAKES NEVER REACH THE STUDENT'S RECORD (David
// 2026-11-27: "Lessons and drills are only made from user mistakes").
//
// A real game: lichess vvidmF0a (the Sicilian Closed replay, the student
// Black at 1000). On move 32 the coach (White) played Rf6, a blunder — the
// engine's best was h4 at -4.7, and after Rf6 Black mates in two (…Rc1+).
// Every record writer is handed that move under the student's seat (Black)
// and must refuse it; the student's own Rc1+ on the next board is filed.
// Before this, every writer took whatever move it was handed.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import games from '../test/fixtures/learn-replay-games.json';

const audit = vi.hoisted(() => ({ rows: [] as Array<{ kind: string; details?: string }> }));
vi.mock('./appAuditor', () => ({ logAppAudit: (e: { kind: string; details?: string }) => { audit.rows.push(e); return Promise.resolve(); } }));

import { buildMistakePuzzleFromCapture } from './mistakePuzzleService';
import { logMisconception } from './misconceptionService';
import { recordCapabilityEvidence, recordLaneEvidence } from './capabilityEvidence';
import { fileTakenBackMiss, type TakenBackReads } from './takenBackPuzzles';
import { autoAnalyzeBlunders } from './autoAnalyzeGame';
import { isStudentsMove, moverOf } from './recordSeat';
import type { StockfishAnalysis } from '../types';

const game = (games as { games: Array<{ id: string; sans: string[] }> }).games.find((g) => g.id === 'sicilianClosed1000');
if (!game) throw new Error('fixture game missing');
const fenAt = (ply: number): string => {
  const c = new Chess();
  for (const san of game.sans.slice(0, ply)) c.move(san);
  return c.fen();
};
/** The board White's 32.Rf6 was played from (ply 63), and Black's reply board. */
const COACH_FEN = fenAt(62);
const COACH_MOVE = 'Rf6';
const COACH_BEST = 'h4';
const STUDENT_FEN = fenAt(63);
const STUDENT_MOVE = 'Rc1+';
const GAME = 'g-seat-vvidmF0a';
const from = { origin: 'game' as const, gameId: GAME, source: 'coach' as const, opponentName: null, gameDate: null };
const refused = (): number => audit.rows.filter((r) => r.kind === 'record-seat-refused').length;
const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

describe('the record holds only the student\'s moves', () => {
  beforeEach(async () => {
    await db.misconceptionTags.clear();
    await db.capabilityEvidence.clear();
    await db.mistakePuzzles.clear();
    audit.rows.length = 0;
  });

  it('the fixture is the real game: White to move before Rf6, Black before Rc1+', () => {
    expect(game.sans[62]).toBe(COACH_MOVE);
    expect(game.sans[63]).toBe(STUDENT_MOVE);
    expect(moverOf(COACH_FEN)).toBe('white');
    expect(moverOf(STUDENT_FEN)).toBe('black');
    expect(isStudentsMove(STUDENT_FEN, 'black', 'misconception')).toBe(true);
  });

  it('a mistake puzzle is never built from the coach\'s move', async () => {
    expect(buildMistakePuzzleFromCapture({ fen: COACH_FEN, studentSeat: 'black', playedSan: COACH_MOVE, bestSan: COACH_BEST, cpLoss: 900, from })).toBeNull();
    const own = buildMistakePuzzleFromCapture({ fen: STUDENT_FEN, studentSeat: 'black', playedSan: 'Rg7', bestSan: STUDENT_MOVE, cpLoss: 900, from });
    expect(own?.playerColor).toBe('black');
    await flush();
    expect(refused()).toBe(1);
  });

  it('a misconception row is never logged for the coach\'s move', async () => {
    const rec = await logMisconception({ tag: 'hung-material', source: 'auto-analysis', fen: COACH_FEN, studentSeat: 'black', playedSan: COACH_MOVE, bestSan: COACH_BEST, cpLoss: 900, sourceGameId: GAME });
    expect(rec).toBeNull();
    expect(await db.misconceptionTags.count()).toBe(0);
  });

  it('capability evidence is never recorded for the coach\'s move, by any of its doors', async () => {
    expect(await recordCapabilityEvidence({ fenBefore: COACH_FEN, playedSan: COACH_MOVE, moverColor: 'white', studentSeat: 'black', cpLoss: 900, bestSan: COACH_BEST, origin: 'learn', prompted: false, sourceGameId: GAME })).toBe(0);
    expect(await recordLaneEvidence({ lane: 'threat-answer', studentSeat: 'black', tag: 'missed-opponents-threat', outcome: 'broken', fen: COACH_FEN, playedSan: COACH_MOVE, posedImportance: 90, origin: 'learn', prompted: false, sourceGameId: GAME })).toBe(false);
    expect(await db.capabilityEvidence.count()).toBe(0);
  });

  it('the coach\'s move taken back is never a puzzle', async () => {
    const read = (bestMove: string, evaluation: number): StockfishAnalysis => ({ bestMove, evaluation, isMate: false, mateIn: null, depth: 14, nodesPerSecond: 0, topLines: [{ rank: 1, evaluation, moves: [bestMove], mate: null }] } as unknown as StockfishAnalysis);
    const reads: TakenBackReads = { read: async () => read('h2h4', -474), price: async () => ({ costCp: 900, scores: { bestWhiteCp: -474, playedWhiteCp: -1374 }, settled: true }) } as TakenBackReads;
    expect(await fileTakenBackMiss({ fenBefore: COACH_FEN, playedSan: COACH_MOVE, gameId: GAME, studentSeat: 'black', spot: null }, reads)).toBeNull();
    expect(await db.mistakePuzzles.count()).toBe(0);
    const verdict = audit.rows.filter((r) => r.kind === 'taken-back-puzzle').map((r) => JSON.parse(r.details ?? '{}').verdict);
    expect(verdict).toEqual(['not-the-students']);
  });

  it('a game sweep handed the coach\'s blunder files nothing of it', async () => {
    const r = await autoAnalyzeBlunders(
      [{ fen: COACH_FEN, playedSan: COACH_MOVE, bestSan: COACH_BEST, cpLoss: 900, grade: 'blunder', gamePhase: 'endgame', moveNumber: 32 }],
      { sourceGameId: GAME, learned: true, playerColor: 'black' },
    );
    expect(r.logged).toBe(0);
    expect(await db.misconceptionTags.count()).toBe(0);
    expect(await db.mistakePuzzles.count()).toBe(0);
  });
});
