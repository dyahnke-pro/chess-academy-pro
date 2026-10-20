import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { db } from '../db/schema';
import { useRememberedThread } from './useRememberedThread';
import type { ChatMessage } from '../types';

beforeEach(async () => { db.close(); await db.delete(); await db.open(); });

function useThread(key: string, initial: ChatMessage[] = []): ChatMessage[] {
  const [m, setM] = useState<ChatMessage[]>(initial);
  useRememberedThread(key, m, setM);
  return m;
}

describe('useRememberedThread', () => {
  it('a thread is shown again after a close-and-reopen', async () => {
    const msgs: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Why Nf3?', timestamp: 1 },
      { id: '2', role: 'assistant', content: 'It guards e5.', timestamp: 2 },
    ];
    const a = renderHook(() => useThread('review:g1', msgs));
    const { recallData } = await import('../services/studentMemory');
    await waitFor(async () => expect((await recallData('chat-thread', 'review:g1'))?.messages.length).toBe(2), { timeout: 2000 });
    a.unmount();
    db.close(); await db.open();
    const b = renderHook(() => useThread('review:g1'));
    await waitFor(() => expect(b.result.current.map((m) => m.content)).toEqual(['Why Nf3?', 'It guards e5.']));
    const c = renderHook(() => useThread('review:g2'));
    await new Promise((r) => setTimeout(r, 50));
    expect(c.result.current).toEqual([]);
  });
});
