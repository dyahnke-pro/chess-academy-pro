import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { db } from '../db/schema';
import { useRememberedSetting } from './useRememberedSetting';

beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

describe('useRememberedSetting', () => {
  it('a choice survives an unmount and a reopened db', async () => {
    const a = renderHook(() => useRememberedSetting<boolean>('voice', true));
    expect(a.result.current[0]).toBe(true);
    act(() => a.result.current[1](false));
    await waitFor(async () => expect((await db.studentMemory.get('setting:voice'))?.data).toEqual({ value: false }));
    a.unmount();
    db.close(); await db.open();
    const b = renderHook(() => useRememberedSetting<boolean>('voice', true));
    await waitFor(() => expect(b.result.current[0]).toBe(false));
  });
});
