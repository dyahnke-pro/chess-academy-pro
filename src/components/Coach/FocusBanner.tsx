import { Eye, RotateCcw, Play, Lightbulb } from 'lucide-react';
import { FOCUS_CARDS } from '../../coach/focus/focusCard';
import { RUNG_TIERS } from '../../coach/focus/focusRung';
import { castleRewindButton } from '../../coach/focus/castlingWatch';
import type { FocusView } from '../../coach/focus/useFocusRunner';

interface FocusBannerProps {
  view: FocusView;
  onTryAgain: () => void;
  onPlayOn: () => void;
  onShowMe: () => void;
}

/** The focus label: the focus and the student's rung, as one chip that rides
 *  in the student's own player row (David 2026-11-16: "The board is the wrong
 *  size … It needs to fill the screen" — a whole row under the board for a
 *  label took the board's height on a phone). */
export function FocusChip({ view }: { view: FocusView }): JSX.Element | null {
  if (!view.focus) return null;
  const tier = view.rung !== null ? RUNG_TIERS[view.rung].title : null;
  return (
    <span className="flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-theme-text whitespace-nowrap" data-testid="focus-chip">
      <Eye size={12} className="text-sky-400 shrink-0" />
      {FOCUS_CARDS[view.focus].title}
      {tier && <span className="font-normal text-theme-text-muted" data-testid="focus-rung">· {tier}</span>}
    </span>
  );
}

/** The Learn board's focus rewind (WO-FOCUS-TACTICS-01): on a taught miss,
 *  "Try again" first, "Play on" beside it ("Take it back" for the one deciding
 *  blunder, "Go back and castle" for a castling STOP); after a second miss at
 *  rung 0, "Show me" — the student's own tap, never automatic. It takes no
 *  height while the game plays; the focus label is `FocusChip`. */
export function FocusBanner({ view, onTryAgain, onPlayOn, onShowMe }: FocusBannerProps): JSX.Element | null {
  if (!view.focus) return null;
  return (
    <div className={view.paused ? 'px-3 pb-2' : ''} data-testid="focus-banner" data-focus={view.focus} data-rung={view.rung ?? ''} data-paused={view.paused ? (view.paused.castle !== null ? 'castle' : view.paused.deciding ? 'deciding' : view.paused.showMe ? 'show-me' : 'miss') : ''}>
      {view.paused && (
        <div className="flex gap-2" data-testid="focus-rewind">
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
              <RotateCcw size={14} />{view.paused.castle !== null ? castleRewindButton(view.paused.castle) : view.paused.deciding ? 'Take it back' : 'Try again'}
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
