import { describe, it, expect } from 'vitest';
import { COINS, coinsFor, levelOfXp, multiplierFor, payout, xpForLevel } from './jackpot';

describe('the jackpot bar pays for skill', () => {
  it('a miss pays nothing, a checkmate pays the most of any single move', () => {
    expect(COINS.miss).toBe(0);
    const learnMoves = (['decision', 'saved', 'punished', 'onlyMove', 'gem'] as const).map((k) => COINS[k]);
    expect(Math.max(...learnMoves)).toBeLessThan(COINS.checkmate);
  });
  it('the streak raises the stakes: 1x, 2x at 3, 3x at 5, 5x at 8', () => {
    expect([0, 2, 3, 4, 5, 7, 8, 20].map(multiplierFor)).toEqual([1, 1, 2, 2, 3, 3, 5, 5]);
    expect(coinsFor('decision', 8)).toBe(COINS.decision * 5);
  });
  it('each level costs 100 more than the last', () => {
    expect([1, 2, 3, 4].map(xpForLevel)).toEqual([0, 100, 300, 600]);
    expect(levelOfXp(0)).toMatchObject({ level: 1, toNext: 0 });
    expect(levelOfXp(150)).toMatchObject({ level: 2, toNext: 0.25 });
    expect(levelOfXp(300).level).toBe(3);
  });
  it('a payout that crosses a level reports the jackpot, one that does not reports none', () => {
    expect(payout(90, 20)).toEqual({ xp: 110, level: 2, levelsGained: 1 });
    expect(payout(110, 20)).toEqual({ xp: 130, level: 2, levelsGained: 0 });
    expect(payout(0, 700).levelsGained).toBe(3);
  });
});
