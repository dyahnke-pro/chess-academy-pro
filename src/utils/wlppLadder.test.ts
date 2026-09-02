import { describe, it, expect } from 'vitest';
import type { OpeningRecord } from '../types';
import {
  MAIN_LINE_INDEX,
  isRungComplete,
  isRungUnlocked,
  areWeaponsUnlocked,
  hasDrilledOpening,
  nextRung,
  lockHint,
  unlockBudgetFor,
} from './wlppLadder';

function rec(p: Partial<OpeningRecord>): OpeningRecord {
  return { id: 'x', name: 'X', isFavorite: false, drillAttempts: 0, lastStudied: null,
    woodpeckerReps: 0, woodpeckerSpeed: null, woodpeckerLastDate: null, ...p } as OpeningRecord;
}

describe('wlppLadder', () => {
  // David 2026-09-02 ("too many clicks to get to playing"): the forward-lock
  // ladder is retired — every rung + all weapons are unlocked up front. Rung
  // COMPLETION is still tracked (checkmarks/progress), it just no longer GATES.
  it('every rung + weapons are unlocked up front (no forward-lock)', () => {
    const o = rec({});
    const L = MAIN_LINE_INDEX;
    expect(isRungUnlocked(o, L, 'watch')).toBe(true);
    expect(isRungUnlocked(o, L, 'learn')).toBe(true);
    expect(isRungUnlocked(o, L, 'practice')).toBe(true);
    expect(isRungUnlocked(o, L, 'play')).toBe(true);
    expect(areWeaponsUnlocked(o, L)).toBe(true);
    // completion still starts empty; nextRung still points at the first todo.
    expect(isRungComplete(o, L, 'watch')).toBe(false);
    expect(nextRung(o, L)).toBe('watch');
  });

  it('completion tracking unchanged (drives checkmarks, not access)', () => {
    const o = rec({ linesDiscovered: [0] });
    expect(isRungComplete(o, 0, 'watch')).toBe(true);
    expect(isRungComplete(o, 0, 'learn')).toBe(false);
    // access stays open regardless of what is complete.
    expect(isRungUnlocked(o, 0, 'practice')).toBe(true);
    expect(nextRung(o, 0)).toBe('learn');
  });

  it('weapons are unlocked even before Play is completed', () => {
    const o = rec({ linesDiscovered: [0], linesLearned: [0], linesPerfected: [0] });
    expect(isRungComplete(o, 0, 'play')).toBe(false);
    expect(areWeaponsUnlocked(o, 0)).toBe(true);
  });

  it('full completion: nextRung null, weapons unlocked', () => {
    const o = rec({ linesDiscovered: [0], linesLearned: [0], linesPerfected: [0], linesPlayed: [0] });
    expect(areWeaponsUnlocked(o, 0)).toBe(true);
    expect(nextRung(o, 0)).toBeNull();
  });

  it('all lines are unlocked regardless of per-line state', () => {
    const o = rec({ linesUnlockedAll: [2] });
    expect(isRungUnlocked(o, 2, 'play')).toBe(true);
    expect(areWeaponsUnlocked(o, 2)).toBe(true);
    // a DIFFERENT line with no state is ALSO unlocked now (whole course open).
    expect(isRungUnlocked(o, 3, 'learn')).toBe(true);
    expect(areWeaponsUnlocked(o, 3)).toBe(true);
  });

  it('per-line COMPLETION independence: main vs variation tracked separately', () => {
    const o = rec({ linesDiscovered: [MAIN_LINE_INDEX] });
    expect(isRungComplete(o, MAIN_LINE_INDEX, 'watch')).toBe(true);
    expect(isRungComplete(o, 0, 'watch')).toBe(false);
    // ...but both lines are accessible.
    expect(isRungUnlocked(o, MAIN_LINE_INDEX, 'learn')).toBe(true);
    expect(isRungUnlocked(o, 0, 'learn')).toBe(true);
  });

  // hasDrilledOpening is the freemium "you chose this opening" signal (David
  // 2026-09-02). Watching is free to sample across every opening; the pick
  // locks only once the student COMPLETES an active drill here.
  it('hasDrilledOpening: false for a fresh opening', () => {
    expect(hasDrilledOpening(rec({}))).toBe(false);
  });

  it('hasDrilledOpening: WATCH completions do NOT count (watching is free)', () => {
    expect(hasDrilledOpening(rec({ linesDiscovered: [MAIN_LINE_INDEX, 0, 3] }))).toBe(false);
  });

  it('hasDrilledOpening: a completed Learn / Practice / Play counts', () => {
    expect(hasDrilledOpening(rec({ linesLearned: [0] }))).toBe(true);
    expect(hasDrilledOpening(rec({ linesPerfected: [MAIN_LINE_INDEX] }))).toBe(true);
    expect(hasDrilledOpening(rec({ linesPlayed: [2] }))).toBe(true);
  });

  // The gems/weapons tab is payoff content, not the front door — finishing ANY
  // of its rungs (Watch included) is a commitment, unlike a main-line Watch.
  it('hasDrilledOpening: ANY weapon rung counts, including a gem WATCH', () => {
    expect(hasDrilledOpening(rec({ weaponRungs: { 'gem-1': ['watch'] } }))).toBe(true);
    expect(hasDrilledOpening(rec({ weaponRungs: { 'gem-1': ['watch', 'learn'] } }))).toBe(true);
    expect(hasDrilledOpening(rec({ weaponRungs: { 'trap-a': ['practice'] } }))).toBe(true);
    // ...but a main-LINE watch still does not.
    expect(hasDrilledOpening(rec({ linesDiscovered: [0] }))).toBe(false);
  });

  it('hasDrilledOpening: empty arrays / empty weaponRungs are not a drill', () => {
    expect(hasDrilledOpening(rec({ linesLearned: [], linesPlayed: [] }))).toBe(false);
    expect(hasDrilledOpening(rec({ weaponRungs: {} }))).toBe(false);
    expect(hasDrilledOpening(rec({ weaponRungs: { 'gem-1': [] } }))).toBe(false);
  });

  it('lockHint reads "Complete X to unlock Y"', () => {
    expect(lockHint('learn')).toBe('Complete Watch to unlock Learn');
    expect(lockHint('practice')).toBe('Complete Learn to unlock Practice');
    expect(lockHint('play')).toBe('Complete Practice to unlock Play');
    expect(lockHint('watch')).toBe('');
  });
});

describe('unlockBudgetFor — one expert pass per color, lifetime', () => {
  it('unused pass is available', () => {
    expect(unlockBudgetFor(undefined, 'ruy-lopez', 'white')).toEqual({ allowed: true, reason: 'available' });
    expect(unlockBudgetFor({}, 'ruy-lopez', 'white')).toEqual({ allowed: true, reason: 'available' });
  });

  it('the same opening that spent the pass is idempotently allowed', () => {
    const passes = { white: 'ruy-lopez' };
    expect(unlockBudgetFor(passes, 'ruy-lopez', 'white')).toEqual({ allowed: true, reason: 'already-here' });
  });

  it('a different opening of the same color is blocked', () => {
    const passes = { white: 'ruy-lopez' };
    expect(unlockBudgetFor(passes, 'vienna-game', 'white')).toEqual({
      allowed: false, reason: 'spent-elsewhere', spentOn: 'ruy-lopez',
    });
  });

  it('colors are independent — spending White leaves Black available', () => {
    const passes = { white: 'ruy-lopez' };
    expect(unlockBudgetFor(passes, 'caro-kann', 'black')).toEqual({ allowed: true, reason: 'available' });
  });

  it('both passes can be spent, one per color', () => {
    const passes = { white: 'ruy-lopez', black: 'caro-kann' };
    expect(unlockBudgetFor(passes, 'caro-kann', 'black')).toEqual({ allowed: true, reason: 'already-here' });
    expect(unlockBudgetFor(passes, 'pirc-defence', 'black')).toEqual({
      allowed: false, reason: 'spent-elsewhere', spentOn: 'caro-kann',
    });
  });
});
