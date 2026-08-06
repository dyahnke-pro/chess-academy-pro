/**
 * billingAnalytics — the money + upgrade-pressure funnel for PostHog.
 * --------------------------------------------------------------------------
 * The rest of the app is densely instrumented (engagement, voice, errors), but
 * the REVENUE funnel was invisible: `billingService` audited purchases via
 * `logAppAudit`, but those `billing-*` kinds were never on the PostHog mirror
 * allowlist (`analytics.AUDIT_EVENT_MAP`), so PostHog saw zero sales while App
 * Store Connect showed real proceeds. This module closes that gap by firing the
 * money funnel DIRECTLY (so it can carry numeric revenue + person properties
 * the audit-mirror can't), and is the SINGLE SOURCE OF TRUTH for every
 * money/upgrade event name + payload.
 *
 * PLATFORM REALITY: billing is native-only (iOS / Android). On web the app is
 * `unconfigured` / free, so the purchase events here only flow from the app
 * builds. The free-tier PRESSURE events (puzzle-limit / opening-claim / second-
 * opening-wall) fire on any build where the soft gate is live.
 *
 * Contract: every export is fire-and-forget — it delegates to the no-op-safe
 * `captureEvent` / `setUserProperties`, so it is silent (never throws) on
 * keyless/dev/test builds exactly like the rest of `analytics`.
 *
 * Docs: docs/plans/2026-06-02-productization.md (§PostHog event catalog).
 */
import { captureEvent, setUserProperties } from './analytics';

/** Every money + upgrade-pressure event name, in one place. Values are the
 *  literal PostHog event names — group/filter on these in insights. */
export const BILLING_EVENT = {
  /** User tapped Subscribe / Start-trial on the paywall (intent to buy). */
  checkoutStarted: 'checkout_started',
  /** User switched the highlighted plan (annual ↔ monthly) in the picker. */
  planSelected: 'plan_selected',
  /** User left the paywall without buying (back-to-free / dismiss). */
  paywallDismissed: 'paywall_dismissed',
  paywallDeclineReason: 'paywall_decline_reason',
  /** A trial-bearing package purchase succeeded (period = TRIAL/INTRO). $0. */
  trialStarted: 'trial_started',
  /** A paid purchase succeeded (period = NORMAL) — carries revenue. */
  purchaseCompleted: 'purchase_completed',
  /** Purchase threw a real (non-cancel) error. */
  purchaseFailed: 'purchase_failed',
  /** User cancelled the native purchase sheet. */
  purchaseCancelled: 'purchase_cancelled',
  /** Restore Purchases finished (became_pro tells you if it found one). */
  restoreCompleted: 'restore_completed',
  /** Restore Purchases threw. */
  restoreFailed: 'restore_failed',
  /** The free 20-puzzle bucket was just emptied (the spend that hit 0). */
  freePuzzleLimitReached: 'free_puzzle_limit_reached',
  /** BOTH free coach buckets (7 lessons + 50 chat turns) were just emptied. */
  freeCoachLimitReached: 'free_coach_limit_reached',
  /** The one free masterclass opening was just claimed (first deep dive). */
  freeOpeningClaimed: 'free_opening_claimed',
  /** A deep dive into a SECOND opening was blocked (upgrade-pressure moment). */
  secondOpeningWalled: 'second_opening_walled',
} as const;

/** RevenueCat period types we care about. TRIAL/INTRO ⇒ a trial start, NORMAL
 *  (or unknown) ⇒ a paid conversion. `(string & {})` keeps the literals for
 *  autocomplete while still accepting any store-supplied period string. */
export type BillingPeriodType = 'TRIAL' | 'INTRO' | 'NORMAL' | (string & {});

/** The shape a purchase/checkout event describes. */
export interface PurchaseContext {
  packageId: string;
  /** Localized price string straight from the store, e.g. "$7.99". */
  priceString: string;
  /** Numeric price in the store currency (0 when unknown). */
  priceAmount: number;
  /** ISO 4217 currency code, e.g. "USD" (empty when unknown). */
  currency: string;
  isAnnual: boolean;
}

function periodLabel(isAnnual: boolean): 'annual' | 'monthly' {
  return isAnnual ? 'annual' : 'monthly';
}

function baseProps(ctx: PurchaseContext): Record<string, unknown> {
  return {
    package_id: ctx.packageId,
    price_string: ctx.priceString,
    price: ctx.priceAmount,
    currency: ctx.currency,
    is_annual: ctx.isAnnual,
    period: periodLabel(ctx.isAnnual),
  };
}

/** Paywall CTA tapped — intent to buy. `walledFeature` is which premium surface
 *  bounced the user to the paywall (opening / puzzles / coach / …). */
export function trackCheckoutStarted(ctx: PurchaseContext, walledFeature?: string | null): void {
  captureEvent(BILLING_EVENT.checkoutStarted, {
    ...baseProps(ctx),
    ...(walledFeature ? { walled_feature: walledFeature } : {}),
  });
}

/** User highlighted a different plan in the picker. */
export function trackPlanSelected(ctx: Pick<PurchaseContext, 'packageId' | 'isAnnual'>): void {
  captureEvent(BILLING_EVENT.planSelected, {
    package_id: ctx.packageId,
    is_annual: ctx.isAnnual,
    period: periodLabel(ctx.isAnnual),
  });
}

/** User left the paywall without subscribing. */
export function trackPaywallDismissed(walledFeature?: string | null): void {
  captureEvent(BILLING_EVENT.paywallDismissed, {
    ...(walledFeature ? { walled_feature: walledFeature } : {}),
  });
}

/** The self-reported reason a user declined the paywall (David 2026-07-26:
 *  "ask them why they said no"). `reason` is a stable slug (too_expensive /
 *  not_sure_worth_it / just_exploring / want_more_free / other / skipped);
 *  `detail` carries the optional free-text on "other". Props feed the
 *  conversion-leak analysis in PostHog. */
export function trackPaywallDeclineReason(
  reason: string,
  walledFeature?: string | null,
  detail?: string,
): void {
  captureEvent(BILLING_EVENT.paywallDeclineReason, {
    reason,
    ...(walledFeature ? { walled_feature: walledFeature } : {}),
    ...(detail ? { detail } : {}),
  });
}

/**
 * A purchase SUCCEEDED. Splits into `trial_started` (no revenue, the free-trial
 * start) vs `purchase_completed` (paid conversion, carries `revenue`/`$revenue`
 * so PostHog's revenue analytics + LTV light up) by the RevenueCat period type.
 */
export function trackPurchaseSuccess(ctx: PurchaseContext, periodType: BillingPeriodType): void {
  const isTrial = periodType === 'TRIAL' || periodType === 'INTRO';
  if (isTrial) {
    captureEvent(BILLING_EVENT.trialStarted, { ...baseProps(ctx), period_type: periodType });
    return;
  }
  captureEvent(BILLING_EVENT.purchaseCompleted, {
    ...baseProps(ctx),
    period_type: periodType,
    // Revenue value for PostHog. `$revenue` feeds the legacy revenue view;
    // `revenue` is the plain numeric property for revenue insights.
    revenue: ctx.priceAmount,
    $revenue: ctx.priceAmount,
  });
}

/** RevenueCat `PurchasesError` diagnostic fields beyond the generic
 *  `.message` — see `billingService.extractPurchaseErrorDetail`. All
 *  optional since a non-RevenueCat throw (e.g. a network error before the
 *  SDK call) won't carry them. */
export interface PurchaseErrorDetail {
  code?: string;
  readableErrorCode?: string;
  underlyingErrorMessage?: string;
}

/** A purchase failed with a real error (not a user cancel). `detail` carries
 *  the RevenueCat error code / underlying StoreKit message when available —
 *  the top-level message alone is a canned string shared by every error of
 *  the same class (e.g. "There was a problem with the App Store." for every
 *  STORE_PROBLEM_ERROR, whatever the actual cause). */
export function trackPurchaseFailed(
  packageId: string,
  errorMessage: string,
  detail?: PurchaseErrorDetail,
): void {
  captureEvent(BILLING_EVENT.purchaseFailed, {
    package_id: packageId,
    error_message: errorMessage.slice(0, 200),
    ...(detail?.code ? { error_code: detail.code } : {}),
    ...(detail?.readableErrorCode ? { readable_error_code: detail.readableErrorCode } : {}),
    ...(detail?.underlyingErrorMessage
      ? { underlying_error_message: detail.underlyingErrorMessage.slice(0, 300) }
      : {}),
  });
}

/** User dismissed the native purchase sheet. */
export function trackPurchaseCancelled(packageId: string): void {
  captureEvent(BILLING_EVENT.purchaseCancelled, { package_id: packageId });
}

/** Restore Purchases finished. `becamePro` is whether an active sub was found. */
export function trackRestore(becamePro: boolean): void {
  captureEvent(BILLING_EVENT.restoreCompleted, { became_pro: becamePro });
}

/** Restore Purchases threw. */
export function trackRestoreFailed(errorMessage: string): void {
  captureEvent(BILLING_EVENT.restoreFailed, { error_message: errorMessage.slice(0, 200) });
}

/** The identifying facts about a resolved entitlement, for person properties. */
export interface SubscriptionPerson {
  isPro: boolean;
  /** Why they're Pro (or not) — trial / subscription / promo / none / unconfigured. */
  source: string;
  /** The billing period when known (annual / monthly), else null. */
  plan?: 'annual' | 'monthly' | null;
  /** Epoch ms the current period ends, when known. */
  expiresAt?: number | null;
}

/**
 * Mirror the resolved entitlement onto the PostHog PERSON via `$set`, so EVERY
 * engagement metric can be broken down by paid-vs-free (do subscribers finish
 * more lessons? which openings do payers use?) — impossible without these.
 * Called on every entitlement resolve (boot, renewal, purchase); idempotent.
 */
export function syncSubscriptionPerson(p: SubscriptionPerson): void {
  setUserProperties({
    is_pro: p.isPro,
    subscription_status: p.isPro ? p.source : 'free',
    ...(p.plan ? { plan: p.plan } : {}),
    subscription_expires_at: p.expiresAt ? new Date(p.expiresAt).toISOString() : null,
  });
}

/** The free 20-puzzle bucket was just emptied. */
export function trackFreePuzzleLimitReached(): void {
  captureEvent(BILLING_EVENT.freePuzzleLimitReached);
}

/** BOTH free coach buckets were just emptied by this spend — the coach route
 *  walls from here on. `via` names which bucket's spend triggered it. */
export function trackFreeCoachLimitReached(via: 'lesson' | 'chat_turn'): void {
  captureEvent(BILLING_EVENT.freeCoachLimitReached, { via });
}

/** The one free masterclass opening was just claimed (activation milestone). */
export function trackFreeOpeningClaimed(openingId: string): void {
  captureEvent(BILLING_EVENT.freeOpeningClaimed, { opening_id: openingId });
}

/** A deep dive into a SECOND opening was blocked — the upgrade-pressure moment. */
export function trackSecondOpeningWalled(attemptedId: string, claimedId: string): void {
  captureEvent(BILLING_EVENT.secondOpeningWalled, {
    attempted_opening_id: attemptedId,
    claimed_opening_id: claimedId,
  });
}
