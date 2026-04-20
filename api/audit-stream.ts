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
 * Storage: uses Upstash Redis when `UPSTASH_REDIS_REST_URL` +
 *          `UPSTASH_REDIS_REST_TOKEN` (or the `KV_REST_API_*` vars
 *          Vercel's KV integration used to inject) are configured.
 *          Falls back to an in-memory Map on the function instance
 *          when neither is set — not durable across cold starts but
 *          works for live-watch sessions where events are read within
 *          seconds.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const wroteToRedis = await writeRedis(entry);
    if (!wroteToRedis) {
      inMemoryBuffer.push(entry);
      trimInMemory();
    }
    res.status(200).json({ ok: true, storage: wroteToRedis ? 'redis' : 'memory' });
    return;
  }

  if (req.method === 'GET') {
    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === 'string' ? parseInt(sinceRaw, 10) : 0;
    const redisEntries = await readRedis(since);
    const memEntries = inMemoryBuffer.filter((e) => e.timestamp > since);
    const entries = redisEntries ?? memEntries;
    // Newest last so the caller can use the last timestamp as the next `since`.
    entries.sort((a, b) => a.timestamp - b.timestamp);
    res.status(200).json({
      entries,
      count: entries.length,
      storage: redisEntries ? 'redis' : 'memory',
    });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
