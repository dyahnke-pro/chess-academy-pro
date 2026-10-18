import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useFirstRunStep } from './useFirstRunStep';
import { advanceFirstRun } from '../../services/firstRunJourney';
import { captureEvent } from '../../services/analytics';

/**
 * Step three of the first run, shown on the import screen: on to the free
 * opening, whether or not the import happened (`label` says which).
 */
export function FirstRunOpeningNext({ label }: { label: string }): JSX.Element | null {
  const step = useFirstRunStep();
  const navigate = useNavigate();
  if (step !== 'import') return null;
  const go = (): void => {
    captureEvent('first_run_step', { step: 'opening' });
    void advanceFirstRun('opening').then(() => navigate('/openings'));
  };
  return (
    <button
      type="button"
      onClick={go}
      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 text-sm font-semibold text-theme-text min-h-[44px]"
      data-testid="first-run-opening-next"
    >
      <BookOpen size={18} className="text-cyan-400" />
      {label}
    </button>
  );
}

/** The banner on Openings while the student is picking their free opening. */
export function FirstRunOpeningBanner(): JSX.Element | null {
  const step = useFirstRunStep();
  if (step !== 'opening') return null;
  return (
    <div className="rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 px-4 py-3" data-testid="first-run-opening-banner">
      <div className="text-sm font-semibold text-theme-text">Pick your free opening</div>
      <div className="text-xs text-theme-text-muted">Tap any opening and start its lesson. That one is yours to keep, free.</div>
    </div>
  );
}
