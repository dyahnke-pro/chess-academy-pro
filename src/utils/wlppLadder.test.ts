import { describe, it, expect } from 'vitest';
import type { OpeningRecord } from '../types';
import {
  MAIN_LINE_INDEX,
  isRungComplete,
  isRungUnlocked,
  areWeaponsUnlocked,
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
