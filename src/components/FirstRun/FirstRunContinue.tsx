import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { advanceFirstRun } from '../../services/firstRunJourney';
import { captureEvent } from '../../services/analytics';

/**
 * Step two of the first run, AFTER the recap (David 2026-10-18: "a clean recap
 * that the user has time to read … maybe a continue button"): the student reads
 * the first game's recap at their own pace, then Continue takes them to bring
 * in their real games. Rendered by the game-over card only while the journey
 * is on its first step.
 */
export function FirstRunContinue(): JSX.Element {
  const navigate = useNavigate();
  const go = (): void => {
    captureEvent('first_run_step', { step: 'import' });
    void advanceFirstRun('import').then(() => navigate('/games/import?firstRun=1'));
  };
  return (
    <button
      type="button"
      onClick={go}
      className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-theme-accent text-theme-bg text-sm font-semibold min-h-[44px] transition-colors"
      data-testid="first-run-continue"
    >
      Continue
      <ChevronRight size={16} />
    </button>
  );
}
