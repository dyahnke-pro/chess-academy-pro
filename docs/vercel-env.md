# Vercel environment variables

The live reference of what's wired and where. Source of truth is
`.env.example` at the repo root — this file explains the _why_ and
which surface each key feeds.

## Summary table

| Key                             | Surface     | Required | Purpose                                                |
| ------------------------------- | ----------- | -------- | ------------------------------------------------------ |
| `ANTHROPIC_KEY`                 | build       | no       | Pre-seeds Claude coach key into the bundle             |
| `DEEPSEEK_KEY`                  | build       | no       | Pre-seeds DeepSeek coach key into the bundle           |
| `AWS_ACCESS_KEY_ID_POLLY`       | vercel-fn   | yes\*    | Polly TTS access (used by `/api/tts`)                  |
| `AWS_SECRET_ACCESS_KEY_POLLY`   | vercel-fn   | yes\*    | Polly TTS secret (used by `/api/tts`)                  |
| `AWS_REGION_POLLY`              | vercel-fn   | no       | Polly region (default `us-east-1`)                     |
| `UPSTASH_REDIS_REST_URL`        | vercel-fn   | no       | Persists client audit stream                           |
| `UPSTASH_REDIS_REST_TOKEN`      | vercel-fn   | no       | Persists client audit stream                           |
| `KV_REST_API_URL`               | vercel-fn   | no       | Alias auto-set by Vercel Upstash integration           |
| `KV_REST_API_TOKEN`             | vercel-fn   | no       | Alias auto-set by Vercel Upstash integration           |
| `AUDIT_STREAM_SECRET`           | vercel-fn   | yes\*\*  | Shared secret gating `/api/audit-stream` POSTs         |
| `ANTHROPIC_API_KEY`             | local only  | no       | Used by `scripts/*` — do NOT ship to Vercel            |
| `DEEPSEEK_API_KEY`              | local only  | no       | Used by `scripts/*` — do NOT ship to Vercel            |

\* Without these, the voice coach falls back to the browser's Web
Speech API. The app still works; it just sounds like the default
system voice.

\*\* Without this, `/api/audit-stream` returns 500. If you don't want
the audit stream live, remove the fetch call from
`appAuditor.ts` or set a dummy value and ignore the 401s.

## Surfaces explained

### `build` — read by Vite

Referenced in `vite.config.ts` via `define`. Value is **inlined into
the JS bundle at build time** and is therefore public. Never put
anything here that must stay secret — users who want to inspect the
shipped app can read it.

### `vercel-fn` — read by `/api/*` handlers

Read at runtime inside Vercel's serverless functions. Safe for
secrets.

### `local only`

Only used by `scripts/` (node CLIs) or Playwright. Setting them in
Vercel has no effect but also isn't harmful.

## Adding a new env var

1. Add it to `.env.example` with a comment explaining the surface and
   purpose.
2. Update the table in this file.
3. If `build`-surface: add to `vite.config.ts` `define` and to
   `env.d.ts` if you want types for `import.meta.env.*`.
4. Set it in Vercel → Project Settings → Environment Variables for
   all environments it applies to (`Production`, `Preview`,
   `Development`).
5. Redeploy — build-surface values don't hot-swap.

## Audit log

Run this to diff what's actually referenced in code vs what's in
`.env.example`:

```bash
rg -n 'process\.env\.[A-Z_]+|import\.meta\.env\.[A-Z_]+' \
  --glob '!node_modules' --glob '!dist' | sort -u
```

If you see a key in code that's not listed in `.env.example`, add it
there and here — missing docs are how keys rot silently on Vercel.

## Deploys: disable previews to protect the free-tier cap

The free tier caps at **100 deployments/day** (`api-deployments-free-per-day`).
Every push to a branch / PR triggers a **preview** deploy that counts
against it — and CLAUDE.md's policy is **push straight to `main`
(production), no previews**. To stop previews from eating the cap:

**Vercel → project `chess-academy-pro` → Settings → Git → "Ignored
Build Step" → "Run my own command":**

```bash
if [ "$VERCEL_ENV" = "production" ]; then exit 1; else exit 0; fi
```

Exit-code contract: **exit 1 = build, exit 0 = skip**. So production
(`main`) builds; every preview is skipped before it consumes a build.

If skipped previews still tick the deployment counter, use the stronger
lever on the same Git settings page: turn **off preview deployments**
for non-production branches (Production Branch = `main`, don't deploy
others) so the deployment is never created.

This is a **project setting, not a `vercel.json` key** — there's no
committable field for it, so it lives here as the durable cross-session
note. Nothing in `.github/workflows/` creates Vercel builds
(`post-deploy-audit.yml` only *audits* after a deploy); builds come
solely from Vercel's native Git integration, which the setting above
controls.
