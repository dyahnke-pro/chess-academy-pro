#!/usr/bin/env node
// Register the web bundle a NATIVE build ships inside it in the OTA pointer's
// history, so the manifest endpoint can rank it (2026-10-21).
//
// Why: the endpoint's forward-only guard ranks a device's current bundle by
// looking its version up in `history`. Only publish-ota-bundle.mjs wrote that
// history, and OTA publishing is manual, so a bundle shipped inside an Xcode
// Cloud build was never in it. Unrankable, the endpoint assumed the pointer was
// newer: build 206 (4.0.6, bundle 04161413, Oct 18) was handed 0f60df09 (Oct 11)
// and every 4.0.6 phone that applied it ran the older code.
//
// This writes ONLY history[version] = commit timestamp. It never moves the
// pointer's version, url, pin or delta mode.
//
// Usage: node scripts/ci/register-native-bundle.mjs [sha8]   (default: HEAD)
// Env: BLOB_READ_WRITE_TOKEN, UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_*).

import { execSync } from 'node:child_process';

const version = (process.argv[2] || execSync('git rev-parse --short=8 HEAD').toString().trim())
  .replace(/[^0-9a-f]/gi, '')
  .slice(0, 8)
  .toLowerCase();
if (version.length !== 8) {
  console.error(`❌ need an 8-char commit SHA, got '${process.argv[2] ?? ''}'`);
  process.exit(1);
}

let ordinal;
try {
  ordinal = Number(execSync(`git show -s --format=%ct ${version}`).toString().trim());
} catch {
  console.error(`❌ commit ${version} is not in this checkout (fetch more history)`);
  process.exit(1);
}
if (!Number.isFinite(ordinal) || ordinal <= 0) {
  console.error(`❌ could not read the commit timestamp of ${version}`);
  process.exit(1);
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (!blobToken) { console.error('❌ BLOB_READ_WRITE_TOKEN not set'); process.exit(1); }

const POINTER_URL =
  process.env.OTA_POINTER_URL ??
  'https://a0td9pnugiojdmfu.public.blob.vercel-storage.com/ota/latest.json';

const { put } = await import('@vercel/blob');
const redis = redisUrl && redisToken
  ? new (await import('@upstash/redis')).Redis({ url: redisUrl, token: redisToken })
  : null;

// Blob is the authoritative copy (the endpoint reads it first).
const res = await fetch(`${POINTER_URL}?cb=${Date.now()}`, { cache: 'no-store' });
if (!res.ok) {
  console.log(`[ota] no pointer published (${res.status}) — nothing to register against`);
  process.exit(0);
}
const pointer = JSON.parse(await res.text());

if (pointer.history?.[version] === ordinal) {
  console.log(`[ota] ${version} already registered (ordinal ${ordinal})`);
  process.exit(0);
}

const HISTORY_CAP = 200;
const history = Object.fromEntries(
  Object.entries({ ...(pointer.history ?? {}), [version]: ordinal })
    .sort((a, b) => b[1] - a[1])
    .slice(0, HISTORY_CAP),
);
const next = { ...pointer, history };

if (redis) {
  try {
    await redis.set('ota:latest', next);
  } catch (err) {
    console.warn(`[ota] Redis write failed (${err instanceof Error ? err.message : err}) — Blob still updates`);
  }
}
await put('ota/latest.json', JSON.stringify(next), {
  access: 'public',
  token: blobToken,
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});
const behind = typeof pointer.ordinal === 'number' && pointer.ordinal < ordinal;
console.log(
  `✅ [ota] registered native bundle ${version} (ordinal ${ordinal}); pointer stays ${pointer.version}` +
  (behind ? ' — the endpoint will no longer offer it to this build' : ''),
);
