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
