# Cost Cap — Tier 1 (server-side rate limit + global daily $ kill-switch)

**Owner:** David · **Started:** 2026-06-22 · **Status:** code DONE, dormant
until a Vercel KV store is provisioned (fail-open no-op without it).

## Why Tier 1 first

DeepSeek is dirt cheap (`deepseek-chat` $0.27/1M in, $1.10/1M out → ~$0.002–0.005
per coach turn), so per-user *dollar* metering barely matters for honest use. The
real exposure before going public:

1. `/api/llm-proxy` had **zero** rate limiting (only an Origin gate, which is
   spoofable outside a browser) — anyone who finds the endpoint could burn
   DeepSeek/Anthropic spend uncapped.
2. No **global daily $ ceiling** anywhere — nothing bounded a day's total bleed.
3. `/api/tts` (Polly, ~$16/1M chars — the *bigger* cost driver) had only an
   **in-memory** per-IP limit, which on Edge is per-isolate and effectively
   resets every cold start.

## What shipped (this branch)

- **`api/_lib/usageGuard.ts`** — Edge-safe, KV-backed:
  - **Global daily $ kill-switch** — one running total across all users + both
    providers + Polly, keyed `spend:YYYY-MM-DD`. Over `LLM_DAILY_USD_CEILING`
    (default **$25**) → every request 429s until UTC midnight.
  - **Per-IP rate limit** — fixed 10-min window (LLM 60, TTS 180 per window).
  - **FAIL-OPEN**: no KV env or any KV error → request allowed. A cost guard
    must never take the coach/voice down.
- Wired into **`api/llm-proxy.ts`** (was unprotected) and **`api/tts.ts`** (on
  top of its existing in-memory layer).
- **`api/_lib/usageGuard.test.ts`** — 5 tests: no-op unconfigured, fail-open on
  KV error, daily-ceiling block, rate-limit block, normal allow.

## Activation — David's one step

The guard no-ops until a KV store exists. To turn it on:

1. **Vercel dashboard → Storage → Create Database → KV (Upstash Redis)**, attach
   to `chess-academy-pro` (Production). This auto-injects `KV_REST_API_URL` +
   `KV_REST_API_TOKEN`.
2. (Optional) set `LLM_DAILY_USD_CEILING` (default 25) and per-IP limits
   (`LLM_IP_LIMIT`, `TTS_IP_LIMIT`) in Project → Env.
3. Deploy. Verify: a normal coach turn + voice still work; hammering
   `/api/llm-proxy` past the window returns 429; the `spend:<date>` key climbs.

## Not in Tier 1 (later)

- **Tier 2** — finish the client-side `checkUsageCap` (audit doc
  `docs/llm-usage-cap-audit.md`): monthly $10 / daily 200-request soft caps for
  honest-user UX + the `estimatedSpend` monthly-reset bug fix.
- **Tier 3** — per-user (not just per-IP) caps once Supabase auth lands.
- The kill-switch charges a flat `LLM_CALL_COST_USD` ($0.005) per LLM call
  (conservative; exact token accounting on a streamed Edge passthrough isn't
  worth the complexity for a ceiling).
