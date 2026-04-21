import { describe, expect, it } from 'vitest';
import { decideNudge } from './nudgeEngine';
import { STREAK_DEFAULT } from '../stores/userContext';

describe('decideNudge', () => {
  const noon = new Date('2026-04-21T12:00:00Z');
  const evening = new Date('2026-04-21T20:00:00Z');

  it('fires mistakes-due when the user has unreviewed mistakes', () => {
    const decision = decideNudge({
      mistakesDueToday: 3,
      streak: STREAK_DEFAULT,
      dismissals: new Set(),
      now: noon,
    });
    expect(decision).not.toBeNull();
    expect(decision?.kind).toBe('mistakes-due');
    expect(decision?.cta?.route).toBe('/tactics/mistakes');
  });

  it('pluralizes correctly for the single-mistake case', () => {
    const decision = decideNudge({
      mistakesDueToday: 1,
      streak: STREAK_DEFAULT,
      dismissals: new Set(),
      now: noon,
    });
    expect(decision?.message).toContain('1 mistake ');
  });

  it('skips mistakes-due when the key is already dismissed', () => {
    const decision = decideNudge({
      mistakesDueToday: 3,
      streak: STREAK_DEFAULT,
      dismissals: new Set(['mistakes-due:2026-04-21']),
      now: noon,
    });
    expect(decision).toBeNull();
  });

  it('fires streak-keeper after 6pm when no activity today', () => {
    const decision = decideNudge({
      mistakesDueToday: 0,
      streak: { current: 5, longest: 5, lastActiveISO: '2026-04-20T12:00:00Z' },
      dismissals: new Set(),
      now: evening,
    });
    expect(decision?.kind).toBe('streak-keeper');
  });

  it('does not fire streak-keeper before 6pm', () => {
    const decision = decideNudge({
      mistakesDueToday: 0,
      streak: { current: 5, longest: 5, lastActiveISO: '2026-04-20T12:00:00Z' },
      dismissals: new Set(),
      now: noon,
    });
    expect(decision).toBeNull();
  });

  it('does not fire streak-keeper when the user was active today', () => {
    const decision = decideNudge({
      mistakesDueToday: 0,
      streak: { current: 5, longest: 5, lastActiveISO: evening.toISOString() },
      dismissals: new Set(),
      now: evening,
    });
    expect(decision).toBeNull();
  });

  it('does not fire streak-keeper for streaks shorter than 3', () => {
    const decision = decideNudge({
      mistakesDueToday: 0,
      streak: { current: 2, longest: 2, lastActiveISO: null },
      dismissals: new Set(),
      now: evening,
    });
    expect(decision).toBeNull();
  });

  it('prefers mistakes-due over streak-keeper when both fire', () => {
    const decision = decideNudge({
      mistakesDueToday: 3,
      streak: { current: 5, longest: 5, lastActiveISO: null },
      dismissals: new Set(),
      now: evening,
    });
    expect(decision?.kind).toBe('mistakes-due');
  });
});
