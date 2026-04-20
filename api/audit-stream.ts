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
 * Storage: uses `@vercel/kv` if configured. If KV env vars are
 *          missing we fall through to an in-memory Map on the
 *          function instance — not durable across cold starts but
 *          works for live-watch sessions where events are read
 *          within seconds.
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

// Best-effort in-memory fallback (per function instance) when KV
// isn't configured. The Map is keyed by timestamp+kind for dedup.
const inMemoryBuffer: AuditStreamEntry[] = [];
const MAX_IN_MEMORY = 500;

function trimInMemory(): void {
  if (inMemoryBuffer.length > MAX_IN_MEMORY) {
    inMemoryBuffer.splice(0, inMemoryBuffer.length - MAX_IN_MEMORY);
  }
}

async function readKv(since: number): Promise<AuditStreamEntry[] | null> {
  try {
    const { kv } = await import('@vercel/kv');
    // Entries stored under a single list key. LRANGE gets everything.
    const raw = await kv.lrange<string>('audit-stream', 0, -1);
    const parsed = raw
      .map((s) => {
        try {
          return JSON.parse(s) as AuditStreamEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is AuditStreamEntry => e !== null && e.timestamp > since);
    return parsed;
  } catch {
    return null;
  }
}

async function writeKv(entry: AuditStreamEntry): Promise<boolean> {
  try {
    const { kv } = await import('@vercel/kv');
    await kv.rpush('audit-stream', JSON.stringify(entry));
    // Trim to last 1000 entries so the list doesn't grow unbounded.
    await kv.ltrim('audit-stream', -1000, -1);
    // 24-hour TTL on the whole list.
    await kv.expire('audit-stream', 86_400);
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
    const wroteToKv = await writeKv(entry);
    if (!wroteToKv) {
      inMemoryBuffer.push(entry);
      trimInMemory();
    }
    res.status(200).json({ ok: true, storage: wroteToKv ? 'kv' : 'memory' });
    return;
  }

  if (req.method === 'GET') {
    const sinceRaw = req.query.since;
    const since = typeof sinceRaw === 'string' ? parseInt(sinceRaw, 10) : 0;
    const kvEntries = await readKv(since);
    const memEntries = inMemoryBuffer.filter((e) => e.timestamp > since);
    const entries = kvEntries ?? memEntries;
    // Newest last so the caller can use the last timestamp as the next `since`.
    entries.sort((a, b) => a.timestamp - b.timestamp);
    res.status(200).json({
      entries,
      count: entries.length,
      storage: kvEntries ? 'kv' : 'memory',
    });
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
