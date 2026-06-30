/**
 * /api/monitor — Vercel-native synthetic health + spend + error monitor.
 *
 * A Vercel cron (vercel.json `crons`) hits this every 10 min. It runs WHERE
 * the secrets already live (no GitHub Actions secret), and persists to ONE
 * durable Vercel Blob object (read-modify-write per run, Redis-rate-limited so
 * an unauth trigger can't be spammed into blob ops — CLAUDE.md: a per-event
 * Blob tier once hit 79K ops and paused the account).
 *
 * Covers (David 2026-06-30, "add all"):
 *  - HEALTH (#2): synthetic probes of the fragile/expensive surfaces BEFORE a
 *    tester hits them — /api/tts must return a VALID MP3 (ID3 + >=2KB +
 *    audio/mpeg; catches a Polly outage / credential expiry), /api/audit-stream
 *    must answer 200 with storage=redis (catches the preview-aliased-to-prod
 *    misconfig that drops the secret), /api/ping liveness.
 *  - SPEND (#3): reads usageGuard's global daily spend counter (`spend:<day>`
 *    KV key) and reports it vs LLM_DAILY_USD_CEILING — early warning before the
 *    429 ceiling blackout or a surprise bill (esp. the coming Polly free-tier
 *    cliff, when POLLY_USD_PER_CHAR flips on).
 *  - ERRORS (#5): snapshots NEW error-class audit events from the audit-stream
 *    Redis list into the durable Blob, so they survive the 24h Redis TTL and a
 *    deploy, independent of client analytics opt-in.
 *
 * New health failures + spend warnings are also mirrored to PostHog (best
 * effort) so they land in the analytics David already queries.
 *
 * Invocation:
 *  - Vercel Cron (unauthenticated) → run the probes, persist, return a summary
 *    (no sensitive payload).
 *  - GET with `x-audit-secret: <AUDIT_STREAM_SECRET>` → also return the full
 *    state (health detail + recent errors) for inspection.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';

const BASE = 'https://chess-academy-pro.vercel.app';
const BLOB_PATH = 'monitor/state.json';
const RATE_LIMIT_MS = 5 * 60_000;
const LASTRUN_KEY = 'monitor:lastrun';
const MAX_ERRORS = 300;
const SPEND_WARN_FRACTION = 0.6; // warn when the day's spend crosses 60% of ceiling

interface AuditEntry {
  timestamp: number;
  kind: string;
  category: string;
  summary: string;
  source: string;
  route?: string;
  details?: string;
}
interface HealthCheck {
  name: string;
  ok: boolean;
  detail: string;
}
interface MonitorState {
  lastRun: number;
  health: HealthCheck[];
  spend: { day: string; usd: number; ceiling: number; fraction: number; warn: boolean };
  errorCursor: number;
  recentErrors: AuditEntry[];
}

const ERROR_KIND_RE = /fail|error|fallover|fallback|crash|stalled|trip|desync|illegal|empty-state|uncaught|unhandled/i;
function isErrorClass(e: AuditEntry): boolean {
  return e.category === 'error' || ERROR_KIND_RE.test(e.kind);
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  if (!url || !token) return null;
  return { url, token };
}

async function getRedis() {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  const { Redis } = await import('@upstash/redis');
  return new Redis(cfg);
}

async function claimRateLimit(now: number): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return true;
  const last = await redis.get<number>(LASTRUN_KEY);
  if (typeof last === 'number' && now - last < RATE_LIMIT_MS) return false;
  await redis.set(LASTRUN_KEY, now, { ex: 86_400 });
  return true;
}

/** Inspect MP3 bytes the way the iOS player does — names a bad body. */
function mp3Verdict(buf: ArrayBuffer, contentType: string | null): { ok: boolean; detail: string } {
  const head = new Uint8Array(buf.slice(0, 4));
  const isId3 = head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33;
  const isSync = head[0] === 0xff && (head[1] & 0xe0) === 0xe0;
  const header = isId3 ? 'id3' : isSync ? 'mpeg-sync' : 'INVALID';
  const ok = (isId3 || isSync) && buf.byteLength >= 2048 && (contentType ?? '').includes('audio');
  return { ok, detail: `${buf.byteLength}B hdr=${header} ct=${contentType ?? 'none'}` };
}

async function probeTts(): Promise<HealthCheck> {
  try {
    // No Origin header → server-to-server; /api/tts allows it (isOriginAllowed).
    // "." is the cheap warmup text — negligible Polly free-tier spend.
    const r = await fetch(`${BASE}/api/tts?text=.&voice=ruth&ssml=1`, { cache: 'no-store' });
    if (!r.ok) {
      const awsErr = r.headers.get('x-tts-error-name');
      return { name: 'tts', ok: false, detail: `HTTP ${r.status}${awsErr ? ` aws=${awsErr}` : ''}` };
    }
    const buf = await r.arrayBuffer();
    const v = mp3Verdict(buf, r.headers.get('content-type'));
    return { name: 'tts', ok: v.ok, detail: v.detail };
  } catch (e) {
    return { name: 'tts', ok: false, detail: `threw: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function probeAuditStream(): Promise<HealthCheck> {
  const secret = process.env.AUDIT_STREAM_SECRET ?? '';
  try {
    const since = Date.now() - 60_000;
    const r = await fetch(`${BASE}/api/audit-stream?since=${since}`, {
      headers: { 'x-audit-secret': secret },
      cache: 'no-store',
    });
    if (!r.ok) return { name: 'audit-stream', ok: false, detail: `HTTP ${r.status}` };
    const j = (await r.json()) as { storage?: string };
    const ok = j.storage === 'redis';
    return { name: 'audit-stream', ok, detail: `storage=${j.storage ?? '?'}` };
  } catch (e) {
    return { name: 'audit-stream', ok: false, detail: `threw: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function probePing(): Promise<HealthCheck> {
  try {
    const r = await fetch(`${BASE}/api/ping`, { cache: 'no-store' });
    return { name: 'ping', ok: r.ok, detail: `HTTP ${r.status}` };
  } catch (e) {
    return { name: 'ping', ok: false, detail: `threw: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function readSpend(): Promise<{ day: string; usd: number; ceiling: number; fraction: number; warn: boolean }> {
  const day = new Date().toISOString().slice(0, 10);
  const ceiling = Number(process.env.LLM_DAILY_USD_CEILING ?? '25');
  let usd = 0;
  try {
    const redis = await getRedis();
    if (redis) usd = Number(await redis.get<string>(`spend:${day}`)) || 0;
  } catch {
    /* fail-open: spend unknown */
  }
  const fraction = ceiling > 0 ? usd / ceiling : 0;
  return { day, usd, ceiling, fraction, warn: fraction >= SPEND_WARN_FRACTION };
}

async function readErrorsSince(cursor: number): Promise<AuditEntry[]> {
  const redis = await getRedis();
  if (!redis) return [];
  const raw = await redis.lrange('audit-stream', 0, -1);
  return raw
    .map((item) => {
      if (typeof item === 'object' && item !== null) return item as AuditEntry;
      if (typeof item === 'string') {
        try {
          return JSON.parse(item) as AuditEntry;
        } catch {
          return null;
        }
      }
      return null;
    })
    .filter(
      (e): e is AuditEntry =>
        e !== null && typeof e.timestamp === 'number' && e.timestamp > cursor && isErrorClass(e),
    );
}

async function readState(): Promise<MonitorState> {
  const fresh: MonitorState = {
    lastRun: 0,
    health: [],
    spend: { day: '', usd: 0, ceiling: 0, fraction: 0, warn: false },
    errorCursor: 0,
    recentErrors: [],
  };
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, { cache: 'no-store' });
      if (res.ok) return { ...fresh, ...((await res.json()) as Partial<MonitorState>) };
    }
  } catch {
    /* first run */
  }
  return fresh;
}

async function writeState(state: MonitorState): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(state), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/** Best-effort PostHog event so a new health failure / spend warning lands in
 *  the analytics David already queries. Never throws. */
async function mirrorToPostHog(event: string, properties: Record<string, unknown>): Promise<void> {
  const key = process.env.VITE_POSTHOG_KEY;
  if (!key) return;
  const host = (process.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: key, event, distinct_id: 'server-monitor', properties }),
    });
  } catch {
    /* best effort */
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-audit-secret');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const expected = process.env.AUDIT_STREAM_SECRET;
  const authed = Boolean(expected) && req.headers['x-audit-secret'] === expected;
  const now = Date.now();

  let ran = false;
  let state: MonitorState;
  try {
    if (await claimRateLimit(now)) {
      ran = true;
      state = await readState();
      const [tts, stream, ping] = await Promise.all([probeTts(), probeAuditStream(), probePing()]);
      const health = [tts, stream, ping];
      const spend = await readSpend();
      const fresh = await readErrorsSince(state.errorCursor);
      const cursor = fresh.length
        ? Math.max(state.errorCursor, ...fresh.map((e) => e.timestamp))
        : state.errorCursor;
      const recentErrors = [...state.recentErrors, ...fresh].slice(-MAX_ERRORS);

      // Alert on NEW health failures (a check that flipped ok→failing this run).
      for (const c of health) {
        const prev = state.health.find((h) => h.name === c.name);
        if (!c.ok && (!prev || prev.ok)) {
          await mirrorToPostHog('monitor_health_failed', { check: c.name, detail: c.detail });
        }
      }
      if (spend.warn && !state.spend.warn) {
        await mirrorToPostHog('monitor_spend_warning', {
          day: spend.day, usd: spend.usd, ceiling: spend.ceiling, fraction: spend.fraction,
        });
      }

      state = { lastRun: now, health, spend, errorCursor: cursor, recentErrors };
      await writeState(state);
    } else {
      state = await readState();
    }
  } catch (err) {
    res.status(500).json({ error: 'monitor failed', detail: err instanceof Error ? err.message : String(err) });
    return;
  }

  const healthOk = state.health.every((h) => h.ok);
  const payload: Record<string, unknown> = {
    ok: true,
    ran,
    healthOk,
    health: state.health.map((h) => ({ name: h.name, ok: h.ok })),
    spend: { usd: state.spend.usd, ceiling: state.spend.ceiling, warn: state.spend.warn },
    errorCount: state.recentErrors.length,
  };
  if (authed) {
    payload.healthDetail = state.health;
    payload.recentErrors = state.recentErrors.slice(-50);
    payload.lastRun = state.lastRun;
  }
  res.status(200).json(payload);
}
