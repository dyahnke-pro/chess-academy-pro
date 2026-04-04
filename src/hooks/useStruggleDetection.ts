/**
 * useStruggleDetection — proactive coaching during tactical training.
 *
 * Tracks time elapsed and wrong attempts while a player works on a puzzle.
 * When struggle thresholds are reached (adapted to player rating), the coach
 * speaks up with tactic-specific teaching — not just "try again" but real
 * conceptual guidance that helps the player understand the pattern.
 *
 * Used by MistakePuzzleBoard (Drill + Create) and TacticSetupBoard (Setup).
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  detectStruggleTier,
  getCoachingMessage,
  hasRecentFailure,
  type CoachingTier,
} from '../services/tacticAlertService';
import type { TacticType } from '../types';

export interface UseStruggleDetectionConfig {
  /** The tactic type being trained (null = unknown / skip detection) */
  tacticType: TacticType | null;
  /** Player's current rating */
  playerRating: number;
  /** Whether the puzzle is actively being solved */
  active: boolean;
  /** Current wrong attempt count (from the puzzle board) */
  wrongAttempts: number;
  /** Callback when coaching message should be delivered */
  onCoach: (message: string, tier: CoachingTier) => void;
}

export interface UseStruggleDetectionReturn {
  /** Reset the timer (call when a new puzzle starts) */
  reset: () => void;
  /** Current coaching tier being applied */
  currentTier: CoachingTier;
}

export function useStruggleDetection({
  tacticType,
  playerRating,
  active,
  wrongAttempts,
  onCoach,
}: UseStruggleDetectionConfig): UseStruggleDetectionReturn {
  const elapsedRef = useRef(0);
  const lastTierRef = useRef<CoachingTier>('none');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCoachRef = useRef(onCoach);
  onCoachRef.current = onCoach;

  const reset = useCallback((): void => {
    elapsedRef.current = 0;
    lastTierRef.current = 'none';
  }, []);

  // Check struggle tier and deliver coaching if escalated
  const checkStruggle = useCallback((): void => {
    if (!tacticType) return;

    const tier = detectStruggleTier({
      elapsedSeconds: elapsedRef.current,
      wrongAttempts,
      sameTypeFailed: hasRecentFailure(tacticType),
      playerRating,
    });

    // Only escalate — never repeat the same tier or go backwards
    if (tier === 'none' || tier === lastTierRef.current) return;

    const tierOrder: CoachingTier[] = ['none', 'nudge', 'teach', 'guide'];
    const currentIdx = tierOrder.indexOf(lastTierRef.current);
    const newIdx = tierOrder.indexOf(tier);
    if (newIdx <= currentIdx) return;

    const message = getCoachingMessage(tacticType, tier, playerRating);
    if (message) {
      lastTierRef.current = tier;
      onCoachRef.current(message, tier);
    }
  }, [tacticType, wrongAttempts, playerRating]);

  // Run a 1-second timer while active
  useEffect(() => {
    if (!active || !tacticType) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1;
      checkStruggle();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, tacticType, checkStruggle]);

  // Also check immediately when wrong attempts change
  useEffect(() => {
    if (active && wrongAttempts > 0) {
      checkStruggle();
    }
  }, [active, wrongAttempts, checkStruggle]);

  return {
    reset,
    currentTier: lastTierRef.current,
  };
}
