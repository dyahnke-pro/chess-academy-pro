/**
 * Edge-safe usage guard shared by /api/llm-proxy and /api/tts.
 *
 * Two protections, both KV-backed so they hold across Vercel's serverless
 * fleet (the old in-memory Map in tts.ts is per-isolate and effectively
 * resets every cold start):
 *
 *   1. GLOBAL DAILY $ KILL-SWITCH — one running total of estimated spend
 *      across ALL users (DeepSeek LLM + Polly). When the day's estimate
 *      crosses LLM_DAILY_USD_CEILING (default $25) every request 429s until
 *      midnight UTC. This is the absolute ceiling on a day's bleed, auth or
 *      no auth — the number David picks.
 *   2. PER-IP DAILY $ CAP — each caller IP gets its own daily budget
 *      (PER_IP_DAILY_USD_CAP, default $1.00) so one looping/abusive caller
 *      self-limits instead of pushing the shared global counter to the ceiling
 *      and 429-ing every paying user. The real protection for a public trial.
 *   3. PER-IP RATE LIMIT — fixed window per caller IP, catches runaway loops
 *      and casual abuse that slips past the Origin gate. (Also guards the Polly
 *      free-tier *character* allotment while POLLY_USD_PER_CHAR is 0.)
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

interface Limit { windowSec: number; maxPerWindow: number; }
function limitFor(kind: GuardKind): Limit {
  // A real human coach session is ~30-80 calls; 60 / 10 min is generous for a
  // person, tight on a loop. Voice fires per-sentence, so a looser window.
  if (kind === 'tts') return { windowSec: 600, maxPerWindow: Number(process.env.TTS_IP_LIMIT ?? '180') };
  return { windowSec: 600, maxPerWindow: Number(process.env.LLM_IP_LIMIT ?? '60') };
}

export interface GuardResult {
  allowed: boolean;
  reason?: 'rate-limit';
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
 * 🔒 RATE LIMIT ONLY — THE $ BOOKKEEPING IS GONE (David 2026-09-11: "deepseek
 * costs pennies. i am not worried about being charged $25 in one day, it barely
 * gets above 3 cents. so we can probably remove the [counter] that checks for
 * amount used").
 *
 * He is right about the money: DeepSeek-only, real usage sits near $0.03/day, so
 * a $25/day ceiling and a $1/day/IP cap were theatre — and they were EXPENSIVE
 * theatre, because the two INCRBYFLOAT spend keys plus their EXPIREs were paid
 * on EVERY llm and tts call, against the same 500k/month Upstash budget that
 * holds the bell and the referral credits. Tracking spend to protect against
 * spend was the larger cost.
 *
 * What does NOT go is the per-IP RATE LIMIT, and removing it with the rest would
 * be the mistake. `/api/llm-proxy` and `/api/tts` are unauthenticated endpoints
 * on a permanently-open free web app — the risk was never David's own users at 3
 * cents, it is anyone who finds those URLs and uses his DeepSeek key and Google
 * TTS quota as a free public API. The rate limit is what bounds that, and it
 * needs no cost estimate to work.
 *
 * Net: 1 command on the steady path (the INCR), plus one EXPIRE the first time
 * an instance sees a window key. Down from six.
 */

/** TTL memo: a window-scoped key only needs its expiry set on first write, so
 *  re-sending EXPIRE on every call was pure spend. Per-instance and bounded. */
const ttlSeen = new Set<string>();
const TTL_MEMO_MAX = 5_000;
function rememberTtl(key: string): void {
  if (ttlSeen.size > TTL_MEMO_MAX) ttlSeen.clear();
  ttlSeen.add(key);
}

/**
 * Per-instance backstop for when the shared counter is UNREACHABLE.
 *
 * Fail-open stays the rule on a KV error, deliberately: refusing every request
 * while Upstash is capped would take the coach and voice down for paying
 * customers, which is worse than an unthrottled endpoint. But "fail open" used
 * to mean "no limit at all", so a scraper during an outage was unbounded. This
 * applies the same per-IP window in memory.
 *
 * It is weaker than the shared counter (a lambda instance is short-lived, and a
 * caller spread across instances gets a fresh window on each), so it is a floor,
 * never a replacement.
 */
const backstop = new Map<string, { window: number; count: number }>();
const BACKSTOP_MAX_IPS = 10_000;

function localBackstop(kind: GuardKind, ip: string): GuardResult {
  const lim = limitFor(kind);
  const window = Math.floor(Date.now() / 1000 / lim.windowSec);
  const key = `${kind}:${ip}`;
  const prev = backstop.get(key);
  const rec = prev && prev.window === window ? prev : { window, count: 0 };
  rec.count += 1;
  if (backstop.size > BACKSTOP_MAX_IPS) backstop.clear();
  backstop.set(key, rec);
  if (rec.count > lim.maxPerWindow) {
    return { allowed: false, reason: 'rate-limit', retryAfterSec: lim.windowSec };
  }
  return { allowed: true };
}

/** The shared counter answered, so it is authoritative — drop the local tally so
 *  a past outage can't keep counting against an IP. */
function resetBackstop(kind: GuardKind, ip: string): void {
  backstop.delete(`${kind}:${ip}`);
}

export async function checkUsageGuard(kind: GuardKind, req: Request): Promise<GuardResult> {
  const creds = kvCreds();
  if (!creds.url || !creds.token) return { allowed: true }; // not provisioned → no-op

  const ip = clientIp(req);
  const lim = limitFor(kind);
  const rlKey = `rl:${kind}:${ip}:${Math.floor(Date.now() / 1000 / lim.windowSec)}`;

  const cmds: (string | number)[][] = [['INCR', rlKey]];
  if (!ttlSeen.has(rlKey)) cmds.push(['EXPIRE', rlKey, lim.windowSec]);

  const res = await kvPipeline(creds, cmds);
  if (!res) return localBackstop(kind, ip); // KV down → bounded fail-open

  rememberTtl(rlKey);
  resetBackstop(kind, ip);

  const ipCount = Number(res[0] ?? 0);
  if (Number.isFinite(ipCount) && ipCount > lim.maxPerWindow) {
    return { allowed: false, reason: 'rate-limit', retryAfterSec: lim.windowSec };
  }
  return { allowed: true };
}

/**
 * Flat conservative $ estimate for one LLM call (a heavy full-context turn).
 * DeepSeek-only (David 2026-06-28: Anthropic dropped). DeepSeek is ~$0.27/M
 * input + $1.10/M output, so a heavy full-context turn lands near $0.001 — the
 * old $0.005 default was an Anthropic-blended figure that over-counted spend
 * ~5× and tripped the daily ceiling far too early for paying users. Override
 * with env LLM_CALL_COST_USD if the model/pricing changes.
 */
export const LLM_CALL_COST_USD = Number(process.env.LLM_CALL_COST_USD ?? '0.001');

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
