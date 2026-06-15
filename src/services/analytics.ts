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
/** Exceptions captured before posthog-js loads (boot-time crashes are exactly
 *  what we want to keep) — replayed on load. */
const preInitExceptions: Array<{ error: unknown; props?: Record<string, unknown> }> = [];
const PRE_INIT_QUEUE_LIMIT = 50;

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';

/**
 * Curated audit-kind → PostHog-event allowlist. ONLY these forensic
 * kinds are mirrored into PostHog; everything else stays in the audit
 * log. Excludes the highest-volume per-move kinds (`move-attempt`, etc.)
 * to protect the PostHog free-tier event budget and keep the product
 * funnel readable. Add a kind here when it carries genuine product signal
 * (a funnel step, an engagement milestone, a cost driver) — not raw
 * forensic noise.
 *
 * VOICE / NARRATION events ARE mirrored (David 2026-06-04: "can we add
 * voice events to hog?"). They're the only way to diagnose a voice bug
 * (e.g. the Brief-narration-silence report) without the app open for a
 * live audit-stream pull — PostHog persists them. The `summary` carries
 * the diagnostic (which gate fired: silent-gate / brief-cap N→0 chars /
 * no-speakable-content / which source). For a single-user + beta-cohort
 * app the volume is a non-issue against the 1M-event/month free tier.
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
  // Activation funnel (build 3) — `games_imported` is the import milestone;
  // paired with lesson_completed / coach_question_asked / strength_calibrated
  // already above, PostHog can build the first-occurrence activation funnel.
  'auto-import-completed': 'games_imported',
  // In-app user bug report (build 1) — also flows here so reports land in
  // PostHog alongside the audit-stream copy.
  'user-report': 'user_report',
  // Voice / narration (David 2026-06-04). The `summary` carries the
  // diagnostic — e.g. voice-speak-invoked from voiceService.speakInternal
  // reads "brief-cap applied: 200→0 chars" / "silenced by Coach Narration =
  // silent" / "dropped (no speakable content)" — which is exactly what
  // pinpoints a Brief-silence bug. The skipped/fired pair tells us whether
  // narration was even attempted upstream before speak.
  'voice-speak-invoked': 'voice_spoken',
  'coach-narration-spoken': 'coach_narration_spoken',
  'coach-move-narration-fired': 'coach_narration_fired',
  'coach-move-narration-skipped': 'coach_narration_skipped',
  // Mirror the actual TTS playback failure (iOS <audio> autoplay rejection,
  // decode error, /api/tts non-200) to PostHog. It was NOT mirrored, so
  // "no voice" reports were invisible in analytics (David 2026-06-06).
  'tts-failure': 'tts_failure',
  // Stockfish engine selection (David 2026-06-15: dead eval bar on iOS).
  // Mirrors WHICH variant the device resolved (multi / single / lila) and
  // any runtime fallback — so we can see that init actually ran and which
  // engine path a device took. A dead eval bar with NO variant event means
  // init never even started; lila here confirms the iOS path. The crash
  // itself surfaces separately as stockfish-error ($exception).
  'stockfish-variant-resolved': 'stockfish_variant',
  'stockfish-variant-fallback': 'stockfish_variant_fallback',
  // Coach LLM health (David 2026-06-15 gap audit). When the brain call
  // fails/times out the coach can't answer — currently invisible. Mirror as
  // events (queryable, not $exception) so we can see failure RATE without
  // spamming the autofix loop; promote to a defect later if a pattern shows.
  'llm-error': 'llm_error',
  // Provider failover (DeepSeek↔Anthropic). Seeing this fire tells us a
  // provider is degraded before users feel it as slow/empty coach replies.
  'provider-fallback': 'provider_fallback',
  // Eval-bar caller miss — the bar requested an analysis that timed out/empty
  // and never updated. Event (not defect) so we see the RATE; a spike means
  // the engine's alive but too slow, or a UI-wiring regression.
  'eval-bar-analysis-failed': 'eval_bar_analysis_failed',
  // Degradation / infra-failure visibility (David 2026-06-15 re-audit). Events
  // (not $exception) so we see RATES without spamming autofix — promote any to
  // DEFECT_KINDS if a pattern shows it's user-facing breakage.
  'audit-stream-post-failed': 'audit_stream_post_failed', // telemetry itself failing — meta-blindspot
  'tool-call-error': 'coach_tool_call_error',
  'coach-tool-callback-rejected': 'coach_tool_callback_rejected',
  'opening-play-eval-error': 'opening_play_eval_error',
  'dexie-error': 'dexie_error',
  'network-error': 'network_error',
  'lichess-error': 'lichess_error',
  'asset-load-error': 'asset_load_error',
  'auto-import-failed': 'auto_import_failed',
  'polly-fallback': 'polly_fallback',
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
  // Full spoken-narration text (David 2026-06-06). The summary truncates to
  // 40 chars; this carries the complete line so PostHog stores the real
  // narration for accuracy review. Bounded generously — a single spoken
  // sentence never approaches this.
  if (entry.narrationText) props.narration_text = entry.narrationText.slice(0, 2000);
  return props;
}

/** Read the PostHog key from the build-time env. Returns undefined when
 *  unset (the no-op case). */
function resolveKey(): string | undefined {
  // Accept either env-var name. The key was originally `VITE_POSTHOG_KEY`
  // but the configured var is named `VITE_PUBLIC_POSTHOG_KEY` — reading
  // only the old name left analytics (and the audit→PostHog mirror) a
  // silent no-op on every build that had the new name, so device voice/
  // narration bugs were undiagnosable (David 2026-06-09). Prefer the old
  // name when present so existing prod config keeps working.
  const key =
    import.meta.env.VITE_POSTHOG_KEY || import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
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
        // Reverse-proxy aware: the toolbar/links point at the real PostHog app
        // even when events ingest through our first-party /ingest proxy.
        ui_host: 'https://us.posthog.com',
        // SPA — we drive pageviews via the `route-changed` bridge.
        capture_pageview: false,
        // Explicit events only; no DOM autocapture noise.
        autocapture: false,
        capture_performance: false,
        // 🚨 DISABLE feature-flag polling. The app uses ZERO PostHog
        // feature flags, but posthog-js polls the `/flags/` endpoint on
        // init/identify by default — and because PostHog is reverse-
        // proxied through `/api/ph/*`, every one of those calls is a
        // billed Vercel EDGE request. Runtime-log analysis (2026-06-11)
        // found `/api/ph/flags/` was ~92% of ALL edge requests (the
        // single biggest driver of the 5.9M that paused the account).
        // Disabling it kills that traffic with no behavior loss — event
        // capture uses a separate endpoint and is unaffected.
        advanced_disable_flags: true,
        // Respect Do-Not-Track at the library level too.
        respect_dnt: true,
      });
      client = posthog;
      enabled = true;
      if (optedOut) posthog.opt_out_capturing();
      else {
        flushQueue();
        // Guaranteed per-load event — fires directly (not via the audit
        // bridge, whose boot-time queue/flush ordering can drop the first
        // event). Proves the ingest pipe works on every session and is the
        // canonical "session started" analytic.
        try {
          posthog.capture('app_session_started');
        } catch {
          /* swallow */
        }
      }
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
  for (const ex of preInitExceptions.splice(0)) {
    try {
      client.captureException(ex.error, ex.props);
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
  // Runtime continuity + curated-fallback + empty-state detectors
  'continuity-error',
  'curated-lesson-fallback',
  'surface-empty-state',
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
  // Engine failures that kill the eval bar / analysis (David 2026-06-15:
  // "we need errors like this to trigger error reports to trigger builds").
  // Promote to PostHog Error Tracking → the posthog-error-watch cron detects
  // the new $exception → triggers claude-autofix. A dead engine now reports
  // and self-routes to a fix build instead of failing dark.
  'stockfish-error',
  'stockfish-analysis-stalled',
  // Opponent-move computation failures — when the coach can't compute ITS
  // reply, the board locks in "opponent thinking" and the user can't move
  // (David 2026-06-15: "it froze, can't move any piece"). These were detected
  // in code but never surfaced; they're the freeze's signal.
  'coach-opponent-stockfish-error',
  'coach-opponent-masters-error',
  'opening-play-opponent-error',
  // Coach brain can't answer at all (provider error / empty token pool).
  'coach-llm-provider-error',
  'tokens-empty',
]);

/** Send an exception to PostHog Error Tracking. Total — never throws. */
export function captureException(error: unknown, props?: Record<string, unknown>): void {
  try {
    if (optedOut) return;
    if (!client) {
      // Queue boot-window crashes (posthog-js still loading) for replay.
      if (initStarted && resolveKey() && preInitExceptions.length < PRE_INIT_QUEUE_LIMIT) {
        preInitExceptions.push({ error, props });
      }
      return;
    }
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
    // NB: gate on opt-out ONLY, not on `enabled`. Early-boot events (app-boot
    // → app_opened, the first route-changed) fire BEFORE posthog-js finishes
    // its async load; `captureEvent`/`captureException` queue during that
    // window and flush on load. Returning on `!enabled` here dropped the
    // app_opened event entirely (the "someone opened the app" signal).
    if (optedOut) return;
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
