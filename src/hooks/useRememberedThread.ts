import { useEffect, useRef, useState } from 'react';
import { recallData, remember, type StoredChatMessage } from '../services/studentMemory';
import type { ChatMessage } from '../types';

/** How many messages a thread keeps for display — a storage window, the
 *  oldest fall out. The coach's own memory of the conversation is
 *  `coachMemoryStore.conversationHistory`, not this. */
const THREAD_WINDOW = 200;

/**
 * A chat thread shown again on reopen (persistent memory, 2026-10-19). Play,
 * Review and the opening chat opened empty every visit although the
 * exchanges had happened. Restores once (only into an empty thread), then
 * remembers every change. `threadKey` null = nothing to remember yet.
 */
export function useRememberedThread(
  threadKey: string | null,
  messages: readonly ChatMessage[],
  setMessages: (m: ChatMessage[]) => void,
): void {
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  useEffect(() => {
    if (!threadKey || restoredFor === threadKey) return;
    let live = true;
    void recallData('chat-thread', threadKey).then((t) => {
      if (!live) return;
      if (t && t.messages.length > 0 && messagesRef.current.length === 0) {
        setMessages(t.messages.map((m, i) => ({ id: `restored-${threadKey}-${i}`, role: m.role, content: m.content, timestamp: m.timestamp })));
      }
      setRestoredFor(threadKey);
    });
    return () => { live = false; };
  }, [threadKey, setMessages, restoredFor]);
  useEffect(() => {
    if (!threadKey || restoredFor !== threadKey) return;
    const stored: StoredChatMessage[] = messages
      .filter((m) => m.content.trim().length > 0)
      .slice(-THREAD_WINDOW)
      .map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp }));
    const t = setTimeout(() => { void remember('chat-thread', threadKey, { messages: stored }); }, 400);
    return () => clearTimeout(t);
  }, [threadKey, messages, restoredFor]);
}
