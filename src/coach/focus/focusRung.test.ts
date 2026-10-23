import { describe, expect, it } from 'vitest';
import { RUNG_TIERS, RUNG_UP_FINDS, rungFrom, rungProgressLine, rungUpLine, SEED_RUNG, type RungGame, type TacticsRung } from './focusRung';

const game = (rung: TacticsRung, found: number, missed: number, at: number): RungGame => ({ rung, found, missed, at });

describe('the rung is read off the games played at it — never the rating', () => {
  it('no games yet: the seed (the record\'s own hold on your side)', () => {
    expect(rungFrom([], 1)).toEqual({ rung: 1, window: [], finds: 0, chances: 0, step: null });
    expect(SEED_RUNG).toEqual({ red: 0, grey: 0, short: 1, green: 2 });
  });
  it('UP: three unprompted finds at the rung in its last five games, found at 75% or better', () => {
    const r = rungFrom([game(0, 1, 0, 1), game(0, 1, 0, 2), game(0, 1, 0, 3)], 0);
    expect(r).toMatchObject({ rung: 1, step: 'up', window: [] });
  });
  it('twin: three finds at a rate under 75% do not step up', () => {
    const r = rungFrom([game(0, 1, 1, 1), game(0, 1, 1, 2), game(0, 1, 0, 3)], 0);
    expect(r).toMatchObject({ rung: 0, step: null, finds: 3, chances: 5 });
  });
  it('twin: two finds are not enough, however clean', () => {
    expect(rungFrom([game(0, 2, 0, 1)], 0)).toMatchObject({ rung: 0, step: null, finds: 2 });
  });
  it('only the games at the CURRENT rung count — finds before a step stay behind it', () => {
    const r = rungFrom([game(0, 3, 0, 1), game(1, 1, 0, 2)], 0);
    expect(r).toMatchObject({ rung: 1, step: null, finds: 1, window: [game(1, 1, 0, 2)] });
  });
  it('the window is the last five games at the rung', () => {
    const old = [1, 2, 3].map((i) => game(1, 1, 0, i));
    const recent = [4, 5, 6, 7, 8].map((i) => game(1, 0, 0, i));
    expect(rungFrom([...old, ...recent], 0)).toMatchObject({ rung: 1, step: null, finds: 0, window: recent });
  });
  it('BACK: five games at the rung below 75%', () => {
    const r = rungFrom([1, 2, 3, 4, 5].map((i) => game(2, 0, 1, i)), 0);
    expect(r).toMatchObject({ rung: 1, step: 'back' });
  });
  it('twin: four poor games are too few to step back; games with no chance never step back', () => {
    expect(rungFrom([1, 2, 3, 4].map((i) => game(2, 0, 1, i)), 0)).toMatchObject({ rung: 2, step: null });
    expect(rungFrom([1, 2, 3, 4, 5].map((i) => game(2, 0, 0, i)), 0)).toMatchObject({ rung: 2, step: null });
  });
  it('the ends hold: never below 0, never above 3', () => {
    expect(rungFrom([1, 2, 3, 4, 5].map((i) => game(0, 0, 1, i)), 0)).toMatchObject({ rung: 0, step: null });
    expect(rungFrom([game(3, 5, 0, 1)], 0)).toMatchObject({ rung: 3, step: null });
  });
  it('the order of the record does not matter — the games are read by time', () => {
    expect(rungFrom([game(1, 1, 0, 2), game(0, 3, 0, 1)], 0)).toMatchObject({ rung: 1, finds: 1 });
  });
});

describe('the tiers and the words', () => {
  it('what each rung does on a miss (David 2026-10-22)', () => {
    expect([0, 1, 2, 3].map((r) => RUNG_TIERS[r as TacticsRung].pauses)).toEqual([true, true, false, false]);
    expect([0, 1, 2, 3].map((r) => RUNG_TIERS[r as TacticsRung].showMe)).toEqual([true, false, false, false]);
    expect([0, 1, 2, 3].map((r) => RUNG_TIERS[r as TacticsRung].asksFirst)).toEqual([true, false, false, false]);
    expect([0, 1, 2, 3].map((r) => RUNG_TIERS[r as TacticsRung].chances)).toEqual([3, 2, 1, 1]);
  });
  it('the progress line counts to the next title; none at the top', () => {
    expect(rungProgressLine({ rung: 0, finds: 2, chances: 3 })).toBe('2 of 3 finds to Intermediate');
    expect(rungProgressLine({ rung: 2, finds: 7, chances: 8 })).toBe(`${RUNG_UP_FINDS} of 3 finds to Advanced`);
    expect(rungProgressLine({ rung: 3, finds: 1, chances: 1 })).toBeNull();
  });
  it('the finds are in but the rate is not: the line says the rate, never "3 of 3" (prod record 2026-10-23)', () => {
    expect(rungProgressLine({ rung: 0, finds: 3, chances: 9 })).toBe('3 of 9 found lately — find 3 of every 4 to reach Intermediate');
    expect(rungProgressLine({ rung: 0, finds: 3, chances: 4 }), 'twin: 3 of 4 is the rate').toBe('3 of 3 finds to Intermediate');
  });
  it('the rung-up line', () => {
    expect(rungUpLine(1)).toBe('Tactics: Intermediate!');
    expect(rungUpLine(3)).toBe('Tactics: Advanced!');
  });
});
