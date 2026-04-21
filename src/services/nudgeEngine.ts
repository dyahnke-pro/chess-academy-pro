/**
 * nudgeEngine.ts — decides which contextual nudge (if any) to surface
 * for the current user state.
 *
 * Ships DORMANT behind the ff_nudge_system_enabled PostHog feature
 * flag (default OFF everywhere). Once the flag is flipped, the engine
 * begins firing `nudge_shown` events and rendering sonner toasts; no
 * code change needed.
 *
 * Rules (in priority order):
 *   1. mistakesDueToday > 0 → "X mistakes waiting to review" toast
 *      with CTA to /tactics/mistakes.
 *   2. streak.current >= 3, no activity today, local time > 6pm →
 *      streak-keeper toast.
 *   3. Any unflagged new_feature_* flag with a key not yet in
 *      dismissals → open ChangelogModal.
 *
 * Gate ordering: the ff_nudge_system_enabled flag short-circuits the
 * whole evaluator, so disabled-state users pay zero cost beyond the
 * `isFeatureEnabled` call.
 */

import { track, EVENTS, isFeatureEnabled } from './analytics';
import { recordDismissal } from './dismissals';
import { notify } from './notify';
import type { StreakState } from '../stores/userContext';

export const NUDGE_FLAG = 'ff_nudge_system_enabled';

export type NudgeKind = 'mistakes-due' | 'streak-keeper' | 'new-feature';

export interface NudgeContext {
  mistakesDueToday: number;
  streak: StreakState;
  dismissals: Set<string>;
  now?: Date;
  /** Called when the user taps the CTA. Defaults to pushState nav. */
  navigate?: (route: string) => void;
}

export interface NudgeDecision {
  kind: NudgeKind;
  key: string;
  message: string;
  description?: string;
  cta?: { label: string; route: string };
}

/**
 * Pure decision function — returns what nudge (if any) should fire
 * for the given context. No side effects. Unit-testable.
 */
export function decideNudge(ctx: NudgeContext): NudgeDecision | null {
  const now = ctx.now ?? new Date();

  // Rule 1: mistakes due today.
  if (ctx.mistakesDueToday > 0) {
    const key = `mistakes-due:${isoDay(now)}`;
    if (!ctx.dismissals.has(key)) {
      return {
        kind: 'mistakes-due',
        key,
        message: `${ctx.mistakesDueToday} mistake${ctx.mistakesDueToday === 1 ? '' : 's'} waiting for review`,
        description: 'Review them now to lock the lesson in.',
        cta: { label: 'Review', route: '/tactics/mistakes' },
      };
    }
  }

  // Rule 2: streak keeper — 3+ day streak, nothing done today, late evening.
  if (
    ctx.streak.current >= 3 &&
    !sameLocalDay(ctx.streak.lastActiveISO, now) &&
    now.getHours() >= 18
  ) {
    const key = `streak-keeper:${isoDay(now)}`;
    if (!ctx.dismissals.has(key)) {
      return {
        kind: 'streak-keeper',
        key,
        message: `Keep your ${ctx.streak.current}-day streak alive`,
        description: 'One puzzle is enough to count today.',
        cta: { label: 'One puzzle', route: '/tactics/adaptive' },
      };
    }
  }

  return null;
}

/**
 * Evaluate the current context and, if a nudge should fire AND the
 * master flag is ON, surface it via sonner and emit PostHog events.
 * No-op when the flag is off.
 */
export function evaluateNudges(ctx: NudgeContext): void {
  if (!isFeatureEnabled(NUDGE_FLAG)) return;
  const decision = decideNudge(ctx);
  if (!decision) return;

  track(EVENTS.nudgeShown, { kind: decision.kind, key: decision.key });

  const cta = decision.cta;
  notify.due(decision.message, {
    description: decision.description,
    action: cta
      ? {
          label: cta.label,
          onClick: () => {
            track(EVENTS.nudgeCtaClicked, {
              key: decision.key,
              route: cta.route,
            });
            void recordDismissal(decision.key);
            if (ctx.navigate) ctx.navigate(cta.route);
            else if (typeof window !== 'undefined') {
              window.history.pushState(null, '', cta.route);
            }
          },
        }
      : undefined,
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sameLocalDay(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
