import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X } from 'lucide-react';
import { ChatMessage } from '../Coach/ChatMessage';
import { ChatInput } from '../Coach/ChatInput';
import { dispatchCoachTurn } from '../../coach/dispatchCoachTurn';
// groundCoachReply import removed — the spine grounds the answer (David 2026-07-09).
import { useCoachMemoryStore } from '../../stores/coachMemoryStore';
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [busy, setBusy] = useState(false);

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
      // Continuity: the unified spine reads conversation history from the
      // shared memory store (not a passed array), so thread the user turn in.
      useCoachMemoryStore.getState().appendConversationMessage({ surface: 'chat-home', role: 'user', text, trigger: null });
      setBusy(true);
      void (async () => {
        try {
          // Ground the question BEFORE the free LLM so the opening-page coach
          // is one coherent unit with Learn/Play (David 2026-07-04): "what am I
          // weak in?" / "what's my strongest opening?" now voice the computed
          // data via the same assemblers instead of the old free-narration
          // punt. Board-independent here (no FEN on the course page); the
          // openingId scopes any opening-context grounding.
          // Route through the ONE shared spine (identical-capabilities rule).
          // The course scope rides the spine's per-call system hook
          // (systemPromptAddition), grounding is auto-built inside ask, and the
          // agentic tool loop gives the course chat navigate/teach — which the
          // old flat getCoachChatResponse path could not do.
          const answer = await dispatchCoachTurn(
            { surface: 'standalone-chat', ask: text, liveState: { surface: 'standalone-chat', userJustDid: text } },
            {
              systemPromptAddition: scope.systemAddition,
              maxToolRoundTrips: 3,
              onNavigate: (path: string) => { void navigate(path); },
            },
          );
          // The answer is spine-grounded (dispatchCoachTurn → coachService.ask);
          // the post-hoc strip is DELETED (David 2026-07-09 — "finish ripping").
          const grounded = answer.text;
          useCoachMemoryStore.getState().appendConversationMessage({ surface: 'chat-home', role: 'coach', text: grounded, trigger: null });
          setMessages((prev) => [...prev, {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: grounded,
            timestamp: Date.now(),
            // Opt-in follow-up picker the grounded answer attached (David
            // 2026-07-04) — tappable chip, never auto-launched.
            ...(answer.actionOffer && answer.actionOffer.length > 0 ? { metadata: { actions: answer.actionOffer } } : {}),
          }]);
        } catch {
          setMessages((prev) => [...prev, { id: `err-${Date.now()}`, role: 'assistant', content: "I couldn't reach the coach just now — try again in a moment.", timestamp: Date.now() }]);
        } finally {
          setBusy(false);
        }
      })();
    },
    [scope, busy, navigate],
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
