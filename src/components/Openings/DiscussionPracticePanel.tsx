// The Discussion Practice prompt UI — the "why did you play that?" card.
// Voice-first (the parent surface speaks the question + coachNote via its
// own say()), with a text fallback and a skip. Kept dumb: all logic lives
// in useDiscussionPractice / services. Mounts inside a play surface.

import { useState, useCallback, type ReactNode } from 'react';
import { Send, X } from 'lucide-react';
import { ExplanationCard } from './ExplanationCard';
import type { DiscussionPhase, DiscussionPrompt } from '../../hooks/useDiscussionPractice';
import type { MisconceptionCandidate } from '../../services/misconceptionDiagnosis';
import { getMisconceptionTag } from '../../data/misconceptionTags';

// The judgment-only buckets code can't determine — shown when the detector
// fired nothing, so the user can still tag a quiet slip. + Random escape.
const JUDGMENT_FLOOR = ['wrong-side', 'overestimated-opponents-attack', 'misplaced-piece', 'no-plan'];

interface DiscussionPracticePanelProps {
  phase: DiscussionPhase;
  prompt: DiscussionPrompt | null;
  teach: string | null;
  /** Ranked candidate buckets (best guess first) when phase === 'picking'. */
  pickerCandidates?: MisconceptionCandidate[];
  onSubmit: (reason: string) => void;
  onSkip: () => void;
  /** Log the bucket the user picked ('random' = honest escape). */
  onPick?: (tag: string) => void;
  onDismissTeach: () => void;
}

export function DiscussionPracticePanel({
  phase,
  prompt,
  teach,
  pickerCandidates = [],
  onSubmit,
  onSkip,
  onPick,
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

  // Code was unsure → the ranked-candidate picker. Most-probable on top (the
  // 1-tap confirm). Falls back to the judgment floor when code fired nothing.
  // "Not sure" is first-class so nobody mis-tags to dismiss it (accuracy here
  // feeds the training plan).
  if (phase === 'picking' && onPick) {
    const ids = pickerCandidates.length > 0 ? pickerCandidates.map((c) => c.tag) : JUDGMENT_FLOOR;
    return (
      <Shell>
        <div data-testid="discussion-picker">
          <p className="text-sm font-semibold text-amber-300 mb-1">Which best fits the mistake?</p>
          <p className="text-xs text-theme-text-muted mb-2">This tags it so your training plan drills the right thing — pick the real one.</p>
          <div className="flex flex-col gap-1.5">
            {ids.map((tag, i) => (
              <button
                key={tag}
                onClick={() => onPick(tag)}
                className={`text-left px-3 py-2 rounded-lg border text-sm ${i === 0 && pickerCandidates.length > 0 ? 'border-theme-accent bg-theme-accent/10 text-theme-text' : 'border-theme-border bg-theme-bg text-theme-text hover:bg-theme-border/40'}`}
                data-testid={`discussion-pick-${tag}`}
              >
                {getMisconceptionTag(tag)?.label ?? tag}
                {i === 0 && pickerCandidates.length > 0 ? <span className="ml-2 text-xs text-theme-accent">best guess</span> : null}
              </button>
            ))}
            <button
              onClick={() => onPick('random')}
              className="text-left px-3 py-2 rounded-lg border border-theme-border bg-theme-bg text-sm text-theme-text-muted hover:bg-theme-border/40"
              data-testid="discussion-pick-random"
            >
              Random / not sure
            </button>
          </div>
        </div>
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
