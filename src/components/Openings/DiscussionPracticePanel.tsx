// The Discussion Practice prompt UI — the "why did you play that?" card.
// Voice-first (the parent surface speaks the question + coachNote via its
// own say()), with a text fallback and a skip. Kept dumb: all logic lives
// in useDiscussionPractice / services. Mounts inside a play surface.

import { useState, useCallback, type ReactNode } from 'react';
import { Send, X } from 'lucide-react';
import { ExplanationCard } from './ExplanationCard';
import type { DiscussionPhase, DiscussionPrompt } from '../../hooks/useDiscussionPractice';

interface DiscussionPracticePanelProps {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  teach: string | null;
  onSubmit: (reason: string) => void;
  onSkip: () => void;
  onDismissTeach: () => void;
}

export function DiscussionPracticePanel({
  phase,
  prompt,
  teach,
  onSubmit,
  onSkip,
  onDismissTeach,
}: DiscussionPracticePanelProps): JSX.Element | null {
  const [text, setText] = useState('');

  const submit = useCallback(() => {
    const r = text.trim();
    setText('');
    onSubmit(r);
  }, [text, onSubmit]);

  // A prominent floating pop-up (like the blunder alert) so the "why did you
  // play that?" question is impossible to miss — David 2026-06-04: "make sure
  // it pops up like the blunder alert." Bottom-centered, elevated, amber
  // accent; the wrapper lets clicks pass through everywhere except the card.
  const Shell = ({ children }: { children: ReactNode }): JSX.Element => (
    <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-50 px-4 pointer-events-none">
      <div className="pointer-events-auto mx-auto w-full max-w-lg rounded-2xl border-2 border-amber-500/60 bg-theme-surface px-4 py-3 shadow-2xl shadow-amber-500/20">
        {children}
      </div>
    </div>
  );

  if (phase === 'teaching' && teach) {
    return (
      <Shell>
        <ExplanationCard text={teach} visible onDismiss={onDismissTeach} variant="info" />
      </Shell>
    );
  }

  if (phase === 'thinking') {
    return (
      <Shell>
        <p className="text-sm text-theme-text-muted" data-testid="discussion-thinking">Thinking…</p>
      </Shell>
    );
  }

  if (phase !== 'asking' || !prompt) return null;

  return (
    <Shell>
      <div data-testid="discussion-prompt">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-amber-300">{prompt.question}</p>
          <button
            onClick={onSkip}
            className="p-1 rounded-lg hover:bg-theme-border/60 text-theme-text-muted shrink-0"
            aria-label="Skip"
            title="Skip"
            data-testid="discussion-skip"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Say or type your reasoning…"
            className="flex-1 px-3 py-2 rounded-lg bg-theme-bg border border-theme-border text-sm text-theme-text placeholder:text-theme-text-muted focus:outline-none focus:border-theme-accent"
            data-testid="discussion-input"
            autoFocus
          />
          <button
            onClick={submit}
            className="p-2 rounded-lg bg-theme-accent text-white hover:opacity-90 shrink-0"
            aria-label="Send"
            data-testid="discussion-send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </Shell>
  );
}
