/**
 * /api/messages — two-way developer ↔ user messages (the Home bell, v2).
 *
 * David 2026-09-06: "send a message to all users… directly reply from within
 * that message thread." One broadcast channel (David → all) + one private 1:1
 * thread per device (user ↔ David).
 *
 * Security: the app has NO login, only an anonymous `device_id`. A device_id in
 * a request is NOT proof of identity, so it can only scope a user to THEIR OWN
 * thread (which is theirs to read/write) — never grant admin. Every ADMIN action
 * (broadcast, reply-as-dev, list all threads) is gated SERVER-SIDE by the
 * `ADMIN_MESSAGE_SECRET` env var via the `x-admin-secret` header. No secret ever
 * ships in the client bundle.
 *
 * Storage mirrors api/audit-stream.ts: Upstash Redis (KV_REST_API_*), with an
 * in-memory per-instance fallback for local dev. Bounded lists, no per-message
 * object storage (the 2026-06-11 blob-ops incident).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  ts: number;
}
export interface ThreadMessage {
  from: 'dev' | 'user';
  body: string;
  ts: number;
}

const BROADCASTS_KEY = 'msg:broadcasts';
const DEVICES_KEY = 'msg:devices';
const threadKey = (device: string): string => `msg:thread:${device}`;

const MAX_BROADCASTS = 100;
const MAX_THREAD = 200;
const MAX_BODY = 4000;
const MAX_TITLE = 120;

// ── storage ────────────────────────────────────────────────────────────────
function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  return url && token ? { url, token } : null;
}

// Per-instance fallback (local dev / nothing configured). Not durable, not shared.
const memBroadcasts: Broadcast[] = [];
const memThreads = new Map<string, ThreadMessage[]>();
const memDevices = new Map<string, number>();

interface Store {
  addBroadcast(b: Broadcast): Promise<void>;
  listBroadcasts(): Promise<Broadcast[]>;
  addThreadMessage(device: string, m: ThreadMessage): Promise<void>;
  listThread(device: string): Promise<ThreadMessage[]>;
  touchDevice(device: string, ts: number): Promise<void>;
  listDevices(limit: number): Promise<string[]>;
}

function memStore(): Store {
  return {
    async addBroadcast(b) { memBroadcasts.push(b); if (memBroadcasts.length > MAX_BROADCASTS) memBroadcasts.splice(0, memBroadcasts.length - MAX_BROADCASTS); },
    async listBroadcasts() { return [...memBroadcasts]; },
    async addThreadMessage(device, m) { const t = memThreads.get(device) ?? []; t.push(m); if (t.length > MAX_THREAD) t.splice(0, t.length - MAX_THREAD); memThreads.set(device, t); },
    async listThread(device) { return [...(memThreads.get(device) ?? [])]; },
    async touchDevice(device, ts) { memDevices.set(device, ts); },
    async listDevices(limit) { return [...memDevices.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map((e) => e[0]); },
  };
}

async function redisStore(cfg: { url: string; token: string }): Promise<Store> {
  const { Redis } = await import('@upstash/redis');
  const redis = new Redis(cfg);
  return {
    async addBroadcast(b) { await redis.rpush(BROADCASTS_KEY, JSON.stringify(b)); await redis.ltrim(BROADCASTS_KEY, -MAX_BROADCASTS, -1); },
    async listBroadcasts() {
      const raw = await redis.lrange(BROADCASTS_KEY, 0, -1);
      return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r) as Broadcast).filter(Boolean);
    },
    async addThreadMessage(device, m) { const k = threadKey(device); await redis.rpush(k, JSON.stringify(m)); await redis.ltrim(k, -MAX_THREAD, -1); },
    async listThread(device) {
      const raw = await redis.lrange(threadKey(device), 0, -1);
      return raw.map((r) => (typeof r === 'string' ? JSON.parse(r) : r) as ThreadMessage).filter(Boolean);
    },
    async touchDevice(device, ts) { await redis.zadd(DEVICES_KEY, { score: ts, member: device }); },
    async listDevices(limit) { return (await redis.zrange<string[]>(DEVICES_KEY, 0, limit - 1, { rev: true })) ?? []; },
  };
}

async function getStore(): Promise<Store> {
  const cfg = getRedisConfig();
  if (!cfg) return memStore();
  try { return await redisStore(cfg); } catch { return memStore(); }
}

// ── helpers ──────────────────────────────────────────────────────────────────
function clean(s: unknown, max: number): string {
  return typeof s === 'string' ? s.trim().slice(0, max) : '';
}
/** A device id is caller-supplied; keep it to a safe key shape. */
function safeDevice(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const d = s.trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(d) ? d : null;
}
function isAdmin(req: VercelRequest): boolean {
  const secret = process.env.ADMIN_MESSAGE_SECRET;
  if (!secret) return false;
  const provided = req.headers['x-admin-secret'];
  return typeof provided === 'string' && provided.length > 0 && provided === secret;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-admin-secret');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const store = await getStore();

  try {
    if (req.method === 'GET') {
      // Admin: list device threads newest-first.
      if (req.query.threads === '1') {
        if (!isAdmin(req)) { res.status(401).json({ error: 'admin only' }); return; }
        const devices = await store.listDevices(200);
        const threads = await Promise.all(devices.map(async (d) => ({ device: d, messages: await store.listThread(d) })));
        res.status(200).json({ threads });
        return;
      }
      // Public, device-scoped: this device's broadcasts + thread.
      const device = safeDevice(req.query.device);
      const broadcasts = await store.listBroadcasts();
      const thread = device ? await store.listThread(device) : [];
      res.status(200).json({ broadcasts, thread });
      return;
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'object' && req.body) ? req.body as Record<string, unknown> : {};
      const action = clean(body.action, 32);

      if (action === 'reply') {
        const device = safeDevice(body.device);
        const text = clean(body.body, MAX_BODY);
        if (!device || !text) { res.status(400).json({ error: 'device + body required' }); return; }
        const ts = Date.now();
        await store.addThreadMessage(device, { from: 'user', body: text, ts });
        await store.touchDevice(device, ts);
        res.status(200).json({ ok: true });
        return;
      }

      if (action === 'broadcast') {
        if (!isAdmin(req)) {
          res.status(process.env.ADMIN_MESSAGE_SECRET ? 401 : 501).json({ error: process.env.ADMIN_MESSAGE_SECRET ? 'admin only' : 'ADMIN_MESSAGE_SECRET not set' });
          return;
        }
        const title = clean(body.title, MAX_TITLE) || 'Message';
        const text = clean(body.body, MAX_BODY);
        if (!text) { res.status(400).json({ error: 'body required' }); return; }
        const b: Broadcast = { id: `b_${Date.now().toString(36)}`, title, body: text, ts: Date.now() };
        await store.addBroadcast(b);
        res.status(200).json({ ok: true, id: b.id });
        return;
      }

      if (action === 'devReply') {
        if (!isAdmin(req)) {
          res.status(process.env.ADMIN_MESSAGE_SECRET ? 401 : 501).json({ error: process.env.ADMIN_MESSAGE_SECRET ? 'admin only' : 'ADMIN_MESSAGE_SECRET not set' });
          return;
        }
        const device = safeDevice(body.device);
        const text = clean(body.body, MAX_BODY);
        if (!device || !text) { res.status(400).json({ error: 'device + body required' }); return; }
        const ts = Date.now();
        await store.addThreadMessage(device, { from: 'dev', body: text, ts });
        await store.touchDevice(device, ts);
        res.status(200).json({ ok: true });
        return;
      }

      res.status(400).json({ error: 'unknown action' });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    res.status(500).json({ error: 'server error', detail: err instanceof Error ? err.message : String(err) });
  }
}
