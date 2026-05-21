import { describe, it, expect } from 'vitest';
import {
  translatePopularity,
  translateScore,
  describeSampleSize,
  translateMasterMove,
  describeTopMasterMove,
} from './explorerTranslate';
import type { MasterPlayMove, MasterPlayResult } from './masterPlayTypes';

function move(p: Partial<MasterPlayMove>): MasterPlayMove {
  const white = p.white ?? 0;
  const draws = p.draws ?? 0;
  const black = p.black ?? 0;
  const games = p.games ?? white + draws + black;
  return {
    san: p.san ?? 'Nf3',
    games,
    white, draws, black,
    whitePct: games ? white / games : 0,
    drawPct: games ? draws / games : 0,
    blackPct: games ? black / games : 0,
    averageRating: p.averageRating,
  };
}

describe('translatePopularity', () => {
  it('maps share to plain English', () => {
    expect(translatePopularity(60, 100)).toBe('the main move');
    expect(translatePopularity(25, 100)).toBe('a common choice');
    expect(translatePopularity(8, 100)).toBe('a sideline');
    expect(translatePopularity(1, 100)).toBe('rarely played');
    expect(translatePopularity(0, 100)).toBe('almost never played');
    expect(translatePopularity(5, 0)).toBe('almost never played');
  });
});

describe('translateScore', () => {
  it('scores from the mover perspective, words only', () => {
    expect(translateScore(move({ white: 70, draws: 20, black: 10 }), 'white')).toBe('scores very well');
    expect(translateScore(move({ white: 33, draws: 34, black: 33 }), 'white')).toBe('is roughly equal');
    expect(translateScore(move({ white: 70, draws: 20, black: 10 }), 'black')).toBe('scores poorly');
    expect(translateScore(move({ white: 0, draws: 0, black: 0, games: 0 }), 'white')).toBe('untested');
  });
});

describe('describeSampleSize — words, never digits', () => {
  it('buckets game counts to words', () => {
    expect(describeSampleSize(50000)).toBe('thousands of master games');
    expect(describeSampleSize(1500)).toBe('over a thousand master games');
    expect(describeSampleSize(300)).toBe('hundreds of master games');
    expect(describeSampleSize(40)).toBe('dozens of master games');
    expect(describeSampleSize(8)).toBe('a handful of master games');
    expect(describeSampleSize(1)).toBe('a single master game');
    expect(describeSampleSize(0)).toBe('no master games');
  });
});

describe('translateMasterMove', () => {
  it('produces a spoken-safe sentence with no raw percentages', () => {
    const t = translateMasterMove(move({ san: 'Nf3', white: 4200, draws: 3000, black: 2800 }), 12000, 'white');
    expect(t.san).toBe('Nf3');
    expect(t.sentence).not.toMatch(/\d+%/);
    expect(t.sentence).toContain('Nf3');
    expect(t.sentence).toContain('White');
  });
});

describe('describeTopMasterMove', () => {
  it('returns null when there is no master data', () => {
    const empty: MasterPlayResult = { fen: '...', totalGames: 0, moves: [], source: 'none' };
    expect(describeTopMasterMove(empty, 'white')).toBeNull();
  });
  it('describes the most-played move', () => {
    const res: MasterPlayResult = {
      fen: '...', totalGames: 100, source: 'local',
      moves: [move({ san: 'a4', games: 60, white: 35, draws: 15, black: 10 }), move({ san: 'd4', games: 40 })],
    };
    const t = describeTopMasterMove(res, 'white');
    expect(t?.san).toBe('a4');
    expect(t?.popularity).toBe('the main move');
  });
});
