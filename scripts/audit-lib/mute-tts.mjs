// Self-contained browser init-script: run this audit WITHOUT spending a cent on
// text-to-speech. Inject once per context, before the app boots:
//
//     await ctx.addInitScript(muteTtsForAudit);
//
// WHY THIS EXISTS (David 2026-08-04, after a $100 TTS overage in a single day):
//
// A post-deploy audit drives the LIVE production app, and every narrated line it
// triggers is a real synthesis against a real metered API. Repeated Playwright
// runs over /coach/teach — plus a `WALKTHROUGH_GEN_REV` bump, which invalidates
// cached lessons and regenerates their prose into brand-new strings that miss
// the CDN clip cache entirely — turn an afternoon of auditing into a bill.
//
// And it buys NOTHING. The narration listener (audit-listener.mjs) reads the
// spoken text out of the app's own `coach-narration-spoken` audit event, which
// carries the full line. Synthesising it produces audio no one is in the room to
// hear. The audit's assertions — did it speak, what did it say, in what order,
// at what verbosity — are all satisfied by the events.
//
// So: same events, same text, same ordering, no audio, no bill.
//
// The app honours this in `voiceService.speakInternal` (search `isAuditMuted`).
// It still emits `coach-narration-spoken` with the exact line, still resolves
// the speak promise on a text-proportional delay so voice-gated auto-advance
// keeps its real pacing, and still respects stop()/supersede. Only the network
// synthesis is skipped.
//
// USE IT ON EVERY AUDIT unless the audit's specific purpose is to verify audio
// playback itself (iOS decode, MediaSource streaming, the /api/tts contract).
// Those are the only cases where the bytes matter — and they should be a short,
// deliberate run, not a side effect of auditing something else.
export function muteTtsForAudit() {
  try {
    window.localStorage.setItem('auditMuteTts', '1');
  } catch {
    /* no localStorage in this context — the app then speaks normally */
  }
}

/** Stamp a RUN ID the app registers as the `audit_run_id` PostHog
 *  super-property (App.tsx, next to device identity), so THIS run's events —
 *  including every `coach_narration_spoken` with its full `narration_text` —
 *  are isolable in PostHog with a WHERE clause instead of $session_id + wall-
 *  clock guesswork. This is the prod-https replacement for the local listener,
 *  which cannot attach cross-scheme (David 2026-08-06: "pull the narrations
 *  from posthog instead of listener tool"). Returns an init-script function;
 *  inject beside the mute:
 *
 *      const runId = `audit-${Date.now().toString(36)}`;
 *      await ctx.addInitScript(stampAuditRunId(runId));
 *
 *  Read back (ingest lag ~90s; via the PostHog MCP, never the dead phx_ key):
 *      SELECT timestamp, properties.source, properties.narration_text
 *      FROM events WHERE event = 'coach_narration_spoken'
 *      AND properties.audit_run_id = '<runId>' ORDER BY timestamp
 */
export function stampAuditRunId(runId) {
  return `try { window.localStorage.setItem('auditRunId', ${JSON.stringify(String(runId))}); } catch {}`;
}
