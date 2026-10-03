import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdaptiveEndgameSession } from './useAdaptiveEndgameSession';
import { useAppStore } from '../stores/appStore';
import { buildUserProfile } from '../test/factories';
import { getCalculationSkillById, skillAcceptsPuzzle } from '../services/calculationDrillService';
import type { RawPuzzle } from '../services/adaptiveEndgameService';

describe('useAdaptiveEndgameSession — counters survive the rating write', () => {
  beforeEach(() => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ puzzleRating: 1358 }));
  });

  it('solved/failed accumulate even though each outcome persists a new endgameRating', () => {
    const { result } = renderHook(() => useAdaptiveEndgameSession(null, { themes: ['mate'] }));
    expect(result.current.currentDrill).not.toBeNull();
    const firstRating = result.current.userRating;

    act(() => result.current.recordOutcome(true));
    expect(result.current.solved).toBe(1);
    expect(result.current.userRating).toBeGreaterThan(firstRating);

    act(() => result.current.recordOutcome(true));
    act(() => result.current.recordOutcome(false));
    expect(result.current.solved).toBe(2);
    expect(result.current.failed).toBe(1);
    // The persisted rating moved, and the session kept it rather than re-seeding.
    expect(useAppStore.getState().activeProfile?.endgameRating).toBe(result.current.userRating);
  });

  it('reset starts a fresh session from the latest persisted rating', () => {
    const { result } = renderHook(() => useAdaptiveEndgameSession(null, { themes: ['mate'] }));
    act(() => result.current.recordOutcome(true));
    const persisted = result.current.userRating;
    act(() => result.current.reset());
    expect(result.current.solved).toBe(0);
    expect(result.current.userRating).toBe(persisted);
  });
});

describe('useAdaptiveEndgameSession — the surface gate reaches every pick', () => {
  it('never serves a candidate the accept gate refuses, even a preferred game puzzle', () => {
    useAppStore.getState().setActiveProfile(buildUserProfile({ puzzleRating: 1358 }));
    const taggedNotMate: RawPuzzle = {
      id: 'game-fake-mate',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moves: 'e2e4 e7e5 g1f3',
      rating: 1358,
      themes: ['mateIn2'],
      openingTags: null,
      popularity: 0,
      nbPlays: 0,
      noSetupMove: true,
    };
    const skill = getCalculationSkillById('find-the-mate');
    if (!skill) throw new Error('find-the-mate missing');
    const { result } = renderHook(() => useAdaptiveEndgameSession(null, {
      themes: skill.themes,
      extraPuzzles: [taggedNotMate],
      preferExtraEvery: 1,
      accept: (p) => skillAcceptsPuzzle(skill, p),
    }));
    for (let i = 0; i < 4; i += 1) {
      expect(result.current.currentDrill).not.toBeNull();
      expect(result.current.currentDrill?.title).not.toBe('From your game');
      act(() => result.current.recordOutcome(true));
    }
  });
});
