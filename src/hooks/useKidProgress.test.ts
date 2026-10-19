import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '../db/schema';
import { useKidProgress, firstOpenLevel } from './useKidProgress';

beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

describe('useKidProgress', () => {
  it('levels and best stars survive leaving the game', async () => {
    const a = renderHook(() => useKidProgress('color-wars'));
    await waitFor(() => expect(a.result.current.loaded).toBe(true));
    act(() => a.result.current.complete(0, 2));
    act(() => a.result.current.complete(0, 1));
    act(() => a.result.current.complete(2, 3));
    await waitFor(async () => expect((await db.studentMemory.get('kid-progress:color-wars'))?.data).toEqual({ levelsCompleted: [0, 2], stars: { 0: 2, 2: 3 } }));
    a.unmount();
    db.close(); await db.open();
    const b = renderHook(() => useKidProgress('color-wars'));
    await waitFor(() => expect(b.result.current.loaded).toBe(true));
    expect([...b.result.current.completed]).toEqual([0, 2]);
    expect(b.result.current.stars).toEqual({ 0: 2, 2: 3 });
  });

  it('firstOpenLevel', () => {
    expect(firstOpenLevel(new Set(), 3)).toBe(0);
    expect(firstOpenLevel(new Set([0, 1]), 3)).toBe(2);
    expect(firstOpenLevel(new Set([0, 1, 2]), 3)).toBe(0);
  });
});
