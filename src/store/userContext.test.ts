import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import { buildUserProfile, buildMistakePuzzle, resetFactoryCounter } from '../test/factories';
import {
  useCurrentUser,
  useDefaultCoach,
  useUserRating,
  useStreak,
  useLearnerType,
  useHasOnboarded,
  useMistakesDueToday,
} from './userContext';

beforeEach(async () => {
  useAppStore.getState().reset();
  resetFactoryCounter();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('useCurrentUser', () => {
  it('returns null before a profile is hydrated', () => {
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current).toBeNull();
  });

  it('returns the active profile once set', () => {
    const profile = buildUserProfile({ name: 'Brother' });
    act(() => {
      useAppStore.getState().setActiveProfile(profile);
    });
    const { result } = renderHook(() => useCurrentUser());
    expect(result.current?.name).toBe('Brother');
  });
});

describe('useDefaultCoach', () => {
  it('returns the default coach id', () => {
    const { result } = renderHook(() => useDefaultCoach());
    expect(result.current).toBe('danya');
  });
});

describe('useUserRating', () => {
  it('returns 0 before a profile is hydrated', () => {
    const { result } = renderHook(() => useUserRating());
    expect(result.current).toBe(0);
  });

  it('returns the active profile rating', () => {
    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile({ currentRating: 1750 }));
    });
    const { result } = renderHook(() => useUserRating());
    expect(result.current).toBe(1750);
  });
});

describe('useStreak', () => {
  it('returns 0 before a profile is hydrated', () => {
    const { result } = renderHook(() => useStreak());
    expect(result.current).toBe(0);
  });

  it('returns the active profile streak', () => {
    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile({ currentStreak: 12 }));
    });
    const { result } = renderHook(() => useStreak());
    expect(result.current).toBe(12);
  });
});

describe('useLearnerType', () => {
  it('defaults to adult before hydration', () => {
    const { result } = renderHook(() => useLearnerType());
    expect(result.current).toBe('adult');
  });

  it('returns kid when isKidMode is true', () => {
    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile({ isKidMode: true }));
    });
    const { result } = renderHook(() => useLearnerType());
    expect(result.current).toBe('kid');
  });

  it('returns adult when isKidMode is false', () => {
    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile({ isKidMode: false }));
    });
    const { result } = renderHook(() => useLearnerType());
    expect(result.current).toBe('adult');
  });
});

describe('useHasOnboarded', () => {
  it('is false before hydration', () => {
    const { result } = renderHook(() => useHasOnboarded());
    expect(result.current).toBe(false);
  });

  it('is true once a profile is active', () => {
    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
    });
    const { result } = renderHook(() => useHasOnboarded());
    expect(result.current).toBe(true);
  });
});

describe('useMistakesDueToday', () => {
  it('returns 0 when no profile is hydrated', () => {
    const { result } = renderHook(() => useMistakesDueToday());
    expect(result.current).toBe(0);
  });

  it('counts unsolved + solved mistake puzzles due today', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.mistakePuzzles.bulkAdd([
      buildMistakePuzzle({ srsDueDate: today.toISOString(), status: 'unsolved' }),
      buildMistakePuzzle({ srsDueDate: today.toISOString(), status: 'solved' }),
      buildMistakePuzzle({ srsDueDate: today.toISOString(), status: 'mastered' }),
      buildMistakePuzzle({ srsDueDate: tomorrow.toISOString(), status: 'unsolved' }),
    ]);

    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
    });

    const { result } = renderHook(() => useMistakesDueToday());
    await waitFor(() => {
      expect(result.current).toBe(2);
    });
  });

  it('resets to 0 when the profile is cleared', async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    await db.mistakePuzzles.add(
      buildMistakePuzzle({ srsDueDate: today.toISOString(), status: 'unsolved' }),
    );

    act(() => {
      useAppStore.getState().setActiveProfile(buildUserProfile());
    });
    const { result } = renderHook(() => useMistakesDueToday());
    await waitFor(() => {
      expect(result.current).toBe(1);
    });

    act(() => {
      useAppStore.getState().setActiveProfile(null);
    });
    await waitFor(() => {
      expect(result.current).toBe(0);
    });
  });
});
