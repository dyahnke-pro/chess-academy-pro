/**
 * usePuzzleMeter — the free-tier puzzle bucket, at the puzzle-board level.
 * --------------------------------------------------------------------------
 * A non-Pro user gets FREE_PUZZLE_LIMIT (20) puzzles total, across every
 * solving surface. The two shared boards (PuzzleBoard, MistakePuzzleBoard) call
 * `consume()` once per puzzle when it reaches a terminal state; the route-level
 * AccessGate walls `/tactics/*` once the bucket is spent (so surfaces that don't
 * render those boards still can't be entered once you're out). Dormant unless
 * the gate is live AND the user is not Pro — `consume()` no-ops otherwise.
 * See docs/plans/2026-07-14-freemium-soft-gate.md.
 */
import { useCallback } from 'react';
import { useEntitlement } from './useEntitlement';
import { useFreeTierStore } from '../stores/freeTierStore';
import { puzzlesRemaining, hasPuzzlesLeft } from '../services/freeTierService';
import { trackFreePuzzleLimitReached } from '../services/billingAnalytics';

export interface PuzzleMeter {
  /** True when metering is live (gate on + non-Pro). When false, everything is
   *  unlimited and `consume` no-ops. */
  active: boolean;
  /** Puzzles left in the free bucket (Infinity when not metered). */
  remaining: number;
  /** Whether the user may start another free puzzle. */
  hasLeft: boolean;
  /** Count one consumed puzzle against the bucket (idempotency is the caller's
   *  job — call once per distinct puzzle). No-op when not metered. */
  consume: () => void;
}

export function usePuzzleMeter(): PuzzleMeter {
  const { isPro, gateEnabled } = useEntitlement();
  const row = useFreeTierStore((s) => s.row);
  const recordPuzzleSolved = useFreeTierStore((s) => s.recordPuzzleSolved);

  const active = gateEnabled && !isPro;
  const remaining = active ? puzzlesRemaining(row) : Infinity;
  const hasLeft = !active || hasPuzzlesLeft(row);

  const consume = useCallback(() => {
    if (!active) return;
    // Fire the upgrade-pressure event on the spend that EMPTIES the bucket
    // (remaining goes 1 → 0), not every solve.
    const willEmpty = puzzlesRemaining(row) <= 1;
    void recordPuzzleSolved();
    if (willEmpty) trackFreePuzzleLimitReached();
  }, [active, recordPuzzleSolved, row]);

  return { active, remaining, hasLeft, consume };
}
