/**
 * useCoachFreeMeter — the free-tier coach budget, at the coach-surface level.
 * --------------------------------------------------------------------------
 * A non-Pro user gets FREE_COACH_LESSON_LIMIT (7) Watch-lesson starts and
 * FREE_COACH_CHAT_LIMIT (50) chat turns, both lifetime, no trial-clock start
 * (David 2026-08-06: "give them a little more... I'm giving value"). The two
 * buckets are independent spends. CoachTeachPage calls `consumeLesson()` once
 * per genuinely NEW walkthrough start (never on resume) and `consumeChatTurn()`
 * once per real user turn (never on the kickoff greeting); the route-level
 * AccessGate walls `/coach/*` once BOTH buckets are spent — same self-wall
 * pattern as `usePuzzleMeter`. Dormant unless the gate is live and the user is
 * not Pro — the consume calls no-op otherwise.
 */
import { useCallback } from 'react';
import { useEntitlement } from './useEntitlement';
import { useFreeTierStore } from '../stores/freeTierStore';
import {
  coachLessonsRemaining,
  coachChatTurnsRemaining,
  hasCoachLessonsLeft,
  hasCoachChatTurnsLeft,
} from '../services/freeTierService';
import { trackFreeCoachLimitReached } from '../services/billingAnalytics';

export interface CoachFreeMeter {
  /** True when metering is live (gate on + non-Pro). When false, everything is
   *  unlimited and the consume calls no-op. */
  active: boolean;
  /** Lessons left in the free bucket (Infinity when not metered). */
  lessonsRemaining: number;
  /** Chat turns left in the free bucket (Infinity when not metered). */
  chatTurnsRemaining: number;
  /** Whether the user may start another free lesson. */
  hasLessonsLeft: boolean;
  /** Whether the user may send another free chat turn. */
  hasChatTurnsLeft: boolean;
  /** Count one lesson start against the bucket. Caller's job to call this only
   *  on a genuinely NEW walkthrough (never a resume). No-op when not metered. */
  consumeLesson: () => void;
  /** Count one chat turn against the bucket. No-op when not metered. */
  consumeChatTurn: () => void;
}

export function useCoachFreeMeter(): CoachFreeMeter {
  const { isPro, gateEnabled } = useEntitlement();
  const row = useFreeTierStore((s) => s.row);
  const recordCoachLessonUsed = useFreeTierStore((s) => s.recordCoachLessonUsed);
  const recordCoachChatTurnUsed = useFreeTierStore((s) => s.recordCoachChatTurnUsed);

  const active = gateEnabled && !isPro;
  const lessonsRemaining = active ? coachLessonsRemaining(row) : Infinity;
  const chatTurnsRemaining = active ? coachChatTurnsRemaining(row) : Infinity;
  const hasLessonsLeft = !active || hasCoachLessonsLeft(row);
  const hasChatTurnsLeft = !active || hasCoachChatTurnsLeft(row);

  const consumeLesson = useCallback(() => {
    if (!active) return;
    // Fire the upgrade-pressure event only on the spend that empties BOTH
    // buckets (this one AND chat turns already spent), not every lesson.
    const willExhaust = coachLessonsRemaining(row) <= 1 && !hasCoachChatTurnsLeft(row);
    void recordCoachLessonUsed();
    if (willExhaust) trackFreeCoachLimitReached('lesson');
  }, [active, recordCoachLessonUsed, row]);

  const consumeChatTurn = useCallback(() => {
    if (!active) return;
    const willExhaust = coachChatTurnsRemaining(row) <= 1 && !hasCoachLessonsLeft(row);
    void recordCoachChatTurnUsed();
    if (willExhaust) trackFreeCoachLimitReached('chat_turn');
  }, [active, recordCoachChatTurnUsed, row]);

  return {
    active,
    lessonsRemaining,
    chatTurnsRemaining,
    hasLessonsLeft,
    hasChatTurnsLeft,
    consumeLesson,
    consumeChatTurn,
  };
}
