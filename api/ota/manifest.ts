/**
 * /api/ota/manifest — self-hosted OTA update endpoint (David 2026-07-03).
 *
 * The Capgo capacitor-updater plugin (self-hosted mode, configured in
 * capacitor.config.ts `CapacitorUpdater.updateUrl`) POSTs here on launch with
 * the device's current bundle version. We reply with the latest published web
 * bundle if it differs — the plugin downloads it, verifies hashes, and applies
 * it on the next foreground; a bad bundle auto-reverts because it won't call
 * `notifyAppReady()` in time (see src/main.tsx).
 *
 * The "latest bundle" pointer is written to Redis + a public Blob mirror by
 * `scripts/ci/publish-ota-bundle.mjs` on each production web deploy.
 *
 * ─── THE 2026-09-03 REBUILD ────────────────────────────────────────────────
 * David: "OTA has never worked." The telemetry disagreed in an instructive
 * way — 60 sessions DID download and commit — but it surfaced three real
 * defects, all of which live in THIS file's response contract:
 *
 * 1. WE REPORTED EVERY NO-OP AS A FAILURE. The old no-update reply was
 *    `{version, url:''}` with no `kind`. The plugin's own source
 *    (CapacitorUpdaterPlugin.swift `normalizedUpdateResponseKind`) maps a
 *    MISSING `kind` to "failed", then fires `downloadFailed` AND a
 *    `download_fail` stat before firing `noNeedUpdate`. That pair — with
 *    version == running — was 72 of the 127 recorded "download failures".
 *    They were never failures; we were generating them. Hence `kind`.
 *
 * 2. IT COULD SERVE AN OLDER BUNDLE. Version comparison was string EQUALITY
 *    only, so a stale pointer happily rolled devices BACKWARD. On 2026-08-31 a
 *    device running d2d10d06 (the Aug 28 release) was handed c02ae379 (Aug 5)
 *    and applied it — which is how devices ended up stranded on the Aug-5
 *    bundle carrying the WASM crash. Now every bundle publishes a monotonic
 *    `ordinal` (commit timestamp) and this endpoint refuses to hand back
 *    anything at or below the ordinal the device already runs. `pin` is the
 *    deliberate-rollback escape hatch.
 *
 * 3. IT RE-SENT 41 MB TO DELIVER A 200 KB FIX. `public/data` alone is 92 MB of
 *    near-immutable reference data. Downloads are foreground-only and restart
 *    from zero, so they had to finish inside one session: sessions where the
 *    download succeeded ran a median 548s, sessions where it failed 240s.
 *    Capgo's delta path (`manifest: ManifestEntry[]`, honoured by the
 *    autoUpdate flow at CapacitorUpdaterPlugin.swift:3747) makes the device
 *    hash what it already has and fetch only what changed.
 *
 * Also fixed here: legacy devices whose builtin version was stamped with a
 * 7-char SHA while we now publish 8 (`f929e5b` vs `f929e5b3`) were being
 * offered a permanent "update" to the same commit — see `canonicalVersion`.
 *
 * No auth: the response only ever points at public bundle URLs we published.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const REDIS_KEY = 'ota:latest';

/** One file of a delta update. Shape fixed by the plugin (ManifestEntry). */
interface ManifestEntry {
  file_name: string;
  file_hash: string;
  download_url: string;
}

interface OtaLatest {
  version: string;
  url: string;
  checksum?: string;
  /** Monotonic rank of this bundle — commit timestamp, epoch seconds. Absent
   *  on pointers written before 2026-09-03; treated as unrankable. */
  ordinal?: number;
  /** Blob URL of the per-file delta manifest for this version. Fetched ONLY
   *  when we actually offer an update, so the common no-op stays one read. */
  manifestUrl?: string;
  /** version → ordinal for recently published bundles, so a device's CURRENT
   *  version can be ranked. Capped by the publisher. */
  history?: Record<string, number>;
  /** Deliberate rollback: serve this exact version and skip the forward-only
   *  guard. Set by hand in the pointer when an OTA needs pulling back. */
  pin?: string | null;
  /** Delta rollout, carried in the POINTER rather than the environment so it
   *  can be changed WITHOUT a redeploy — see `deltaMode`. */
  delta?: DeltaMode;
}

/** Delta rollout: 'off' = always whole-zip, 'canary' = delta only for the
 *  devices listed in OTA_DELTA_DEVICES, 'on' = everyone. Starts at canary
 *  because the delta path cannot be proven from CI — only on a real device —
 *  and a broken delta means a device silently stops updating. */
type DeltaMode = 'off' | 'canary' | 'on';

function asDeltaMode(raw: string | undefined): DeltaMode | null {
  const v = (raw ?? '').trim().toLowerCase();
  return v === 'off' || v === 'on' || v === 'canary' ? v : null;
}

/**
 * THE ROLLOUT SWITCH LIVES IN THE POINTER, NOT THE ENVIRONMENT.
 *
 * A Vercel env var only takes effect on the NEXT deployment, so "if delta
 * misbehaves, flip the env var back" would have meant a redeploy — while every
 * device on the delta path stayed broken for the length of a build. The pointer
 * is plain data, read on every check, so writing one field to it
 * (`scripts/ci/ota-set-delta-mode.mjs`) takes effect on the very next update
 * check with nothing to deploy. That is what makes shipping this behind a
 * canary honest rather than a phrase in a comment.
 *
 * The env var stays as an operator override that outranks the pointer, for the
 * case where the pointer itself is what you distrust.
 */
function deltaMode(pointer: OtaLatest | null): DeltaMode {
  return asDeltaMode(process.env.OTA_DELTA) ?? asDeltaMode(pointer?.delta) ?? 'canary';
}

/** David's own devices (per CLAUDE.md's confirmed list) — the canary cohort. */
const DEFAULT_CANARY_DEVICES = [
  'eb8cc1c1-f377-4e31-94ff-d404a7ce31ae',
  'cd0d0525-259e-4443-93ec-39d98595894f',
  'baabb7eb-7da2-46d9-984e-a130e43c7290',
];

function canaryDevices(): Set<string> {
  const fromEnv = (process.env.OTA_DELTA_DEVICES ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(fromEnv.length > 0 ? fromEnv : DEFAULT_CANARY_DEVICES);
}

function deltaAllowed(deviceId: string, pointer: OtaLatest | null): boolean {
  const mode = deltaMode(pointer);
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return deviceId !== '' && canaryDevices().has(deviceId);
}

/**
 * Collapse the 7-vs-8-char git-SHA split. `git rev-parse --short` obeys
 * core.abbrev (auto), so builds made on different machines stamped the SAME
 * commit as `f929e5b` or `f929e5b3`. Both sides pin --short=8 now, but devices
 * installed before that fix carry a 7-char builtin FOREVER and would otherwise
 * be offered a permanent update to the commit they are already running.
 * Non-SHA versions (`1.0` from an unstamped build, `builtin`) pass through and
 * simply never match — which is correct: they should update.
 */
function canonicalVersion(v: string): string {
  return /^[0-9a-f]{7,40}$/i.test(v) ? v.slice(0, 7).toLowerCase() : v;
}

function sameBundle(a: string, b: string): boolean {
  return canonicalVersion(a) === canonicalVersion(b);
}

/** The blob path convention publish-ota-bundle.mjs writes: one zip per version
 *  under the same store. Falls back to the pointer's url if it isn't parseable,
 *  which at worst means the pin behaves like no pin. */
function bundleUrlFor(pointerUrl: string, version: string): string {
  try {
    return `${new URL(pointerUrl).origin}/ota/bundles/${version}.zip`;
  } catch {
    return pointerUrl;
  }
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
 *  checks silently told devices "you're current"). Overridable for a store
 *  migration. */
const BLOB_POINTER_URL =
  process.env.OTA_POINTER_URL ??
  'https://a0td9pnugiojdmfu.public.blob.vercel-storage.com/ota/latest.json';

function parsePointer(raw: unknown): OtaLatest | null {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const p = parsed as OtaLatest | null;
  if (!p || typeof p.version !== 'string' || typeof p.url !== 'string') return null;
  return p;
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

/**
 * Read both stores and prefer the NEWER one by ordinal.
 *
 * These two can diverge — the publisher writes Redis first and the Blob mirror
 * last, and the Redis write is allowed to fail (2026-07-19: the Upstash free
 * tier hit its monthly command cap and ~60% of update checks silently no-opped).
 * The old code preferred Redis unconditionally, so a stale Redis value would
 * pin every device to an OLD bundle for as long as it persisted — the same
 * rollback failure the ordinal exists to prevent, arriving through the back
 * door. Ranking them costs one extra public-URL GET per check and no extra
 * Redis command.
 */
async function readLatest(): Promise<OtaLatest | null> {
  const [fromRedis, fromBlob] = await Promise.all([readLatestFromRedis(), readLatestFromBlob()]);
  if (!fromRedis) return fromBlob;
  if (!fromBlob) return fromRedis;
  const r = typeof fromRedis.ordinal === 'number' ? fromRedis.ordinal : -1;
  const b = typeof fromBlob.ordinal === 'number' ? fromBlob.ordinal : -1;
  return b > r ? fromBlob : fromRedis;
}

async function readManifest(url: string): Promise<ManifestEntry[] | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (!Array.isArray(json) || json.length === 0) return null;
    const entries = json as ManifestEntry[];
    const ok = entries.every(
      (e) =>
        e &&
        typeof e.file_name === 'string' &&
        typeof e.file_hash === 'string' &&
        typeof e.download_url === 'string',
    );
    return ok ? entries : null;
  } catch {
    return null;
  }
}

/**
 * Forward-only. Returns true when the device already runs something at least as
 * new as `latest`, so handing it `latest` would be a rollback.
 *
 * Ranking needs BOTH ordinals. When the device's version predates the ordinal
 * scheme (or was never stamped) it is unrankable, and we allow the update: the
 * publisher refuses to move the pointer backwards, so `latest` is by
 * construction the newest bundle we have ever published.
 */
function wouldRollBack(latest: OtaLatest, deviceVersion: string): boolean {
  if (typeof latest.ordinal !== 'number') return false;
  const history = latest.history ?? {};
  const key = Object.keys(history).find((v) => sameBundle(v, deviceVersion));
  if (key === undefined) return false;
  const deviceOrdinal = history[key];
  if (typeof deviceOrdinal !== 'number') return false;
  return deviceOrdinal >= latest.ordinal;
}

/** The no-update reply. `kind: 'up_to_date'` is load-bearing — without it the
 *  plugin classifies the response "failed" and emits a phantom downloadFailed
 *  (see note 1 at the top of this file). */
function noUpdate(res: VercelResponse, version: string, why: string): void {
  res.status(200).json({
    version,
    url: '',
    kind: 'up_to_date',
    message: `No new version available (${why})`,
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Capgo POSTs; allow GET too for manual inspection + the audit script.
  const body = (typeof req.body === 'object' && req.body ? req.body : {}) as Record<string, unknown>;
  const currentVersion =
    (typeof body.version_name === 'string' && body.version_name) ||
    (typeof req.query.version === 'string' && req.query.version) ||
    'builtin';
  const deviceId =
    (typeof body.device_id === 'string' && body.device_id) ||
    (typeof req.query.device_id === 'string' && req.query.device_id) ||
    '';

  const latest = await readLatest();

  // Nothing published yet, or both stores unavailable → tell the device it is
  // current. Safe default: it keeps running its shipped bundle.
  if (!latest) {
    noUpdate(res, currentVersion, 'no pointer published');
    return;
  }

  // Deliberate rollback: an operator set `pin` in the pointer. Skips the
  // forward-only guard on purpose — that is the whole point of a pin.
  const pinned = typeof latest.pin === 'string' && latest.pin.length > 0 ? latest.pin : null;
  const targetVersion = pinned ?? latest.version;
  // A pin names a DIFFERENT bundle than the pointer, so it needs that bundle's
  // OWN url — handing back `latest.url` would ship the latest zip under the
  // pinned version's name, which is worse than not rolling back at all. The
  // publisher always writes bundles to ota/bundles/<version>.zip, so the pinned
  // url is derivable from the pointer's own origin.
  const targetUrl = pinned ? bundleUrlFor(latest.url, pinned) : latest.url;

  if (sameBundle(targetVersion, currentVersion)) {
    noUpdate(res, currentVersion, 'already on latest');
    return;
  }

  if (!pinned && wouldRollBack(latest, currentVersion)) {
    noUpdate(res, currentVersion, 'device is newer than published');
    return;
  }

  // A newer bundle is available. Prefer the delta manifest — the plugin hashes
  // what it already has on disk and downloads only the changed files, which is
  // the difference between a 41 MB transfer and a few hundred KB.
  const payload: Record<string, unknown> = { version: targetVersion, url: targetUrl };
  if (latest.checksum) payload.checksum = latest.checksum;

  if (latest.manifestUrl && !pinned && deltaAllowed(deviceId, latest)) {
    const manifest = await readManifest(latest.manifestUrl);
    if (manifest) {
      payload.manifest = manifest;
      // The plugin skips whole-bundle checksum verification when a manifest is
      // present (per-file hashes cover it) — don't send a stale one.
      delete payload.checksum;
    }
  }

  res.status(200).json(payload);
}
