/**
 * billingService — RevenueCat wrapper that resolves the one `isPro` boolean.
 * Productization Phase 4 (docs/plans/2026-06-02-productization.md).
 *
 * RevenueCat fronts Apple StoreKit (App Store) and Google Play Billing behind
 * ONE entitlement: `pro`. The rest of the app never touches a store SDK — it
 * reads `entitlementStore.isPro`, which this service feeds.
 *
 * SCOPE: billing is **native-only** (iOS / Android) for launch. On the web
 * PWA it resolves to `unconfigured` (the web app stays open/free); web billing
 * via Stripe-on-RevenueCat is a later phase, slotted behind VITE_REVENUECAT_WEB_KEY.
 *
 * GRACEFUL DEGRADATION (the load-bearing safety rule): with NO RevenueCat key
 * for the current platform, every function no-ops and entitlement resolves to
 * `unconfigured` → isPro = true. So today's keyless build behaves exactly as it
 * does now (fully usable), and the hard wall only appears once BOTH a key is
 * present AND `VITE_PAYWALL_ENABLED=true` (see `isPaywallGateEnabled`).
 *
 * Keys (public SDK keys, safe to bake into the client bundle):
 *   - VITE_REVENUECAT_IOS_KEY      (appl_…)  — App Store
 *   - VITE_REVENUECAT_ANDROID_KEY  (goog_…)  — Google Play
 */
import { Capacitor } from '@capacitor/core';
import { useEntitlementStore } from '../stores/entitlementStore';
import type { EntitlementSource } from '../stores/entitlementStore';
import { logAppAudit } from './appAuditor';
import {
  syncSubscriptionPerson,
  trackPurchaseSuccess,
  trackPurchaseFailed,
  trackPurchaseCancelled,
  trackRestore,
  trackRestoreFailed,
  trackBillingUnconfiguredNative,
} from './billingAnalytics';

/** The single RevenueCat entitlement identifier the whole app gates on.
 *  Must match the entitlement id configured in the RevenueCat dashboard. */
export const PRO_ENTITLEMENT_ID = 'pro';

/** A normalized purchase option surfaced to the paywall UI, platform-agnostic. */
export interface BillingPackage {
  /** Opaque id used to start the purchase (the RevenueCat package identifier). */
  id: string;
  /** Localized price string straight from the store, e.g. "$7.99". */
  priceString: string;
  /** Numeric price in the store currency (0 when unknown) — for analytics revenue. */
  priceAmount: number;
  /** ISO 4217 currency code, e.g. "USD" (empty when unknown) — for analytics. */
  currency: string;
  /** Localized product title, when the store provides one. */
  title: string;
  /** Localized description / billing period, when available. */
  description: string;
  /** True when this package carries an introductory free trial. */
  hasFreeTrial: boolean;
  /** Human trial length when known, e.g. "7 days". */
  trialDescription: string | null;
  /** RevenueCat package type — 'ANNUAL' | 'MONTHLY' | 'CUSTOM' | … — for
   *  labeling/sorting the plan picker. */
  packageType: string;
  /** True for the annual plan, so the paywall can badge it "best value". */
  isAnnual: boolean;
}

let configured = false;

function logBilling(kind: 'billing-error' | 'billing-purchase' | 'billing-restore', source: string, summary: string): void {
  void logAppAudit({ kind, category: 'subsystem', source, summary });
}

/** Resolve the public SDK key for the running NATIVE platform (null otherwise). */
function resolvePlatformKey(): string | null {
  if (!Capacitor.isNativePlatform()) return null;
  const platform = Capacitor.getPlatform();
  const env = import.meta.env;
  const key =
    platform === 'ios'
      ? (env.VITE_REVENUECAT_IOS_KEY as string | undefined)
      : platform === 'android'
        ? (env.VITE_REVENUECAT_ANDROID_KEY as string | undefined)
        : undefined;
  return key && key.length > 0 ? key : null;
}

/** True when a RevenueCat key is configured for the current platform. */
export function isBillingConfigured(): boolean {
  return resolvePlatformKey() !== null;
}

/** Clear any stored billing error (used by the paywall so a stale boot-time
 *  error never lingers as a permanent banner — Apple 2.1(b)). */
export function clearBillingError(): void {
  useEntitlementStore.getState().setError(null);
}

/**
 * The stable, durable per-install analytics id: RevenueCat's app-user id.
 * RevenueCat persists it in the iOS Keychain, so it survives the localStorage /
 * IndexedDB evictions that make PostHog's anonymous id churn a new "person" on
 * almost every iOS session — and even survives an app reinstall. Tying PostHog
 * identity to this makes every install ONE tracked user (open frequency,
 * retention, session cadence), instead of the inflated anonymous-id count
 * (David 2026-07-17). Subscribers already carry this same id in RevenueCat, so
 * payment ↔ usage links for free.
 *
 * Returns null on web / keyless builds (billing unconfigured) — there PostHog's
 * own persisted cookie id is already stable, so no identify is needed.
 */
export async function getStableAnalyticsId(): Promise<string | null> {
  if (!configured) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const res: unknown = await Purchases.getAppUserID();
    const id =
      typeof res === 'string'
        ? res
        : (res as { appUserID?: string } | null)?.appUserID;
    return id && id.length > 0 ? id : null;
  } catch {
    return null;
  }
}

/**
 * Initialize billing at app boot and resolve entitlement into the store.
 * Safe to call unconditionally — no key ⇒ marks `unconfigured`/Pro and returns.
 */
export async function initBilling(appUserId?: string): Promise<void> {
  const store = useEntitlementStore.getState();
  const key = resolvePlatformKey();

  if (!key) {
    // Keyless build / web: app stays fully usable; the wall can't engage.
    store.setEntitlement({ isPro: true, source: 'unconfigured' });
    // 🔒 ON NATIVE THIS IS NOT NORMAL — SAY SO. Web is keyless by design, but a
    // native device with no key has billing switched OFF: no purchase, no
    // restore, no subscription recognised. It fails OPEN, so nothing looks
    // broken to the user and nothing looked broken to us either — this branch
    // returned in silence, and a dead revenue path was indistinguishable from a
    // quiet week.
    //
    // It is reachable in normal operation: the OTA bundle is built from the WEB
    // environment (`vercel build --prod` in ota-publish.yml), which carries no
    // VITE_REVENUECAT_IOS_KEY, so every native device that applies an OTA loses
    // billing until the next store install. The event carries the running
    // BUNDLE because that is the discriminator — builtin has the key, OTA does
    // not.
    if (Capacitor.isNativePlatform()) {
      let bundle = 'unknown';
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
        bundle = (await CapacitorUpdater.current())?.bundle?.version ?? 'unknown';
      } catch {
        /* plugin absent — the platform string alone still identifies the case */
      }
      const platform = Capacitor.getPlatform();
      logBilling(
        'billing-error',
        'billingService.initBilling',
        `NO RevenueCat key on native (${platform}, bundle=${bundle}) — purchases, restore and subscription status are all unavailable`,
      );
      trackBillingUnconfiguredNative(platform, bundle);
    }
    return;
  }

  store.setResolving(true);
  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }
    // Configure ANONYMOUSLY, then alias — never configure straight into the
    // stable id (David 2026-08-01). RevenueCat treats a first configure with a
    // new appUserID as a DIFFERENT customer, so every existing install would be
    // orphaned from its own purchase and look un-subscribed until the user
    // found "Restore". `logIn` is the documented migration: it aliases the
    // anonymous customer onto the stable id and carries the entitlements over.
    await Purchases.configure({ apiKey: key });
    if (appUserId) {
      try {
        await Purchases.logIn({ appUserID: appUserId });
      } catch (aliasErr) {
        // A failed alias must never cost the user their entitlement — stay on
        // the anonymous customer, which still owns the purchase.
        logBilling(
          'billing-error',
          'billingService.initBilling.alias',
          aliasErr instanceof Error ? aliasErr.message : 'alias failed',
        );
      }
    }
    // Push-driven entitlement updates (renewals, refunds, family sharing).
    await Purchases.addCustomerInfoUpdateListener(() => {
      void refreshEntitlement();
    });
    configured = true;
    await refreshEntitlement();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'billing init failed';
    store.setError(message);
    logBilling('billing-error', 'billingService.initBilling', message);
    // Fail OPEN on a billing init error so a transient SDK fault never locks a
    // legitimate user out — the gate also requires `isPaywallGateEnabled`.
    store.setEntitlement({ isPro: true, source: 'unconfigured' });
  }
}

/**
 * Map a RevenueCat CustomerInfo object into the entitlement store. Shared by
 * `refreshEntitlement` (which fetches it) and `purchasePackage` (which already
 * has it from the purchase result) so a successful purchase applies its
 * entitlement WITHOUT a second network round-trip that could fail and leave the
 * user "paid but still walled" — the exact 2.1(b) class Apple flagged.
 */
function applyCustomerInfo(customerInfo: {
  entitlements: { active: Record<string, { periodType: string; store: string; expirationDate: string | null }> };
}): void {
  const store = useEntitlementStore.getState();
  const ent = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
  if (ent) {
    const periodType = ent.periodType; // 'NORMAL' | 'INTRO' | 'TRIAL'
    const isTrial = periodType === 'TRIAL' || periodType === 'INTRO';
    const source: EntitlementSource = isTrial
      ? 'trial'
      : ent.store === 'PROMOTIONAL'
        ? 'promo'
        : 'subscription';
    const expiresAt = ent.expirationDate ? new Date(ent.expirationDate).getTime() : null;
    store.setEntitlement({ isPro: true, source, expiresAt });
    // Mirror onto the PostHog person so engagement can be split by paid-vs-free.
    syncSubscriptionPerson({ isPro: true, source, expiresAt });
  } else {
    store.setEntitlement({ isPro: false, source: 'none', expiresAt: null });
    syncSubscriptionPerson({ isPro: false, source: 'none', expiresAt: null });
  }
}

/** Pull the latest customer info and map the `pro` entitlement into the store. */
export async function refreshEntitlement(): Promise<void> {
  const store = useEntitlementStore.getState();
  if (!configured) return;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();
    applyCustomerInfo(customerInfo);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'entitlement refresh failed';
    store.setError(message);
    logBilling('billing-error', 'billingService.refreshEntitlement', message);
  }
}

/** Fetch the purchasable packages for the paywall. Empty array when keyless. */
export async function getBillingPackages(): Promise<BillingPackage[]> {
  if (!configured) return [];
  const { Purchases } = await import('@revenuecat/purchases-capacitor');
  const { current } = await Purchases.getOfferings();
  if (!current) return [];
  const packages = current.availablePackages.map((pkg) => {
    const product = pkg.product;
    const intro = product.introPrice;
    const isFree = intro != null && intro.price === 0;
    const packageType: string = pkg.packageType;
    return {
      id: pkg.identifier,
      priceString: product.priceString,
      priceAmount: product.price,
      currency: product.currencyCode,
      title: product.title,
      description: product.description,
      hasFreeTrial: isFree,
      trialDescription: isFree ? `${intro.periodNumberOfUnits} ${intro.periodUnit.toLowerCase()}` : null,
      packageType,
      isAnnual: packageType === 'ANNUAL',
    };
  });
  // Annual first so the paywall can present it as the headline "best value".
  return packages.sort((a, b) => Number(b.isAnnual) - Number(a.isAnnual));
}

/** Purchase a package by id. Resolves true on success, false on user cancel. */
export async function purchasePackage(packageId: string): Promise<boolean> {
  if (!configured) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { current } = await Purchases.getOfferings();
    const pkg = current?.availablePackages.find((p) => p.identifier === packageId);
    if (!pkg) return false;
    // Apply the entitlement straight from the purchase result — no second
    // getCustomerInfo call that could fail after the money already moved.
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    if (result?.customerInfo) {
      applyCustomerInfo(result.customerInfo);
    } else {
      await refreshEntitlement();
    }
    logBilling('billing-purchase', 'billingService.purchasePackage', packageId);
    // Split trial-start vs paid conversion off the resolved entitlement source
    // (already computed by applyCustomerInfo) so the funnel distinguishes the
    // two — revenue rides `purchase_completed` only.
    const source = useEntitlementStore.getState().source;
    const product = pkg.product;
    trackPurchaseSuccess(
      {
        packageId,
        priceString: product.priceString,
        priceAmount: product.price,
        currency: product.currencyCode,
        isAnnual: (pkg.packageType as string) === 'ANNUAL',
      },
      source === 'trial' ? 'TRIAL' : 'NORMAL',
    );
    return true;
  } catch (err) {
    // RevenueCat throws on user-cancel; treat cancel as a benign false.
    const cancelled =
      typeof err === 'object' && err !== null && 'userCancelled' in err
        ? Boolean((err as { userCancelled: unknown }).userCancelled)
        : /cancel/i.test(err instanceof Error ? err.message : '');
    if (cancelled) {
      trackPurchaseCancelled(packageId);
    } else {
      const message = err instanceof Error ? err.message : 'purchase failed';
      const detail = extractPurchaseErrorDetail(err);
      useEntitlementStore.getState().setError(message);
      logBilling(
        'billing-error',
        'billingService.purchasePackage',
        [
          message,
          detail.code ? `code=${detail.code}` : null,
          detail.readableErrorCode ? `readableErrorCode=${detail.readableErrorCode}` : null,
          detail.underlyingErrorMessage ? `underlying=${detail.underlyingErrorMessage}` : null,
        ]
          .filter(Boolean)
          .join(' | '),
      );
      trackPurchaseFailed(packageId, message, detail);
    }
    return false;
  }
}

/**
 * Pull the RevenueCat `PurchasesError` diagnostic fields out of a caught
 * error, when present. `err.message` alone is a generic canned string (e.g.
 * "There was a problem with the App Store." for every STORE_PROBLEM_ERROR,
 * whatever the real cause) — `code` / `readableErrorCode` /
 * `underlyingErrorMessage` are what actually distinguish a Paid-Apps-
 * Agreement issue from a sandbox account issue from a real StoreKit outage.
 * Added 2026-08-06 after a real user's purchase attempt failed identically
 * on both packages within 1s each, six times in 46s, with nothing beyond
 * the generic message to diagnose it — see PostHog `purchase_failed`.
 */
export function extractPurchaseErrorDetail(err: unknown): {
  code?: string;
  readableErrorCode?: string;
  underlyingErrorMessage?: string;
} {
  if (typeof err !== 'object' || err === null) return {};
  const e = err as Record<string, unknown>;
  const userInfo = typeof e.userInfo === 'object' && e.userInfo !== null
    ? (e.userInfo as Record<string, unknown>)
    : undefined;
  return {
    code: typeof e.code === 'string' ? e.code : undefined,
    readableErrorCode:
      typeof userInfo?.readableErrorCode === 'string'
        ? userInfo.readableErrorCode
        : typeof e.readableErrorCode === 'string'
          ? e.readableErrorCode
          : undefined,
    underlyingErrorMessage:
      typeof e.underlyingErrorMessage === 'string' ? e.underlyingErrorMessage : undefined,
  };
}

/** Restore previously-purchased subscriptions (App Store requirement). */
export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    await Purchases.restorePurchases();
    await refreshEntitlement();
    logBilling('billing-restore', 'billingService.restorePurchases', 'restore');
    const becamePro = useEntitlementStore.getState().isPro;
    trackRestore(becamePro);
    return becamePro;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'restore failed';
    useEntitlementStore.getState().setError(message);
    logBilling('billing-error', 'billingService.restorePurchases', message);
    trackRestoreFailed(message);
    return false;
  }
}
