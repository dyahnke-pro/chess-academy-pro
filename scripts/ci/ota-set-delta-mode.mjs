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

// 🔒 BOTH STORES OR NEITHER. The endpoint ranks Redis and Blob by ordinal and
// breaks a TIE in Redis's favour — and a mode flip does not change the ordinal.
// So a Blob-only write leaves the old mode winning on every check: the tool
// prints success, the pointer visibly changes, and NOTHING happens. That is the
// silent-no-op-reporting-success failure mode, in the one tool whose entire job
// is backing out an incident. Refuse rather than lie.
if (!redisUrl || !redisToken) {
  console.error('❌ Redis creds absent (UPSTASH_REDIS_REST_* / KV_REST_API_*).');
  console.error('   A Blob-only write would NOT take effect: the endpoint breaks an');
  console.error('   ordinal tie in favour of Redis, and a mode flip leaves the ordinal');
  console.error('   unchanged — so the old mode would keep winning while this reported');
  console.error('   success. In CI these come from `vercel pull`; locally, pull them');
  console.error('   from the Vercel project env with VERCEL_TOKEN.');
  process.exit(1);
}

const before = pointer.delta ?? '(unset)';
const next = { ...pointer, delta: arg };

// Redis first, Blob last — the same order publish-ota-bundle.mjs uses, and the
// endpoint prefers whichever holds the higher ordinal, so a half-completed
// write can never serve an older bundle.
try {
  const { Redis } = await import('@upstash/redis');
  await new Redis({ url: redisUrl, token: redisToken }).set('ota:latest', next);
  console.log('[ota] Redis pointer updated');
} catch (err) {
  // Same reasoning as the guard above: a Blob-only write is ineffective, so a
  // failed Redis write must stop the run rather than half-apply the change.
  console.error(`❌ Redis update FAILED (${err instanceof Error ? err.message : err}).`);
  console.error('   Aborting BEFORE the Blob write: a Blob-only change would not take');
  console.error('   effect, and leaving the two stores disagreeing is worse than no change.');
  process.exit(1);
}

const { put } = await import('@vercel/blob');
const written = await put('ota/latest.json', JSON.stringify(next), {
  access: 'public',
  token: blobToken,
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});

console.log(`✅ delta mode ${before} → ${arg} (version ${pointer.version}, ordinal ${pointer.ordinal})`);
console.log(`   ${written.url}`);
console.log('   Takes effect on each device\'s next update check — nothing to deploy.');
