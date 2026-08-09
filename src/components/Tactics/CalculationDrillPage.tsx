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
  // No wrapping scroll/padding container here: CalculationTab's drill view
  // renders ChessLessonLayout, which must be the DIRECT child of <main> to
  // correctly cap the board height and reserve space above the mobile bottom
  // nav (see ChessLessonLayout.tsx). Nesting it inside another overflow-y-auto
  // + padded div stacks two bottom-padding reserves and pushes the Skip/Hint/
  // Next control row off-screen with no way to scroll to it. The picker and
  // rationale views own their own scroll/padding wrapper for the same reason.
  return <CalculationTab onExit={() => { void navigate('/tactics'); }} />;
}
