/**
 * Canonical user-context selectors (WO-INFRA-01).
 *
 * Every component that needs to know "who the current user is" or
 * any user-scoped derived value (rating, streak, learner type, etc.)
 * MUST consume one of the hooks exported here instead of pulling
 * `activeProfile` straight from `useAppStore`. Centralising the
 * selectors keeps:
 *   - return types stable across the codebase (no scattered
 *     `currentRating ?? 0` defaults that drift),
 *   - future migration paths open (e.g. flipping the rating source
 *     from Dexie to Supabase only touches this file),
 *   - test mocking trivial — stub these hooks and every consumer
 *     gets the same fake user shape.
 *
 * Live in `src/store/` (not `src/stores/`) because they are *derived*
 * selectors composed over the Zustand store, not a new store.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/schema';
import type { UserProfile } from '../types';

/**
 * Coach personality currently driving narration. Today the project
 * ships a single coach voice ("danya") and the value is hard-coded;
 * once a per-profile coach selector lands, this hook will read it
 * from `activeProfile.preferences` without consumers needing to
 * change.
 */
export type CoachId = 'danya' | 'kasparov' | 'fischer';

/**
 * Surface-level user archetype. Drives copy tone, layout density,
 * and which onboarding cues fire. Derived from `isKidMode` today.
 */
export type LearnerType = 'kid' | 'adult';

/** The active user profile, or `null` before hydration completes. */
export function useCurrentUser(): UserProfile | null {
  return useAppStore((s) => s.activeProfile);
}

/**
 * The coach personality the user has selected (or the default when
 * none is persisted yet). Returns a stable `CoachId` so consumers
 * can switch on it without null-handling.
 */
export function useDefaultCoach(): CoachId {
  return useAppStore(() => 'danya');
}

/**
 * Live game ELO. Returns `0` when no profile is hydrated so callers
 * can render a skeleton without a null check.
 */
export function useUserRating(): number {
  return useAppStore((s) => s.activeProfile?.currentRating ?? 0);
}

/**
 * Current consecutive-day streak. Returns `0` before hydration.
 */
export function useStreak(): number {
  return useAppStore((s) => s.activeProfile?.currentStreak ?? 0);
}

/**
 * User archetype derived from the profile's kid-mode flag. Defaults
 * to `'adult'` before hydration so adult-targeted copy renders in
 * the loading state instead of kid-targeted copy.
 */
export function useLearnerType(): LearnerType {
  return useAppStore((s) => (s.activeProfile?.isKidMode ? 'kid' : 'adult'));
}

/**
 * `true` once the profile has been hydrated from Dexie. The app
 * does not yet ship a dedicated onboarding flow — when one lands,
 * this hook will consult an explicit `hasOnboarded` flag on the
 * profile instead of treating "profile exists" as the proxy.
 */
export function useHasOnboarded(): boolean {
  return useAppStore((s) => s.activeProfile !== null);
}

/**
 * Count of mistake puzzles whose SRS due date is on or before the
 * end of today and which have not yet been mastered. Polls Dexie
 * once per profile change (the data does not mutate often enough
 * to justify a live subscription). Returns `0` before hydration or
 * if the query fails — failures are logged and swallowed so a
 * dashboard widget never blocks rendering.
 */
export function useMistakesDueToday(): number {
  const profile = useAppStore((s) => s.activeProfile);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!profile) {
      setCount(0);
      return;
    }
    let cancelled = false;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const cutoff = endOfToday.toISOString();
    db.mistakePuzzles
      .where('srsDueDate')
      .belowOrEqual(cutoff)
      .filter((p) => p.status !== 'mastered')
      .count()
      .then((n) => {
        if (!cancelled) setCount(n);
      })
      .catch((err: unknown) => {
        console.warn('[useMistakesDueToday] query failed:', err);
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  return count;
}
