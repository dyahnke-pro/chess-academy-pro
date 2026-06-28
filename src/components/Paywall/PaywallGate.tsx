import type { ReactNode } from 'react';
import { useEntitlement } from '../../hooks/useEntitlement';
import { PaywallPage } from './PaywallPage';

/**
 * PaywallGate — wraps the routed app. When the hard paywall gate is live
 * (`VITE_PAYWALL_ENABLED=true`) and the user is not Pro, it renders the
 * PaywallPage instead of the app. Otherwise it renders the app untouched.
 *
 * DORMANT BY DEFAULT: `shouldShowPaywall` is false unless the build flag is on,
 * so today's keyless/flagless build renders children exactly as before — zero
 * behavior change. The standalone legal/support routes (/privacy, /terms,
 * /support) are mounted OUTSIDE this gate in App.tsx so a store reviewer (and a
 * walled user) can always reach them.
 */
export function PaywallGate({ children }: { children: ReactNode }): JSX.Element {
  const { shouldShowPaywall } = useEntitlement();
  if (shouldShowPaywall) return <PaywallPage />;
  return <>{children}</>;
}
