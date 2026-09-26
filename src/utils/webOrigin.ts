// webOrigin — the ONE place that decides whether a request leaves the app.
//
// Inside the native (Capacitor) app the page is served from the app bundle,
// so a relative `/api/...` or `/data/...` URL resolves against the bundle —
// which has no API, and (since 2026-09-26) no large data files either. Those
// requests must go to the deployed web origin instead. On the web, same-origin
// relative URLs stay relative.
//
// This logic used to be hand-copied into five services (voiceService,
// coachApi, lichessExplorerService, chesscomGamesService, plus the TTS URL),
// and each copy was patched separately when the `protocol === 'capacitor:'`
// sniff broke under `server.hostname` (2026-06-06, 2026-06-13). One helper
// means the next such fix lands everywhere at once.
import { Capacitor } from '@capacitor/core';

/** The deployed web app — every server route and every `public/` file. */
export const WEB_ORIGIN = 'https://chess-academy-pro.vercel.app';

/** True inside the native app. Capacitor's `isNativePlatform()` is the
 *  scheme-independent signal; the protocol sniff is a defensive fallback. */
export function isNativeApp(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch { /* @capacitor/core unavailable — fall through */ }
  return typeof window !== 'undefined' && window.location.protocol === 'capacitor:';
}

/** `/api/x` or `/data/x.json` → absolute on native, unchanged on the web. */
export function withWebOrigin(path: string): string {
  return isNativeApp() ? `${WEB_ORIGIN}${path}` : path;
}
