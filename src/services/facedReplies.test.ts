// facedReplies — what the student's opponents played against them, by board,
// read from the games store (WO-COURSE-01 D: "own games first").
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildGameRecord, resetFactoryCounter } from '../test/factories';

vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { id: 'main', name: 'S', preferences: { chessComUsername: 'student' } } }) },
}));

import { facedRepliesIndex, timesFaced, __resetFacedReplies } from './facedReplies';

const pgnOf = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.pgn(); };
const fenAfter = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const ITALIAN_H6 = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'h6', 'd4'];
const AT_BC4 = fenAfter(ITALIAN_H6.slice(0, 5));

describe('facedRepliesIndex — whose moves count', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    __resetFacedReplies();
    await db.games.clear();
  });

  it('counts the OPPONENT\'s moves in the games the student played as that colour', async () => {
    await db.games.bulkPut([
      buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'student', black: 'opp-1' }),
      buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'student', black: 'opp-2' }),
      // The student as Black: their own …h6 is not an opponent's reply.
      buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'opp-3', black: 'student' }),
      // A master game and a seeded fixture are never the student's.
      buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'student', black: 'opp-4', isMasterGame: true }),
      buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'student', black: 'opp-5', fixture: true }),
    ]);
    const white = await facedRepliesIndex('white');
    expect(timesFaced(white, AT_BC4, 'h6')).toBe(2);
    // White's own move on the board before is not counted as faced.
    expect(timesFaced(white, fenAfter(ITALIAN_H6.slice(0, 4)), 'Bc4')).toBe(0);
    const black = await facedRepliesIndex('black');
    expect(timesFaced(black, AT_BC4, 'h6')).toBe(0);
    expect(timesFaced(black, fenAfter(ITALIAN_H6.slice(0, 4)), 'Bc4')).toBe(1);
  });
});

describe('facedRepliesIndex — from the games store, once per game count', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    __resetFacedReplies();
    await db.games.clear();
  });

  it('reads the student\'s games and rebuilds when a game is added', async () => {
    await db.games.put(buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'student', black: 'opp-1' }));
    expect(timesFaced(await facedRepliesIndex('white'), AT_BC4, 'h6')).toBe(1);
    await db.games.put(buildGameRecord({ pgn: pgnOf(ITALIAN_H6), white: 'student', black: 'opp-2' }));
    expect(timesFaced(await facedRepliesIndex('white'), AT_BC4, 'h6')).toBe(2);
  });
});
