import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  positionTouchesThread,
  threadCallbackFor,
  resetThreadCallbacks,
  threadCallbackAlreadySpoken,
  type CoachingThread,
} from './coachThread';

const thread: CoachingThread = {
  tag: 'removal-of-guard',
  label: 'Removal of the guard',
  patternThemes: ['fork', 'hangingPiece'],
  count: 4,
  lastSeenAt: 1_000,
};

describe('positionTouchesThread', () => {
  it('matches on a shared pattern theme', () => {
    expect(positionTouchesThread(thread, ['fork', 'endgame'])).toBe(true);
  });
  it('matches on the thread tag itself', () => {
    expect(positionTouchesThread(thread, ['removal-of-guard'])).toBe(true);
  });
  it('does not match an unrelated position', () => {
    expect(positionTouchesThread(thread, ['backRankMate', 'pin'])).toBe(false);
  });
  it('never matches a null thread', () => {
    expect(positionTouchesThread(null, ['fork'])).toBe(false);
  });
});

describe('threadCallbackFor — earned + say-once', () => {
  beforeEach(() => resetThreadCallbacks());

  it('speaks the callback when the position touches the thread, naming the count', () => {
    const line = threadCallbackFor(thread, ['fork']);
    expect(line).toMatch(/removal of the guard we've been working on/i);
    expect(line).toMatch(/4 games running/);
  });

  it('says it at most ONCE per session (never nags)', () => {
    expect(threadCallbackFor(thread, ['fork'])).not.toBe('');
    expect(threadCallbackAlreadySpoken('removal-of-guard')).toBe(true);
    // A second touch in the same session is silent.
    expect(threadCallbackFor(thread, ['hangingPiece'])).toBe('');
  });

  it('is silent when the position does not touch the thread', () => {
    expect(threadCallbackFor(thread, ['pin'])).toBe('');
  });

  it('drops the count clause for a first-time (count < 2) thread', () => {
    const fresh: CoachingThread = { ...thread, count: 1 };
    expect(threadCallbackFor(fresh, ['fork'])).toBe('This is the removal of the guard we\'ve been working on.');
  });

  it('resets across sessions so the thread can resurface', () => {
    expect(threadCallbackFor(thread, ['fork'])).not.toBe('');
    resetThreadCallbacks();
    expect(threadCallbackFor(thread, ['fork'])).not.toBe('');
  });
});

describe('getActiveCoachingThread', () => {
  beforeEach(() => vi.resetModules());

  it('returns the top weakness as the thread', async () => {
    vi.doMock('./weaknessSpine', () => ({
      getUnifiedWeaknessProfile: () => Promise.resolve([
        { tag: 'removal-of-guard', label: 'Removal of the guard', puzzleThemes: ['fork'], total: 4, lastSeenAt: 1000, positions: [], severity: 80, openCount: 3, key: 'k', bucket: 'tactic', sources: ['coach'] },
      ]),
    }));
    const { getActiveCoachingThread } = await import('./coachThread');
    const t = await getActiveCoachingThread();
    expect(t).toMatchObject({ tag: 'removal-of-guard', count: 4, patternThemes: ['fork'] });
  });

  it('returns null when there is no weakness data yet', async () => {
    vi.doMock('./weaknessSpine', () => ({ getUnifiedWeaknessProfile: () => Promise.resolve([]) }));
    const { getActiveCoachingThread } = await import('./coachThread');
    expect(await getActiveCoachingThread()).toBeNull();
  });
});
