# Environment variables — where each one belongs

Companion to `.env.example`. The file lists the keys; this doc says
which Vercel scope each one goes in and why.

Vercel has three env scopes and two surfaces:
- **Scopes:** Development / Preview / Production.
- **Surfaces:** Build (available during `npm run build`) vs. Runtime
  (available to serverless functions in `api/*`).

`VITE_*` keys are **build-time only** — Vite bakes them into the
bundle. Changing them requires a redeploy, not a restart.

## Observability (Sentry + PostHog)

| Key | Surface | Scope | Notes |
|-----|---------|-------|-------|
| `VITE_SENTRY_DSN` | Build | Production (+ Preview optional) | Public DSN; safe to bake into the bundle. Leave unset in Development so local runs don't noise-up Sentry. |
| `VITE_POSTHOG_KEY` | Build | Production (+ Preview optional) | Public project key. Same rule as Sentry. |
| `VITE_POSTHOG_ALLOW_DEV` | Build | — | Set to `true` only in a developer's `.env.local` when debugging proxy wiring. Never set in Preview or Production. |
| `SENTRY_AUTH_TOKEN` | Build | Production + Preview | Required for source-map upload. Sensitive — Vercel "secret" type. |
| `SENTRY_ORG` | Build | Production + Preview | Sentry org slug. |
| `SENTRY_PROJECT` | Build | Production + Preview | Sentry project slug. |

The sentryVitePlugin silently skips the upload when any of the three
`SENTRY_*` build-scope vars are missing, so PR preview builds from
forks (which don't have the secret) still pass.

## Playwright

| Key | Surface | Scope | Notes |
|-----|---------|-------|-------|
| `VITE_ALLOW_TEST_LOGIN` | Build | Preview only | Registers the `/auth/test-login` route Playwright uses. NEVER set on Production. |
| `PLAYWRIGHT_BASE_URL` | CI runtime | — | Set by `.github/workflows/e2e.yml` from the Vercel preview URL. Don't set manually. |

## Existing (from #302 and earlier)

| Key | Surface | Scope | Notes |
|-----|---------|-------|-------|
| `ANTHROPIC_KEY` / `DEEPSEEK_KEY` | Build | Production (optional) | Pre-seeds coach keys so the first-run user doesn't have to paste one. |
| `AWS_*_POLLY` | Runtime (vercel-fn) | Production | Amazon Polly TTS. `/api/tts` falls back to Web Speech when unset. |
| `UPSTASH_REDIS_*` / `KV_*` | Runtime (vercel-fn) | Production (optional) | Audit stream persistence. |
| `AUDIT_STREAM_SECRET` | Runtime (vercel-fn) | Production (required for audit) | Shared secret for `/api/audit-stream`. |

## Adding a new env var

1. Add it to `.env.example` with a `[build]` / `[vercel-fn]` / `[local]` tag.
2. Add a row to this table.
3. Add it to the appropriate Vercel Project → Settings → Environment Variables scope.
4. If build-time, restart the preview deployment so the next build picks it up.
