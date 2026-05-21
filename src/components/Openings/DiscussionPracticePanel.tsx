// The Discussion Practice prompt UI — the "why did you play that?" card.
// Voice-first (the parent surface speaks the question + coachNote via its
// own say()), with a text fallback and a skip. Kept dumb: all logic lives
// in useDiscussionPractice / services. Mounts inside a play surface.

import { useState, useCallback } from 'react';
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

  if (phase === 'teaching' && teach) {
    return (
      <div className="px-4 pb-safe-4">
        <ExplanationCard text={teach} visible onDismiss={onDismissTeach} variant="info" />
      </div>
    );
  }

  if (phase === 'thinking') {
    return (
      <div className="px-4 pb-safe-4">
        <p className="text-xs text-theme-text-muted" data-testid="discussion-thinking">Thinking…</p>
      </div>
    );
  }

  if (phase !== 'asking' || !prompt) return null;

  return (
    <div
      className="px-4 pb-safe-4 pt-2 border-t border-theme-border bg-theme-surface"
      data-testid="discussion-prompt"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-theme-text">{prompt.question}</p>
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
  );
}
