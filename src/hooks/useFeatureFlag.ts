import { useSyncExternalStore } from 'react';
import { isFeatureEnabled, onFeatureFlags } from '../services/analytics';

/**
 * Subscribe to a PostHog feature flag. Returns the current boolean
 * value and re-renders the calling component when PostHog pushes a
 * change (either via the dashboard, a remote config refresh, or a
 * local override).
 *
 * Returns `false` when PostHog is not initialized so callers can
 * safely render "feature off" during local dev without guards.
 *
 * Uses `useSyncExternalStore` so the subscription stays concurrent-
 * safe under React 18+ transitions and StrictMode's double-invoke.
 */
export function useFeatureFlag(flag: string): boolean {
  return useSyncExternalStore(
    (onChange) => onFeatureFlags(onChange),
    () => isFeatureEnabled(flag),
    () => false,
  );
}
