import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCoachSessionStore,
  __resetCoachSessionStoreForTests,
  __flushPersistForTests,
} from './coachSessionStore';
import { db } from '../db/schema';
import type { ChatMessage } from '../types';

const buildMessage = (role: 'user' | 'assistant', content: string): ChatMessage => ({
  id: `msg-${Math.random()}`,
  role,
  content,
  timestamp: Date.now(),
});

describe('coachSessionStore', () => {
  beforeEach(async () => {
    __resetCoachSessionStoreForTests();
    await db.meta.clear();
  });

  it('starts with empty state', () => {
    const s = useCoachSessionStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.recentActions).toEqual([]);
    expect(s.focus.kind).toBeNull();
    expect(s.narrationMode).toBe(false);
  });

  it('appends messages and trims history on persist', async () => {
    const store = useCoachSessionStore.getState();
    store.appendMessage(buildMessage('user', 'hi'));
    store.appendMessage(buildMessage('assistant', 'hello'));
    expect(useCoachSessionStore.getState().messages).toHaveLength(2);
  });

  it('records actions and caps the recent actions list', () => {
    const store = useCoachSessionStore.getState();
    for (let i = 0; i < 25; i += 1) {
      store.recordAction({
        id: `a-${i}`,
        name: 'noop',
        args: {},
        result: 'ok',
        ts: i,
      });
    }
    expect(useCoachSessionStore.getState().recentActions.length).toBe(20);
    // FIFO trim — earliest dropped, latest kept.
    expect(useCoachSessionStore.getState().recentActions[19].id).toBe('a-24');
  });

  it('persists and restores messages, focus, and actions', async () => {
    const store = useCoachSessionStore.getState();
    store.appendMessage(buildMessage('user', 'analyze my last game'));
    store.setFocus({ kind: 'game', value: 'game-1', label: 'vs Smith' });
    store.recordAction({ id: 'a-1', name: 'analyze_game', args: { id: 'game-1' }, result: 'ok', message: 'ok', ts: 1 });
    store.setNarrationMode(true);
    await __flushPersistForTests();

    __resetCoachSessionStoreForTests();
    expect(useCoachSessionStore.getState().messages).toEqual([]);

    await useCoachSessionStore.getState().hydrate();
    const restored = useCoachSessionStore.getState();
    expect(restored.messages).toHaveLength(1);
    expect(restored.focus.kind).toBe('game');
    expect(restored.focus.value).toBe('game-1');
    expect(restored.recentActions).toHaveLength(1);
    expect(restored.narrationMode).toBe(true);
  });

  it('pushNarration sets and consumeNarration clears', () => {
    const store = useCoachSessionStore.getState();
    store.pushNarration({ text: 'Watch the e-file.' });
    expect(useCoachSessionStore.getState().pendingNarration?.text).toBe('Watch the e-file.');
    const consumed = useCoachSessionStore.getState().consumeNarration();
    expect(consumed?.text).toBe('Watch the e-file.');
    expect(useCoachSessionStore.getState().pendingNarration).toBeNull();
  });

  it('reset wipes the store and clears persisted state', async () => {
    const store = useCoachSessionStore.getState();
    store.appendMessage(buildMessage('user', 'hi'));
    store.setNarrationMode(true);
    await __flushPersistForTests();

    useCoachSessionStore.getState().reset();
    expect(useCoachSessionStore.getState().messages).toEqual([]);
    expect(useCoachSessionStore.getState().narrationMode).toBe(false);

    const row = await db.meta.get('coachSession.v1');
    expect(row).toBeUndefined();
  });
});
