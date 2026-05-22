import { useCallback, useMemo, useRef, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ChatMessage } from '../Coach/ChatMessage';
import { ChatInput } from '../Coach/ChatInput';
import { getCoachChatResponse } from '../../services/coachApi';
import { buildCourseScope } from '../../data/lessons';
import type { ChatMessage as ChatMessageType } from '../../types';

interface MasterclassCoachChatProps {
  openingId: string;
  /** The active variation tab, if any — scopes the coach to that line. */
  variationName?: string | null;
}

/**
 * Course-scoped coach chat for the masterclass surface (David 2026-05-22:
 * "tie coach in so it knows it's inside a specific training course so it
 * stays on target"). The coach is scoped by the CURRENT tab via
 * buildCourseScope — its system prompt is told which opening/variation the
 * student is inside + the verified ideas, and it opens with a greeting that
 * names the course. Scope is explicit (by tab), not text-matched, so a
 * generic "what's the plan here?" still anchors to this opening.
 *
 * Renders nothing for a non-masterclass opening (buildCourseScope → null).
 */
export function MasterclassCoachChat({ openingId, variationName }: MasterclassCoachChatProps): JSX.Element | null {
  const scope = useMemo(() => buildCourseScope(openingId, variationName), [openingId, variationName]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [busy, setBusy] = useState(false);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  const openChat = useCallback(() => {
    if (!scope) return;
    if (messages.length === 0) {
      setMessages([{ id: `greet-${Date.now()}`, role: 'assistant', content: scope.greeting, timestamp: Date.now() }]);
    }
    setOpen(true);
  }, [scope, messages.length]);

  const handleSend = useCallback(
    (text: string): void => {
      if (!scope || !text.trim() || busy) return;
      const userMsg: ChatMessageType = { id: `u-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
      setMessages((prev) => [...prev, userMsg]);
      historyRef.current.push({ role: 'user', content: text });
      setBusy(true);
      void (async () => {
        try {
          const reply = await getCoachChatResponse(
            historyRef.current,
            scope.systemAddition,
            undefined,
            'explore_reaction',
            512,
          );
          historyRef.current.push({ role: 'assistant', content: reply });
          setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: reply, timestamp: Date.now() }]);
        } catch {
          setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "I couldn't reach the coach just now — try again in a moment.", timestamp: Date.now() }]);
        } finally {
          setBusy(false);
        }
      })();
    },
    [scope, busy],
  );

  if (!scope) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={openChat}
        data-testid="masterclass-coach-open"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex items-center gap-2 px-4 py-3 rounded-full bg-amber-500 text-white shadow-lg md:bottom-6"
      >
        <MessageCircle size={20} />
        <span className="text-sm font-semibold">Ask the coach</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex flex-col bg-theme-bg border-t-2 border-amber-500/40 max-h-[70vh] md:inset-auto md:bottom-6 md:right-4 md:w-96 md:rounded-2xl md:border-2 md:max-h-[32rem] shadow-2xl" data-testid="masterclass-coach-panel">
      <div className="flex items-center justify-between px-4 py-3 border-b border-theme-border/40">
        <span className="text-sm font-semibold text-amber-300 truncate">{scope.label}</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="Close coach chat" className="p-1.5 rounded-full text-theme-text">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {busy && <p className="text-xs text-theme-text-muted px-2">Coach is thinking…</p>}
      </div>
      <ChatInput onSend={handleSend} disabled={busy} placeholder={`Ask about the ${scope.label}…`} />
    </div>
  );
}
