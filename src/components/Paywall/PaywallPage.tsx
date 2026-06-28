import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, Loader2, AlertCircle } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement';
import {
  getBillingPackages,
  purchasePackage,
  restorePurchases,
  isBillingConfigured,
  type BillingPackage,
} from '../../services/billingService';

/**
 * PaywallPage — the hard wall shown when the entitlement gate is live and the
 * user isn't Pro (Productization Phase 2/4). Apple Guideline 3.1.2 compliant:
 * shows the subscription title, length, price, free-trial terms, the auto-renew
 * disclosure, a Restore Purchases control, and functional Terms + Privacy links.
 *
 * Dormant by default — only mounts when `VITE_PAYWALL_ENABLED=true` AND the
 * user is not Pro (see PaywallGate). Renders loading / empty / error states.
 */
const FEATURES: readonly string[] = [
  'Unlimited AI coach — ask anything, mid-game',
  '42 guided opening masterclasses, move by move',
  'Thousands of tactics puzzles tuned to your level',
  'Full Stockfish game analysis + spaced repetition',
  'Voice coaching, endgames, and middlegame plans',
];

export function PaywallPage(): JSX.Element {
  const { isResolving, lastError } = useEntitlement();
  const [packages, setPackages] = useState<BillingPackage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const pkgs = await getBillingPackages();
        if (!cancelled) setPackages(pkgs);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Could not load plans');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Packages arrive annual-first (best value). Default the selection to the
  // first one; the user can tap to switch between annual and monthly.
  const selected = packages?.find((p) => p.id === selectedId) ?? packages?.[0] ?? null;
  const periodLabel = selected?.isAnnual ? 'year' : 'month';

  async function handleSubscribe(): Promise<void> {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    const ok = await purchasePackage(selected.id);
    setBusy(false);
    if (!ok) setNotice('Purchase didn’t complete. You can try again.');
    // On success the entitlement updates and PaywallGate swaps to the app.
  }

  async function handleRestore(): Promise<void> {
    setRestoring(true);
    setNotice(null);
    const ok = await restorePurchases();
    setRestoring(false);
    setNotice(ok ? 'Subscription restored.' : 'No active subscription found to restore.');
  }

  const billingReady = isBillingConfigured();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c9a84c]/15">
            <Crown className="h-7 w-7 text-[#c9a84c]" />
          </div>
          <h1 className="text-2xl font-bold">Chess Academy Pro</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Your AI chess coach — learn, play, and drill your weaknesses shut.
          </p>
        </header>

        <ul className="mb-6 space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="flex-1" />

        {/* Plan picker — annual + monthly, annual badged best value */}
        <div className="mb-4 space-y-2">
          {isResolving || packages === null ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border-2 border-[#c9a84c]/40 bg-[#c9a84c]/5 py-4 text-sm text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading plans…
            </div>
          ) : packages.length > 0 ? (
            packages.map((p) => {
              const isSel = selected?.id === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`relative flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition ${
                    isSel ? 'border-[#c9a84c] bg-[#c9a84c]/10' : 'border-zinc-700 bg-transparent'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{p.isAnnual ? 'Yearly' : 'Monthly'}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {p.priceString}/{p.isAnnual ? 'year' : 'month'}
                      {p.hasFreeTrial ? ' · 7-day free trial' : ''}
                    </p>
                  </div>
                  {p.isAnnual && (
                    <span className="rounded-full bg-[#c9a84c] px-2 py-0.5 text-[11px] font-bold text-[#0f0f0f]">
                      BEST VALUE
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="rounded-2xl border-2 border-zinc-700 py-4 text-center text-sm text-zinc-400">
              {billingReady
                ? 'No plans are available right now. Please try again later.'
                : 'Subscriptions aren’t available on this device yet.'}
            </p>
          )}
        </div>

        {(loadError || lastError) && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{loadError ?? lastError}</span>
          </div>
        )}
        {notice && <p className="mb-3 text-center text-xs text-zinc-400">{notice}</p>}

        <button
          type="button"
          onClick={() => void handleSubscribe()}
          disabled={busy || !selected}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#c9a84c] py-4 text-base font-bold text-[#0f0f0f] transition active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : selected?.hasFreeTrial ? (
            'Start free trial'
          ) : (
            'Subscribe'
          )}
        </button>

        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={restoring}
          className="mt-3 w-full py-2 text-sm text-zinc-400 underline disabled:opacity-50"
        >
          {restoring ? 'Restoring…' : 'Restore Purchases'}
        </button>

        {/* Apple 3.1.2 required disclosure + legal links */}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-zinc-500">
          {selected?.hasFreeTrial && selected
            ? `Your 7-day free trial converts to a ${selected.priceString}/${periodLabel} subscription unless cancelled at least 24 hours before it ends. `
            : ''}
          Payment is charged to your store account at confirmation of purchase.
          The subscription renews automatically each {periodLabel} unless
          auto-renew is turned off at least 24 hours before the period ends.
          Manage or cancel anytime in your store account settings.
        </p>
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          <Link to="/terms" className="underline">
            Terms of Service
          </Link>
          <span className="mx-2">·</span>
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
