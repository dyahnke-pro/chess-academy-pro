import { describe, it, expect, vi, afterEach } from 'vitest';
import { emitWeaknessModelChanged, onWeaknessModelChanged, onWeaknessModelSettled, SETTLE_MS, __resetWeaknessModelListenersForTests } from './weaknessModelEvents';

afterEach(() => { __resetWeaknessModelListenersForTests(); vi.useRealTimers(); });

describe('one burst of record writes, one re-read (David\'s phone, 2026-10-19)', () => {
  it('cache invalidation stays synchronous; a reloading reader runs once per burst', () => {
    vi.useFakeTimers();
    const invalidate = vi.fn();
    const reload = vi.fn();
    onWeaknessModelChanged(invalidate);
    onWeaknessModelSettled(reload);
    // A Learn move writes several rows in quick succession.
    emitWeaknessModelChanged();
    vi.advanceTimersByTime(100);
    emitWeaknessModelChanged();
    vi.advanceTimersByTime(100);
    emitWeaknessModelChanged();
    expect(invalidate).toHaveBeenCalledTimes(3);
    expect(reload).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SETTLE_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    // The next move's burst reloads again.
    emitWeaknessModelChanged();
    vi.advanceTimersByTime(SETTLE_MS);
    expect(reload).toHaveBeenCalledTimes(2);
  });
});
