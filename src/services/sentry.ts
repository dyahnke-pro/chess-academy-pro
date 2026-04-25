/**
 * sentry.ts — error + replay observability wrapper.
 *
 * Init is idempotent and no-op when either (a) the DSN is missing or
 * (b) the app is not running in a production build. Lets dev sessions
 * and CI runs skip all network traffic without a build-time branch.
 *
 * All subsystem code should call `captureException(err, { subsystem })`
 * rather than importing `@sentry/react` directly — keeps the tag
 * surface uniform and makes it trivial to swap providers later.
 */

import * as Sentry from '@sentry/react';

/** Mirrors the ff_observability_enabled PostHog flag at boot time so
 *  Sentry reporting can be silenced in preview/dev without a redeploy. */
const OBSERVABILITY_DEFAULT_ON = import.meta.env.PROD;

let initialized = false;

export function initSentry(): void {
  if (initialized) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  if (!OBSERVABILITY_DEFAULT_ON) return;

  Sentry.init({
    dsn,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev',
    environment:
      (import.meta.env.VITE_APP_ENV as string | undefined) ??
      (import.meta.env.PROD ? 'production' : 'development'),
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });

  initialized = true;
}

export type SentrySubsystem =
  | 'app'
  | 'userContext'
  | 'stockfish'
  | 'anthropic'
  | 'deepseek'
  | 'supabase'
  | 'posthog'
  | 'nudge'
  | 'voice'
  | 'dexie';

interface CaptureContext {
  subsystem: SentrySubsystem;
  /** Optional finer-grained tag (e.g. selector name, endpoint). */
  tag?: string;
  /** Optional structured extras surfaced on the Sentry event. */
  extra?: Record<string, unknown>;
}

/**
 * Capture an exception with consistent tagging. Safe to call when
 * Sentry is not initialized — falls through to a console.error so
 * local dev still surfaces the issue.
 */
export function captureException(err: unknown, ctx: CaptureContext): void {
  if (!initialized) {
    if (!import.meta.env.PROD) {
      console.error(`[sentry:${ctx.subsystem}${ctx.tag ? `/${ctx.tag}` : ''}]`, err);
    }
    return;
  }
  Sentry.withScope((scope) => {
    scope.setTag('subsystem', ctx.subsystem);
    if (ctx.tag) scope.setTag('tag', ctx.tag);
    if (ctx.extra) scope.setExtras(ctx.extra);
    Sentry.captureException(err);
  });
}

/** Pass-through to Sentry.setUser — used on login/logout. */
export function setSentryUser(
  user: { id: string; email?: string } | null,
): void {
  if (!initialized) return;
  if (user) {
    Sentry.setUser({ id: user.id, email: user.email });
  } else {
    Sentry.setUser(null);
  }
}

/** Re-exported for the top-level React ErrorBoundary wrapper. */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
