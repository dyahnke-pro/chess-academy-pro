import { Navigate } from 'react-router-dom';
import { useEntitlement } from '../../hooks/useEntitlement';
import { PaywallPage } from './PaywallPage';

/**
 * PlansPage — the plans, opened ON PURPOSE from Settings → Subscription (App
 * Review 2.1(b), 2026-10-22). The same page a wall shows, without the wall's
 * "you've used up…" line. A subscriber has nothing to buy, so they go back to
 * Settings, where the card says their plan and offers Manage subscription.
 */
export function PlansPage(): JSX.Element {
  const { isPro, isResolving } = useEntitlement();
  if (isPro && !isResolving) return <Navigate to="/settings" replace />;
  return <PaywallPage feature="settings" />;
}
