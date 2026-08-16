#!/usr/bin/env node
// Publish the built web bundle (dist/) as a self-hosted OTA update for the
// Capgo capacitor-updater plugin (David 2026-07-03).
//
//   1. Zip the CONTENTS of dist/ (index.html at the zip root — Capgo needs the
//      web root, not a nested dist/ folder).
//   2. Upload the zip to Vercel Blob (public, immutable per-version path).
//   3. Write the latest pointer { version, url } to Redis, which /api/ota/manifest
//      hands to devices on their next launch.
//
// Usage: node scripts/ci/publish-ota-bundle.mjs [version]
//   version defaults to the short git SHA — the SAME value the iOS build stamps
//   as its builtin bundle version (OTA_BUNDLE_VERSION in ci_post_clone.sh), so a
//   fresh install doesn't redundantly re-download the bundle it already shipped.
//
// Env: BLOB_READ_WRITE_TOKEN, and UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_*).
// Degrades LOUDLY: missing creds → non-zero exit (the deploy step surfaces it),
// never a silent no-op.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync } from 'node:fs';

// 🚨 PIN THE LENGTH. `git rev-parse --short` obeys core.abbrev, which defaults
// to AUTO — git lengthens the SHA whenever 7 characters would be ambiguous in
// that particular object database. Two machines building the SAME COMMIT can
// therefore mint different version strings: PostHog shows f929e5b vs f929e5b3,
// 90c89ee vs 90c89ee5, 7ba2cf9 vs 7ba2cf96 in the wild.
//
// The device compares version STRINGS, so that mismatch reads as "an update is
// available" for the bundle it is already running — and the blob path is
// `ota/bundles/<version>.zip`, so the URL it then fetches is for a version that
// was never uploaded under that name. 10 `ota_download_failed` across 7 real
// iOS devices in 7 days, with rows where running == updateTo.
//
// --short=8 is explicit and stable across machines. Devices currently on a
// 7-char version take one real update and are then consistent forever.
const version = (process.argv[2] || execSync('git rev-parse --short=8 HEAD').toString().trim()).replace(/[^A-Za-z0-9._-]/g, '');
const DIST = 'dist';
const ZIP = `ota-bundle-${version}.zip`;

if (!existsSync(DIST)) {
  console.error('❌ no dist/ — run `npm run build` first');
  process.exit(1);
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (!blobToken) { console.error('❌ BLOB_READ_WRITE_TOKEN not set'); process.exit(1); }
if (!redisUrl || !redisToken) { console.error('❌ Redis (UPSTASH_REDIS_REST_* / KV_REST_API_*) not set'); process.exit(1); }

// 1. Zip dist contents.
try { rmSync(ZIP, { force: true }); } catch { /* ignore */ }
execSync(`cd ${DIST} && zip -r -q -X ../${ZIP} .`, { stdio: 'inherit' });
const bytes = readFileSync(ZIP);
console.log(`[ota] zipped ${ZIP} — ${(bytes.length / 1024 / 1024).toFixed(2)} MB`);

// 2. Upload to Vercel Blob at a stable per-version path.
const { put } = await import('@vercel/blob');
const { url } = await put(`ota/bundles/${version}.zip`, bytes, {
  access: 'public',
  token: blobToken,
  contentType: 'application/zip',
  addRandomSuffix: false,
  allowOverwrite: true,
});
console.log(`[ota] uploaded → ${url}`);

// 3. Point /api/ota/manifest at it. (No checksum: the plugin then downloads
//    without integrity verification — the bundle is our own HTTPS Blob. A
//    checksum can be added once the round-trip is verified on-device.)
const { Redis } = await import('@upstash/redis');
const redis = new Redis({ url: redisUrl, token: redisToken });
try {
  await redis.set('ota:latest', { version, url });
  console.log('[ota] Redis pointer set');
} catch (err) {
  console.warn(`[ota] Redis pointer FAILED (${err instanceof Error ? err.message : err}) — Blob mirror still updates`);
}

// Static Blob mirror of the pointer — the manifest's quota-proof fallback
// (2026-07-19: the Upstash free tier hit its monthly command cap and ~60% of
// device update checks silently no-opped; a public-URL GET has no quota).
const pointer = await put('ota/latest.json', JSON.stringify({ version, url }), {
  access: 'public',
  token: blobToken,
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});
console.log(`[ota] pointer mirror → ${pointer.url}`);

// Clean up the local zip so it can't leak into an artifact.
try { rmSync(ZIP, { force: true }); } catch { /* ignore */ }
console.log(`✅ [ota] published bundle version=${version}`);
