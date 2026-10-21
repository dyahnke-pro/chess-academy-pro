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
 *  along it is; on a miss, the rewind — "Try again" first, "Play on" beside it. */
export function MissionBanner({ view, onTryAgain, onPlayOn }: MissionBannerProps): JSX.Element | null {
  const card = view.card;
  if (!card || view.phase === 'idle') return null;
  const done = view.phase === 'resolved';
  const passed = view.outcome === 'pass-first-try' || view.outcome === 'pass-retry';
  return (
    <div className="px-3 pb-2" data-testid="mission-banner" data-mission={card.id} data-phase={view.phase} data-outcome={view.outcome ?? ''}>
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${passed ? 'border-amber-400/50 bg-amber-400/10' : 'border-sky-500/30 bg-sky-500/10'}`}>
        {passed ? <CheckCircle2 size={16} className="text-amber-400 shrink-0" /> : <Target size={16} className="text-sky-400 shrink-0" />}
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-theme-text truncate">Mission: {card.title}</div>
          <div className="text-theme-text-muted truncate" data-testid="mission-progress">
            {done ? (passed ? 'Complete' : view.outcome === 'miss-shown' ? 'Shown — keep playing' : PHASE_OVER[card.phase]) : view.progress}
          </div>
        </div>
      </div>
      {view.phase === 'paused' && (
        <div className="mt-2 flex gap-2" data-testid="mission-rewind">
          <button
            onClick={onTryAgain}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white"
            data-testid="mission-try-again"
          >
            <RotateCcw size={14} />Try again
          </button>
          <button
            onClick={onPlayOn}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-theme-border px-3 py-2 text-sm font-medium text-theme-text"
            data-testid="mission-play-on"
          >
            <Play size={14} />Play on
          </button>
        </div>
      )}
    </div>
  );
}
