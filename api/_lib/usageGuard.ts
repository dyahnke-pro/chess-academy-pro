/**
 * Edge-safe usage guard shared by /api/llm-proxy and /api/tts.
 *
 * Two protections, both KV-backed so they hold across Vercel's serverless
 * fleet (the old in-memory Map in tts.ts is per-isolate and effectively
 * resets every cold start):
 *
 *   1. GLOBAL DAILY $ KILL-SWITCH — one running total of estimated spend
 *      across ALL users + both providers + Polly. When the day's estimate
 *      crosses LLM_DAILY_USD_CEILING (default $25) every request 429s until
 *      midnight UTC. This is the absolute ceiling on a day's bleed, auth or
 *      no auth — the number David picks.
 *   2. PER-IP RATE LIMIT — fixed window per caller IP, catches runaway loops
 *      and casual abuse that slips past the Origin gate.
 *
 * FAIL-OPEN by design: if KV isn't provisioned (no KV_REST_API_URL /
 * KV_REST_API_TOKEN) or a KV call errors, the guard ALLOWS the request. A
 * cost guard must never take the coach or voice down — the worst case of a
 * KV outage is "no extra protection for a few minutes," never "app broken."
 *
 * Provisioning: create a Vercel KV (Upstash Redis) store on the project; it
 * injects KV_REST_API_URL + KV_REST_API_TOKEN. Until then this no-ops.
 */

export type GuardKind = 'llm' | 'tts';

// 🚨 All env reads are LAZY (inside functions, at call time). On the Vercel Edge
// runtime, runtime env vars (KV_REST_API_URL etc.) are NOT reliably bound when
// a module's top-level code evaluates — a top-level `const KV_URL =
// process.env.…` reads empty and the guard fails open on every call (verified
// 2026-06-22: an isolated handler reading process.env lazily got the creds; the
// guard reading them at module scope did not). Read them per request instead.

interface KvCreds { url: string; token: string; }
function kvCreds(): KvCreds {
  return {
    url: (process.env.KV_REST_API_URL || '').replace(/\/+$/, ''),
    token: process.env.KV_REST_API_TOKEN || '',
  };
}

/** Absolute ceiling on a single day's estimated spend, across everyone. */
function dailyUsdCeiling(): number {
  return Number(process.env.LLM_DAILY_USD_CEILING ?? '25');
}

interface Limit { windowSec: number; maxPerWindow: number; }
function limitFor(kind: GuardKind): Limit {
  // A real human coach session is ~30-80 calls; 60 / 10 min is generous for a
  // person, tight on a loop. Voice fires per-sentence, so a looser window.
  if (kind === 'tts') return { windowSec: 600, maxPerWindow: Number(process.env.TTS_IP_LIMIT ?? '180') };
  return { windowSec: 600, maxPerWindow: Number(process.env.LLM_IP_LIMIT ?? '60') };
}

export interface GuardResult {
  allowed: boolean;
  reason?: 'rate-limit' | 'daily-ceiling';
  retryAfterSec?: number;
}

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Upstash REST pipeline. Returns the array of `result` values, or null on any
 * failure (caller treats null as fail-open).
 */
async function kvPipeline(creds: KvCreds, commands: (string | number)[][]): Promise<unknown[] | null> {
  if (!creds.url || !creds.token) return null;
  try {
    const r = await fetch(`${creds.url}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${creds.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as unknown;
    if (!Array.isArray(j)) return null;
    return j.map((x) => (x && typeof x === 'object' && 'result' in x ? (x as { result: unknown }).result : null));
  } catch {
    return null;
  }
}

/**
 * Record this call's estimated cost against the global daily counter, bump the
 * caller's per-IP window, and decide whether to allow it.
 *
 * @param estimatedCostUsd best-effort $ this call adds (flat per-LLM-call, or
 *        chars × Polly rate for TTS). Used only for the daily ceiling — it
 *        never needs to be exact, only conservative.
 */
export async function checkUsageGuard(
  kind: GuardKind,
  req: Request,
  estimatedCostUsd: number,
): Promise<GuardResult> {
  const creds = kvCreds();
  if (!creds.url || !creds.token) return { allowed: true }; // not provisioned → no-op

  const ip = clientIp(req);
  const lim = limitFor(kind);
  const day = new Date().toISOString().slice(0, 10);
  const rlKey = `rl:${kind}:${ip}:${Math.floor(Date.now() / 1000 / lim.windowSec)}`;
  const spendKey = `spend:${day}`;
  const charge = Math.max(0, estimatedCostUsd).toFixed(6);

  const res = await kvPipeline(creds, [
    ['INCR', rlKey],
    ['EXPIRE', rlKey, lim.windowSec],
    ['INCRBYFLOAT', spendKey, charge],
    ['EXPIRE', spendKey, 172800], // 2 days, so the key self-cleans
  ]);
  if (!res) return { allowed: true }; // KV error → fail open

  const ipCount = Number(res[0] ?? 0);
  const daySpend = Number(res[2] ?? 0);

  // Daily ceiling is the harder stop — check it first.
  if (Number.isFinite(daySpend) && daySpend > dailyUsdCeiling()) {
    return { allowed: false, reason: 'daily-ceiling', retryAfterSec: secondsUntilUtcMidnight() };
  }
  if (Number.isFinite(ipCount) && ipCount > lim.maxPerWindow) {
    return { allowed: false, reason: 'rate-limit', retryAfterSec: lim.windowSec };
  }
  return { allowed: true };
}

function secondsUntilUtcMidnight(): number {
  const now = Date.now();
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(60, Math.floor((next.getTime() - now) / 1000));
}

/** Flat conservative $ estimate for one LLM call (a heavy full-context turn). */
export const LLM_CALL_COST_USD = Number(process.env.LLM_CALL_COST_USD ?? '0.005');

/**
 * Polly's contribution to the global $ ceiling.
 *
 * Currently **0** — AWS Polly is inside its 12-month free tier (David
 * 2026-06-22), so synthesis costs nothing and must NOT count toward the dollar
 * kill-switch (otherwise the ceiling trips on phantom spend). The per-IP TTS
 * rate limit still applies, which protects the free tier's monthly *character*
 * allotment from a looping/abusive caller.
 *
 * 🔔 WHEN THE FREE TRIAL ENDS: set env `POLLY_USD_PER_CHAR=0.000016` (Neural
 * ≈ $16 / 1M chars; Generative is pricier) so Polly re-enters the dollar
 * ceiling.
 */
export const POLLY_USD_PER_CHAR = Number(process.env.POLLY_USD_PER_CHAR ?? '0');
