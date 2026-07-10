// The Discussion Practice prompt UI — the "why did you play that?" card.
// Voice-first (the parent surface speaks the question + coachNote via its
// own say()), with a text fallback and a skip. Kept dumb: all logic lives
// in useDiscussionPractice / services. Mounts inside a play surface.

import { useState, useCallback, type ReactNode } from 'react';
import { Send, X, Lightbulb, PencilLine } from 'lucide-react';
import { ExplanationCard } from './ExplanationCard';
import { HINT_SENTINEL, type DiscussionPhase, type DiscussionPrompt } from '../../hooks/useDiscussionPractice';

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
  const [typing, setTyping] = useState(false);

  const submit = useCallback(() => {
    const r = text.trim();
    setText('');
    setTyping(false);
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

  // The picker: deterministic reason chips (never telegraph the answer) +
  // "Type your answer" + Hint (reveals the grounded answer). CLEAN probe — the
  // question carries ZERO board facts; the answer only appears after a commit.
  const options = prompt.options ?? [];
  const showPicker = options.length > 0 && !typing;

  return (
    <Shell>
      <div data-testid="discussion-prompt">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-amber-300">{prompt.question}</p>
            {prompt.severity && (
              <span
                data-testid="discussion-severity"
                className={
                  'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ' +
                  (prompt.severity === 'blunder'
                    ? 'bg-red-500/20 text-red-300'
                    : prompt.severity === 'mistake'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'bg-yellow-500/20 text-yellow-300')
                }
              >
                {prompt.severity}
              </span>
            )}
          </div>
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

        {showPicker ? (
          <div className="flex flex-col gap-1.5" data-testid="discussion-reason-picker">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onSubmit(opt)}
                className="w-full text-left px-3 py-2 rounded-lg bg-theme-bg border border-theme-border text-sm text-theme-text hover:border-theme-accent hover:bg-theme-border/40"
                data-testid="discussion-reason-option"
              >
                {opt}
              </button>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setTyping(true)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-theme-border text-xs text-theme-text-muted hover:text-theme-text"
                data-testid="discussion-type-toggle"
              >
                <PencilLine size={13} /> Type your answer
              </button>
              <button
                onClick={() => onSubmit(HINT_SENTINEL)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-amber-500/40 text-xs text-amber-300 hover:bg-amber-500/10"
                data-testid="discussion-hint"
              >
                <Lightbulb size={13} /> Hint
              </button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </Shell>
  );
}
