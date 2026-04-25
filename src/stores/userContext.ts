// userContext.ts — canonical selectors for user / profile / UI state.
//
// Rationale: `useAppStore` is a single big store (activeProfile +
// preferences + coach flags + UI toggles + transient board context).
// Consumers across the app reach into it for the same handful of
// fields over and over — and they do it inconsistently, sometimes
// pulling `state.activeProfile` and sometimes computing
// `state.activeProfile?.preferences.foo ?? defaultFoo` inline.
//
// This module is the contract. Read user context through the
// selectors below. If a selector doesn't exist for the thing you
// want, add it here — don't inline the same "?? default" dance in
// another component.
//
// All selectors are pure `(state) => T` functions so they compose
// with `useAppStore(selectFoo)` for subscription and are trivial to
// use outside React via `useAppStore.getState()`.

import { useAppStore } from './appStore';
import type { AiProvider, CoachVerbosity, UserProfile } from '../types';

type AppState = ReturnType<typeof useAppStore.getState>;

// ─── Canonical contract (WO-FOUND-02) ────────────────────────────────────────
//
// The 7 selectors below plus the existing ones form the read-surface
// every feature WO should consume. They all return sensible defaults
// when the backing column/table does not exist yet (missing column ≠
// error) so later WOs can wire them up without breaking callers.

export type DefaultCoach = 'danya' | 'kasparov' | 'fischer' | 'kid_coach';

export type LearnerType = 'adult' | 'kid';

export interface StreakState {
  current: number;
  longest: number;
  lastActiveISO: string | null;
}

export const STREAK_DEFAULT: StreakState = {
  current: 0,
  longest: 0,
  lastActiveISO: null,
};

// ─── Defaults ────────────────────────────────────────────────────────────────
//
// Centralized defaults for "user hasn't set this yet" reads. Keep in
// sync with the DEFAULT_USER_PROFILE in dbService.ts — these are the
// values we fall back to when `activeProfile` is null (cold start).

export const USER_CONTEXT_DEFAULTS = {
  name: 'Student',
  rating: 1200,
  puzzleRating: 1200,
  level: 1,
  xp: 0,
  aiProvider: 'deepseek' as AiProvider,
  coachVerbosity: 'unlimited' as CoachVerbosity,
  coachVoiceOn: true,
  kidMode: false,
} as const;

// ─── Profile selectors ───────────────────────────────────────────────────────

export const selectActiveProfile = (state: AppState): UserProfile | null =>
  state.activeProfile;

export const selectIsHydrated = (state: AppState): boolean =>
  !state.isLoading && state.activeProfile !== null;

export const selectUserName = (state: AppState): string =>
  state.activeProfile?.name ?? USER_CONTEXT_DEFAULTS.name;

export const selectUserRating = (state: AppState): number =>
  state.activeProfile?.currentRating ?? USER_CONTEXT_DEFAULTS.rating;

export const selectPuzzleRating = (state: AppState): number =>
  state.activeProfile?.puzzleRating ?? USER_CONTEXT_DEFAULTS.puzzleRating;

export const selectUserLevel = (state: AppState): number =>
  state.activeProfile?.level ?? USER_CONTEXT_DEFAULTS.level;

export const selectUserXp = (state: AppState): number =>
  state.activeProfile?.xp ?? USER_CONTEXT_DEFAULTS.xp;

export const selectIsKidMode = (state: AppState): boolean =>
  state.activeProfile?.isKidMode ?? USER_CONTEXT_DEFAULTS.kidMode;

// ─── Coach / AI selectors ────────────────────────────────────────────────────

export const selectAiProvider = (state: AppState): AiProvider =>
  state.activeProfile?.preferences.aiProvider ?? USER_CONTEXT_DEFAULTS.aiProvider;

export const selectCoachVerbosity = (state: AppState): CoachVerbosity =>
  state.activeProfile?.preferences.coachVerbosity ??
  USER_CONTEXT_DEFAULTS.coachVerbosity;

export const selectCoachVoiceOn = (state: AppState): boolean => state.coachVoiceOn;

export const selectCoachDrawerOpen = (state: AppState): boolean =>
  state.coachDrawerOpen;

/**
 * True when the user has configured at least one LLM provider key.
 * Used by the coach entry points to decide whether to route to
 * onboarding or go straight to the feature.
 */
export const selectHasLlmKey = (state: AppState): boolean => {
  const prefs = state.activeProfile?.preferences;
  if (!prefs) return false;
  return Boolean(prefs.apiKeyEncrypted) || Boolean(prefs.anthropicApiKeyEncrypted);
};

// ─── Board context selectors ─────────────────────────────────────────────────

export const selectGlobalBoardContext = (state: AppState): AppState['globalBoardContext'] =>
  state.globalBoardContext;

export const selectLastBoardSnapshot = (state: AppState): AppState['lastBoardSnapshot'] =>
  state.lastBoardSnapshot;

// ─── Convenience hooks ───────────────────────────────────────────────────────
//
// Thin wrappers so callers can `const rating = useUserRating()` instead
// of `useAppStore(selectUserRating)`. Equivalent, but the named hook
// reads better at call sites.

export function useActiveProfile(): UserProfile | null {
  return useAppStore(selectActiveProfile);
}

export function useUserRating(): number {
  return useAppStore(selectUserRating);
}

export function useUserName(): string {
  return useAppStore(selectUserName);
}

export function useIsKidMode(): boolean {
  return useAppStore(selectIsKidMode);
}

export function useAiProvider(): AiProvider {
  return useAppStore(selectAiProvider);
}

export function useCoachVerbosity(): CoachVerbosity {
  return useAppStore(selectCoachVerbosity);
}

export function useCoachVoiceOn(): boolean {
  return useAppStore(selectCoachVoiceOn);
}

export function useHasLlmKey(): boolean {
  return useAppStore(selectHasLlmKey);
}

// ─── Canonical 7-selector contract (WO-FOUND-02) ─────────────────────────────
//
// These layer on top of #302's selectors. They read from fields /
// tables that future WOs will populate; until then they return the
// documented safe defaults. The underlying Supabase queries (when
// wired) MUST be wrapped in try/catch and report to Sentry with
// tag { subsystem: 'userContext', selector: '<name>' } — the raw
// selector itself stays pure and synchronous.

/**
 * The currently authenticated user / active local profile. Identical
 * semantics to selectActiveProfile; exported under the contract name
 * so feature code can read "the current user" without depending on
 * the activeProfile / currentUser naming coincidence. Returns null
 * during cold start or when not logged in.
 */
export const selectCurrentUser = (state: AppState): UserProfile | null =>
  state.activeProfile;

/**
 * User's preferred coach persona. Sourced from
 * `profiles.default_coach` once WO-PROGRESS-01 ships the column; for
 * now we read `preferences.defaultCoach` if set locally, else null.
 * Missing column / unset → null.
 */
export const selectDefaultCoach = (state: AppState): DefaultCoach | null => {
  const prefs = state.activeProfile?.preferences as
    | { defaultCoach?: DefaultCoach | null }
    | undefined;
  return prefs?.defaultCoach ?? null;
};

/**
 * Current / longest / last-active streak. Sourced from the
 * `user_streaks` table once WO-PROGRESS-01 ships it. Until then
 * returns the zero-streak default so nudge logic and UI can render
 * without guards.
 */
export const selectStreak = (_state: AppState): StreakState => STREAK_DEFAULT;

/**
 * Learner type gates kid-mode vs. adult-mode UI. Sourced from
 * `profiles.learner_type`; missing column → 'adult' (safe default
 * for the existing single-user install which is an adult).
 */
export const selectLearnerType = (state: AppState): LearnerType => {
  if (state.activeProfile?.isKidMode) return 'kid';
  const prefs = state.activeProfile?.preferences as
    | { learnerType?: LearnerType }
    | undefined;
  return prefs?.learnerType ?? 'adult';
};

/**
 * Whether the user has completed onboarding. Sourced from
 * `profiles.has_onboarded`; missing column → true so existing users
 * are not force-routed through an onboarding flow that does not exist
 * yet. (The legacy local flag in Dexie.meta table is the current
 * source of truth until WO-ONBOARDING ships.)
 */
export const selectHasOnboarded = (state: AppState): boolean => {
  const prefs = state.activeProfile?.preferences as
    | { hasOnboarded?: boolean }
    | undefined;
  return prefs?.hasOnboarded ?? true;
};

/**
 * Count of mistake puzzles due for review today. Wired to the
 * `mistakes` table once WO-MISTAKES-UNIFIED-01 ships it. Until then
 * returns 0. Consumed by the nudge engine's "mistakes due" rule.
 */
export const selectMistakesDueToday = (_state: AppState): number => 0;

/**
 * Keys of nudges / changelog versions / new-feature pins the user
 * has dismissed. Backed by the `user_dismissals` Supabase table
 * (0002_user_dismissals.sql) — the store is hydrated from Supabase
 * on login and stays empty when the user is not logged in.
 */
export const selectDismissals = (state: AppState): Set<string> =>
  state.dismissals;

// ─── Convenience hooks for the canonical contract ────────────────────────────

export function useCurrentUser(): UserProfile | null {
  return useAppStore(selectCurrentUser);
}

export function useDefaultCoach(): DefaultCoach | null {
  return useAppStore(selectDefaultCoach);
}

export function useStreak(): StreakState {
  return useAppStore(selectStreak);
}

export function useLearnerType(): LearnerType {
  return useAppStore(selectLearnerType);
}

export function useHasOnboarded(): boolean {
  return useAppStore(selectHasOnboarded);
}

export function useMistakesDueToday(): number {
  return useAppStore(selectMistakesDueToday);
}

export function useDismissals(): Set<string> {
  return useAppStore(selectDismissals);
}
