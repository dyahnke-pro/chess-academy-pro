/**
 * analytics.ts — PostHog wrapper + canonical event name registry.
 *
 * All PostHog event names live here as const strings. Never call
 * `posthog.capture('my_event')` with a string literal at the call
 * site — import the constant so greps, docs, and the PostHog insight
 * library all stay in sync.
 *
 * Init is safe to call unconditionally: no-op when the project key
 * is missing or we're not in a production build. Calls to `track()`
 * before init resolve to no-ops too, so feature code never has to
 * guard.
 */

import posthog from 'posthog-js';

// ─── Event name registry ─────────────────────────────────────────────────────

export const EVENTS = {
  modeEntered: 'mode_entered',
  modeCompleted: 'mode_completed',
  puzzleAttempted: 'puzzle_attempted',
  puzzleSolved: 'puzzle_solved',
  mistakeLogged: 'mistake_logged',
  coachSelected: 'coach_selected',
  hintRequested: 'hint_requested',
  gameCompleted: 'game_completed',
  nudgeShown: 'nudge_shown',
  nudgeDismissed: 'nudge_dismissed',
  nudgeCtaClicked: 'nudge_cta_clicked',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

// Typed props per event. Keep these lean — PostHog ingestion is cheap
// but every property we add is another column a future insight has to
// reason about.
export interface EventProps {
  [EVENTS.modeEntered]: { mode: string };
  [EVENTS.modeCompleted]: { mode: string; durationSec: number };
  [EVENTS.puzzleAttempted]: { mode: string; fen: string; rating: number };
  [EVENTS.puzzleSolved]: { mode: string; fen: string; attempts: number };
  [EVENTS.mistakeLogged]: { sourceMode: string; fen: string };
  [EVENTS.coachSelected]: { coach: string };
  [EVENTS.hintRequested]: { mode: string; tier: number };
  [EVENTS.gameCompleted]: { result: string; opponent: string };
  [EVENTS.nudgeShown]: { kind: string; key: string };
  [EVENTS.nudgeDismissed]: { key: string };
  [EVENTS.nudgeCtaClicked]: { key: string; route: string };
}

// ─── Init ────────────────────────────────────────────────────────────────────

let initialized = false;

export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
  if (!key) return;

  // Preview/dev builds skip the real PostHog connection unless the
  // developer explicitly opts in via VITE_POSTHOG_ALLOW_DEV=true. This
  // matches ff_observability_enabled's default-OFF behavior in preview.
  const allowDev = import.meta.env.VITE_POSTHOG_ALLOW_DEV === 'true';
  if (!import.meta.env.PROD && !allowDev) return;

  posthog.init(key, {
    // Reverse-proxy path — keeps ad-blockers from nuking the SDK and
    // hides the third-party origin from network tabs. Paired with
    // the /ingest/:path* rewrite in vercel.json.
    api_host: '/ingest',
    // Point the UI host at the real PostHog domain so links rendered
    // inside the toolbar (session replays, feature-flag dashboards)
    // resolve correctly. Does NOT affect where events are sent.
    ui_host: 'https://us.posthog.com',
    person_profiles: 'identified_only',
    // Pageviews are fired manually from App.tsx's router-effect so
    // SPA route changes register as distinct views.
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    loaded: () => {
      initialized = true;
    },
  });
  initialized = true;
}

// ─── Capture helpers ─────────────────────────────────────────────────────────

export function track<N extends EventName>(
  name: N,
  props: EventProps[N],
): void {
  if (!initialized) return;
  posthog.capture(name, props as Record<string, unknown>);
}

export function capturePageview(url: string): void {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: url });
}

export function identifyUser(
  id: string,
  props?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.identify(id, props);
}

export function resetUser(): void {
  if (!initialized) return;
  posthog.reset();
}

/** Exposed so the useFeatureFlag hook and nudgeEngine can read flags
 *  without importing `posthog-js` directly. */
export function isFeatureEnabled(flag: string): boolean {
  if (!initialized) return false;
  return posthog.isFeatureEnabled(flag) === true;
}

/** Subscribe to feature-flag updates. The returned disposer is the
 *  source of truth for unsubscription — don't call `removeFeatureFlagsHandler`
 *  directly. */
export function onFeatureFlags(listener: () => void): () => void {
  if (!initialized) return () => {};
  posthog.onFeatureFlags(listener);
  return () => {
    // posthog-js >=1.150 exposes removeFeatureFlagsHandler; guard to
    // stay compatible with older bundles loaded from cache.
    const anyPh = posthog as unknown as {
      removeFeatureFlagsHandler?: (fn: () => void) => void;
    };
    anyPh.removeFeatureFlagsHandler?.(listener);
  };
}
