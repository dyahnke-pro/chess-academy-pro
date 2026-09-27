#!/usr/bin/env node
// Flip the OTA delta rollout WITHOUT a deploy.
//
//   node scripts/ci/ota-set-delta-mode.mjs on       # everyone gets deltas
//   node scripts/ci/ota-set-delta-mode.mjs canary   # only OTA_DELTA_DEVICES
//   node scripts/ci/ota-set-delta-mode.mjs off      # whole-zip for everyone
//   node scripts/ci/ota-set-delta-mode.mjs --show   # read the current mode
//
// WHY THIS EXISTS: the rollout switch was originally an env var, and a Vercel
// env var only applies to the NEXT deployment — so "if delta misbehaves, flip
// it back" would really have meant "wait for a build while every device on the
// delta path stays broken". The switch lives in the pointer instead, which is
// plain data read on every update check, so this script's write takes effect on
// the very next check. Shipping behind a canary is only honest if backing out
// is genuinely immediate.
//
// It rewrites ONLY the `delta` field: read-modify-write of the existing pointer,
// so version/url/ordinal/manifestUrl/history/pin are preserved exactly. That
// matters — clobbering `ordinal` here would disarm the forward-only guard.
//
// Env: BLOB_READ_WRITE_TOKEN + UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_*),
// the same credentials publish-ota-bundle.mjs uses. In CI they come from
// `vercel pull`; locally, from .env.local.

const VALID = new Set(['off', 'canary', 'on']);
const arg = (process.argv[2] ?? '').trim().toLowerCase();
const show = arg === '--show' || arg === '';

if (!show && !VALID.has(arg)) {
  console.error(`❌ mode must be one of: ${[...VALID].join(' | ')} (got "${arg}")`);
  process.exit(2);
}

const POINTER_URL =
  process.env.OTA_POINTER_URL ??
  'https://a0td9pnugiojdmfu.public.blob.vercel-storage.com/ota/latest.json';

async function readPointer() {
  const res = await fetch(`${POINTER_URL}?cb=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`pointer unreadable: HTTP ${res.status}`);
  return JSON.parse(await res.text());
}

const pointer = await readPointer();

if (show) {
  console.log(`version   : ${pointer.version}`);
  console.log(`ordinal   : ${pointer.ordinal ?? '(none — forward-only guard NOT armed)'}`);
  console.log(`delta     : ${pointer.delta ?? '(unset → canary)'}`);
  console.log(`pin       : ${pointer.pin ?? '(none)'}`);
  console.log(`manifest  : ${pointer.manifestUrl ?? '(none — whole-zip only)'}`);
  process.exit(0);
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (!blobToken) { console.error('❌ BLOB_READ_WRITE_TOKEN not set'); process.exit(1); }

// BLOB IS AUTHORITATIVE; REDIS IS BEST-EFFORT (corrected 2026-09-27).
// This used to refuse to run without a Redis write, on the grounds that the
// endpoint ranked the two stores and broke ties in Redis's favour. That stopped
// being true on 2026-09-11: `api/ota/manifest.ts` readLatest() reads the Blob
// pointer FIRST and consults Redis ONLY when the Blob read fails. So the Blob
// write is the one that takes effect. The old rule was not just stale but
// harmful: on 2026-09-27 the shared Upstash budget was at its monthly cap
// (500,000/500,000) and the tool could not flip the switch at all.
//
// Redis is still updated when it can be, so the fallback copy agrees; a failed
// Redis write is a warning. (If Blob ever becomes unreadable the endpoint falls
// back to Redis, which may then hold the old mode — the safe direction for
// 'off', and only a missed saving for 'on'.)
const before = pointer.delta ?? '(unset)';
const next = { ...pointer, delta: arg };

const { put } = await import('@vercel/blob');
const written = await put('ota/latest.json', JSON.stringify(next), {
  access: 'public',
  token: blobToken,
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});

if (redisUrl && redisToken) {
  try {
    const { Redis } = await import('@upstash/redis');
    await new Redis({ url: redisUrl, token: redisToken }).set('ota:latest', next);
    console.log('[ota] Redis fallback pointer updated');
  } catch (err) {
    console.warn(`⚠️  Redis fallback NOT updated (${err instanceof Error ? err.message : err}).`);
    console.warn('   The Blob pointer is what the endpoint reads; this only matters if Blob becomes unreadable.');
  }
} else {
  console.warn('⚠️  Redis creds absent — fallback pointer not updated (Blob is authoritative).');
}

console.log(`✅ delta mode ${before} → ${arg} (version ${pointer.version}, ordinal ${pointer.ordinal})`);
console.log(`   ${written.url}`);
console.log('   Takes effect on each device\'s next update check — nothing to deploy.');
