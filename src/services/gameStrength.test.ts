import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import { gameStrength, recordStrengthMove, resetGameStrengthForTests } from './gameStrength';
import { recallData, remember } from './studentMemory';

// A contested middlegame board (ply ≥ 16, so the estimator reads it).
const FEN = 'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P4/2PBPN2/PP1N1PPP/R2QK2R w KQ - 0 9';

function blunder(): Parameters<typeof recordStrengthMove>[2] {
  return { fenBefore: FEN, playedSan: 'Qa4', cpLoss: 400, evalBeforeMover: 20, prompted: false, coachMade: false };
}
function clean(): Parameters<typeof recordStrengthMove>[2] {
  return { fenBefore: FEN, playedSan: 'O-O', cpLoss: 0, evalBeforeMover: 20, prompted: false, coachMade: false };
}

describe('one strength per game, on every surface (David 2026-10-22)', () => {
  beforeEach(async () => {
    db.close(); await db.delete(); await db.open();
    resetGameStrengthForTests();
  });

  it('holds the number for the whole game, however the student plays — the next game feels it', async () => {
    const start = await gameStrength('g1', 1400);
    expect(start).toBe(1400);
    for (let k = 0; k < 6; k += 1) await recordStrengthMove('g1', 1400, blunder());
    // Same game: the opponent did not move.
    expect(await gameStrength('g1', 1400)).toBe(1400);
    // The next game starts where the board measured.
    const next = await gameStrength('g2', 1400);
    expect(next).toBeLessThan(1400 - 100);
  });

  it('a seed nothing has taught yet does not pin the next game: its own seed wins', async () => {
    expect(await gameStrength('before-profile', 400)).toBe(400);
    expect(await gameStrength('after-profile', 1100)).toBe(1100);
  });

  it('a game left and resumed keeps its number', async () => {
    const a = await gameStrength('learn-1', 1200);
    await gameStrength('play-1', 1200);
    for (let k = 0; k < 6; k += 1) await recordStrengthMove('play-1', 1200, clean());
    expect(await gameStrength('learn-1', 1200)).toBe(a);
  });

  it('every surface reads the same estimate: a move graded in one game shows in a new game anywhere', async () => {
    await gameStrength('learn-1', 1200);
    for (let k = 0; k < 6; k += 1) await recordStrengthMove('learn-1', 1200, clean());
    const play = await gameStrength('play-1', 1200);
    const openings = await gameStrength('opening-play:9', 1200);
    expect(play).toBeGreaterThan(1200);
    expect(openings).toBe(play);
  });

  it('a new game starts at the strength the app last saved, not the seed', async () => {
    await remember('live-strength', 'student', { rating: 1900, rd: 120, evidence: 4 });
    expect(Math.abs((await gameStrength('g-new', 1200)) - 1900)).toBeLessThan(10);
  });

  it('a number the old +60/−35 stepper wrote (no spread) is NOT carried — David\'s drifted 1679', async () => {
    await remember('live-strength', 'student', { rating: 1679, evidence: 6 });
    expect(await gameStrength('g-new', 1414)).toBe(1414);
  });

  it('saves the estimate as it learns, so a closed app keeps it', async () => {
    await gameStrength('g1', 1400);
    for (let k = 0; k < 3; k += 1) await recordStrengthMove('g1', 1400, blunder());
    await new Promise((r) => setTimeout(r, 20));
    const saved = await recallData('live-strength', 'student');
    expect(saved?.evidence).toBe(3);
    expect(saved?.rating).toBeLessThan(1400);
  });

  it('a find on a chance the coach made, and a prompted move, teach it nothing', async () => {
    await gameStrength('g1', 1400);
    await recordStrengthMove('g1', 1400, { ...clean(), coachMade: true });
    await recordStrengthMove('g1', 1400, { ...clean(), prompted: true });
    expect(await gameStrength('g2', 1400)).toBe(1400);
  });
});
