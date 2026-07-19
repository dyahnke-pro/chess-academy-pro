/**
 * review-voice-listener — shared instrument-3 attach for the review
 * repros (G1: Playwright + audit-stream + THE NARRATION LISTENER, all
 * three on every run). Points the page's audit stream at the local
 * sidecar so every voice-speak-invoked event (40-char preview of the
 * actually-spoken text) is captured in-process.
 *
 * Usage in a repro:
 *   const voice = process.env.AUDIT_LISTENER === '1' ? await attachVoiceListener(ctx) : null;
 *   ...
 *   if (voice) {
 *     const lines = voiceLines(voice);
 *     check('listener: X spoke', lines.some((l) => /pattern/.test(l)));
 *     await voice.stop();
 *   }
 */
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-listener.mjs';

/** Chromium launch args the listener NEEDS when the page runs on a
 *  public HTTPS origin (prod): without these, Private Network Access
 *  preflight-blocks every POST from the page to http://127.0.0.1, the
 *  app's failure streak latches streaming off, and the listener
 *  captures nothing (the 2026-07-13 shard runs hit the same wall). */
export const LISTENER_LAUNCH_ARGS = [
  '--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults',
];

export async function attachVoiceListener(ctx) {
  const listener = await startAuditListener();
  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch {
        /* storage unavailable — the repro's stream checks degrade */
      }
    },
    { url: `${listener.url}/api/audit-stream`, secret: LOCAL_LISTENER_SECRET },
  );
  return listener;
}

/** Previews (first 40 chars) of every line the voice service was asked
 *  to SPEAK during the run, in order. */
export function voiceLines(listener) {
  return listener
    .getCapturedEvents()
    .filter((e) => e.kind === 'voice-speak-invoked')
    .map((e) => String(e.summary ?? ''));
}
