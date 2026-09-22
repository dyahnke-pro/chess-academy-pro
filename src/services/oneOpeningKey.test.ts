// ONE OPENING KEY across the writers and the reader (WO-STANDARD-01 A1).
//
// Before: imports stored the Dexie slug, Play the detected NAME, Learn the
// walkthrough tree's name, the samples null. `studentNeedLoader` joined
// `g.openingId === q.openingId`, so the result term ("your score in this
// opening") and the departure term never joined across surfaces. The brand on
// `OpeningKey` makes a name fail to COMPILE; this file proves the RUNTIME
// half: every writer's mint of one game agrees, and the loader's joins read it.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';
import { openingKeyFromPgn, openingKeyFromSans } from './openingKey';
import { detectOpening } from './openingDetectionService';
import { lineFenKeys, loadStudentNeedContext } from './studentNeedLoader';
import { computeNeed, fenKey, COLD_START_GAMES, FAMILIAR_REPS, type StudentNeedContext } from './needScore';
import type { BookDepartureRow } from './bookDepartureWeakness';
import type { OpeningKey } from '../types';

vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { preferences: { chessComUsername: 'student' } } }) },
}));
vi.mock('./weaknessSignalLoader', () => ({ loadWeaknessSignals: async () => [] }));
vi.mock('./capabilityEvidence', () => ({ getCapabilityProfile: async () => new Map() }));
vi.mock('./bookDeparturePrecompute', () => ({ getCachedBookDepartureRows: async () => [] }));

const NAJDORF = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
const DRAGON = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'];
const ITALIAN = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];

/** A movetext with a result, the way an import's PGN body reads. */
function pgnOf(sans: readonly string[], result = '1-0'): string {
  const c = new Chess();
  for (const s of sans) c.move(s);
  c.setHeader('Result', result);
  return c.pgn();
}

describe('one opening key — the writers agree', () => {
  it('import (PGN), Play (detected key) and Learn (SANs) mint the SAME key for one game', () => {
    const importWrites = openingKeyFromPgn(pgnOf(NAJDORF));
    const playWrites = detectOpening([...NAJDORF])?.key ?? null;
    const learnWrites = openingKeyFromSans(NAJDORF);
    expect(importWrites).not.toBeNull();
    expect(playWrites).toBe(importWrites);
    expect(learnWrites).toBe(importWrites);
  });
});

describe('one opening key — the reader joins on it', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    await db.delete();
    await db.open();
  });

  it('"your score in this opening" is computed over the FAMILY, not an empty set', async () => {
    const naj = openingKeyFromSans(NAJDORF)!;
    const dra = openingKeyFromSans(DRAGON)!;
    const ita = openingKeyFromSans(ITALIAN)!;
    // Four decided Sicilian games as Black (two lost, two won) + two Italian wins.
    await db.games.bulkPut([
      buildGameRecord({ id: 's1', white: 'x', black: 'student', result: '1-0', openingId: naj, pgn: pgnOf(NAJDORF) }),
      buildGameRecord({ id: 's2', white: 'x', black: 'student', result: '1-0', openingId: dra, pgn: pgnOf(DRAGON) }),
      buildGameRecord({ id: 's3', white: 'x', black: 'student', result: '0-1', openingId: naj, pgn: pgnOf(NAJDORF, '0-1') }),
      buildGameRecord({ id: 's4', white: 'x', black: 'student', result: '0-1', openingId: dra, pgn: pgnOf(DRAGON, '0-1') }),
      buildGameRecord({ id: 'i1', white: 'student', black: 'x', result: '1-0', openingId: ita, pgn: pgnOf(ITALIAN) }),
      buildGameRecord({ id: 'i2', white: 'student', black: 'x', result: '1-0', openingId: ita, pgn: pgnOf(ITALIAN) }),
    ]);
    const ctx = await loadStudentNeedContext({ rating: 1500, sans: NAJDORF, studentColor: 'black', openingId: naj, eco: null });
    // The Dragon games count (same family); the Italian ones do not → 2/4.
    expect(ctx.openingScore).toBe(0.5);
    expect(ctx.overallScore).toBeCloseTo(4 / 6);
    expect(ctx.lineFenKeys).toEqual(lineFenKeys(NAJDORF));
  });

  it('with no key, ECO is the fallback — and without either the term is honestly null', async () => {
    await db.games.bulkPut([1, 2, 3, 4].map((i) =>
      buildGameRecord({ id: `e${i}`, white: 'student', black: 'x', result: '1-0', eco: 'C50', openingId: null, pgn: pgnOf(ITALIAN) })));
    const byEco = await loadStudentNeedContext({ rating: 1500, sans: ITALIAN, studentColor: 'white', openingId: null, eco: 'C50' });
    expect(byEco.openingScore).toBe(1);
    const nothing = await loadStudentNeedContext({ rating: 1500, sans: ['d4'], studentColor: 'white', openingId: null, eco: null });
    expect(nothing.openingScore).toBeNull();
  });
});

describe('one opening key — the departure term joins by POSITION, never a null wildcard', () => {
  const warm = (over: Partial<StudentNeedContext>): StudentNeedContext => ({
    rating: 1500, gamesPlayed: COLD_START_GAMES + 10, signals: [], bookDepartures: [], capabilities: new Map(),
    lineReps: new Array(20).fill(FAMILIAR_REPS), ...over,
  });
  const afterPlies = (sans: readonly string[], n: number): string => {
    const c = new Chess();
    for (const s of sans.slice(0, n)) c.move(s);
    return c.fen();
  };
  // The student left book at ply 10 (…a6) — the last in-book position is after 9 plies.
  const row: BookDepartureRow = {
    gameId: 'g1', departurePly: 10, departedSan: 'a6', mainSan: 'g6', bookFen: afterPlies(NAJDORF, 9),
    evalCostCp: 120, openingId: openingKeyFromSans(NAJDORF), playedAt: 1,
  };

  it('a departure whose last-in-book board is ON this line speaks at that ply', () => {
    const ctx = warm({ bookDepartures: [row], openingId: openingKeyFromSans(NAJDORF), lineFenKeys: lineFenKeys(NAJDORF) });
    expect(computeNeed({ ply: 10, studentMove: true, clauseKind: null, fundamentalId: null }, ctx).speak).toBe(true);
  });

  it('the same departure is silent on a line that never reaches that board — even in the same family', () => {
    // The Dragon shares the first 9 plies with the Najdorf, so the position
    // after 9 plies IS on the Dragon line too: the row belongs there as well.
    const dragon = warm({ bookDepartures: [row], openingId: openingKeyFromSans(DRAGON), lineFenKeys: lineFenKeys(DRAGON) });
    expect(dragon.lineFenKeys![9]).toBe(fenKey(row.bookFen));
    // A Sicilian that diverged earlier does not reach it → silent.
    const other = ['e4', 'c5', 'Nc3', 'Nc6', 'g3', 'g6', 'Bg2', 'Bg7', 'd3', 'd6'];
    const closed = warm({ bookDepartures: [row], openingId: openingKeyFromSans(other), lineFenKeys: lineFenKeys(other) });
    expect(computeNeed({ ply: 10, studentMove: true, clauseKind: null, fundamentalId: null }, closed).speak).toBe(false);
  });

  it('an unknown-opening game does NOT inherit every departure the student ever made', () => {
    const ctx = warm({ bookDepartures: [{ ...row, openingId: null }], openingId: null });
    expect(computeNeed({ ply: 10, studentMove: true, clauseKind: null, fundamentalId: null }, ctx).speak).toBe(false);
    const foreign = 'a00-not-a-real-entry' as OpeningKey;
    expect(computeNeed({ ply: 10, studentMove: true, clauseKind: null, fundamentalId: null }, warm({ bookDepartures: [row], openingId: foreign })).speak).toBe(false);
  });
});
