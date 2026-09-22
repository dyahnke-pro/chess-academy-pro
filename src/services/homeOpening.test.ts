// homeOpening — THE HOME-OPENING COMPUTER (WO-HOME-OPENING-01 A3). Volume
// picks, a floor binds the computer, a 3-game 0% line can never win.
import { describe, it, expect } from 'vitest';
import { buildGameRecord } from '../test/factories';
import {
  chooseHomeOpening, isHomeOpeningGame, orderGamesForAnalysis, rankHomeOpeningCandidates, weakestVariation,
  HOME_OPENING_MIN_GAMES, HOME_OPENING_MIN_SHARE, VARIATION_MIN_GAMES,
} from './homeOpening';
import { openingKeyFor } from './openingKey';
import type { GameRecord } from '../types';

const ID = { chessComUsername: 'student' };
const VIENNA_C25 = openingKeyFor('C25', 'Vienna Game');
const VIENNA_C29 = openingKeyFor('C29', 'Vienna Game: Vienna Gambit');
const PIRC = openingKeyFor('B07', 'Pirc Defense');
const ELEPHANT = openingKeyFor('C40', 'Elephant Gambit');
const ITALIAN = openingKeyFor('C50', 'Italian Game');

/** n games as `colour` with the given key and a win rate. */
function games(key: ReturnType<typeof openingKeyFor>, colour: 'white' | 'black', n: number, winRate: number, tag: string): GameRecord[] {
  return Array.from({ length: n }, (_, i) => {
    const win = i < Math.round(n * winRate);
    const result = colour === 'white' ? (win ? '1-0' : '0-1') : (win ? '0-1' : '1-0');
    return buildGameRecord({
      id: `${tag}-${i}`, openingId: key, result,
      white: colour === 'white' ? 'student' : 'opp', black: colour === 'black' ? 'student' : 'opp',
      date: `2026-0${1 + (i % 9)}-1${i % 9}`,
    });
  });
}

describe('rankHomeOpeningCandidates', () => {
  it('groups by FAMILY across ECO codes, carries the sub-lines, and counts the record honestly', () => {
    const all = [...games(VIENNA_C25, 'white', 42, 0.43, 'v25'), ...games(VIENNA_C29, 'white', 46, 0.70, 'v28'), ...games(ITALIAN, 'white', 20, 0.5, 'it')];
    const r = rankHomeOpeningCandidates(all, ID, 'white');
    expect(r.totalGames).toBe(108);
    expect(r.unkeyed).toBe(0);
    expect(r.candidates[0].family).toBe('Vienna Game');
    expect(r.candidates[0].games).toBe(88);
    expect(r.candidates[0].variations.map((v) => v.name)).toEqual(['Vienna Game: Vienna Gambit', 'Vienna Game']);
    expect(r.candidates[0].key).toBe(VIENNA_C29); // the most-played sub-line anchors the family
    expect(r.candidates[0].score).toBeCloseTo((18 + 32) / 88, 2);
    expect(r.candidates[1].family).toBe('Italian Game');
  });

  it('a game is counted for the colour the STUDENT played, master + unfinished games never', () => {
    const asBlack = games(PIRC, 'black', 12, 0.5, 'p');
    const asWhite = games(ITALIAN, 'white', 3, 1, 'i');
    const master = buildGameRecord({ id: 'm', openingId: PIRC, isMasterGame: true, white: 'x', black: 'student', result: '0-1' });
    const unfinished = buildGameRecord({ id: 'u', openingId: PIRC, white: 'x', black: 'student', result: '*' });
    const black = rankHomeOpeningCandidates([...asBlack, ...asWhite, master, unfinished], ID, 'black');
    expect(black.totalGames).toBe(12);
    expect(black.candidates.map((c) => c.family)).toEqual(['Pirc Defense']);
    const white = rankHomeOpeningCandidates([...asBlack, ...asWhite], ID, 'white');
    expect(white.totalGames).toBe(3);
  });

  it('an unkeyed game is counted but cannot vote', () => {
    const keyed = games(PIRC, 'black', 10, 0.5, 'p');
    const unkeyed = [buildGameRecord({ id: 'nokey', openingId: null, white: 'x', black: 'student', result: '0-1' })];
    const r = rankHomeOpeningCandidates([...keyed, ...unkeyed], ID, 'black');
    expect(r.totalGames).toBe(11);
    expect(r.unkeyed).toBe(1);
    expect(r.candidates[0].share).toBe(1); // share is of KEYED games
  });
});

describe('chooseHomeOpening — the floor binds the computer', () => {
  it('a 3-game 0% line can NEVER win over a 40-game 73% line (the Elephant Gambit negative control)', () => {
    const all = [...games(ELEPHANT, 'black', 3, 0, 'e'), ...games(PIRC, 'black', 40, 0.73, 'p')];
    const r = rankHomeOpeningCandidates(all, ID, 'black');
    expect(chooseHomeOpening(r)?.family).toBe('Pirc Defense');
    const elephant = r.candidates.find((c) => c.family === 'Elephant Gambit');
    expect(elephant?.clearsFloor).toBe(false);
    // …and even when the Elephant is the ONLY line, it is not chosen.
    expect(chooseHomeOpening(rankHomeOpeningCandidates(games(ELEPHANT, 'black', 3, 0, 'e'), ID, 'black'))).toBeNull();
  });

  it('volume decides among lines that clear the floor — not score', () => {
    const all = [...games(PIRC, 'black', 30, 0.40, 'p'), ...games(ELEPHANT, 'black', 15, 0.90, 'e')];
    expect(chooseHomeOpening(rankHomeOpeningCandidates(all, ID, 'black'))?.family).toBe('Pirc Defense');
  });

  it(`the games floor is ${HOME_OPENING_MIN_GAMES} and the share floor is ${HOME_OPENING_MIN_SHARE * 100}%`, () => {
    const nine = rankHomeOpeningCandidates(games(PIRC, 'black', HOME_OPENING_MIN_GAMES - 1, 0.5, 'p'), ID, 'black');
    expect(chooseHomeOpening(nine)).toBeNull();
    const ten = rankHomeOpeningCandidates(games(PIRC, 'black', HOME_OPENING_MIN_GAMES, 0.5, 'p'), ID, 'black');
    expect(chooseHomeOpening(ten)?.family).toBe('Pirc Defense');
    // 12 Pirc games inside 400 keyed games = 3% share → under the share floor.
    const diluted = [...games(PIRC, 'black', 12, 0.5, 'p'), ...games(ELEPHANT, 'black', 388, 0.5, 'e')];
    const r = rankHomeOpeningCandidates(diluted, ID, 'black');
    expect(r.candidates.find((c) => c.family === 'Pirc Defense')?.clearsFloor).toBe(false);
  });
});

describe('weakestVariation — the line inside the home opening that bleeds', () => {
  it('ranks by games × score deficit among sub-lines with enough games; null when none is under 50%', () => {
    const all = [...games(VIENNA_C25, 'white', 42, 0.43, 'v25'), ...games(VIENNA_C29, 'white', 46, 0.70, 'v28')];
    const c = rankHomeOpeningCandidates(all, ID, 'white').candidates[0];
    expect(weakestVariation(c)?.key).toBe(VIENNA_C25);
    const fine = rankHomeOpeningCandidates(games(VIENNA_C29, 'white', 20, 0.7, 'v'), ID, 'white').candidates[0];
    expect(weakestVariation(fine)).toBeNull();
    const thin = rankHomeOpeningCandidates(games(VIENNA_C25, 'white', VARIATION_MIN_GAMES - 1, 0, 'v'), ID, 'white').candidates[0];
    expect(weakestVariation(thin)).toBeNull();
  });
});

describe('orderGamesForAnalysis — home openings first, ALL of them, then newest', () => {
  it('puts every home-opening game ahead of the rest, newest first within each half', () => {
    const home = { white: { family: 'Vienna Game' }, black: { family: 'Pirc Defense' } };
    const vienna = games(VIENNA_C25, 'white', 3, 0.5, 'v');
    const pirc = games(PIRC, 'black', 2, 0.5, 'p');
    const italian = games(ITALIAN, 'white', 4, 0.5, 'i');
    const pircAsWhite = buildGameRecord({ id: 'pw', openingId: PIRC, white: 'student', black: 'opp', result: '1-0', date: '2026-09-09' });
    const { home: h, rest } = orderGamesForAnalysis([...italian, pircAsWhite, ...vienna, ...pirc], ID, home);
    expect(h.map((g) => g.id).sort()).toEqual([...vienna, ...pirc].map((g) => g.id).sort());
    expect(rest.map((g) => g.id)).toContain('pw'); // the Pirc the student FACED is not their Pirc
    for (const half of [h, rest]) {
      for (let i = 1; i < half.length; i += 1) {
        expect(new Date(half[i - 1].date).getTime()).toBeGreaterThanOrEqual(new Date(half[i].date).getTime());
      }
    }
    expect(isHomeOpeningGame(pircAsWhite, ID, home)).toBe(false);
  });

  it('with no home opening yet everything is "rest", newest first', () => {
    const { home: h, rest } = orderGamesForAnalysis(games(PIRC, 'black', 5, 0.5, 'p'), ID, { white: null, black: null });
    expect(h).toHaveLength(0);
    expect(rest).toHaveLength(5);
  });
});
