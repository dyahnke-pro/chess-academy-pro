import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChessClock } from './useChessClock';
import { getTimeControlById } from '../services/chessClock';

describe('useChessClock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const blitz = getTimeControlById('blitz-3-2');
  const unlimited = getTimeControlById('unlimited');

  it('is disabled and never ticks for unlimited time control', () => {
    const onFlag = vi.fn();
    const { result } = renderHook(() =>
      useChessClock({ timeControl: unlimited, turn: 'w', running: true, onFlag }),
    );
    expect(result.current.enabled).toBe(false);
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.clock.whiteMs).toBe(0);
    expect(onFlag).not.toHaveBeenCalled();
  });

  it('decrements only the side to move while running', () => {
    const onFlag = vi.fn();
    const { result } = renderHook(() =>
      useChessClock({ timeControl: blitz, turn: 'w', running: true, onFlag }),
    );
    act(() => { vi.advanceTimersByTime(3_000); });
    expect(result.current.clock.whiteMs).toBeLessThanOrEqual(177_100);
    expect(result.current.clock.whiteMs).toBeGreaterThanOrEqual(176_900);
    expect(result.current.clock.blackMs).toBe(180_000);
  });

  it('does not tick when paused (running=false)', () => {
    const onFlag = vi.fn();
    const { result } = renderHook(() =>
      useChessClock({ timeControl: blitz, turn: 'w', running: false, onFlag }),
    );
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(result.current.clock.whiteMs).toBe(180_000);
  });

  it('adds the increment to the side that just moved', () => {
    const onFlag = vi.fn();
    const { result } = renderHook(() =>
      useChessClock({ timeControl: blitz, turn: 'w', running: true, onFlag }),
    );
    act(() => { vi.advanceTimersByTime(2_000); });
    act(() => { result.current.recordMove('w'); });
    // white spent ~2s then gained 2s increment → net roughly back to start
    expect(result.current.clock.whiteMs).toBeGreaterThanOrEqual(179_900);
    expect(result.current.clock.whiteMs).toBeLessThanOrEqual(180_100);
  });

  it('fires onFlag once when the side to move runs out', () => {
    const onFlag = vi.fn();
    const { result } = renderHook(() =>
      useChessClock({ timeControl: getTimeControlById('blitz-3-2'), turn: 'w', running: true, onFlag }),
    );
    act(() => { vi.advanceTimersByTime(181_000); });
    expect(result.current.clock.whiteMs).toBe(0);
    expect(onFlag).toHaveBeenCalledTimes(1);
    expect(onFlag).toHaveBeenCalledWith('w');
    // keeps firing-once even as timers keep advancing
    act(() => { vi.advanceTimersByTime(5_000); });
    expect(onFlag).toHaveBeenCalledTimes(1);
  });
});
