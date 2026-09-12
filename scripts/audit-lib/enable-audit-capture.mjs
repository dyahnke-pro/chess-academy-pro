// Self-contained browser init-script: turn the app's audit-stream POSTs back ON
// so an audit that CAPTURES events (via `page.route('**/api/audit-stream**')`
// fulfilled locally, or the loopback listener) actually receives them. Inject
// once per context, before the app boots, next to muteTtsForAudit:
//
//     await ctx.addInitScript(enableAuditCapture);
//
// WHY THIS EXISTS (2026-09-11 audit-stream opt-in change):
//
// The audit stream went OPT-IN and OFF BY DEFAULT — the app no longer POSTs its
// `logAppAudit()` events anywhere unless the viewer explicitly enabled streaming
// in Settings. That was the right call for real devices (it was exhausting the
// shared Upstash command budget). But it silently BLINDED every audit whose
// assertions read the app's emitted events: the interceptor route never fires,
// so a presence check ("did a routing event fire?", "did master-play-prefetch
// fire?", "was the storage-persistence event emitted?") reports FALSE even
// though the app behaved correctly. That is a false red in the exact place the
// audit was watching — the G1 tripwire going dark, not the app breaking.
//
// The app enables streaming when BOTH `auditStreamUrl` and `auditStreamSecret`
// are present (profile.preferences, with a legacy localStorage fallback that
// appAuditor migrates on boot). This sets both in localStorage. The URL points
// at the app's own origin so it matches the `**/api/audit-stream**` route the
// audit already intercepts and FULFILLS LOCALLY — so nothing reaches prod, no
// real secret is needed, and the Upstash budget is never touched. It only makes
// the app EMIT, so the local interceptor can see the events again.
//
// Use it on any audit that asserts on captured audit events. It pairs with — it
// does not replace — the local `page.route`/listener interception; without that
// interception this would try to POST to prod. Do NOT use it on an audit that
// deliberately verifies the DEFAULT-OFF behavior (audit-stream-optin-prod).
export function enableAuditCapture() {
  try {
    const origin = (typeof location !== 'undefined' && location.origin) || 'https://chess-academy-pro.vercel.app';
    window.localStorage.setItem('auditStreamUrl', `${origin}/api/audit-stream`);
    // Any non-empty value: the interceptor fulfills locally and never validates
    // it, and prod is never reached, so this is not a real credential.
    window.localStorage.setItem('auditStreamSecret', 'audit-local-capture');
  } catch {
    /* no localStorage in this context — the audit will capture nothing, which
       its own assertions will surface as a failure rather than a false pass */
  }
}
