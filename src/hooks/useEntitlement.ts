/**
 * useEntitlement — read access state in components.
 * Productization Phase 2 (docs/plans/2026-06-02-productization.md).
 *
 * The single hook surfaces use to ask "is this user Pro / on trial / walled?"
 * and to render the right paywall copy. The actual app-blocking gate
 * (`AppGate`) reads `gateEnabled` so it stays dormant until David flips the
 * `VITE_PAYWALL_ENABLED` build flag.
 */
import { useEntitlementStore, isPaywallGateEnabled, trialDaysLeft } from '../stores/entitlementStore';
import type { EntitlementSource, EntitlementStatus } from '../stores/entitlementStore';

export interface UseEntitlement {
  isPro: boolean;
  status: EntitlementStatus;
  source: EntitlementSource;
  expiresAt: number | null;
  isResolving: boolean;
  lastError: string | null;
  /** Whole days left on the trial/period, or null when there's no expiry. */
  trialDaysLeft: number | null;
  /** True only while inside the auto-started free trial. */
  isTrial: boolean;
  /** Whether the hard paywall gate is live (build flag). */
  gateEnabled: boolean;
  /** Should the paywall block the app right now?  gate live AND not Pro AND
   *  resolution finished. */
  shouldShowPaywall: boolean;
}

export function useEntitlement(): UseEntitlement {
  const { isPro, status, source, expiresAt, isResolving, lastError } = useEntitlementStore();
  const gateEnabled = isPaywallGateEnabled();
  return {
    isPro,
    status,
    source,
    expiresAt,
    isResolving,
    lastError,
    trialDaysLeft: trialDaysLeft(expiresAt),
    isTrial: source === 'trial',
    gateEnabled,
    shouldShowPaywall: gateEnabled && !isResolving && !isPro,
  };
}
