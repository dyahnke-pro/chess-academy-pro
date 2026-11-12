import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useEntitlement } from '../../hooks/useEntitlement';
import { PaywallPage } from './PaywallPage';

/**
 * PlansPage — the plans, opened ON PURPOSE from Settings → Subscription (App
 * Review 2.1(b), 2026-10-22) or the Go Pro bar on Home (2026-11-12). The same
 * page a wall shows, without the wall's "you've used up…" line. "Not now"
 * returns to where it was opened from (route state `from`), Settings when none
 * was given. A subscriber has nothing to buy, so they go back to Settings,
 * where the card says their plan and offers Manage subscription.
 */
export function PlansPage(): JSX.Element {
  const { isPro, isResolving } = useEntitlement();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as { from?: string } | null)?.from;
  if (isPro && !isResolving) return <Navigate to="/settings" replace />;
  return <PaywallPage feature="settings" onLeave={from ? () => void navigate(from) : undefined} />;
}
