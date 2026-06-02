/**
 * entitlementStore — single source of truth for "can this user use the app?"
 * --------------------------------------------------------------------------
 * Productization Phase 2 (docs/plans/2026-06-02-productization.md).
 *
 * The hard paywall (David 2026-06-02: "gate the whole app, pay to use all")
 * reduces to ONE boolean the whole app reads: `isPro`. This store holds it,
 * fed by the billing layer (RevenueCat, Phase 4) and — for offline cold
 * starts — a last-known value cached on the profile.
 *
 * `status`/`source` model the WHY behind `isPro` so the paywall and the
 * account screen can show the right copy ("Trial — 3 days left",
 * "Subscribed", "Beta access"):
 *   - trial         : inside the auto-started 7-day free trial → Pro
 *   - subscription  : an active paid subscription → Pro
 *   - promo         : a RevenueCat promotional entitlement (beta cohort) → Pro
 *   - none          : no entitlement → NOT Pro (paywall)
 *   - unconfigured  : billing keys absent → gate is dormant, treat as Pro so
 *                     the app is fully usable in dev / today's build
 *
 * SAFETY: the gate that actually BLOCKS the app on `!isPro` is dormant until
 * `isPaywallGateEnabled()` returns true (build flag). Until David flips it,
 * this store is pure plumbing and the app behaves exactly as today.
 */
import { create } from 'zustand';

/** Why the user does (or doesn't) have access. */
export type EntitlementSource =
  | 'trial'
  | 'subscription'
  | 'promo'
  | 'none'
  | 'unconfigured';

export type EntitlementStatus = 'unknown' | 'pro' | 'free';

export interface EntitlementState {
  /** Resolved access flag the whole app gates on. */
  isPro: boolean;
  status: EntitlementStatus;
  source: EntitlementSource;
  /** Epoch ms the trial (or current period) ends, when known. */
  expiresAt: number | null;
  /** True while the billing layer is resolving entitlement on boot. */
  isResolving: boolean;
  /** Last billing error, for the paywall's error state. */
  lastError: string | null;

  /** Apply a resolved entitlement (from billing or the offline cache). */
  setEntitlement: (next: {
    isPro: boolean;
    source: EntitlementSource;
    expiresAt?: number | null;
  }) => void;
  setResolving: (resolving: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const DEFAULT_ENTITLEMENT: Pick<
  EntitlementState,
  'isPro' | 'status' | 'source' | 'expiresAt' | 'isResolving' | 'lastError'
> = {
  isPro: false,
  status: 'unknown',
  source: 'none',
  expiresAt: null,
  isResolving: true,
  lastError: null,
};

export const useEntitlementStore = create<EntitlementState>((set) => ({
  ...DEFAULT_ENTITLEMENT,
  setEntitlement: ({ isPro, source, expiresAt = null }) =>
    set({
      isPro,
      status: isPro ? 'pro' : 'free',
      source,
      expiresAt,
      isResolving: false,
      lastError: null,
    }),
  setResolving: (resolving) => set({ isResolving: resolving }),
  setError: (error) => set({ lastError: error, isResolving: false }),
  reset: () => set({ ...DEFAULT_ENTITLEMENT }),
}));

/** Selector: the one boolean the app gates on. */
export const selectIsPro = (s: EntitlementState): boolean => s.isPro;

/**
 * Whether the hard paywall gate is LIVE. Dormant by default — flipping it
 * locks every non-Pro user (including David) out of the whole app, so it
 * stays off until the auth + billing phases are wired AND David approves the
 * cutover. Controlled by the build flag `VITE_PAYWALL_ENABLED=true`.
 */
export function isPaywallGateEnabled(): boolean {
  return import.meta.env.VITE_PAYWALL_ENABLED === 'true';
}

/** Whole days remaining until `expiresAt` (trial countdown copy). Returns
 *  null when there's no expiry, 0 once elapsed. Pure. */
export function trialDaysLeft(expiresAt: number | null, now: number = Date.now()): number | null {
  if (expiresAt == null) return null;
  const ms = expiresAt - now;
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}
