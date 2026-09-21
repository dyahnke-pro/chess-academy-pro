/**
 * THE POSITIVE HALF IS READ, NOT JUST WRITTEN (2026-09-18).
 *
 * `capabilityEvidence` had been writing `held` rows since it was built, and
 * `getCapabilityProfile` had THREE call sites — all inside its own test. So the
 * heat map had three states and the app could only ever say two of them, and
 * every data term was RAISE-ONLY: the coach could get louder about a student and
 * never quieter.
 *
 * These gates hold the SHAPE of the fix, not a number: the three states must
 * stay distinguishable, and green must be structurally unable to quiet a ply the
 * student got wrong.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeNeed, coldStudent, HELD_FOR_PROVEN, type StudentNeedContext } from './needScore';
import type { CapabilityProfile } from './capabilityEvidence';
import type { MisconceptionTagId } from '../data/misconceptionTags';

const TAG = 'hangs-piece' as MisconceptionTagId;

/** An entry in the shape the profile now returns. The bar is a RECENT STREAK
 *  across DISTINCT GAMES (measured 2026-09-20: three holds are reachable
 *  inside ONE game, and a tag proven that way flipped four games later), so a
 *  fixture has to say how many games the streak spans — `held` alone can no
 *  longer stand in for proven. */
const entry = (o: { held?: number; broken?: number; streak?: number; games?: number }) => ({
  held: o.held ?? o.streak ?? 0,
  broken: o.broken ?? 0,
  heldStreak: o.streak ?? o.held ?? 0,
  streakGames: o.games ?? 0,
});

const ctxWith = (profile: CapabilityProfile): StudentNeedContext => ({
  ...coldStudent(1500), gamesPlayed: 50, capabilities: profile,
});
// `onThread` gives the ply a real need to LOWER FROM. Without it every base
// score is 0 and the clamp makes the whole term unobservable — which is itself
// correct behaviour (nothing to quiet), but it tests nothing.
const ply = (tags: MisconceptionTagId[]) =>
  ({ ply: 9, studentMove: true, clauseKind: null, fundamentalId: null, onThread: true, posedTags: tags, playedCleanly: true });

describe('the capability profile is READ by the need computer', () => {
  it('GREEN — a proven capability LOWERS need', () => {
    const proven = ctxWith(new Map([[TAG, entry({ streak: HELD_FOR_PROVEN, games: 2 })]]));
    const quiet = computeNeed(ply([TAG]), proven);
    const base = computeNeed(ply([TAG]), ctxWith(new Map()));
    expect(quiet.score, 'proven evidence must make the coach quieter').toBeLessThan(base.score);
    expect(quiet.reasons.join(' ')).toMatch(/proven/);
  });

  it('GREY — a capability never asked about lowers NOTHING (absent ≠ mastered)', () => {
    const grey = ctxWith(new Map([['some-other-tag' as MisconceptionTagId, entry({ streak: 99, games: 9 })]]));
    expect(computeNeed(ply([TAG]), grey).score).toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('RED — one broken row stops green arguing, however many holds sit beside it', () => {
    // A break ENDS the streak, so the lifetime holds beside it prove nothing.
    const red = ctxWith(new Map([[TAG, entry({ held: 500, broken: 1, streak: 0, games: 0 })]]));
    expect(computeNeed(ply([TAG]), red).score).toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('seen but not yet proven does not count — one clean move is not mastery', () => {
    const thin = ctxWith(new Map([[TAG, entry({ streak: HELD_FOR_PROVEN - 1, games: 2 })]]));
    expect(computeNeed(ply([TAG]), thin).score).toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('ONE GAME OF CLEAN ANSWERS IS NOT PROVEN — green\'s claim is "you did it again NEXT time"', () => {
    // Measured 2026-09-20: 6 of 6 real game-seats reached three holds inside a
    // SINGLE game, and one student\'s tag proven that way broke four games
    // later. A streak that never left one game is not evidence of a habit.
    const oneGame = ctxWith(new Map([[TAG, entry({ streak: 9, games: 1 })]]));
    expect(computeNeed(ply([TAG]), oneGame).score)
      .toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('GREEN IS RECOVERABLE — a break resets the streak, it does not bar green forever', () => {
    // The opposite defect, and the one the heat map exists to fix: the old
    // rule required a LIFETIME `broken === 0`, so one slip ever meant a
    // student who then FIXED the weakness could never be told they had.
    const recovered = ctxWith(new Map([[TAG, entry({ held: 12, broken: 4, streak: HELD_FOR_PROVEN, games: 2 })]]));
    expect(computeNeed(ply([TAG]), recovered).score)
      .toBeLessThan(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('never goes negative, and the term can only lower — never raise', () => {
    const proven = ctxWith(new Map([[TAG, entry({ streak: 99, games: 4 })]]));
    const v = computeNeed(ply([TAG]), proven);
    expect(v.score).toBeGreaterThanOrEqual(0);
    expect(v.score).toBeLessThanOrEqual(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('a ply with NO posed capability is untouched', () => {
    const proven = ctxWith(new Map([[TAG, entry({ streak: 99, games: 4 })]]));
    expect(computeNeed(ply([]), proven).score).toBe(computeNeed(ply([]), ctxWith(new Map())).score);
  });

  it('GREEN cannot silence a ply the student got WRONG — the blunder guard', () => {
    // This used to be structural-by-accident: `capabilitiesShown` pre-filtered
    // the list, so green was safe only because of WHICH list the caller passed
    // — a property no reader of `capabilityTerm` could check. The tags are now
    // POSED (ungated, so the weakness term can still see the hole) and the
    // guard travels beside them, so this has to be asserted directly.
    const proven = ctxWith(new Map([[TAG, entry({ streak: 99, games: 4 })]]));
    const blundered = { ...ply([TAG]), playedCleanly: false };
    expect(computeNeed(blundered, proven).score)
      .toBe(computeNeed(blundered, ctxWith(new Map())).score);
  });
});

describe('the wire fires — a reader exists outside the test', () => {
  it('the loader reads the profile into the context', () => {
    const src = readFileSync('src/services/studentNeedLoader.ts', 'utf8');
    expect(src).toMatch(/getCapabilityProfile\(\)/);
    expect(src).toMatch(/capabilities,/);
  });

  it('a production caller computes the ply tags from the board', () => {
    const src = readFileSync('src/services/teachingSelector.ts', 'utf8');
    expect(src, 'the join is computed by the same computer that writes green, never authored')
      .toMatch(/capabilitiesPosed\(/);
    expect(src).toMatch(/posedTags:/);
    // POSED, not pre-filtered: the lane must hand the guard across separately,
    // or the weakness term goes blind on exactly the plies it should speak on.
    expect(src).toMatch(/playedCleanly:\s*movePlayedCleanly\(/);
    expect(src, 'the mistake guard must NOT be pre-applied to the tag list')
      .not.toMatch(/capabilitiesPosed\([^)]*cpLoss/);
  });

  it('the cp-loss sign is derived per colour — white falls, black rises', () => {
    // The sign is the trap this repo has been bitten by before. A wrong sign
    // hands a blunder to `movePlayedCleanly` as a clean move, which would record
    // green for a mistake AND quiet the ply that most needed teaching.
    const src = readFileSync('src/services/teachingSelector.ts', 'utf8');
    expect(src).toMatch(/playerColor === 'white'\s*\?\s*p\.evalBefore - p\.evalAfter\s*:\s*p\.evalAfter - p\.evalBefore/);
  });
});
