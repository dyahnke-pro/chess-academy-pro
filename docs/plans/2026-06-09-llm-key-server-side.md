# PLAN — Move LLM keys server-side (kill the bundle leak)

**Incident (2026-06-09):** David's DeepSeek key was extractable from the
public prod JS bundle and someone siphoned it onto `deepseek-v4-pro`
(779 requests, $4.56 on 6/6) — his app only calls `deepseek-chat` /
`deepseek-reasoner` ($0.00). Key **revoked**. Anthropic key also leaked
(see below) and must be rotated too.

## Leak surfaces (all must be closed)

1. `vite.config.ts:31-32` — `define` inlines `__DEEPSEEK_KEY__` /
   `__ANTHROPIC_KEY__` into the client bundle.
2. `vite.config.ts:26,29` — `loadEnv` / `envPrefix` expose `DEEPSEEK_` /
   `ANTHROPIC_` prefixed env to `import.meta.env` (client).
3. `coachApi.ts:231-234` — hardcoded obfuscated (split+reversed) `_P`
   (Anthropic) + `_Q` (DeepSeek) keys. `_Q` decodes to the exact revoked
   `sk-92e…c9fe`. **In git history permanently — revocation is the only
   remedy.**
4. `coachApi.ts:237,241` — `getAnthropicKey` / `getDeepseekKey` read all
   of the above.
5. `src/vite-env.d.ts:15-16` — global decls for `__*_KEY__`.
6. `coachApi.ts` 6 client instantiations call `api.deepseek.com` /
   Anthropic **directly from the browser** (`dangerouslyAllowBrowser`).

## Design — transparent same-origin proxy

The SDKs keep doing all the work (streaming, tool-use, fallback). We only
swap each client's `baseURL` to our own `/api` and inject the real key
**server-side**. Lowest blast radius on the brain pipeline.

- **`api/llm-proxy.ts`** (edge, streams `upstream.body`). One flat
  function, dispatched by `?provider=deepseek|anthropic&path=…`. Mirrors
  the proven `phproxy` flat-function + query-rewrite pattern (nested
  catch-all 404s in this Vite project — see phproxy header). Origin
  allowlist + CORS mirror `tts.ts` (Capacitor / vercel.app / localhost /
  preview). Injects `DEEPSEEK_KEY` (`Authorization: Bearer`) or
  `ANTHROPIC_KEY` (`x-api-key`) from `process.env` — never the client.
- **`vercel.json`** rewrites (before the SPA catch-all):
  - `/api/llm/deepseek/:path*` → `/api/llm-proxy?provider=deepseek&path=:path*`
  - `/api/llm/anthropic/:path*` → `/api/llm-proxy?provider=anthropic&path=:path*`
- **`coachApi.ts`**: `baseURL` → `${apiOrigin()}/api/llm/{deepseek,anthropic}`
  (`apiOrigin()` = `VERCEL_ORIGIN` under Capacitor, else `location.origin`
  — same rule as `voiceService.getTtsUrl`). `getKey()` → returns a sentinel
  (`'proxy'`) so provider-reachability/fallback logic is preserved; the
  server decides real availability. `_P`/`_Q`/`_r` + all `import.meta.env`
  /`__*_KEY__` reads DELETED.
- **`vite.config.ts`**: drop the two key `define`s + the `DEEPSEEK_`/
  `ANTHROPIC_` `loadEnv`/`envPrefix` entries.
- **`src/vite-env.d.ts`**: drop the two `__*_KEY__` decls.
- **Tests**: update provider-URL mocks (`coachApi.master-integration.test`)
  from `api.deepseek.com` → the proxy paths.

## Server env (David, in Vercel — NOT the bundle)

Set as plain (non-`VITE_`) Project env vars, Production + Preview:
- `DEEPSEEK_KEY` = the NEW rotated key
- `ANTHROPIC_KEY` = the rotated Anthropic key

The edge function reads `process.env.*` at runtime. Nothing ships to the
client.

## Out of scope (flagged follow-ups)

- `__AUDIT_STREAM_SECRET__` is also bundle-exposed (`vite.config.ts:44`,
  read by `appAuditor.ts`). Low severity (spam a 24h audit buffer). Fix
  later by Origin-gating the audit POST instead of a baked secret.
- KV-backed rate limiting on the proxy (Origin allowlist is the primary
  gate today, matching tts/explorer posture).

## Done =

typecheck + coach tests + lint green → ship to `main` → David sets the two
server env vars → redeploy → **re-scan the live bundle: zero `sk-`** →
coach audit (best-move probe) green on prod.
