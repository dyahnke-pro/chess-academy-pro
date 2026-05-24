import { describe, it, expect } from 'vitest';
import type { OpeningRecord } from '../types';
import {
  MAIN_LINE_INDEX,
  isRungComplete,
  isRungUnlocked,
  areWeaponsUnlocked,
  nextRung,
  lockHint,
} from './wlppLadder';

function rec(p: Partial<OpeningRecord>): OpeningRecord {
  return { id: 'x', name: 'X', isFavorite: false, drillAttempts: 0, lastStudied: null,
    woodpeckerReps: 0, woodpeckerSpeed: null, woodpeckerLastDate: null, ...p } as OpeningRecord;
}

describe('wlppLadder', () => {
  it('fresh line: only Watch unlocked, nothing complete, weapons locked', () => {
    const o = rec({});
    const L = MAIN_LINE_INDEX;
    expect(isRungUnlocked(o, L, 'watch')).toBe(true);
    expect(isRungUnlocked(o, L, 'learn')).toBe(false);
    expect(isRungUnlocked(o, L, 'practice')).toBe(false);
    expect(isRungUnlocked(o, L, 'play')).toBe(false);
    expect(areWeaponsUnlocked(o, L)).toBe(false);
    expect(nextRung(o, L)).toBe('watch');
  });

  it('forward unlock: Watch done → Learn unlocks, Practice still locked', () => {
    const o = rec({ linesDiscovered: [0] });
    expect(isRungComplete(o, 0, 'watch')).toBe(true);
    expect(isRungUnlocked(o, 0, 'learn')).toBe(true);
    expect(isRungUnlocked(o, 0, 'practice')).toBe(false);
    expect(nextRung(o, 0)).toBe('learn');
  });

  it('full climb unlocks weapons', () => {
    const o = rec({ linesDiscovered: [0], linesLearned: [0], linesPerfected: [0], linesPlayed: [0] });
    expect(areWeaponsUnlocked(o, 0)).toBe(true);
    expect(nextRung(o, 0)).toBeNull();
  });

  it('weapons stay locked until Play even if practiced', () => {
    const o = rec({ linesDiscovered: [0], linesLearned: [0], linesPerfected: [0] });
    expect(isRungUnlocked(o, 0, 'play')).toBe(true);
    expect(areWeaponsUnlocked(o, 0)).toBe(false);
  });

  it('"unlock all" frees every rung + weapons for that line only', () => {
    const o = rec({ linesUnlockedAll: [2] });
    expect(isRungUnlocked(o, 2, 'play')).toBe(true);
    expect(areWeaponsUnlocked(o, 2)).toBe(true);
    // a different line is untouched
    expect(isRungUnlocked(o, 3, 'learn')).toBe(false);
    expect(areWeaponsUnlocked(o, 3)).toBe(false);
  });

  it('per-line independence: main vs variation tracked separately', () => {
    const o = rec({ linesDiscovered: [MAIN_LINE_INDEX] });
    expect(isRungUnlocked(o, MAIN_LINE_INDEX, 'learn')).toBe(true);
    expect(isRungUnlocked(o, 0, 'learn')).toBe(false);
  });

  it('lockHint reads "Complete X to unlock Y"', () => {
    expect(lockHint('learn')).toBe('Complete Watch to unlock Learn');
    expect(lockHint('practice')).toBe('Complete Learn to unlock Practice');
    expect(lockHint('play')).toBe('Complete Practice to unlock Play');
    expect(lockHint('watch')).toBe('');
  });
});
