import { Eye, RotateCcw, Play, Lightbulb } from 'lucide-react';
import { FOCUS_CARDS } from '../../coach/focus/focusCard';
import { RUNG_TIERS } from '../../coach/focus/focusRung';
import type { FocusView } from '../../coach/focus/useFocusRunner';

interface FocusBannerProps {
  view: FocusView;
  onTryAgain: () => void;
  onPlayOn: () => void;
  onShowMe: () => void;
}

/** The Learn board's focus row (WO-FOCUS-TACTICS-01): the focus and the
 *  student's rung; on a taught miss the rewind — "Try again" first, "Play on"
 *  beside it ("Take it back" for the one deciding blunder); after a second
 *  miss at rung 0, "Show me" — the student's own tap, never automatic. */
export function FocusBanner({ view, onTryAgain, onPlayOn, onShowMe }: FocusBannerProps): JSX.Element | null {
  if (!view.focus) return null;
  const tier = view.rung !== null ? RUNG_TIERS[view.rung].title : null;
  return (
    <div className="px-3 pb-2" data-testid="focus-banner" data-focus={view.focus} data-rung={view.rung ?? ''} data-paused={view.paused ? (view.paused.deciding ? 'deciding' : view.paused.showMe ? 'show-me' : 'miss') : ''}>
      <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs">
        <Eye size={16} className="text-sky-400 shrink-0" />
        <div className="min-w-0 flex-1 font-semibold text-theme-text truncate">Focus: {FOCUS_CARDS[view.focus].title}</div>
        {tier && <div className="shrink-0 text-theme-text-muted" data-testid="focus-rung">{tier}</div>}
      </div>
      {view.paused && (
        <div className="mt-2 flex gap-2" data-testid="focus-rewind">
          {view.paused.showMe ? (
            <button
              onClick={onShowMe}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white"
              data-testid="focus-show-me"
            >
              <Lightbulb size={14} />Show me
            </button>
          ) : (
            <button
              onClick={onTryAgain}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white"
              data-testid="focus-try-again"
            >
              <RotateCcw size={14} />{view.paused.deciding ? 'Take it back' : 'Try again'}
            </button>
          )}
          <button
            onClick={onPlayOn}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-theme-border px-3 py-2 text-sm font-medium text-theme-text"
            data-testid="focus-play-on"
          >
            <Play size={14} />Play on
          </button>
        </div>
      )}
    </div>
  );
}
