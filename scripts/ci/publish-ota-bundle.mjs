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

const version = (process.argv[2] || execSync('git rev-parse --short HEAD').toString().trim()).replace(/[^A-Za-z0-9._-]/g, '');
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
await redis.set('ota:latest', { version, url });

// Clean up the local zip so it can't leak into an artifact.
try { rmSync(ZIP, { force: true }); } catch { /* ignore */ }
console.log(`✅ [ota] published bundle version=${version}`);
