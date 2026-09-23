// homeOpeningSteer — Play steers into the home repertoire's most-faced lines
// (WO-HOME-OPENING-01 A7). Gate from PLAN: with the Pirc as home and the
// student Black, the bot's first move is e4 on 10 of 10 games; a control with
// no home opening keeps today's behaviour (null → the layers below).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chess } from 'chess.js';
import { db } from '../db/schema';
import { buildGameRecord, buildUserProfile, resetFactoryCounter } from '../test/factories';
import { openingKeyFor } from './openingKey';
import type { GameRecord } from '../types';

vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: () => ({ activeProfile: { id: 'main', name: 'S', preferences: { chessComUsername: 'student' } }, setActiveProfile: () => undefined }) },
}));
vi.mock('./appAuditor', () => ({ logAppAudit: async () => undefined }));

import { buildSteerIndex, isHomeSteerWarm, openingSans, pickHomeSteerMove, steerFromIndex, STEER_MAX_PLY, STEER_MIN_GAMES, __resetHomeSteerCacheForTests } from './homeOpeningSteer';
import { __resetHomeOpeningCacheForTests } from './homeOpeningService';

const PIRC = openingKeyFor('B07', 'Pirc Defense');
const ID = { chessComUsername: 'student' };
const pgnOf = (sans: readonly string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); c.setHeader('Result', '1-0'); return c.pgn(); };
const AUSTRIAN = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'f4', 'Bg7', 'Nf3', 'O-O'];
const CLASSICAL = ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6', 'Nf3', 'Bg7', 'Be2', 'O-O'];
function pircGames(n: number, line: readonly string[], tag: string): GameRecord[] {
  return Array.from({ length: n }, (_, i) => buildGameRecord({ id: `${tag}-${i}`, openingId: PIRC, pgn: pgnOf(line), white: `opp-${i}`, black: 'student', result: '1-0' }));
}

describe('buildSteerIndex + steerFromIndex', () => {
  it('indexes only the OPPONENT\'s replies in the home games, and steers by what they faced most', () => {
    const games = [...pircGames(7, AUSTRIAN, 'a'), ...pircGames(3, CLASSICAL, 'c')];
    const index = buildSteerIndex(games, ID, 'black', 'Pirc Defense');
    const start = new Chess().fen();
    // Move 1 for White: every home game began 1.e4 → deterministic, 10 of 10.
    for (let i = 0; i < 10; i += 1) expect(steerFromIndex(index, start, 'Pirc Defense', Math.random)?.san).toBe('e4');
    // After 1.e4 d6 2.d4 Nf6 3.Nc3 g6: 7 faced f4, 3 faced Nf3 — weighted by frequency.
    const c = new Chess(); for (const s of AUSTRIAN.slice(0, 6)) c.move(s);
    expect(steerFromIndex(index, c.fen(), 'Pirc Defense', () => 0.1)?.san).toBe('f4');
    expect(steerFromIndex(index, c.fen(), 'Pirc Defense', () => 0.95)?.san).toBe('Nf3');
    expect(steerFromIndex(index, c.fen(), 'Pirc Defense', () => 0.1)?.total).toBe(10);
    // The student's OWN moves are not in the index (position after 1.e4, Black to move).
    const afterE4 = new Chess(); afterE4.move('e4');
    expect(steerFromIndex(index, afterE4.fen(), 'Pirc Defense')).toBeNull();
  });

  it(`stays silent below ${STEER_MIN_GAMES} games at a position, and off the home line entirely`, () => {
    const index = buildSteerIndex(pircGames(2, AUSTRIAN, 'a'), ID, 'black', 'Pirc Defense');
    expect(steerFromIndex(index, new Chess().fen(), 'Pirc Defense')).toBeNull();
    const many = buildSteerIndex(pircGames(9, AUSTRIAN, 'a'), ID, 'black', 'Pirc Defense');
    const sicilian = new Chess(); sicilian.move('e4'); sicilian.move('c5');
    expect(steerFromIndex(many, sicilian.fen(), 'Pirc Defense')).toBeNull();
  });

  it('a Pirc the student FACED as White never steers their Black games', () => {
    const faced = Array.from({ length: 6 }, (_, i) => buildGameRecord({ id: `w${i}`, openingId: PIRC, pgn: pgnOf(AUSTRIAN), white: 'student', black: 'opp', result: '1-0' }));
    expect(buildSteerIndex(faced, ID, 'black', 'Pirc Defense').size).toBe(0);
  });
});

describe('pickHomeSteerMove — from the persisted home opening', () => {
  beforeEach(async () => {
    resetFactoryCounter();
    __resetHomeSteerCacheForTests();
    __resetHomeOpeningCacheForTests();
    await db.delete();
    await db.open();
    await db.profiles.put(buildUserProfile({ id: 'main', preferences: { ...buildUserProfile().preferences, chessComUsername: 'student' } }));
  });

  it('Pirc as home, student Black → the bot opens e4 on 10 of 10 games', async () => {
    await db.games.bulkPut(pircGames(12, AUSTRIAN, 'a'));
    for (let i = 0; i < 10; i += 1) {
      const pick = await pickHomeSteerMove(new Chess().fen(), 'black');
      expect(pick?.san).toBe('e4');
      expect(pick?.uci).toBe('e2e4');
    }
  });

  it('CONTROL: no home opening → null (today\'s behaviour), and the student\'s other colour is untouched', async () => {
    expect(await pickHomeSteerMove(new Chess().fen(), 'black')).toBeNull();
    await db.games.bulkPut(pircGames(12, AUSTRIAN, 'a'));
    __resetHomeOpeningCacheForTests();
    expect(await pickHomeSteerMove(new Chess().fen(), 'white')).toBeNull(); // no home as White
  });
});

describe('isHomeSteerWarm — the cold build is a different budget from the warm lookup (walk 2, 2026-09-23)', () => {
  it('is false before the first call and true for that colour after it', async () => {
    __resetHomeSteerCacheForTests();
    expect(isHomeSteerWarm('black')).toBe(false);
    await pickHomeSteerMove(new Chess().fen(), 'black');
    expect(isHomeSteerWarm('black')).toBe(true);
    expect(isHomeSteerWarm('white')).toBe(false);
  });
});


describe('openingSans — the raw imported PGN, opening plies only (walk 4, 2026-09-23)', () => {
  const RAW = `[Event "Live Chess"]
[Site "Chess.com"]
[Result "1-0"]
[ECO "B90"]

1. e4 {[%clk 0:09:58.3]} 1... c5 {[%clk 0:09:57]} 2. Nf3 $1 {[%eval 0.3]} d6 (2... Nc6 3. d4) 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 1-0`;

  it('matches chess.js loadPgn on a chess.com game with headers, clocks, a variation and a NAG', () => {
    const c = new Chess();
    c.loadPgn(RAW);
    expect(openingSans(RAW, STEER_MAX_PLY)).toEqual(c.history());
    expect(openingSans(RAW, 3)).toEqual(['e4', 'c5', 'Nf3']);
  });

  it('a corrupt tail never poisons the index: replay stops at the first illegal token', () => {
    const g = buildGameRecord({ id: 'bad', openingId: PIRC, pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Qz9 Bg7', white: 'opp', black: 'student', result: '1-0' });
    const index = buildSteerIndex([g, g, g], ID, 'black', 'Pirc Defense');
    const c = new Chess(); for (const s of ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6']) c.move(s);
    expect(steerFromIndex(index, new Chess().fen(), 'Pirc Defense')?.san).toBe('e4');
    expect(steerFromIndex(index, c.fen(), 'Pirc Defense')).toBeNull();
  });
});
