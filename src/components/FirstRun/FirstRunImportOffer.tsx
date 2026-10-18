import { useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useFirstRunStep } from './useFirstRunStep';
import { advanceFirstRun } from '../../services/firstRunJourney';
import { captureEvent } from '../../services/analytics';

/**
 * Step two of the first run: after the first game with the coach, bring in
 * the student's real games so the coach can learn them. Renders only while the
 * journey is on its first step.
 */
export function FirstRunImportOffer(): JSX.Element | null {
  const step = useFirstRunStep();
  const navigate = useNavigate();
  if (step !== 'learn') return null;
  const go = (): void => {
    captureEvent('first_run_step', { step: 'import' });
    void advanceFirstRun('import').then(() => navigate('/games/import?firstRun=1'));
  };
  return (
    <button
      type="button"
      onClick={go}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 text-left min-h-[44px]"
      data-testid="first-run-import-offer"
    >
      <Download size={20} className="text-cyan-400 shrink-0" />
      <span>
        <span className="block text-sm font-semibold text-theme-text">Bring in your real games</span>
        <span className="block text-xs text-theme-text-muted">Your Chess.com or Lichess name, and the coach starts learning how you play.</span>
      </span>
    </button>
  );
}
