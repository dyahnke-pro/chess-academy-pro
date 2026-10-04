import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSquareAnswer } from './useSquareAnswer';

afterEach(() => { vi.useRealTimers(); });

describe('useSquareAnswer — the thin tap shell', () => {
  it('a partial answer that pauses gets ONE nudge; finishing settles once with the nudge recorded', () => {
    vi.useFakeTimers();
    const onNudge = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(() => useSquareAnswer({ key: ['d5', 'a8'], mode: 'all', questionKey: 'q1', onNudge, onSettled }));
    act(() => { result.current.tap('d5'); });
    expect(result.current.squareStyles.d5).toBeDefined();
    act(() => { vi.advanceTimersByTime(8000); });
    expect(onNudge).toHaveBeenCalledTimes(1);
    act(() => { result.current.tap('a8'); });
    expect(result.current.status).toBe('right');
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled.mock.calls[0][0]).toMatchObject({ solved: true, detail: { help: 'nudge', wrongAttempts: 0 } });
    act(() => { result.current.tap('h1'); });
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  it('wrong taps paint red, report the miss, and the key is shown after three', () => {
    const onWrongTap = vi.fn();
    const onSettled = vi.fn();
    const { result } = renderHook(() => useSquareAnswer({ key: ['d5'], mode: 'any', questionKey: 'q1', onWrongTap, onSettled, tagWrongTap: () => 'hung-material' }));
    act(() => { result.current.tap('a1'); });
    act(() => { result.current.tap('b2'); });
    expect(onWrongTap).toHaveBeenCalledTimes(2);
    act(() => { result.current.tap('c3'); });
    expect(result.current.status).toBe('shown');
    expect(result.current.squareStyles.d5).toBeDefined();
    expect(onSettled.mock.calls[0][0]).toMatchObject({ solved: false, detail: { wrongTags: ['hung-material'], wrongAttempts: 3, firstMissHelp: 'none' } });
  });

  it('a new question resets; no key means taps are refused', () => {
    const { result, rerender } = renderHook((p: { q: string; key: string[] | null }) => useSquareAnswer({ key: p.key as never, mode: 'any', questionKey: p.q }), { initialProps: { q: 'q1', key: ['d5'] as string[] | null } });
    act(() => { result.current.tap('a1'); });
    expect(result.current.wrongTaps).toEqual(['a1']);
    rerender({ q: 'q2', key: ['d5'] });
    expect(result.current.wrongTaps).toEqual([]);
    rerender({ q: 'q3', key: null });
    expect(result.current.tap('d5')).toBeNull();
  });
});
