import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from './useIsMobile';

describe('useIsMobile', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: currentMatches,
      media: query,
      addEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners.push(handler);
      },
      removeEventListener: (_event: string, handler: (e: MediaQueryListEvent) => void) => {
        listeners = listeners.filter((l) => l !== handler);
      },
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when viewport is below breakpoint', () => {
    currentMatches = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport is at or above breakpoint', () => {
    currentMatches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('responds to media query change events', () => {
    currentMatches = false;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it('accepts custom breakpoint', () => {
    currentMatches = true;
    const { result } = renderHook(() => useIsMobile(480));
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 479px)');
  });

  it('cleans up listener on unmount', () => {
    currentMatches = false;
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners).toHaveLength(1);
    unmount();
    expect(listeners).toHaveLength(0);
  });
});
