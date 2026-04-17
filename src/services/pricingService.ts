/**
 * pricingService
 * --------------
 * Single source of truth for what a given user pays. Used by the
 * paywall, Settings → Billing surface, and eventually the Lemon
 * Squeezy checkout redirect.
 *
 * Pricing tiers:
 *   - 'beta'        — $2.99/mo, locked for life. Assigned automatically
 *                     to everyone who installs during the beta phase.
 *   - 'free-social' — $0/mo, locked for life. Granted when the user
 *                     taps "Share for free forever" and posts about
 *                     the app. Honor system at launch.
 *   - 'standard'    — $7.99/mo, the retail price. Assigned to anyone
 *                     who installs AFTER the beta phase ends.
 *   - 'free-trial'  — $0 during the 7-day trial, then converts to
 *                     'standard'. Only relevant post-beta-phase.
 *
 * The pricing tier is stored on the user profile and NEVER changes
 * once assigned (unless the user takes a tier-changing action like
 * sharing on social). This "price locked in" promise is the entire
 * reason beta users are valuable.
 */
import type { UserProfile } from '../types';

export type PricingTier = 'beta' | 'free-social' | 'standard' | 'free-trial';

/** Beta phase cutoff. Anyone who creates a profile on or before this
 *  date is auto-flagged as a beta user and gets the $2.99 tier for
 *  life. Change this once to extend/shorten the beta window. */
export const BETA_PHASE_END_DATE = '2026-06-30';

/** Whether we're still accepting new beta users. Pure, synchronous —
 *  safe to call from render or any hook. */
export function isBetaPhaseActive(now: Date = new Date()): boolean {
  return now <= new Date(`${BETA_PHASE_END_DATE}T23:59:59Z`);
}

export interface PricingOffer {
  /** Price per month in USD. 0 for free tiers. */
  priceMonthly: number;
  /** Price per year in USD. 0 for free tiers. */
  priceYearly: number;
  /** User-facing tier label. */
  label: string;
  /** Short human description, e.g. for Settings → Billing. */
  description: string;
  /** True when this price never changes regardless of future pricing
   *  moves. Used by UI to show "locked in for life" badges. */
  lockedForLife: boolean;
  /** True when the user is paying nothing — gates UI like "manage
   *  subscription" which shouldn't appear for free accounts. */
  free: boolean;
}

const OFFERS: Record<PricingTier, PricingOffer> = {
  beta: {
    priceMonthly: 2.99,
    priceYearly: 29.99,
    label: 'Beta Tester',
    description: 'Locked at $2.99/mo for life — thanks for being here early.',
    lockedForLife: true,
    free: false,
  },
  'free-social': {
    priceMonthly: 0,
    priceYearly: 0,
    label: 'Free forever (shared)',
    description: 'Free for life — thanks for spreading the word.',
    lockedForLife: true,
    free: true,
  },
  standard: {
    priceMonthly: 7.99,
    priceYearly: 79.99,
    label: 'Pro',
    description: 'Full Chess Academy Pro — cancel any time.',
    lockedForLife: false,
    free: false,
  },
  'free-trial': {
    priceMonthly: 0,
    priceYearly: 0,
    label: 'Free trial',
    description: '7 days free — converts to Pro after.',
    lockedForLife: false,
    free: true,
  },
};

/**
 * Resolve the effective pricing tier for a profile. Defaults to
 * 'beta' during the beta phase, 'standard' after.
 */
export function resolvePricingTier(profile: UserProfile | null | undefined, now: Date = new Date()): PricingTier {
  const stored = profile?.preferences.pricingTier;
  if (stored) return stored;
  return isBetaPhaseActive(now) ? 'beta' : 'standard';
}

/** Look up the offer for the user's current tier. */
export function getPricingOffer(profile: UserProfile | null | undefined): PricingOffer {
  return OFFERS[resolvePricingTier(profile)];
}

/** Look up an offer by tier name — used by UI that previews tiers
 *  the user hasn't claimed yet (e.g. the "Share for free forever"
 *  button showing what free-social grants). */
export function getOfferForTier(tier: PricingTier): PricingOffer {
  return OFFERS[tier];
}

/**
 * Build pre-composed share-intent URLs for the "free for life if you
 * share" flow. Returns one intent per supported platform — the UI
 * can show any subset. No tracking, no UTM; this is a social-share
 * growth lever, not an attribution system.
 */
export interface ShareIntent {
  platform: 'x' | 'reddit' | 'copy';
  label: string;
  url: string;
}

const SHARE_COPY = `I\u2019m testing Chess Academy Pro — an AI chess coach that actually watches your games, narrates while you play, and drills you on your real weaknesses. Early beta, worth a look:`;

export function buildShareIntents(appUrl: string): ShareIntent[] {
  const encodedText = encodeURIComponent(SHARE_COPY);
  const encodedUrl = encodeURIComponent(appUrl);
  return [
    {
      platform: 'x',
      label: 'Share on X',
      url: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    },
    {
      platform: 'reddit',
      label: 'Share on Reddit',
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodeURIComponent('Chess Academy Pro — AI coach that watches your games')}`,
    },
    {
      platform: 'copy',
      label: 'Copy link',
      url: appUrl,
    },
  ];
}
