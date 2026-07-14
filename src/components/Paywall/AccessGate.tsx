import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useFreeTierStore } from '../../stores/freeTierStore';
import { resolveAccess } from '../../services/accessPolicy';
import { captureEvent } from '../../services/analytics';
import { PaywallPage } from './PaywallPage';

/**
 * AccessGate — the route-aware soft paywall (replaces the all-or-nothing
 * PaywallGate). For a non-Pro user with the gate live, it walls MOST routes but
 * lets the free tier through: the shell, game upload, weakness analysis, the
 * 20-puzzle bucket, the browsable masterclass opening pages (+ model games), and
 * a 7-day kid window. See docs/plans/2026-07-14-freemium-soft-gate.md.
 *
 * The ONE-free-opening limit is NOT enforced here — masterclass opening PAGES
 * are browsable free so a user can preview + watch model games; the pick is
 * claimed IN-PAGE on the first WLPP deep-dive tap (OpeningDetailPage), and a
 * deep dive into a second opening walls there (David 2026-07-14).
 *
 * DORMANT unless `VITE_PAYWALL_ENABLED=true` AND the user is not Pro — otherwise
 * `resolveAccess` returns `allow` for everything and this renders children
 * untouched (today's behavior).
 *
 * Side effect (never in render): stamp first kid-section access to start the
 * 7-day clock.
 */
export function AccessGate({ children }: { children: ReactNode }): JSX.Element {
  const { pathname } = useLocation();
  const { isPro, gateEnabled, isResolving } = useEntitlement();
  const { row, hydrated, stampKidAccess } = useFreeTierStore();

  // Stamp first kid-section access to start the 7-day free window.
  const inKid = pathname === '/kid' || pathname.startsWith('/kid/');
  useEffect(() => {
    if (!gateEnabled || isPro || !hydrated) return;
    if (!inKid) return;
    if (row.kidFirstAccessAt != null) return;
    void stampKidAccess();
  }, [gateEnabled, isPro, hydrated, inKid, row.kidFirstAccessAt, stampKidAccess]);

  // Analytics: fire `paywall_viewed` once per walled path (props: feature,
  // path). Effect keyed on the resolved feature so it fires on real wall hits,
  // not every render. Guarded to the live-gate + non-Pro + hydrated case.
  const liveWall =
    gateEnabled && !isPro && !isResolving && hydrated
      ? resolveAccess({ pathname, isPro, gateEnabled, freeTier: row })
      : null;
  const walledFeature = liveWall?.decision === 'wall' ? liveWall.feature : null;
  useEffect(() => {
    if (walledFeature) captureEvent('paywall_viewed', { feature: walledFeature, path: pathname });
  }, [walledFeature, pathname]);

  // Don't flash the wall before we know the answer: while entitlement is
  // resolving, or the ledger hasn't hydrated, render the app.
  if (!gateEnabled || isPro || isResolving || !hydrated) return <>{children}</>;

  const access = resolveAccess({ pathname, isPro, gateEnabled, freeTier: row });
  if (access.decision === 'wall') return <PaywallPage feature={access.feature} />;

  // 'allow' and 'meter' both render the app (the puzzle board self-walls when
  // the bucket is spent — see usePuzzleMeter; the opening WLPP self-walls on a
  // second deep dive — see OpeningDetailPage).
  return <>{children}</>;
}
