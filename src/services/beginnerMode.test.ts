/** Beginner mode and the Start-here path (David 2026-10-02). */
import { describe, it, expect } from 'vitest';
import { isBeginnerMode } from './ratingBands';
import { rankUpNext, START_STEPS, type UpNextInput } from './upNextPicker';

describe('isBeginnerMode — what they said, until their games say otherwise', () => {
  it('on for New to chess and Beginner at their picked strength', () => {
    expect(isBeginnerMode({ skillBand: 'newcomer', currentRating: 600 })).toBe(true);
    expect(isBeginnerMode({ skillBand: 'beginner', currentRating: 900 })).toBe(true);
  });
  it('graduates itself once a measured rating reaches the intermediate tier', () => {
    expect(isBeginnerMode({ skillBand: 'beginner', currentRating: 1000 })).toBe(false);
  });
  it('off for Intermediate, Advanced, Skip, and a profile that never answered', () => {
    expect(isBeginnerMode({ skillBand: 'intermediate', currentRating: 900 })).toBe(false);
    expect(isBeginnerMode({ skillBand: 'advanced', currentRating: 900 })).toBe(false);
    expect(isBeginnerMode({ skillBand: 'skipped', currentRating: 400 })).toBe(false);
    expect(isBeginnerMode({ currentRating: 400 })).toBe(false);
    expect(isBeginnerMode(null)).toBe(false);
  });
});

describe('Up next — the Start-here path leads for a beginner', () => {
  const base: UpNextInput = { reps: [], latestGameSlip: null, grownPuzzle: null, freeOpeningOpen: false, coldStart: true, startSteps: [] };

  it('the next undone step comes first, ahead of a cold-start Deep Run', () => {
    const r = rankUpNext({ ...base, startSteps: [...START_STEPS] });
    expect(r[0]).toMatchObject({ kind: 'start', key: 'up:start:fundamentals', path: '/coach/fundamentals' });
    expect(r[1].kind).toBe('deep-run');
  });

  it('the order is fundamentals, the Italian, a coached game, then e5 as Black', () => {
    expect(START_STEPS).toEqual(['fundamentals', 'italian', 'first-game', 'black-e5']);
    const italian = rankUpNext({ ...base, startSteps: ['italian', 'first-game'] })[0];
    expect(italian).toMatchObject({ key: 'up:start:italian', path: '/openings/italian-game' });
    const black = rankUpNext({ ...base, startSteps: ['black-e5'] })[0];
    expect(black.path).toBe('/openings/two-knights-defence');
  });

  it('no start pick outside beginner mode (negative control)', () => {
    expect(rankUpNext(base).some((p) => p.kind === 'start')).toBe(false);
  });
});
