/**
 * allowedOrigin — the ONE origin allowlist for every api/* gate.
 *
 * Root cause this exists (PostHog 2026-07-09, 8× `403 forbidden origin`):
 * `api/llm-proxy.ts` and `api/tts.ts` each carried a PRIVATE copy of the
 * allowlist with DIFFERENT preview regexes, and neither matched the app's
 * own Vercel DEPLOYMENT URLs (`chess-academy-<hash>-dyahnke-pros-projects
 * .vercel.app` — David opened one on the iPhone and every LLM call died,
 * killing smart-search + stage-gen for the session). Two lists that must
 * stay in sync never do; this module is the single source of truth.
 *
 * The gate's purpose is cost-amplification defense (a third-party page
 * must not be able to burn the DeepSeek/Polly quota). Everything the app
 * itself is served from must pass:
 *  - the native app schemes (`capacitor://` + the configured hostname)
 *  - production
 *  - local dev (vite proxies /api/* to prod with a localhost Origin)
 *  - EVERY Vercel URL of THIS project under THIS team — deployment URLs
 *    (`<project>-<hash>-<team>`) and git-branch aliases
 *    (`<project>-git-<branch>-<team>`) both carry the team suffix, so the
 *    regex REQUIRES it: another team's `chess-academy-*` project can never
 *    match. Arbitrary third-party origins stay blocked.
 */

const ALLOWED_ORIGINS = [
  // Native iOS WKWebView serves over BOTH schemes depending on the
  // Capacitor `server.hostname` config (David 2026-06-14: coach dead on
  // iOS when the https form was missing). Allow both.
  'capacitor://app.chessacademy.pro',
  'https://app.chessacademy.pro',
  'https://chess-academy-pro.vercel.app',
];

/** Local-dev origins. Always allowed on every environment, even prod —
 *  `vite dev` proxies `/api/*` to the deployed endpoint, so the request
 *  arrives with an `Origin: http://localhost:5173` header. Risk of a
 *  malicious page spoofing a localhost Origin is bounded by the per-IP
 *  rate limits at each endpoint (David's call, 2026-05-19). */
const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
];

/** Every Vercel URL of THIS project under THIS team: deployment URLs
 *  (`chess-academy-l8nh98ocd-dyahnke-pros-projects.vercel.app` — the exact
 *  shape from the 2026-07-09 PostHog 403s) and git-branch aliases
 *  (`chess-academy-pro-git-<branch>-dyahnke-pros-projects.vercel.app`).
 *  The team suffix is REQUIRED — that is what keeps a hostile
 *  `chess-academy-evil.vercel.app` (another team) out. Production's bare
 *  domain is in ALLOWED_ORIGINS above. */
const VERCEL_PROJECT_ORIGIN_RE =
  /^https:\/\/chess-academy-[a-z0-9-]+-dyahnke-pros-projects\.vercel\.app$/;

export function isAllowedOrigin(origin: string): boolean {
  return (
    ALLOWED_ORIGINS.includes(origin) ||
    LOCAL_DEV_ORIGINS.includes(origin) ||
    VERCEL_PROJECT_ORIGIN_RE.test(origin)
  );
}

/** Missing Origin (server-to-server / same-origin GET) is allowed; a
 *  present Origin must be on the allowlist. */
export function originAllowed(origin: string | null): boolean {
  return !origin || isAllowedOrigin(origin);
}
