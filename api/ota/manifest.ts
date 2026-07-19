/**
 * /api/ota/manifest — self-hosted OTA update endpoint (David 2026-07-03).
 *
 * The Capgo capacitor-updater plugin (self-hosted mode, configured in
 * capacitor.config.ts `CapacitorUpdater.updateUrl`) POSTs here on launch with
 * the device's current bundle version. We reply with the latest published web
 * bundle if it differs — the plugin downloads the zip, verifies the checksum,
 * and applies it on the next foreground; a bad bundle auto-reverts because it
 * won't call `notifyAppReady()` in time (see src/main.tsx).
 *
 * The "latest bundle" pointer ({version, url, checksum}) is written to Redis by
 * `scripts/ci/publish-ota-bundle.mjs` on each production web deploy. The bundle
 * zip itself lives in Vercel Blob (public URL).
 *
 * No auth: the response only ever points at a public bundle URL we published —
 * there's nothing sensitive to leak, and the plugin needs an open endpoint.
 *
 * "No update" contract: return HTTP 200 with the SAME version the device
 * reported and an empty url — Capgo treats version-equal as a no-op.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const REDIS_KEY = 'ota:latest';

interface OtaLatest {
  version: string;
  url: string;
  checksum?: string;
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;
  if (!url || !token) return null;
  return { url, token };
}

/** Static mirror of the pointer, written by publish-ota-bundle.mjs alongside
 *  the Redis key. Blob GETs are plain public-URL fetches — no command quota —
 *  so the manifest survives Redis being down or rate-capped (2026-07-19: the
 *  Upstash free tier hit its 500k/month command limit and ~60% of update
 *  checks silently told devices "you're current"; David's phone never got
 *  the OTA). Overridable for a store migration. */
const BLOB_POINTER_URL =
  process.env.OTA_POINTER_URL ??
  'https://a0td9pnugiojdmfu.public.blob.vercel-storage.com/ota/latest.json';

function parsePointer(raw: unknown): OtaLatest | null {
  const parsed = typeof raw === 'string' ? (JSON.parse(raw) as OtaLatest) : (raw as OtaLatest);
  if (!parsed || typeof parsed.version !== 'string' || typeof parsed.url !== 'string') return null;
  return parsed;
}

async function readLatestFromRedis(): Promise<OtaLatest | null> {
  const cfg = getRedisConfig();
  if (!cfg) return null;
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis(cfg);
    const raw = await redis.get<OtaLatest | string>(REDIS_KEY);
    if (!raw) return null;
    return parsePointer(raw);
  } catch {
    return null;
  }
}

async function readLatestFromBlob(): Promise<OtaLatest | null> {
  try {
    const res = await fetch(`${BLOB_POINTER_URL}?cb=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return parsePointer(await res.text());
  } catch {
    return null;
  }
}

async function readLatest(): Promise<OtaLatest | null> {
  return (await readLatestFromRedis()) ?? (await readLatestFromBlob());
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Capgo POSTs; allow GET too for manual inspection.
  const body = (typeof req.body === 'object' && req.body ? req.body : {}) as Record<string, unknown>;
  const currentVersion =
    (typeof body.version_name === 'string' && body.version_name) ||
    (typeof req.query.version === 'string' && req.query.version) ||
    'builtin';

  const latest = await readLatest();

  // Nothing published yet, or store unavailable → tell the device it's current
  // (no update). Safe default: the app keeps running its shipped bundle.
  if (!latest) {
    res.status(200).json({ version: currentVersion, url: '' });
    return;
  }

  // Already on the latest bundle → no-op.
  if (latest.version === currentVersion) {
    res.status(200).json({ version: currentVersion, url: '' });
    return;
  }

  // A newer bundle is available — hand the plugin the download.
  res.status(200).json({
    version: latest.version,
    url: latest.url,
    ...(latest.checksum ? { checksum: latest.checksum } : {}),
  });
}
