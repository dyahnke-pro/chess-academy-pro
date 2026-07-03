import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const analyzeWithBudget = vi.fn().mockResolvedValue({
  bestMove: 'e2e4',
  evaluation: 30,
  isMate: false,
  mateIn: null,
  depth: 12,
  topLines: [],
  nodesPerSecond: 0,
});
const isBusy = vi.fn(() => false);

vi.mock('../services/stockfishEngine', () => ({
  stockfishEngine: {
    analyzeWithBudget: (...args: unknown[]) => analyzeWithBudget(...args),
    isBusy: () => isBusy(),
  },
}));

const setCachedStockfish = vi.fn();
vi.mock('./stockfishFenCache', () => ({
  setCachedStockfish: (...args: unknown[]) => setCachedStockfish(...args),
}));

import { useEnginePonder } from './useEnginePonder';

const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('useEnginePonder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    analyzeWithBudget.mockClear();
    isBusy.mockClear();
    isBusy.mockReturnValue(false);
    setCachedStockfish.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing when disabled', () => {
    renderHook(() => useEnginePonder(FEN, false));
    vi.advanceTimersByTime(5000);
    expect(analyzeWithBudget).not.toHaveBeenCalled();
  });

  it('does nothing when fen is null even if enabled', () => {
    renderHook(() => useEnginePonder(null, true));
    vi.advanceTimersByTime(5000);
    expect(analyzeWithBudget).not.toHaveBeenCalled();
  });

  it('analyzes and caches after the debounce when enabled + engine idle', async () => {
    renderHook(() => useEnginePonder(FEN, true));
    expect(analyzeWithBudget).not.toHaveBeenCalled(); // debounced
    await vi.advanceTimersByTimeAsync(1000);
    expect(analyzeWithBudget).toHaveBeenCalledTimes(1);
    expect(analyzeWithBudget).toHaveBeenCalledWith(FEN, 12, expect.any(Number));
    await Promise.resolve();
    expect(setCachedStockfish).toHaveBeenCalledWith(FEN, expect.objectContaining({ bestMove: 'e2e4' }));
  });

  it('yields when the engine is busy (does not clobber a live request)', async () => {
    isBusy.mockReturnValue(true);
    renderHook(() => useEnginePonder(FEN, true));
    await vi.advanceTimersByTimeAsync(1000);
    expect(analyzeWithBudget).not.toHaveBeenCalled();
  });

  it('cancels the pending ponder when disabled before the debounce fires', async () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useEnginePonder(FEN, enabled),
      { initialProps: { enabled: true } },
    );
    // Flip disabled before the 1s debounce elapses.
    rerender({ enabled: false });
    await vi.advanceTimersByTimeAsync(2000);
    expect(analyzeWithBudget).not.toHaveBeenCalled();
  });
});
