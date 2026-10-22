import { Target, RotateCcw, Play, CheckCircle2 } from 'lucide-react';
import type { RunnerState } from '../../missions/missionRunner';
import type { MissionPhase } from '../../missions/missionCard';

/** What the banner says when a card's phase ended before it passed. */
const PHASE_OVER: Record<MissionPhase, string> = {
  opening: 'Opening over',
  middlegame: 'Middlegame over',
  endgame: 'Endgame over',
};

interface MissionBannerProps {
  view: RunnerState;
  onTryAgain: () => void;
  onPlayOn: () => void;
}

/** The Learn board's mission row (WO-MISSIONS-01): the mission and how far
 *  along it is; on a miss, the rewind — "Try again" first, "Play on" beside it.
 *  ONE row of FIXED height: the rewind takes the progress line's place inside
 *  it, never a row of its own — a second row resized the board mid-game, on
 *  the very move the student was thinking about (David 2026-10-21: "the chess
 *  board does not fit to the screen"). */
export function MissionBanner({ view, onTryAgain, onPlayOn }: MissionBannerProps): JSX.Element | null {
  const card = view.card;
  if (!card || view.phase === 'idle') return null;
  // A card that resolved stays on the banner while a later phase is watched.
  const done = view.phase === 'resolved' || view.phase === 'watching';
  const passed = done && (view.outcome === 'pass-first-try' || view.outcome === 'pass-retry');
  return (
    <div className="px-3 pb-2" data-testid="mission-banner" data-mission={card.id} data-phase={view.phase} data-outcome={view.outcome ?? ''}>
      <div
        className={`flex h-12 items-center gap-2 rounded-xl border px-3 text-xs ${passed ? 'border-amber-400/50 bg-amber-400/10' : 'border-sky-500/30 bg-sky-500/10'}`}
        data-testid="mission-banner-row"
      >
        {passed ? <CheckCircle2 size={16} className="text-amber-400 shrink-0" /> : <Target size={16} className="text-sky-400 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-theme-text truncate">Mission: {card.title}</div>
          {view.phase !== 'paused' && (
            <div className="text-theme-text-muted truncate" data-testid="mission-progress">
              {done ? (passed ? 'Complete' : view.outcome === 'miss-shown' ? 'Shown — keep playing' : view.outcome === 'missed' ? 'Missed' : PHASE_OVER[card.phase]) : view.progress}
            </div>
          )}
        </div>
        {view.phase === 'paused' && (
          <div className="flex shrink-0 gap-1.5" data-testid="mission-rewind">
            <button
              onClick={onTryAgain}
              className="flex h-9 items-center gap-1 rounded-lg bg-sky-500 px-2.5 text-xs font-semibold text-white"
              data-testid="mission-try-again"
            >
              <RotateCcw size={12} />Try again
            </button>
            <button
              onClick={onPlayOn}
              className="flex h-9 items-center gap-1 rounded-lg border border-theme-border px-2.5 text-xs font-medium text-theme-text"
              data-testid="mission-play-on"
            >
              <Play size={12} />Play on
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
