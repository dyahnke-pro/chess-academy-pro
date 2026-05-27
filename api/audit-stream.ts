/**
 * /api/audit-stream — real-time audit event sink.
 *
 * POST: client sends an audit entry. Stored in Vercel KV as a
 *       timestamp-keyed list entry with 24h TTL.
 * GET:  query param `since=<ms>` returns all entries with
 *       timestamp > since. Used by Claude to poll for new events
 *       when the user asks for a live-watch session.
 *
 * Auth: shared secret via `x-audit-secret` header. Must match the
 *       `AUDIT_STREAM_SECRET` env var. Missing / wrong secret → 401.
 *       This is a single-user app; we don't need per-user auth, just
 *       a barrier against anonymous spam.
 *
 * Opt-in: the client only streams when localStorage has
 *         `auditStreamSecret` + `auditStreamUrl` set. Default
 *         behaviour is local-only — audit data never leaves the
 *         device unless the user explicitly enables streaming.
 *
 * Storage (first configured tier wins):
 *   1. Upstash Redis — when `UPSTASH_REDIS_REST_URL` +
 *      `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` vars) are set.
 *   2. Vercel Blob — when `BLOB_READ_WRITE_TOKEN` is set. Each event is
 *      one immutable object at `audit/<timestamp>-<rand>.json`; reads
 *      `list()` the prefix, filter by the timestamp embedded in the
 *      pathname, and fetch the matches. Durable across cold starts and
 *      shared across all serverless workers — which the in-memory tier
 *      is NOT (that was the bug: a tester's POST and Claude's GET hit
 *      different workers, so reads came back empty). Old objects (>24h)
 *      are pruned opportunistically on read.
 *   3. In-memory Map — last-resort fallback (local dev / nothing
 *      configured). Per-instance, not durable, not shared.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, list, del } from '@vercel/blob';

interface AuditStreamEntry {
  timestamp: number;
  kind: string;
  category: string;
  summary: string;
  source: string;
  details?: string;
  fen?: string;
  context?: string;
  route?: string;
}

// Best-effort in-memory fallback (per function instance) when Upstash
// isn't configured. The Map is keyed by timestamp+kind for dedup.
const inMemoryBuffer: AuditStreamEntry[] = [];
const MAX_IN_MEMORY = 500;

function trimInMemory(): void {
  if (inMemoryBuffer.length > MAX_IN_MEMORY) {
    inMemoryBuffer.splice(0, inMemoryBuffer.length - MAX_IN_MEMORY);
  }
}

function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  if (!url || !token) return null;
  return { url, token };
}

async function readRedis(since: number): Promise<AuditStreamEntry[] | null> {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis(cfg);
    const raw = await redis.lrange('audit-stream', 0, -1);
    const parsed = raw
      .map((item) => {
        // Upstash returns parsed JSON for JSON-ish strings, raw strings otherwise.
        if (typeof item === 'object' && item !== null) return item as AuditStreamEntry;
        if (typeof item === 'string') {
          try {
            return JSON.parse(item) as AuditStreamEntry;
          } catch {
            return null;
          }
        }
        return null;
      })
      .filter((e): e is AuditStreamEntry => e !== null && typeof e.timestamp === 'number' && e.timestamp > since);
    return parsed;
  } catch {
    return null;
  }
}

async function writeRedis(entry: AuditStreamEntry): Promise<boolean> {
  const cfg = getRedisConfig();
  if (!cfg) return false;
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis(cfg);
    await redis.rpush('audit-stream', JSON.stringify(entry));
    await redis.ltrim('audit-stream', -1000, -1);
    await redis.expire('audit-stream', 86_400);
    return true;
  } catch {
    return false;
  }
}

// ── Vercel Blob tier ──────────────────────────────────────────────
const BLOB_PREFIX = 'audit/';
const BLOB_TTL_MS = 86_400_000; // 24h, matches the Redis tier

function getBlobToken(): string | null {
  return process.env.BLOB_READ_WRITE_TOKEN ?? null;
}

/** Parse the event timestamp out of a blob pathname like
 *  `audit/1779916298005-AbC123.json`. Returns NaN on an unexpected
 *  shape so the caller can skip it. */
function timestampFromPathname(pathname: string): number {
  const file = pathname.split('/').pop() ?? '';
  const lead = file.split('-')[0];
  return Number.parseInt(lead, 10);
}

async function writeBlob(entry: AuditStreamEntry): Promise<boolean> {
  const token = getBlobToken();
  if (!token) return false;
  try {
    await put(`${BLOB_PREFIX}${entry.timestamp}.json`, JSON.stringify(entry), {
      access: 'public',
      token,
      contentType: 'application/json',
      // Unguessable URL per object; the timestamp prefix is preserved
      // for range-filtering on read.
      addRandomSuffix: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function readBlob(since: number): Promise<AuditStreamEntry[] | null> {
  const token = getBlobToken();
  if (!token) return null;
  try {
    // Page through every audit object (list caps at 1000/page).
    const all: { pathname: string; url: string; ts: number }[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const { blobs, hasMore, cursor: next } = await list({ prefix: BLOB_PREFIX, token, cursor, limit: 1000 });
      for (const b of blobs) {
        all.push({ pathname: b.pathname, url: b.url, ts: timestampFromPathname(b.pathname) });
      }
      if (!hasMore) break;
      cursor = next;
    }
    const now = Date.now();
    // Opportunistic prune of expired objects (fire-and-forget).
    const expired = all.filter((b) => Number.isFinite(b.ts) && now - b.ts > BLOB_TTL_MS);
    if (expired.length > 0) {
      void del(expired.map((b) => b.url), { token }).catch(() => undefined);
    }
    // Fetch only the objects newer than `since`.
    const fresh = all.filter((b) => Number.isFinite(b.ts) && b.ts > since);
    const entries = await Promise.all(
      fresh.map(async (b) => {
        try {
          const r = await fetch(b.url);
          if (!r.ok) return null;
          return (await r.json()) as AuditStreamEntry;
        } catch {
          return null;
        }
      }),
    );
    return entries.filter((e): e is AuditStreamEntry => e !== null && typeof e.timestamp === 'number');
  } catch {
    return null;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const secret = req.headers['x-audit-secret'];
  const expected = process.env.AUDIT_STREAM_SECRET;

  if (!expected) {
    res.status(500).json({ error: 'server misconfigured: AUDIT_STREAM_SECRET not set' });
    return;
  }
  if (secret !== expected) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body as Partial<AuditStreamEntry> | undefined;
    if (!body || typeof body.timestamp !== 'number' || typeof body.kind !== 'string') {
      res.status(400).json({ error: 'invalid entry' });
      return;
    }
    const entry: AuditStreamEntry = {
      timestamp: body.timestamp,
      kind: body.kind,
      category: body.category ?? 'unknown',
      summary: body.summary ?? '',
      source: body.source ?? 'unknown',
      details: body.details,
      fen: body.fen,
      context: body.context,
      route: body.route,
    };
    let storage: 'redis' | 'blob' | 'memory';
    if (await writeRedis(entry)) {
      storage = 'redis';
    } else if (await writeBlob(entry)) {
      storage = 'blob';
    } else {
      inMemoryBuffer.push(entry);
      trimInMemory();
      storage = 'memory';
    }
    res.status(200).json({ ok: true, storage });
    return;
  }

  if (req.method === 'GET') {
    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === 'string' ? parseInt(sinceRaw, 10) : 0;
    const redisEntries = await readRedis(since);
    const blobEntries = redisEntries === null ? await readBlob(since) : null;
    const entries =
      redisEntries ?? blobEntries ?? inMemoryBuffer.filter((e) => e.timestamp > since);
    // Newest last so the caller can use the last timestamp as the next `since`.
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const storage = redisEntries ? 'redis' : blobEntries ? 'blob' : 'memory';
    res.status(200).json({
      entries,
      count: entries.length,
      storage,
    });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
