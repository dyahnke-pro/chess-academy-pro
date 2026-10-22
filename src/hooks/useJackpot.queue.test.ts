import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

vi.mock('../services/dbService', () => ({ updateProfile: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../services/rewardService', () => ({ reward: vi.fn(), ringCoins: vi.fn() }));

import { useJackpot, GAIN_MIN_MS } from './useJackpot';

describe('useJackpot — payouts that land together play in turn (2026-10-22)', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('the gem and the mission on one move: the gem shows first, then the mission, each counted', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useJackpot());
    act(() => {
      result.current.award('gem', 0);
      result.current.award('mission', 0);
    });
    expect(result.current.gain?.label).toBe('Gem');
    const gemTo = result.current.gain?.to ?? 0;
    act(() => { vi.advanceTimersByTime(GAIN_MIN_MS + 50); });
    expect(result.current.gain?.label).toBe('Mission');
    // The mission counts up from where the gem left the total.
    expect(result.current.gain?.from).toBe(gemTo);
  });

  it('fail twin: a lone payout stays up past the hand-over time', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useJackpot());
    act(() => { result.current.award('gem', 0); });
    act(() => { vi.advanceTimersByTime(GAIN_MIN_MS + 50); });
    expect(result.current.gain?.label).toBe('Gem');
  });
});
