/**
 * /api/voice-failure-watch — Vercel-native voice-failure watcher.
 *
 * WHY THIS EXISTS (David 2026-06-30): the old GitHub-Actions cron
 * (`audit-watch.yml`) pulled prod with `${{ secrets.AUDIT_STREAM_SECRET }}`
 * — a GitHub Actions repo secret that was never synced to the rotated value,
 * so the cron ran green every 10 min doing NOTHING and a live tester's
 * `tts-failure` / `voice-fallover` events raised no alert. The GitHub Actions
 * secrets API is org-policy-blocked through the agent proxy, so that secret
 * can't be fixed from a session. The fix is to run the watcher WHERE the
 * secret already lives — Vercel. This function reads the audit-stream Redis
 * list directly (no secret needed server-side) and snapshots any new voice
 * failures into ONE durable Vercel Blob object, so the history survives the
 * Redis 24h TTL and deploys, and any session can read it back.
 *
 * Invocation:
 *   - Vercel Cron (vercel.json `crons`) hits this path unauthenticated on a
 *     schedule → SNAPSHOT mode: rate-limited (Redis `voice-watch:lastrun`,
 *     5 min) read-modify-write of the single Blob object. Returns counts
 *     only, no event data.
 *   - GET with `x-audit-secret: <AUDIT_STREAM_SECRET>` → also returns the
 *     full durable failure log for inspection.
 *
 * 🔒 BLOB DISCIPLINE (CLAUDE.md): ONE object, read-modify-write per run
 * (~2 ops). NEVER per-event — the per-event Blob tier once cost 79K ops and
 * paused the account. The Redis lastrun gate bounds blob ops even if the
 * unauthenticated trigger is spammed.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list } from '@vercel/blob';

interface AuditEntry {
  timestamp: number;
  kind: string;
  category: string;
  summary: string;
  source: string;
  route?: string;
  // The diagnostic payload — userAgent, error code, srcKind, the failing
  // text, etc. This is what a failure is ROOT-CAUSED from, so the durable
  // log MUST preserve it, not just the one-line summary.
  details?: string;
  fen?: string;
  context?: string;
}

interface WatchState {
  cursor: number;
  updatedAt: number;
  failures: AuditEntry[];
}

const FAILURE_KINDS = new Set([
  'tts-failure',
  'voice-fallover',
  'polly-fallback',
  'mic-start-failed',
]);
const BLOB_PATH = 'voice-failures/state.json';
const MAX_FAILURES = 500; // bound the durable log
const RATE_LIMIT_MS = 5 * 60_000; // min gap between snapshots
const LASTRUN_KEY = 'voice-watch:lastrun';

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  if (!url || !token) return null;
  return { url, token };
}

async function readStreamSince(since: number): Promise<AuditEntry[]> {
  const cfg = getRedisConfig();
  if (!cfg) return [];
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis(cfg);
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
        e !== null && typeof e.timestamp === 'number' && e.timestamp > since,
    );
}

/** Returns true if a snapshot is due (and stamps lastrun), false if throttled. */
async function claimRateLimit(now: number): Promise<boolean> {
  const cfg = getRedisConfig();
  if (!cfg) return true; // no redis → don't block (local dev)
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis(cfg);
  const last = await redis.get<number>(LASTRUN_KEY);
  if (typeof last === 'number' && now - last < RATE_LIMIT_MS) return false;
  await redis.set(LASTRUN_KEY, now, { ex: 86_400 });
  return true;
}

async function readState(): Promise<WatchState> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    if (blobs.length > 0) {
      const res = await fetch(blobs[0].url, { cache: 'no-store' });
      if (res.ok) {
        const parsed = (await res.json()) as Partial<WatchState>;
        return {
          cursor: typeof parsed.cursor === 'number' ? parsed.cursor : 0,
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
          failures: Array.isArray(parsed.failures) ? parsed.failures : [],
        };
      }
    }
  } catch {
    /* first run / transient — start fresh */
  }
  return { cursor: 0, updatedAt: 0, failures: [] };
}

async function writeState(state: WatchState): Promise<void> {
  await put(BLOB_PATH, JSON.stringify(state), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
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
  let newFailures = 0;
  let totalFailures = 0;

  try {
    if (await claimRateLimit(now)) {
      ran = true;
      const state = await readState();
      // ONE stream read per run. Advance the cursor past every seen event so
      // the next run doesn't rescan the same buffer; persist only when it moves.
      const allSince = await readStreamSince(state.cursor);
      const fresh = allSince.filter((e) => FAILURE_KINDS.has(e.kind));
      const maxTs = allSince.length
        ? Math.max(state.cursor, ...allSince.map((e) => e.timestamp))
        : state.cursor;
      if (fresh.length > 0) {
        fresh.sort((a, b) => a.timestamp - b.timestamp);
        const merged = [...state.failures, ...fresh].slice(-MAX_FAILURES);
        await writeState({ cursor: maxTs, updatedAt: now, failures: merged });
        newFailures = fresh.length;
        totalFailures = merged.length;
      } else {
        if (maxTs > state.cursor) {
          await writeState({ cursor: maxTs, updatedAt: now, failures: state.failures });
        }
        totalFailures = state.failures.length;
      }
    } else {
      const state = await readState();
      totalFailures = state.failures.length;
    }
  } catch (err) {
    res.status(500).json({ error: 'watch failed', detail: err instanceof Error ? err.message : String(err) });
    return;
  }

  const payload: Record<string, unknown> = { ok: true, ran, newFailures, totalFailures };
  if (authed) {
    const state = await readState();
    payload.failures = state.failures;
    payload.cursor = state.cursor;
    payload.updatedAt = state.updatedAt;
  }
  res.status(200).json(payload);
}
