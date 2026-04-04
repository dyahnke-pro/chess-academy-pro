import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStruggleDetection } from './useStruggleDetection';
import type { CoachingTier } from '../services/tacticAlertService';

// Mock the service to control struggle detection behavior
vi.mock('../services/tacticAlertService', () => {
  let callCount = 0;
  return {
    detectStruggleTier: vi.fn(({ wrongAttempts, elapsedSeconds }: { wrongAttempts: number; elapsedSeconds: number }): CoachingTier => {
      if (wrongAttempts >= 3 || elapsedSeconds >= 75) return 'guide';
      if (wrongAttempts >= 2 || elapsedSeconds >= 45) return 'teach';
      if (wrongAttempts >= 1 || elapsedSeconds >= 20) return 'nudge';
      return 'none';
    }),
    getCoachingMessage: vi.fn((_type: string, tier: CoachingTier): string | null => {
      if (tier === 'none') return null;
      callCount++;
      return `coaching-${tier}-${callCount}`;
    }),
    hasRecentFailure: vi.fn((): boolean => false),
  };
});

describe('useStruggleDetection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('does not coach when not active', () => {
    const onCoach = vi.fn();
    renderHook(() =>
      useStruggleDetection({
        tacticType: 'fork',
        playerRating: 1200,
        active: false,
        wrongAttempts: 0,
        onCoach,
      }),
    );

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onCoach).not.toHaveBeenCalled();
  });

  it('does not coach when tacticType is null', () => {
    const onCoach = vi.fn();
    renderHook(() =>
      useStruggleDetection({
        tacticType: null,
        playerRating: 1200,
        active: true,
        wrongAttempts: 0,
        onCoach,
      }),
    );

    act(() => { vi.advanceTimersByTime(30_000); });
    expect(onCoach).not.toHaveBeenCalled();
  });

  it('coaches after time threshold is reached', () => {
    const onCoach = vi.fn();
    renderHook(() =>
      useStruggleDetection({
        tacticType: 'fork',
        playerRating: 1200,
        active: true,
        wrongAttempts: 0,
        onCoach,
      }),
    );

    // Under nudge threshold (20s)
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(onCoach).not.toHaveBeenCalled();

    // Past nudge threshold
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(onCoach).toHaveBeenCalledTimes(1);
    expect(onCoach).toHaveBeenCalledWith(expect.any(String), 'nudge');
  });

  it('coaches when wrong attempts trigger threshold', () => {
    const onCoach = vi.fn();
    const { rerender } = renderHook(
      ({ wrongAttempts }) =>
        useStruggleDetection({
          tacticType: 'pin',
          playerRating: 1200,
          active: true,
          wrongAttempts,
          onCoach,
        }),
      { initialProps: { wrongAttempts: 0 } },
    );

    // First wrong attempt triggers nudge
    rerender({ wrongAttempts: 1 });
    expect(onCoach).toHaveBeenCalledTimes(1);
    expect(onCoach).toHaveBeenCalledWith(expect.any(String), 'nudge');
  });

  it('escalates through tiers but never repeats', () => {
    const onCoach = vi.fn();
    const { rerender } = renderHook(
      ({ wrongAttempts }) =>
        useStruggleDetection({
          tacticType: 'fork',
          playerRating: 1200,
          active: true,
          wrongAttempts,
          onCoach,
        }),
      { initialProps: { wrongAttempts: 0 } },
    );

    // First wrong attempt → nudge
    rerender({ wrongAttempts: 1 });
    expect(onCoach).toHaveBeenCalledTimes(1);

    // Same attempt count again → should NOT re-coach
    rerender({ wrongAttempts: 1 });
    expect(onCoach).toHaveBeenCalledTimes(1);

    // Second wrong attempt → teach (escalation)
    rerender({ wrongAttempts: 2 });
    expect(onCoach).toHaveBeenCalledTimes(2);
    expect(onCoach).toHaveBeenLastCalledWith(expect.any(String), 'teach');

    // Third wrong attempt → guide
    rerender({ wrongAttempts: 3 });
    expect(onCoach).toHaveBeenCalledTimes(3);
    expect(onCoach).toHaveBeenLastCalledWith(expect.any(String), 'guide');
  });

  it('resets on reset() call', () => {
    const onCoach = vi.fn();
    const { result, rerender } = renderHook(
      ({ wrongAttempts }) =>
        useStruggleDetection({
          tacticType: 'fork',
          playerRating: 1200,
          active: true,
          wrongAttempts,
          onCoach,
        }),
      { initialProps: { wrongAttempts: 0 } },
    );

    // Trigger nudge
    rerender({ wrongAttempts: 1 });
    expect(onCoach).toHaveBeenCalledTimes(1);

    // Reset
    act(() => { result.current.reset(); });

    // Same attempt count should trigger nudge again after reset
    rerender({ wrongAttempts: 0 });
    rerender({ wrongAttempts: 1 });
    expect(onCoach).toHaveBeenCalledTimes(2);
  });

  it('cleans up timer on unmount', () => {
    const onCoach = vi.fn();
    const { unmount } = renderHook(() =>
      useStruggleDetection({
        tacticType: 'fork',
        playerRating: 1200,
        active: true,
        wrongAttempts: 0,
        onCoach,
      }),
    );

    unmount();

    // Advancing time after unmount should not call coach
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(onCoach).not.toHaveBeenCalled();
  });
});
