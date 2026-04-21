import { beforeEach, describe, expect, it } from 'vitest';
import { useAppStore } from './appStore';
import {
  selectCurrentUser,
  selectDefaultCoach,
  selectDismissals,
  selectHasOnboarded,
  selectLearnerType,
  selectMistakesDueToday,
  selectStreak,
  STREAK_DEFAULT,
} from './userContext';

describe('WO-FOUND-02 canonical selectors — defensive defaults', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('selectCurrentUser returns null when no profile is loaded', () => {
    expect(selectCurrentUser(useAppStore.getState())).toBeNull();
  });

  it('selectDefaultCoach returns null when the column is missing', () => {
    expect(selectDefaultCoach(useAppStore.getState())).toBeNull();
  });

  it('selectStreak returns the zero-streak default when the table is missing', () => {
    expect(selectStreak(useAppStore.getState())).toEqual(STREAK_DEFAULT);
  });

  it('selectLearnerType returns "adult" when the column is missing', () => {
    expect(selectLearnerType(useAppStore.getState())).toBe('adult');
  });

  it('selectHasOnboarded returns true when the column is missing (existing users are not re-onboarded)', () => {
    expect(selectHasOnboarded(useAppStore.getState())).toBe(true);
  });

  it('selectMistakesDueToday returns 0 when the mistakes table is missing', () => {
    expect(selectMistakesDueToday(useAppStore.getState())).toBe(0);
  });

  it('selectDismissals returns an empty Set at cold start', () => {
    const dismissals = selectDismissals(useAppStore.getState());
    expect(dismissals).toBeInstanceOf(Set);
    expect(dismissals.size).toBe(0);
  });

  it('addDismissal pushes a key into the dismissals set', () => {
    useAppStore.getState().addDismissal('test-key');
    expect(selectDismissals(useAppStore.getState()).has('test-key')).toBe(true);
  });

  it('setDismissals replaces the entire set', () => {
    useAppStore.getState().addDismissal('a');
    useAppStore.getState().setDismissals(['b', 'c']);
    const keys = selectDismissals(useAppStore.getState());
    expect(keys.has('a')).toBe(false);
    expect(keys.has('b')).toBe(true);
    expect(keys.has('c')).toBe(true);
  });
});
