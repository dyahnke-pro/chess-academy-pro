/**
 * analytics — PostHog Cloud product analytics
 * -------------------------------------------
 * Productization Phase 1 (docs/plans/2026-06-02-productization.md).
 *
 * Thin wrapper over `posthog-js`. Two design rules:
 *
 *   1. NO-OP WITHOUT A KEY. If `VITE_POSTHOG_KEY` is unset (local dev,
 *      preview, tests, or any build David hasn't wired the key into),
 *      every function here is a silent no-op and `posthog-js` is never
 *      even imported. The existing app is unchanged.
 *   2. BRIDGE, DON'T DUPLICATE. The app already emits ~200 forensic
 *      events through `appAuditor.logAppAudit`. Rather than scatter a
 *      second instrumentation layer across the codebase, we mirror a
 *      CURATED ALLOWLIST of high-signal product events into PostHog
 *      from inside `logAppAudit` (see `mirrorAuditEvent`). The forensic
 *      firehose stays in the audit log / audit-stream; PostHog gets the
 *      funnel.
 *
 * Explicit product events the audit log doesn't model (sign-up, login,
 * paywall_viewed, checkout_started, purchase_completed) are sent
 * directly via `captureEvent` from the auth/billing surfaces in later
 * phases.
 *
 * Contract: every export is fire-and-forget and swallows its own
 * errors — analytics must never break a feature path.
 */
import type { AuditEntry, AuditKind } from './appAuditor';

// `posthog-js` keeps its anonymous distinct-id in a first-party cookie /
// localStorage. That's the library's own identity store, not app state,
// so it's outside the spirit of the CLAUDE.md "no localStorage" rule
// (which governs OUR persistence — that goes to Dexie).
type PosthogClient = typeof import('posthog-js').default;

let client: PosthogClient | null = null;
let enabled = false;
let optedOut = false;
let initStarted = false;

/** Events captured before `posthog-js` finishes loading. Replayed on load. */
interface QueuedEvent {
  name: string;
  props?: Record<string, unknown>;
}
const preInitQueue: QueuedEvent[] = [];
const PRE_INIT_QUEUE_LIMIT = 50;

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/**
 * Curated audit-kind → PostHog-event allowlist. ONLY these forensic
 * kinds are mirrored into PostHog; everything else stays in the audit
 * log. Deliberately excludes high-volume per-move kinds (`move-attempt`,
 * `voice-speak-invoked`, etc.) to protect the PostHog free-tier event
 * budget and keep the product funnel readable. Add a kind here when it
 * carries genuine product signal (a funnel step, an engagement
 * milestone, a cost driver) — not raw forensic noise.
 */
const AUDIT_EVENT_MAP: Partial<Record<AuditKind, string>> = {
  'app-boot': 'app_opened',
  'route-changed': 'page_viewed',
  'lesson-started': 'lesson_started',
  'lesson-completed': 'lesson_completed',
  'lesson-abandoned': 'lesson_abandoned',
  'srs-session-start': 'srs_session_started',
  'srs-session-complete': 'srs_session_completed',
  'quiz-started': 'quiz_started',
  'quiz-resolved': 'quiz_resolved',
  'coach-brain-ask-received': 'coach_question_asked',
  'llm-token-usage': 'llm_call', // cost driver — feeds margin analysis
  'opening-cache-miss': 'opening_generated', // the expensive build op
  'strength-calibrated': 'strength_calibrated',
  'pwa-installed': 'pwa_installed',
  'pwa-install-prompt': 'pwa_install_prompted',
  'session-shape': 'session_ended',
  'puzzle-skipped': 'puzzle_skipped',
  'repeat-mistake': 'repeat_mistake',
  'misconception-captured': 'misconception_captured',
};

/** Map a forensic audit kind to its product-event name, or undefined
 *  when the kind isn't on the allowlist. Pure — exported for tests. */
export function auditKindToEvent(kind: AuditKind): string | undefined {
  return AUDIT_EVENT_MAP[kind];
}

/** Project the lean, PostHog-safe subset of an audit entry's fields.
 *  Pure — exported for tests. Keeps payloads small (no stack-trace
 *  `details` dumps) and avoids leaking large free-form blobs. */
export function buildEventProps(entry: AuditEntry): Record<string, unknown> {
  const props: Record<string, unknown> = { audit_kind: entry.kind, source: entry.source };
  if (entry.route) props.route = entry.route;
  if (entry.context) props.context = entry.context.slice(0, 200);
  if (entry.summary) props.summary = entry.summary.slice(0, 200);
  if (entry.buildId) props.build_id = entry.buildId;
  return props;
}

/** Read the PostHog key from the build-time env. Returns undefined when
 *  unset (the no-op case). */
function resolveKey(): string | undefined {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  return key && key.length > 0 ? key : undefined;
}

/**
 * Initialize analytics. Idempotent. Call once at app boot.
 * - No key → permanent no-op (posthog-js never imported).
 * - `optedOut` → posthog loads but capturing is suppressed until the
 *   user opts back in (so the cookie/consent state is still managed).
 */
export function initAnalytics(opts?: { optedOut?: boolean }): void {
  if (initStarted) {
    // Allow a late opt-out flip even if init already ran.
    if (opts && typeof opts.optedOut === 'boolean') setAnalyticsOptOut(opts.optedOut);
    return;
  }
  initStarted = true;
  optedOut = opts?.optedOut === true;

  const key = resolveKey();
  if (!key || typeof window === 'undefined') {
    enabled = false;
    return;
  }

  const host = import.meta.env.VITE_POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
  void import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        // SPA — we drive pageviews via the `route-changed` bridge.
        capture_pageview: false,
        // Explicit events only; no DOM autocapture noise.
        autocapture: false,
        capture_performance: false,
        // Respect Do-Not-Track at the library level too.
        respect_dnt: true,
      });
      client = posthog;
      enabled = true;
      if (optedOut) posthog.opt_out_capturing();
      else flushQueue();
    })
    .catch(() => {
      // Network/bundle failure to load posthog — stay a no-op.
      enabled = false;
    });
}

function flushQueue(): void {
  if (!client || optedOut) return;
  for (const ev of preInitQueue.splice(0)) {
    try {
      client.capture(ev.name, ev.props);
    } catch {
      /* swallow */
    }
  }
}

/** True once posthog-js has loaded and a key was present. */
export function isAnalyticsEnabled(): boolean {
  return enabled && !optedOut;
}

/** Capture an explicit product event. Queues if posthog hasn't loaded
 *  yet (within a bounded buffer). No-op when disabled / opted out. */
export function captureEvent(name: string, props?: Record<string, unknown>): void {
  try {
    if (optedOut) return;
    if (!client) {
      // Only queue when init is in flight (a key exists); otherwise drop.
      if (initStarted && resolveKey() && preInitQueue.length < PRE_INIT_QUEUE_LIMIT) {
        preInitQueue.push({ name, props });
      }
      return;
    }
    client.capture(name, props);
  } catch {
    /* swallow — analytics must never break a feature path */
  }
}

/** Associate the current device with a stable user id (Supabase user id,
 *  wired in Phase 3). Pre-auth we stay anonymous — never identify with
 *  the shared local `'main'` profile id (that would collapse every
 *  device into one user). */
export function identifyUser(distinctId: string, props?: Record<string, unknown>): void {
  try {
    if (!client || optedOut || !distinctId) return;
    client.identify(distinctId, props);
  } catch {
    /* swallow */
  }
}

/**
 * Crash detection (PostHog Error Tracking).
 * ----------------------------------------
 * David 2026-06-02: "add the crash detection." Rather than stand up a
 * second vendor (the Sentry env slots are empty), we forward the app's
 * EXISTING crash audit-events into PostHog's Error Tracking — every crash
 * path (window.onerror, unhandledrejection, React error boundary) already
 * routes through `logAppAudit`, so the bridge in `mirrorAuditEvent` sends
 * each as a `$exception`. PostHog groups them into issues automatically;
 * pair with session replay (toggle on in the PostHog project) to watch the
 * crash happen. No-op without a key, same as the rest of this module.
 */
const CRASH_KINDS: ReadonlySet<AuditKind> = new Set<AuditKind>([
  'uncaught-error',
  'unhandled-rejection',
  'error-boundary',
]);

/**
 * Defect-severity bridge (David 2026-06-02: "and build 2").
 * ---------------------------------------------------------
 * These aren't JS crashes — they're real CONTENT/RUNTIME DEFECTS the app
 * already detects but that otherwise sit buried in the 200-kind forensic
 * stream where you have to be looking. We promote them to PostHog Error
 * Tracking issues (as exceptions tagged `severity: 'defect'`) so they ALERT.
 * The forensic firehose stays in the audit-stream; only genuine defects get
 * promoted. Add a kind here only when it represents a real defect a human
 * should look at — not an informational/graceful-fallback signal.
 */
const DEFECT_KINDS: ReadonlySet<AuditKind> = new Set<AuditKind>([
  // Runtime continuity (build 1)
  'continuity-error',
  // Narration board-truth violations (a claim that's false on the board)
  'piece-on-square',
  'hanging-piece',
  'check-claim',
  'mate-claim',
  'illegal-san',
  'sanitizer-leak',
  // Live coach grounding failures
  'coach-board-claim-blocked',
  'claim-validator-trip',
  'master-play-enforcement-fallback',
  // Board desync + silence-where-narration-expected
  'fen-desync',
  'walkthrough-narration-empty',
]);

/** Send an exception to PostHog Error Tracking. Total — never throws. */
export function captureException(error: unknown, props?: Record<string, unknown>): void {
  try {
    if (optedOut || !client) return;
    client.captureException(error, props);
  } catch {
    /* swallow — crash reporting must never itself crash */
  }
}

/** Reconstruct an Error from a crash audit entry so PostHog groups it by
 *  a stable name + stack instead of a generic blob. */
function crashFromAudit(entry: AuditEntry): Error {
  const err = new Error(entry.summary || entry.kind);
  err.name = entry.kind;
  // The audit's `details` is the captured stack (+ React componentStack for
  // boundary catches) — hand it to PostHog as the stack for grouping.
  if (entry.details) err.stack = entry.details;
  return err;
}

/** Reset identity on logout so the next user starts a fresh anonymous id. */
export function resetAnalytics(): void {
  try {
    client?.reset();
  } catch {
    /* swallow */
  }
}

/** Honor a user's analytics opt-out (Settings privacy toggle, Phase 2+). */
export function setAnalyticsOptOut(next: boolean): void {
  optedOut = next;
  try {
    if (!client) return;
    if (next) client.opt_out_capturing();
    else {
      client.opt_in_capturing();
      flushQueue();
    }
  } catch {
    /* swallow */
  }
}

/**
 * Bridge a forensic audit entry into PostHog when it's on the curated
 * allowlist. Called fire-and-forget from `appAuditor.logAppAudit`.
 * Cheap and total — never throws, returns immediately for unmapped
 * kinds and when analytics is disabled.
 */
export function mirrorAuditEvent(entry: AuditEntry): void {
  try {
    if (optedOut || !enabled) return;
    // Crash + defect detection: forward error-class and defect-class kinds to
    // PostHog Error Tracking as exceptions (not product events) so they group
    // into alertable issues. `severity` distinguishes a JS crash from a
    // content/runtime defect in the PostHog issue list.
    if (CRASH_KINDS.has(entry.kind) || DEFECT_KINDS.has(entry.kind)) {
      captureException(crashFromAudit(entry), {
        audit_kind: entry.kind,
        severity: CRASH_KINDS.has(entry.kind) ? 'crash' : 'defect',
        source: entry.source,
        ...(entry.route ? { route: entry.route } : {}),
        ...(entry.fen ? { fen: entry.fen } : {}),
        ...(entry.buildId ? { build_id: entry.buildId } : {}),
      });
      return;
    }
    const eventName = AUDIT_EVENT_MAP[entry.kind];
    if (!eventName) return;
    captureEvent(eventName, buildEventProps(entry));
  } catch {
    /* swallow */
  }
}
