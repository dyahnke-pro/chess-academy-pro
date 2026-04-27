/**
 * useArrowState — coach-arrow plumbing for any board surface.
 * WO-COACH-ARROWS.
 *
 * The brain calls the `draw_arrows` cerebrum tool while explaining.
 * The tool's surface callback writes into the appStore's `coachArrows`
 * slice via this hook. Any board (CoachGamePage, WalkthroughMode,
 * the global drawer's surrounding board) reads from the same slice
 * and renders the arrows.
 *
 * Auto-clear: the appStore's `setGlobalBoardContext` action wipes
 * `coachArrows` whenever `lastMove.san` changes — so the brain's
 * highlights don't linger past the user's next move. That's why this
 * hook doesn't need to subscribe to lastMove itself.
 *
 * Returns:
 *   - `arrows`: the current coach arrows (empty array when none)
 *   - `setArrows(arrows)`: replace the current set (the
 *     `onDrawArrows` callback)
 *   - `clearArrows()`: wipe (the `onClearArrows` callback)
 *
 * Both setters are stable references — safe to pass into
 * `coachService.ask` options without re-creating the call between
 * renders.
 */
import { useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { ArrowSpec } from '../../coach/types';

export interface UseArrowStateReturn {
  arrows: ArrowSpec[];
  setArrows: (arrows: ArrowSpec[]) => void;
  clearArrows: () => void;
}

export function useArrowState(): UseArrowStateReturn {
  const arrows = useAppStore((s) => s.coachArrows);
  const setCoachArrows = useAppStore((s) => s.setCoachArrows);
  const clearCoachArrows = useAppStore((s) => s.clearCoachArrows);

  const setArrows = useCallback(
    (next: ArrowSpec[]) => {
      setCoachArrows(next);
    },
    [setCoachArrows],
  );

  const clearArrows = useCallback(() => {
    clearCoachArrows();
  }, [clearCoachArrows]);

  return { arrows, setArrows, clearArrows };
}
