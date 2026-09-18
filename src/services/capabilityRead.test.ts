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

const ctxWith = (profile: CapabilityProfile): StudentNeedContext => ({
  ...coldStudent(1500), gamesPlayed: 50, capabilities: profile,
});
// `onThread` gives the ply a real need to LOWER FROM. Without it every base
// score is 0 and the clamp makes the whole term unobservable — which is itself
// correct behaviour (nothing to quiet), but it tests nothing.
const ply = (tags: MisconceptionTagId[]) => ({ ply: 9, studentMove: true, onThread: true, capabilityTags: tags });

describe('the capability profile is READ by the need computer', () => {
  it('GREEN — a proven capability LOWERS need', () => {
    const proven = ctxWith(new Map([[TAG, { held: HELD_FOR_PROVEN, broken: 0 }]]));
    const quiet = computeNeed(ply([TAG]), proven);
    const base = computeNeed(ply([TAG]), ctxWith(new Map()));
    expect(quiet.score, 'proven evidence must make the coach quieter').toBeLessThan(base.score);
    expect(quiet.reasons.join(' ')).toMatch(/proven/);
  });

  it('GREY — a capability never asked about lowers NOTHING (absent ≠ mastered)', () => {
    const grey = ctxWith(new Map([['some-other-tag' as MisconceptionTagId, { held: 99, broken: 0 }]]));
    expect(computeNeed(ply([TAG]), grey).score).toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('RED — one broken row stops green arguing, however many holds sit beside it', () => {
    const red = ctxWith(new Map([[TAG, { held: 500, broken: 1 }]]));
    expect(computeNeed(ply([TAG]), red).score).toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('seen but not yet proven does not count — one clean move is not mastery', () => {
    const thin = ctxWith(new Map([[TAG, { held: HELD_FOR_PROVEN - 1, broken: 0 }]]));
    expect(computeNeed(ply([TAG]), thin).score).toBe(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('never goes negative, and the term can only lower — never raise', () => {
    const proven = ctxWith(new Map([[TAG, { held: 99, broken: 0 }]]));
    const v = computeNeed(ply([TAG]), proven);
    expect(v.score).toBeGreaterThanOrEqual(0);
    expect(v.score).toBeLessThanOrEqual(computeNeed(ply([TAG]), ctxWith(new Map())).score);
  });

  it('a ply with NO demonstrated capability is untouched — this is the blunder guard', () => {
    // `capabilitiesShown` returns [] for a move costing a pawn or more, so a ply
    // the student got wrong arrives here with no tags. Green therefore cannot
    // silence a blunder, structurally rather than by a guard someone must
    // remember to keep.
    const proven = ctxWith(new Map([[TAG, { held: 99, broken: 0 }]]));
    expect(computeNeed(ply([]), proven).score).toBe(computeNeed(ply([]), ctxWith(new Map())).score);
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
      .toMatch(/capabilitiesShown\(/);
    expect(src).toMatch(/capabilityTags:/);
  });

  it('the cp-loss sign is derived per colour — white falls, black rises', () => {
    // The sign is the trap this repo has been bitten by before. A wrong sign
    // hands a blunder to `capabilitiesShown` as a clean move, which would record
    // green for a mistake AND quiet the ply that most needed teaching.
    const src = readFileSync('src/services/teachingSelector.ts', 'utf8');
    expect(src).toMatch(/playerColor === 'white'\s*\?\s*p\.evalBefore - p\.evalAfter\s*:\s*p\.evalAfter - p\.evalBefore/);
  });
});
