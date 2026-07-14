import { useEffect, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useFreeTierStore } from '../../stores/freeTierStore';
import { resolveAccess } from '../../services/accessPolicy';
import { canViewOpening, isEligibleFreeOpening } from '../../services/freeTierService';
import { captureEvent } from '../../services/analytics';
import { PaywallPage } from './PaywallPage';

/**
 * AccessGate — the route-aware soft paywall (replaces the all-or-nothing
 * PaywallGate). For a non-Pro user with the gate live, it walls MOST routes but
 * lets the free tier through: the shell, game upload, weakness analysis, the
 * 20-puzzle bucket, one picked masterclass opening, and a 7-day kid window.
 * See docs/plans/2026-07-14-freemium-soft-gate.md + accessPolicy.ts.
 *
 * DORMANT unless `VITE_PAYWALL_ENABLED=true` AND the user is not Pro — otherwise
 * `resolveAccess` returns `allow` for everything and this renders children
 * untouched (today's behavior).
 *
 * Side effects (never in render): claim the first eligible opening the user
 * opens as their one free opening; stamp first kid-section access to start the
 * 7-day clock.
 */
export function AccessGate({ children }: { children: ReactNode }): JSX.Element {
  const { pathname } = useLocation();
  const { isPro, gateEnabled, isResolving } = useEntitlement();
  const { row, hydrated, claimFreeOpening, stampKidAccess } = useFreeTierStore();

  // Extract a masterclass opening id for the claim effect (mirrors accessPolicy).
  const openingId = openingIdFromPath(pathname);

  // Claim the one free opening on first open (eligible + none claimed yet).
  useEffect(() => {
    if (!gateEnabled || isPro || !hydrated) return;
    if (!openingId) return;
    if (row.freeOpeningId != null) return; // already claimed one
    if (!isEligibleFreeOpening(openingId)) return; // pro-rep/gambit → walled, don't claim
    void claimFreeOpening(openingId);
  }, [gateEnabled, isPro, hydrated, openingId, row.freeOpeningId, claimFreeOpening]);

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
  const walledFeature =
    liveWall?.decision === 'wall' && !(openingId && canViewOpening(openingId, row)) ? liveWall.feature : null;
  useEffect(() => {
    if (walledFeature) captureEvent('paywall_viewed', { feature: walledFeature, path: pathname });
  }, [walledFeature, pathname]);

  // Don't flash the wall before we know the answer: while entitlement is
  // resolving, or the ledger hasn't hydrated, render the app.
  if (!gateEnabled || isPro || isResolving || !hydrated) return <>{children}</>;

  const access = resolveAccess({ pathname, isPro, gateEnabled, freeTier: row });

  // An eligible opening the user is about to claim (freeOpeningId still null in
  // this render pass) should render, not flash the wall while the claim effect
  // runs. `canViewOpening` already returns true for that case.
  if (access.decision === 'wall') {
    // Guard the claim race: if it's an opening we CAN view, allow.
    if (openingId && canViewOpening(openingId, row)) return <>{children}</>;
    return <PaywallPage feature={access.feature} />;
  }

  // 'allow' and 'meter' both render the app (the puzzle board self-walls when
  // the bucket is spent — see usePuzzleMeter).
  return <>{children}</>;
}

/** `/openings/:id` (not `/openings`, `/openings/srs`, `/openings/pro/...`). */
function openingIdFromPath(pathname: string): string | null {
  if (!(pathname === '/openings' || pathname.startsWith('/openings/'))) return null;
  const rest = pathname.slice('/openings'.length).replace(/^\//, '');
  if (rest === '' || rest === 'srs' || rest.startsWith('pro/')) return null;
  const id = rest.split('/')[0];
  return id || null;
}
