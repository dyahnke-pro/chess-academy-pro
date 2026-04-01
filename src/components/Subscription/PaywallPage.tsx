import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Check,
  Zap,
  Brain,
  BookOpen,
  Mic,
  Cloud,
  ChevronLeft,
  BarChart3,
} from 'lucide-react';
import type { SubscriptionPeriod } from '../../types/subscription';
import { PRODUCT_ID_MONTHLY, PRODUCT_ID_ANNUAL } from '../../types/subscription';
import { useSubscriptionStore } from '../../stores/subscriptionStore';

// ─── Feature List ───────────────────────────────────────────────────────────

interface FeatureRow {
  icon: typeof Crown;
  label: string;
  free: boolean;
  pro: boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  { icon: Zap, label: 'Stockfish analysis', free: true, pro: true },
  { icon: BarChart3, label: 'Puzzle trainer & SRS', free: true, pro: true },
  { icon: BookOpen, label: 'Basic openings', free: true, pro: true },
  { icon: Brain, label: 'AI Chess Coach', free: false, pro: true },
  { icon: BarChart3, label: 'Weakness detection', free: false, pro: true },
  { icon: BookOpen, label: 'Pro repertoires & gambits', free: false, pro: true },
  { icon: Mic, label: 'Voice coaching', free: false, pro: true },
  { icon: Cloud, label: 'Cloud sync & backup', free: false, pro: true },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function PaywallPage(): JSX.Element {
  const navigate = useNavigate();
  const tier = useSubscriptionStore((s) => s.tier);
  const [period, setPeriod] = useState<SubscriptionPeriod>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const isAlreadyPro = tier === 'pro';
  const monthlyPrice = '$4.99';
  const annualPrice = '$34.99';
  const annualMonthly = '$2.92';

  function handlePurchase(): void {
    setPurchasing(true);
    try {
      const productId = period === 'monthly' ? PRODUCT_ID_MONTHLY : PRODUCT_ID_ANNUAL;
      // TODO: Integrate with RevenueCat / StoreKit 2 when Capacitor plugin is added.
      // For now, log the intent. The actual purchase flow will call:
      //   await Purchases.purchaseProduct(productId);
      console.info('[Paywall] Purchase requested:', productId);
    } finally {
      setPurchasing(false);
    }
  }

  function handleRestore(): void {
    // TODO: Integrate with RevenueCat / StoreKit 2
    console.info('[Paywall] Restore purchases requested');
  }

  return (
    <div className="flex min-h-full flex-col bg-neutral-950 px-4 pb-8 pt-4">
      {/* Header */}
      <div className="mb-6 flex items-center">
        <button
          onClick={() => void navigate(-1)}
          className="mr-3 flex h-10 w-10 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-white">Chess Academy Pro</h1>
      </div>

      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600">
          <Crown className="h-10 w-10 text-black" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-white">
          {isAlreadyPro ? 'You\'re a Pro!' : 'Upgrade to Pro'}
        </h2>
        <p className="text-sm text-neutral-400">
          {isAlreadyPro
            ? 'You have access to all features.'
            : 'Unlock the full power of your chess training.'}
        </p>
      </div>

      {/* Period Toggle */}
      {!isAlreadyPro && (
        <div className="mx-auto mb-6 flex w-full max-w-xs rounded-xl bg-neutral-900 p-1">
          <button
            onClick={() => setPeriod('monthly')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              period === 'monthly'
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('annual')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              period === 'annual'
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-400'
            }`}
          >
            Annual
            <span className="ml-1 text-xs text-amber-400">Save 41%</span>
          </button>
        </div>
      )}

      {/* Price Card */}
      {!isAlreadyPro && (
        <div className="mx-auto mb-6 w-full max-w-xs rounded-2xl border border-amber-500/30 bg-neutral-900 p-5 text-center">
          <div className="mb-1 text-3xl font-bold text-white">
            {period === 'monthly' ? monthlyPrice : annualPrice}
          </div>
          <div className="text-sm text-neutral-400">
            {period === 'monthly' ? 'per month' : `per year (${annualMonthly}/mo)`}
          </div>
          <div className="mt-2 text-xs text-amber-400">7-day free trial included</div>
        </div>
      )}

      {/* Feature Comparison */}
      <div className="mx-auto mb-8 w-full max-w-sm">
        <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs font-medium uppercase tracking-wider text-neutral-500">
          <span>Feature</span>
          <span className="w-12 text-center">Free</span>
          <span className="w-12 text-center text-amber-400">Pro</span>
        </div>
        {FEATURE_ROWS.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-neutral-800 py-3"
          >
            <div className="flex items-center gap-2 text-sm text-neutral-200">
              <row.icon className="h-4 w-4 text-neutral-500" />
              {row.label}
            </div>
            <div className="flex w-12 justify-center">
              {row.free ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <span className="text-neutral-600">—</span>
              )}
            </div>
            <div className="flex w-12 justify-center">
              <Check className="h-4 w-4 text-amber-400" />
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {!isAlreadyPro && (
        <div className="mx-auto w-full max-w-xs">
          <button
            onClick={handlePurchase}
            disabled={purchasing}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 font-semibold text-black transition-colors hover:bg-amber-400 disabled:opacity-50"
          >
            {purchasing ? 'Processing...' : 'Start Free Trial'}
          </button>
          <button
            onClick={handleRestore}
            className="w-full py-2 text-center text-sm text-neutral-500 transition-colors hover:text-neutral-300"
          >
            Restore Purchases
          </button>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-600">
            Payment is charged after the 7-day trial. Cancel anytime in Settings.
            By subscribing you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      )}
    </div>
  );
}
