/**
 * revenuecatEvent — pure mapping from a RevenueCat webhook event to a PostHog
 * capture payload.
 * --------------------------------------------------------------------------
 * RevenueCat POSTs a server-to-server webhook for every subscription lifecycle
 * event — including the ones a CLIENT can never see because they happen while
 * the app is closed (renewals, cancellations, refunds, billing issues,
 * expirations). This maps that payload into the SAME PostHog event vocabulary
 * the client fires (`billingAnalytics.ts`), keyed on the SAME distinct id the
 * app `identify()`s with (RevenueCat's app-user id), so server-side money
 * events attach to the same PostHog person as in-app usage.
 *
 * Pure + total — the handler (`api/revenuecat-webhook.ts`) owns auth + the
 * fetch to PostHog; this owns only the shape, so it's unit-testable.
 * Docs: docs/plans/2026-06-02-productization.md (§PostHog event catalog).
 */

/** The subset of a RevenueCat webhook `event` object we read. */
export interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  product_id?: string;
  period_type?: string; // NORMAL | TRIAL | INTRO
  price?: number; // in the store's base currency (USD-normalized by RC)
  price_in_purchased_currency?: number;
  currency?: string;
  store?: string;
  environment?: string; // PRODUCTION | SANDBOX
  expiration_at_ms?: number;
  is_trial_conversion?: boolean;
  [k: string]: unknown;
}

export interface PostHogCapture {
  event: string;
  distinctId: string;
  properties: Record<string, unknown>;
}

/** RevenueCat event type → PostHog event name. Unknown types fall through to
 *  `rc_<lowercased type>` so nothing is silently dropped. */
const TYPE_MAP: Record<string, string> = {
  INITIAL_PURCHASE: 'purchase_completed', // overridden to trial_started when period is TRIAL/INTRO
  NON_RENEWING_PURCHASE: 'purchase_completed',
  RENEWAL: 'subscription_renewed',
  PRODUCT_CHANGE: 'subscription_product_changed',
  CANCELLATION: 'subscription_cancelled',
  UNCANCELLATION: 'subscription_uncancelled',
  EXPIRATION: 'subscription_expired',
  BILLING_ISSUE: 'subscription_billing_issue',
  SUBSCRIPTION_PAUSED: 'subscription_paused',
  TRANSFER: 'subscription_transferred',
};

/** Events that move real money — attach `revenue`/`$revenue`. */
const REVENUE_EVENTS = new Set(['purchase_completed', 'subscription_renewed']);

function isTrial(period: string | undefined): boolean {
  return period === 'TRIAL' || period === 'INTRO';
}

/**
 * Map a RevenueCat webhook event to a PostHog capture, or null when the event
 * carries no usable identity/type (drop it rather than send a junk row).
 */
export function mapRevenueCatEvent(rc: RevenueCatEvent | undefined | null): PostHogCapture | null {
  if (!rc) return null;
  const type = typeof rc.type === 'string' ? rc.type : '';
  const distinctId = rc.app_user_id || rc.original_app_user_id || '';
  if (!type || !distinctId) return null;

  // INITIAL_PURCHASE with a trial period is a trial START, not a paid conversion.
  let event = TYPE_MAP[type] ?? `rc_${type.toLowerCase()}`;
  if (type === 'INITIAL_PURCHASE' && isTrial(rc.period_type)) {
    event = 'trial_started';
  }

  const amount =
    typeof rc.price_in_purchased_currency === 'number'
      ? rc.price_in_purchased_currency
      : typeof rc.price === 'number'
        ? rc.price
        : 0;

  const properties: Record<string, unknown> = {
    source: 'revenuecat_webhook',
    rc_event_type: type,
    product_id: rc.product_id,
    period_type: rc.period_type,
    store: rc.store,
    environment: rc.environment,
    price: amount,
    currency: rc.currency,
  };

  // Revenue value only on money-moving events (never on cancel/expire/trial).
  if (REVENUE_EVENTS.has(event)) {
    properties.revenue = amount;
    properties.$revenue = amount;
  }

  // Person-property side effects ($set) so is_pro / status stay fresh from the
  // server side too — renewals keep it true, expirations flip it false.
  const set: Record<string, unknown> = {};
  if (event === 'purchase_completed' || event === 'subscription_renewed' || event === 'subscription_uncancelled') {
    set.is_pro = true;
    set.subscription_status = 'subscription';
    if (typeof rc.expiration_at_ms === 'number') {
      set.subscription_expires_at = new Date(rc.expiration_at_ms).toISOString();
    }
  } else if (event === 'trial_started') {
    set.is_pro = true;
    set.subscription_status = 'trial';
  } else if (event === 'subscription_expired') {
    set.is_pro = false;
    set.subscription_status = 'free';
  }
  if (Object.keys(set).length > 0) properties.$set = set;

  return { event, distinctId, properties };
}
