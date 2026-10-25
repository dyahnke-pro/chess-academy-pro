import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Crown, Loader2 } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement';
import { trialDaysLeft } from '../../stores/entitlementStore';
import type { EntitlementSource } from '../../stores/entitlementStore';
import { isBillingConfigured, restorePurchases, clearBillingError } from '../../services/billingService';
import { trackPlansOpened, trackManageSubscriptionTapped } from '../../services/billingAnalytics';

/** The store's own subscriptions page — where a subscriber manages or cancels. */
const MANAGE_URL: Record<'ios' | 'android', string> = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: 'https://play.google.com/store/account/subscriptions',
};

/** What the card says about the plan. Pure. `null` = no billing here, no card. */
export function subscriptionStatusLine(
  source: EntitlementSource,
  expiresAt: number | null,
  now: number = Date.now(),
): string | null {
  switch (source) {
    case 'trial': {
      const days = trialDaysLeft(expiresAt, now);
      return days == null ? 'Pro — free trial' : `Pro — free trial, ${days} day${days === 1 ? '' : 's'} left`;
    }
    case 'subscription':
      return 'Pro — subscribed';
    case 'promo':
      return 'Pro — complimentary access';
    case 'none':
      return 'Free plan';
    case 'unconfigured':
      return null;
  }
}

/**
 * SubscriptionPanel — the plan, always findable (App Review 2.1(b), 2026-10-22:
 * the reviewer saw every feature open and no way to buy, and read it as
 * "already subscribed"). The wall only appears once a free limit is spent, so
 * a user who never hits one had nowhere to see their plan, buy Pro or restore
 * a purchase. This card is that place: the true status, See plans, Restore
 * Purchases, and Manage subscription for a subscriber.
 *
 * Native only — it renders nothing where billing is not configured (the web
 * app is free by promise and has no store).
 */
export function SubscriptionPanel(): JSX.Element | null {
  const { source, expiresAt, isPro, isResolving, lastError } = useEntitlement();
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isBillingConfigured()) return null;

  const platform = Capacitor.getPlatform() === 'android' ? 'android' : 'ios';
  const status = isResolving ? null : subscriptionStatusLine(source, expiresAt);

  const handleRestore = async (): Promise<void> => {
    setRestoring(true);
    setNotice(null);
    clearBillingError();
    const ok = await restorePurchases();
    setRestoring(false);
    setNotice(ok ? 'Purchases restored.' : 'No purchases found to restore.');
  };

  return (
    <div
      className="rounded-xl p-5 border flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      data-testid="subscription-panel"
    >
      <div className="flex items-center gap-3">
        <Crown size={20} className="shrink-0 text-[#c9a84c]" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">Subscription</div>
          {isResolving ? (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }} data-testid="subscription-status-loading">
              <Loader2 size={12} className="animate-spin" /> Checking your plan…
            </div>
          ) : (
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }} data-testid="subscription-status">
              {status}
            </div>
          )}
        </div>
      </div>

      {lastError && !isResolving && (
        <p className="text-xs" style={{ color: 'var(--color-error)' }} data-testid="subscription-error">
          Couldn’t reach the store just now. Your plan may not be up to date — try Restore Purchases.
        </p>
      )}

      <div className="flex gap-2">
        {isPro ? (
          <a
            href={MANAGE_URL[platform]}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackManageSubscriptionTapped()}
            className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="subscription-manage-btn"
          >
            Manage subscription
          </a>
        ) : (
          <Link
            to="/pro"
            onClick={() => trackPlansOpened('settings')}
            className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center"
            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
            data-testid="subscription-see-plans-btn"
          >
            See plans
          </Link>
        )}
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={restoring}
          className="flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border disabled:opacity-50"
          style={{ borderColor: 'var(--color-border)' }}
          data-testid="subscription-restore-btn"
        >
          {restoring ? <Loader2 size={14} className="animate-spin" /> : null}
          {restoring ? 'Restoring…' : 'Restore Purchases'}
        </button>
      </div>

      {notice && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }} data-testid="subscription-notice">
          {notice}
        </p>
      )}
    </div>
  );
}
