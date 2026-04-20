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
