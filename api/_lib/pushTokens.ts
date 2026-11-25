/**
 * The push-token book: one APNs token per device id, in the same Upstash store
 * as the bell (msg:*). One SET per registration, one GET per push.
 *
 * Callers own the audit-traffic check (api/push-register.ts refuses audit
 * pages before reaching here; the devReply that sends is admin-only), so this
 * helper never sees a headless boot.
 */
import { pushToToken, apnsConfigFromEnv, type ApnsEnvironment, type PushAlert, type PushOutcome, type Http2Connect } from './apns.js';

export interface PushTokenRecord {
  token: string;
  environment: ApnsEnvironment;
  platform: 'ios';
  ts: number;
}

const KEY = (device: string): string => `push:device:${device}`;

export interface TokenStore {
  get(device: string): Promise<PushTokenRecord | null>;
  set(device: string, rec: PushTokenRecord): Promise<void>;
  del(device: string): Promise<void>;
}

const mem = new Map<string, PushTokenRecord>();

export function memTokenStore(): TokenStore {
  return {
    async get(d) { return mem.get(d) ?? null; },
    async set(d, r) { mem.set(d, r); },
    async del(d) { mem.delete(d); },
  };
}

export async function getTokenStore(): Promise<TokenStore> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  if (!url || !token) return memTokenStore();
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({ url, token });
    return {
      async get(d) {
        const raw = await redis.get<PushTokenRecord | string>(KEY(d));
        if (!raw) return null;
        return typeof raw === 'string' ? (JSON.parse(raw) as PushTokenRecord) : raw;
      },
      async set(d, r) { await redis.set(KEY(d), JSON.stringify(r)); },
      async del(d) { await redis.del(KEY(d)); },
    };
  } catch {
    return memTokenStore();
  }
}

/** An APNs device token is hex (64 today; Apple allows it to grow). */
export function safeApnsToken(s: unknown): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim().toLowerCase();
  return /^[0-9a-f]{64,200}$/.test(t) ? t : null;
}

export type DeviceNotifyOutcome = PushOutcome | { sent: false; why: 'no-token' };

/**
 * Push to whatever token this device last registered. Never throws. A dead
 * token is dropped; a token that answered on the other host is re-filed there.
 */
export async function notifyDevice(
  device: string,
  alert: PushAlert,
  deps: { store?: TokenStore; connect?: Http2Connect } = {},
): Promise<DeviceNotifyOutcome> {
  try {
    const store = deps.store ?? (await getTokenStore());
    const rec = await store.get(device);
    if (!rec) return { sent: false, why: 'no-token' };
    const out = await pushToToken({ token: rec.token, environment: rec.environment, alert, cfg: apnsConfigFromEnv() }, deps.connect);
    if (out.sent && out.environment !== rec.environment) await store.set(device, { ...rec, environment: out.environment });
    if (!out.sent && out.why === 'dead-token') await store.del(device);
    return out;
  } catch {
    return { sent: false, why: 'failed' };
  }
}

/** "New message from David" + the first ~100 characters of the reply. PURE. */
export function devReplyAlert(text: string): PushAlert {
  const flat = text.replace(/\s+/g, ' ').trim();
  const body = flat.length > 100 ? `${flat.slice(0, 99).trimEnd()}…` : flat;
  return { title: 'New message from David', body, data: { open: 'bell' }, threadId: 'messages' };
}
