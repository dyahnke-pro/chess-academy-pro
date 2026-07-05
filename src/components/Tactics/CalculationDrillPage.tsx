import { useNavigate } from 'react-router-dom';
import { CalculationTab } from '../Coach/CalculationTab';

/**
 * CalculationDrillPage — the calculation skill drills as a first-class Tactics
 * surface (`/tactics/calculation`). Calculation isn't an endgame topic, so it
 * lives here alongside the other tactical training (David 2026-07-05, moved out
 * of the Endgame page's "Calc" tab). Thin wrapper: `CalculationTab` owns the
 * picker + drills; exit returns to the Tactics hub.
 */
export function CalculationDrillPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-6">
      <CalculationTab onExit={() => { void navigate('/tactics'); }} />
    </div>
  );
}
