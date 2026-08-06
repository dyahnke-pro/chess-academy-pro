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
import { Capacitor } from '@capacitor/core';
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
/** Super-properties registered before posthog-js finished its lazy load —
 *  flushed by the init callback so an early `registerSuperProperties` (the
 *  App-boot identity chain, an audit run stamp) is never silently lost. */
const pendingSuperProps: Record<string, unknown> = {};
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
  // Coach auto-taught an opening with NO hand-built masterclass (David
  // 2026-07-16: "how many times coach made a lesson we do not have built —
  // clues me in to which openings need masterclasses"). `summary` = the
  // opening name; group-by it in PostHog to rank which openings testers most
  // want a masterclass for. `context` carries { eco, oid, entry }.
  'unbuilt-opening-lesson': 'unbuilt_opening_lesson',
  'lesson-completed': 'lesson_completed',
  'lesson-abandoned': 'lesson_abandoned',
  'srs-session-start': 'srs_session_started',
  'srs-session-complete': 'srs_session_completed',
  'quiz-started': 'quiz_started',
  'quiz-resolved': 'quiz_resolved',
  'coach-brain-ask-received': 'coach_question_asked',
  // Full ask→answer capture (David 2026-07-10: "full access to the
  // conversations"). Carries `ask_text` + `answer_text` so every coach turn is
  // queryable in PostHog, not just a 60-char summary.
  'coach-brain-answered': 'coach_answer',
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
  // In-app general feedback (David 2026-07-13) — header pill + Settings
  // "Send feedback". Lands in PostHog as `feedback_submitted` alongside the
  // audit-stream copy so it's queryable and a session can alert on it.
  'feedback-submitted': 'feedback_submitted',
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
  // Mic start failures (iOS native-speech unavailable, permission denial,
  // unsupported platform) — the ONE voice failure kind that wasn't mirrored,
  // so dead-mic reports were invisible in analytics (David 2026-06-30).
  'mic-start-failed': 'mic_start_failed',
  // Stockfish engine selection (David 2026-06-15: dead eval bar on iOS).
  // Mirrors WHICH variant the device resolved (multi / single / lila) and
  // any runtime fallback — so we can see that init actually ran and which
  // engine path a device took. A dead eval bar with NO variant event means
  // init never even started; lila here confirms the iOS path. The crash
  // itself surfaces separately as stockfish-error ($exception).
  'stockfish-variant-resolved': 'stockfish_variant',
  'stockfish-variant-fallback': 'stockfish_variant_fallback',
  // Coach OPPONENT move sourcing (David 2026-07-11: "the computer's moves are
  // total garbage" on iPhone — Learn/Play replies). The layered picker
  // (masters → lichess games → skill-limited Stockfish → random floor) logs
  // WHICH layer produced every reply move, but none of it was mirrored, so a
  // device where the theory layers silently fail (and every reply degrades to
  // weak-engine/random) was undiagnosable from durable analytics. summary
  // carries source= + san= + elo; the masters-miss/error kinds show WHY the
  // theory layer fell through.
  'coach-opponent-move-source': 'coach_opponent_move_source',
  'coach-opponent-masters-miss': 'coach_opponent_masters_miss',
  'coach-opponent-masters-error': 'coach_opponent_masters_error',
  // Coach LLM health (David 2026-06-15 gap audit). When the brain call
  // fails/times out the coach can't answer — currently invisible. Mirror as
  // events (queryable, not $exception) so we can see failure RATE without
  // spamming the autofix loop; promote to a defect later if a pattern shows.
  'llm-error': 'llm_error',
  // Provider failover/retry (DeepSeek↔Anthropic). Seeing this fire tells us a
  // provider is degraded before users feel it as slow/empty coach replies.
  'coach-brain-provider-retry': 'coach_provider_retry',
  // Grounding gate TRIP (David 2026-07-04). This fires when a guardrail CAUGHT
  // the LLM inventing chess (a board-false / eval-false / out-of-vocab-tactic
  // sentence) and DROPPED it before it was spoken — the guardrail SUCCEEDING,
  // not a crash. It was in DEFECT_KINDS ($exception), so ~30 successful catches
  // in 3 days buried the real crashes (an IDB DataError) in the exception list
  // and spammed the autofix cron. Mirror as an event instead (queryable, not
  // $exception) so the RATE stays visible — a high rate is the G0 signal that
  // the LLM is still deciding — without alarming on the guardrail doing its job.
  // The EXHAUSTION case (gate gave up, served the stock "I can't verify" reply)
  // stays a defect via `master-play-enforcement-fallback`.
  'claim-validator-trip': 'coach_grounding_gate_tripped',
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
  // Storage-persistence grant (David 2026-07-29). Without a grant, WebKit
  // evicts IndexedDB from infrequently-opened apps — which was wiping testers'
  // profiles/progress between sessions and minting a fresh analytics identity
  // each time (~20 installs looked like 340 one-off users). Mirroring the
  // per-boot grant state is how we VERIFY the fix lands in the wild: the share
  // of boots reporting persisted=true should climb toward 100%, and
  // `strength_calibrated` per device should collapse toward one.
  'storage-persistence': 'storage_persistence',
  'lichess-error': 'lichess_error',
  'asset-load-error': 'asset_load_error',
  'auto-import-failed': 'auto_import_failed',
  'polly-fallback': 'polly_fallback',
  // The IN-FLOW Polly → Web Speech demotion (voiceService.speakInternal).
  // `polly-fallback` only fires on noFallback skips; this is the silent
  // every-line demotion that IS the no-sound signal on iOS, and it was
  // invisible in durable analytics — "the buffer's wiped, data's gone"
  // when the real answer is here (David 2026-06-27). Event (not $exception)
  // so we see the RATE of Polly degradation per session/device.
  'voice-fallover': 'voice_fallover',
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
  // Full conversation capture (David 2026-07-10). The student's complete ask +
  // the coach's complete reply, so PostHog holds every turn for review — not
  // the 60-char preview `summary` truncates to. Bounded generously; a teaching
  // answer can run long but never near this.
  if (entry.askText) props.ask_text = entry.askText.slice(0, 4000);
  if (entry.answerText) props.answer_text = entry.answerText.slice(0, 4000);
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
 * Resolve the platform super-properties so every event + person can be told
 * apart: a native App Store / Play install vs an installed PWA vs a plain
 * browser visit. This is the "real downloaders" filter — without it a native
 * iOS install looks identical to someone visiting the website on an iPhone,
 * because the app uses `posthog-js` inside the Capacitor webview. Pure + total
 * (defends against non-Capacitor / SSR / test envs). Exported for tests.
 */
export function resolvePlatformSuperProps(): Record<string, unknown> {
  let isNative = false;
  let nativePlatform: string | null = null;
  try {
    isNative = Capacitor.isNativePlatform();
    nativePlatform = isNative ? Capacitor.getPlatform() : null;
  } catch {
    /* not a Capacitor env */
  }

  let isStandalone = false;
  try {
    isStandalone =
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof navigator !== 'undefined' &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true);
  } catch {
    /* matchMedia unavailable */
  }

  const platform = isNative ? 'native' : isStandalone ? 'pwa' : 'web';
  return {
    platform,
    is_native: isNative,
    is_standalone: isStandalone,
    ...(nativePlatform ? { native_platform: nativePlatform } : {}),
  };
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
        // DOM autocapture ON (David 2026-07-26: "I want ALL parts of the app
        // monitored for use — everything that can be clicked"). Captures every
        // button / link / input interaction across EVERY surface (openings,
        // tactics, weaknesses, kids, settings, …) automatically, so usage is
        // recorded without hand-wiring each control. Chess-board squares are
        // plain divs and are NOT autocaptured, so this stays free of per-move
        // board noise. Named semantic events (lesson_completed, purchases, etc.)
        // still fire explicitly for clean funnels. Volume is well within the
        // PostHog 1M-events/month free tier at current scale; scope to an
        // element allowlist if it ever grows.
        autocapture: true,
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
      // Tag EVERY event (super-property) + the person with the platform so
      // native installs are separable from PWA / browser web visitors — the
      // "real downloaders" filter. Registered before the app_session_started
      // capture below so that event carries it too.
      try {
        const platformProps = resolvePlatformSuperProps();
        // AUDIT RUN CORRELATION — read the driver's stamp HERE, in the one
        // place that provably runs before the first capture, instead of
        // depending on App.tsx's identity chain (whose registration reached
        // PostHog without the stamp on the 2026-08-06 probes — the chain is
        // one race too many for a correlation key). Absent for real users.
        try {
          const auditRunId = globalThis.localStorage?.getItem('auditRunId');
          if (auditRunId) (platformProps).audit_run_id = auditRunId;
        } catch { /* locked-down context */ }
        posthog.register(platformProps);
        posthog.setPersonProperties(platformProps);
        // Anything registered while the library was still loading — the
        // identity chain frequently wins that race. Registered before the
        // app_session_started capture below so even the first event carries
        // device_id / is_internal / audit_run_id.
        if (Object.keys(pendingSuperProps).length > 0) {
          posthog.register({ ...pendingSuperProps });
          posthog.setPersonProperties({ ...pendingSuperProps });
        }
      } catch {
        /* swallow — never let tagging break init */
      }
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
  // Live coach grounding failures. NB: `claim-validator-trip` (the gate
  // catching + dropping an invented sentence) was moved OUT of DEFECT_KINDS to
  // a product event — a successful catch is the guardrail working, not a defect
  // (David 2026-07-04). What stays here is genuine breakage: a hard-blocked
  // board claim and the EXHAUSTION fallback (gate gave up, served stock reply).
  'coach-board-claim-blocked',
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
  // Coach brain can't answer at all (provider error).
  'coach-llm-provider-error',
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

/**
 * Register SUPER-PROPERTIES — attached to every subsequent event and persisted
 * by posthog-js across sessions (so from the next load they ride every event
 * including the boot ones). Used for the stable device identity + the internal
 * (owner-device) flag. Also mirrors onto the person so cohorts can filter on
 * them. No-op when disabled / opted out.
 */
export function registerSuperProperties(props: Record<string, unknown>): void {
  try {
    if (optedOut) return;
    // posthog-js loads LAZILY — `client` lands in the import's .then, and the
    // App-boot identity chain (device_id / is_internal / audit_run_id) often
    // resolves first. Returning here silently LOST those registrations: the
    // 2026-08-06 pipe probe stamped an audit_run_id that reached no event and
    // never entered the taxonomy. Queue instead; the init callback flushes.
    if (!client) {
      if (initStarted) Object.assign(pendingSuperProps, props);
      return;
    }
    client.register(props);
    client.setPersonProperties(props);
  } catch {
    /* swallow — analytics must never break a feature path */
  }
}

/**
 * Set PostHog PERSON properties on the current person via `$set` / `$set_once`.
 * Used to attach durable, queryable attributes (is_pro, plan, first_seen_at) so
 * every event can be broken down by them. `once` props are written only if not
 * already set (stable cohorts). No-op when disabled / opted out.
 */
export function setUserProperties(
  props?: Record<string, unknown>,
  once?: Record<string, unknown>,
): void {
  try {
    if (!client || optedOut) return;
    if (!props && !once) return;
    client.setPersonProperties(props, once);
  } catch {
    /* swallow — analytics must never break a feature path */
  }
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
        // Explicit `summary` prop — the Error.message carries it too, but
        // PostHog doesn't expose that as a queryable field, so the stockfish
        // crash reason came back blank (David 2026-06-15). This makes the
        // reason queryable as properties.summary.
        summary: entry.summary,
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
