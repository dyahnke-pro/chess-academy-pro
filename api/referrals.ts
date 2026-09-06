/**
 * /api/referrals — free-opening rewards for recruiting a new user (David 2026-09-06).
 *
 * The app has NO login, only an anonymous `device_id`, so a referral can NEVER
 * be confirmed from the recruiter's word. It is confirmed from the NEW user's
 * OWN usage: the recruiter shares a code, the friend enters it on their device,
 * and the reward unlocks for BOTH only after that friend does something real in
 * the app (their first genuine win calls `qualify`). That real-use gate is the
 * whole anti-farm — a reinstall farm would have to actually play through the
 * app on each fresh device for a payoff that only matters behind the native
 * paywall.
 *
 * Credits are the ONE thing that genuinely needs a server: when your recruit
 * qualifies on THEIR device, YOUR device has to learn it earned a credit. The
 * client mirrors `credits` into its local free-tier ledger (max-wins).
 *
 * Storage mirrors api/messages.ts: Upstash Redis (KV_REST_API_*), with an
 * in-memory per-instance fallback for local dev. No per-event object storage.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const CODE_KEY = (code: string): string => `ref:code:${code}`;
const BYDEVICE_KEY = (device: string): string => `ref:bydevice:${device}`;
const CLAIMED_KEY = (device: string): string => `ref:claimed:${device}`;
const CREDITS_KEY = (device: string): string => `ref:credits:${device}`;
const RECRUITS_KEY = (device: string): string => `ref:recruits:${device}`;
const REVIEW_KEY = (device: string): string => `ref:review:${device}`;

interface ClaimRec { referrer: string; ts: number; qualified: boolean }

// ── storage ────────────────────────────────────────────────────────────────
function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  return url && token ? { url, token } : null;
}

const mem = new Map<string, string>();

interface Store {
  get(key: string): Promise<string | null>;
  set(key: string, val: string): Promise<void>;
  setIfAbsent(key: string, val: string): Promise<boolean>;
  incr(key: string): Promise<number>;
}

function memStore(): Store {
  return {
    async get(k) { return mem.has(k) ? mem.get(k)! : null; },
    async set(k, v) { mem.set(k, v); },
    async setIfAbsent(k, v) { if (mem.has(k)) return false; mem.set(k, v); return true; },
    async incr(k) { const n = Number(mem.get(k) ?? '0') + 1; mem.set(k, String(n)); return n; },
  };
}

async function redisStore(cfg: { url: string; token: string }): Promise<Store> {
  const { Redis } = await import('@upstash/redis');
  // automaticDeserialization:false — otherwise Upstash JSON-parses values on
  // read, so a stored JSON string (the claim record) comes back as an OBJECT
  // and our JSON.parse then chokes on "[object Object]". With it off, get()
  // always returns the raw string, matching the in-memory store contract.
  const redis = new Redis({ ...cfg, automaticDeserialization: false });
  return {
    async get(k) { const v = await redis.get<string>(k); return v == null ? null : String(v); },
    async set(k, v) { await redis.set(k, v); },
    async setIfAbsent(k, v) { const r = await redis.set(k, v, { nx: true }); return r === 'OK'; },
    async incr(k) { return await redis.incr(k); },
  };
}

async function getStore(): Promise<Store> {
  const cfg = getRedisConfig();
  if (!cfg) return memStore();
  try { return await redisStore(cfg); } catch { return memStore(); }
}

// ── helpers ──────────────────────────────────────────────────────────────────
/** A device id is caller-supplied; keep it to a safe key shape. */
function safeDevice(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const d = s.trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(d) ? d : null;
}

/** A short, human-typeable code (unambiguous alphabet, no 0/O/1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(): string {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return c;
}
function safeCode(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const c = s.trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(c) ? c : null;
}

/** Get (or issue) this device's stable referral code. */
async function ensureCode(store: Store, device: string): Promise<string> {
  const existing = await store.get(BYDEVICE_KEY(device));
  if (existing) return existing;
  // Issue a fresh code; retry on the rare collision.
  for (let i = 0; i < 6; i++) {
    const code = makeCode();
    if (await store.setIfAbsent(CODE_KEY(code), device)) {
      await store.set(BYDEVICE_KEY(device), code);
      return code;
    }
  }
  // Extremely unlikely — fall back to a device-derived code.
  const fallback = device.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || makeCode();
  await store.set(CODE_KEY(fallback), device);
  await store.set(BYDEVICE_KEY(device), fallback);
  return fallback;
}

async function readInt(store: Store, key: string): Promise<number> {
  const v = await store.get(key);
  return Math.max(0, Number(v ?? '0') || 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  const store = await getStore();

  try {
    if (req.method === 'GET') {
      const device = safeDevice(req.query.device);
      if (!device) { res.status(400).json({ error: 'device required' }); return; }
      const code = await ensureCode(store, device);
      const [credits, recruits, claimedRaw] = await Promise.all([
        readInt(store, CREDITS_KEY(device)),
        readInt(store, RECRUITS_KEY(device)),
        store.get(CLAIMED_KEY(device)),
      ]);
      const claimed = claimedRaw ? (JSON.parse(claimedRaw) as ClaimRec) : null;
      res.status(200).json({ code, credits, recruits, claimed: claimed ? { qualified: claimed.qualified, ts: claimed.ts } : null });
      return;
    }

    if (req.method === 'POST') {
      const body = (typeof req.body === 'object' && req.body) ? req.body as Record<string, unknown> : {};
      const action = typeof body.action === 'string' ? body.action.trim() : '';
      const device = safeDevice(body.device);
      if (!device) { res.status(400).json({ error: 'device required' }); return; }

      if (action === 'claim') {
        const code = safeCode(body.code);
        if (!code) { res.status(400).json({ error: 'bad code' }); return; }
        // Already claimed once (lifetime)?
        if (await store.get(CLAIMED_KEY(device))) { res.status(200).json({ ok: false, reason: 'already-claimed' }); return; }
        const referrer = await store.get(CODE_KEY(code));
        if (!referrer) { res.status(200).json({ ok: false, reason: 'unknown-code' }); return; }
        if (referrer === device) { res.status(200).json({ ok: false, reason: 'own-code' }); return; }
        const rec: ClaimRec = { referrer, ts: Date.now(), qualified: false };
        // NX so a race can't double-claim.
        const wrote = await store.setIfAbsent(CLAIMED_KEY(device), JSON.stringify(rec));
        if (!wrote) { res.status(200).json({ ok: false, reason: 'already-claimed' }); return; }
        res.status(200).json({ ok: true });
        return;
      }

      if (action === 'qualify') {
        const claimedRaw = await store.get(CLAIMED_KEY(device));
        if (!claimedRaw) { res.status(200).json({ ok: true, granted: false, reason: 'no-referral' }); return; }
        const rec = JSON.parse(claimedRaw) as ClaimRec;
        if (rec.qualified) {
          res.status(200).json({ ok: true, granted: false, reason: 'already-qualified', credits: await readInt(store, CREDITS_KEY(device)) });
          return;
        }
        rec.qualified = true;
        await store.set(CLAIMED_KEY(device), JSON.stringify(rec));
        // Credit BOTH sides; +1 recruit for the referrer.
        const [selfCredits] = await Promise.all([
          store.incr(CREDITS_KEY(device)),
          store.incr(CREDITS_KEY(rec.referrer)),
          store.incr(RECRUITS_KEY(rec.referrer)),
        ]);
        res.status(200).json({ ok: true, granted: true, credits: selfCredits });
        return;
      }

      if (action === 'reviewReward') {
        // One-time per device.
        const wrote = await store.setIfAbsent(REVIEW_KEY(device), String(Date.now()));
        if (!wrote) { res.status(200).json({ ok: true, granted: false, reason: 'already-rewarded', credits: await readInt(store, CREDITS_KEY(device)) }); return; }
        const credits = await store.incr(CREDITS_KEY(device));
        res.status(200).json({ ok: true, granted: true, credits });
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
