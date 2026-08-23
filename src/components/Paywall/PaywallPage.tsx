import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Crown, Check, Loader2, AlertCircle } from 'lucide-react';
import { useEntitlement } from '../../hooks/useEntitlement';
import {
  getBillingPackages,
  purchasePackage,
  restorePurchases,
  isBillingConfigured,
  clearBillingError,
  type BillingPackage,
} from '../../services/billingService';
import {
  trackCheckoutStarted,
  trackPlanSelected,
  trackPaywallDismissed,
  trackPaywallDeclineReason,
} from '../../services/billingAnalytics';

/** Decline-survey reasons (David 2026-07-26: "ask them why they said no").
 *  Stable slug + the tappable label the user sees. */
const DECLINE_REASONS: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: 'too_expensive', label: 'Too expensive' },
  { slug: 'too_many_bugs', label: 'Too many bugs' },
  { slug: 'didnt_work', label: "The app didn't work" },
  { slug: 'not_sure_worth_it', label: "Not sure it's worth it" },
  { slug: 'just_exploring', label: 'Just exploring for now' },
];

/**
 * PaywallPage — the hard wall shown when the entitlement gate is live and the
 * user isn't Pro (Productization Phase 2/4). Apple Guideline 3.1.2 compliant:
 * shows the subscription title, length, price, free-trial terms, the auto-renew
 * disclosure, a Restore Purchases control, and functional Terms + Privacy links.
 *
 * Dormant by default — only mounts when `VITE_PAYWALL_ENABLED=true` AND the
 * user is not Pro (see PaywallGate). Renders loading / empty / error states.
 *
 * Beta test builds set `VITE_PAYWALL_TEST_MODE=true` to render a conspicuous
 * disclaimer that this is a preview and purchases run in Apple's StoreKit
 * Sandbox (never a real charge). MUST stay off for the public-launch build —
 * you cannot tell real App Store users "you won't be charged."
 */
const PAYWALL_TEST_MODE = import.meta.env.VITE_PAYWALL_TEST_MODE === 'true';
const FEATURES: readonly string[] = [
  'Unlimited AI coach — ask anything, mid-game',
  '42 guided opening masterclasses, move by move',
  'Thousands of tactics puzzles tuned to your level',
  'Full Stockfish game analysis + spaced repetition',
  'Voice coaching, endgames, and middlegame plans',
];

/** The free plan — what a non-Pro user gets without paying. Mirrors the
 *  metered soft gate (accessPolicy / freeTierService): unlimited game upload,
 *  weakness analysis, a 20-puzzle bucket, one main-tab opening, a week of Kids.
 *  Shown at the top of the paywall so a walled user always sees what they
 *  still have for free. */
const FREE_TIER: readonly string[] = [
  '20 free tactics puzzles',
  'One full opening — Watch, Learn, Practice, Play',
  'Hundreds of free AI coach turns to try',
  'Upload your games + see your weaknesses',
  'Kids mode free for a week',
];

/** Which premium surface bounced the user here — drives the contextual line
 *  at the top of the paywall (soft-gate upsell). Mirrors accessPolicy's
 *  GatedFeature. */
export type PaywallFeature = 'opening' | 'puzzles' | 'coach' | 'academy' | 'kid' | 'app';

const FEATURE_PROMPT: Record<PaywallFeature, string | null> = {
  puzzles: 'You’ve used all 20 free puzzles. Go Pro for unlimited tactics tuned to your level.',
  opening: 'You’ve opened your one free masterclass. Go Pro to unlock all 42 openings.',
  coach: 'You’ve used up your free coaching. Go Pro for unlimited lessons, chat, and analysis.',
  academy: 'The Academy is a Pro feature — go Pro for the full guided course path.',
  kid: 'Your free week of Kids mode is up. Go Pro to keep playing.',
  app: null,
};

export function PaywallPage({ feature }: { feature?: PaywallFeature } = {}): JSX.Element {
  const { isResolving } = useEntitlement();
  const featurePrompt = feature ? FEATURE_PROMPT[feature] : null;
  const [packages, setPackages] = useState<BillingPackage[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Decline survey — shown when the user chooses "Not now" (David 2026-07-26).
  const [declineOpen, setDeclineOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const navigate = useNavigate();

  /** Log the self-reported decline reason, then leave to the free features. */
  const submitDecline = (slug: string): void => {
    trackPaywallDeclineReason(
      slug,
      feature ?? null,
      slug === 'other' ? otherText.trim() || undefined : undefined,
    );
    void navigate('/');
  };

  useEffect(() => {
    let cancelled = false;
    // Clear any stale billing error from boot so a transient init hiccup never
    // leaves a permanent error banner on the paywall (Apple 2.1(b)).
    clearBillingError();
    void (async () => {
      try {
        const pkgs = await getBillingPackages();
        if (!cancelled) setPackages(pkgs);
      } catch {
        // Never surface a raw StoreKit/RevenueCat error string to the user.
        if (!cancelled) setLoadError('Plans couldn’t load right now. Please try again.');
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
    // Intent-to-buy — the top of the checkout funnel (paired downstream with
    // trial_started / purchase_completed / purchase_failed from billingService).
    trackCheckoutStarted(
      {
        packageId: selected.id,
        priceString: selected.priceString,
        priceAmount: selected.priceAmount,
        currency: selected.currency,
        isAnnual: selected.isAnnual,
      },
      feature ?? null,
    );
    setBusy(true);
    setNotice(null);
    // Clear stale errors before the attempt so the banner reflects THIS attempt.
    clearBillingError();
    const ok = await purchasePackage(selected.id);
    setBusy(false);
    // A failed/cancelled purchase shows one calm line — never a raw error dump.
    if (!ok) setNotice('Purchase didn’t complete. No charge was made — you can try again.');
    // On success the entitlement updates and PaywallGate swaps to the app.
  }

  async function handleRestore(): Promise<void> {
    setRestoring(true);
    setNotice(null);
    clearBillingError();
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

        {featurePrompt && (
          <div className="mb-6 rounded-2xl border-2 border-[#c9a84c]/40 bg-[#c9a84c]/10 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-[#e5c874]">{featurePrompt}</p>
          </div>
        )}

        {PAYWALL_TEST_MODE && (
          <div className="mb-6 rounded-2xl border-2 border-amber-400/40 bg-amber-400/10 px-4 py-3 text-center">
            <p className="text-sm font-bold text-amber-300">🧪 Beta test — not a real charge</p>
            <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
              This is a preview screen. Purchases run in Apple’s TestFlight
              Sandbox and will <span className="font-semibold">never bill your
              card or Apple ID</span>. Tap around freely — nothing here charges
              real money.
            </p>
          </div>
        )}

        {/* Free plan — what they keep without paying. Sits at the top so a
            walled user always sees the free tier before the Pro pitch. */}
        <div className="mb-5 rounded-2xl border border-zinc-700 bg-zinc-800/40 px-4 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">Free plan includes</p>
          <ul className="space-y-1.5">
            {FREE_TIER.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#c9a84c]">Go Pro to unlock</p>
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
                  onClick={() => {
                    setSelectedId(p.id);
                    trackPlanSelected({ packageId: p.id, isAnnual: p.isAnnual });
                  }}
                  className={`relative flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition ${
                    isSel ? 'border-[#c9a84c] bg-[#c9a84c]/10' : 'border-zinc-700 bg-transparent'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{p.isAnnual ? 'Yearly' : 'Monthly'}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">
                      {p.hasFreeTrial
                        ? `7-day free trial, then ${p.priceString}/${p.isAnnual ? 'year' : 'month'}`
                        : `${p.priceString}/${p.isAnnual ? 'year' : 'month'}`}
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

        {loadError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}
        {notice && <p className="mb-3 text-center text-xs text-zinc-400">{notice}</p>}

        {/* Apple 3.1.2(c): the binding price + auto-renew statement must be
            clear and CONSPICUOUS, directly next to the purchase button — not
            buried in fine print. This line does that. */}
        {selected && (
          <p className="mb-3 text-center text-sm font-medium text-zinc-200">
            {selected.hasFreeTrial
              ? `7-day free trial, then ${selected.priceString}/${periodLabel}. Auto-renews until cancelled.`
              : `${selected.priceString}/${periodLabel}. Auto-renews until cancelled.`}
          </p>
        )}

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

        {/* Apple 3.1.2 full required disclosure + legal links. Higher contrast
            than fine print so the terms are legible, not hidden. */}
        <p className="mt-5 text-center text-xs leading-relaxed text-zinc-400">
          {selected?.hasFreeTrial && selected
            ? `Your 7-day free trial automatically converts to a paid ${selected.priceString}/${periodLabel} subscription, and payment is charged to your Apple ID account, unless you cancel at least 24 hours before the trial ends. `
            : ''}
          Payment is charged to your Apple ID account at confirmation of
          purchase. The subscription renews automatically at {selected?.priceString ?? 'the listed price'}/{periodLabel},
          and your account is charged for renewal within 24 hours before the
          current period ends, unless auto-renew is turned off beforehand. You
          can manage or cancel anytime in your App Store account settings.
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

        {/* Soft gate: this wall sits in front of ONE premium surface, not the
            whole app — always give a way back to the free features. */}
        <p className="mt-4 text-center text-xs">
          <button
            type="button"
            className="text-zinc-400 underline"
            data-testid="paywall-back-free"
            onClick={() => {
              trackPaywallDismissed(feature ?? null);
              setDeclineOpen(true);
            }}
          >
            Not now — back to free features
          </button>
        </p>
      </div>

      {declineOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          data-testid="decline-survey"
          role="dialog"
          aria-modal="true"
          aria-label="What held you back?"
        >
          <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
            <h2 className="text-center text-base font-bold text-zinc-100">
              Quick question — what held you back?
            </h2>
            <p className="mt-1 text-center text-xs text-zinc-400">
              One tap helps us improve. Totally optional.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {DECLINE_REASONS.map((r) => (
                <button
                  key={r.slug}
                  type="button"
                  data-testid={`decline-reason-${r.slug}`}
                  onClick={() => submitDecline(r.slug)}
                  className="rounded-xl border-2 border-zinc-700 bg-zinc-800/60 px-4 py-3 text-sm font-medium text-zinc-100 hover:border-amber-500/50"
                >
                  {r.label}
                </button>
              ))}
              <input
                type="text"
                value={otherText}
                onChange={(e) => setOtherText(e.target.value)}
                placeholder="Tell us more (optional)…"
                data-testid="decline-other-text"
                className="mt-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              />
              {otherText.trim() && (
                <button
                  type="button"
                  data-testid="decline-submit-other"
                  onClick={() => submitDecline('other')}
                  className="rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-900"
                >
                  Send
                </button>
              )}
            </div>
            <button
              type="button"
              data-testid="decline-skip"
              onClick={() => submitDecline('skipped')}
              className="mt-3 w-full text-center text-xs text-zinc-500 underline"
            >
              Skip — back to free features
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
