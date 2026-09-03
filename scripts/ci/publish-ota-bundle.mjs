#!/usr/bin/env node
// Publish the built web bundle (dist/) as a self-hosted OTA update for the
// Capgo capacitor-updater plugin (David 2026-07-03).
//
//   1. Zip the CONTENTS of dist/ (index.html at the zip root — Capgo needs the
//      web root, not a nested dist/ folder). This stays the whole-bundle
//      fallback for devices not on the delta path.
//   2. Upload every file CONTENT-ADDRESSED to ota/files/<sha256>, so a file
//      that did not change is already there and is never re-uploaded.
//   3. Write a per-file delta manifest to ota/manifests/<version>.json.
//   4. Move the latest pointer {version, url, ordinal, manifestUrl, history}
//      forward — never backward.
//
// Usage: node scripts/ci/publish-ota-bundle.mjs [version]
//   version defaults to the short git SHA — the SAME value the iOS build stamps
//   as its builtin bundle version (OTA_BUNDLE_VERSION in ci_post_clone.sh), so a
//   fresh install doesn't redundantly re-download the bundle it already shipped.
//
// Env: BLOB_READ_WRITE_TOKEN, and UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_*).
//   OTA_PUBLISH_FORCE=1  bypass the forward-only guard (deliberate rollback).
// Degrades LOUDLY: missing creds → non-zero exit (the deploy step surfaces it),
// never a silent no-op.
//
// ─── WHY THE DELTA + ORDINAL WORK EXISTS (2026-09-03) ──────────────────────
// Two defects this script is the fix for:
//
// ROLLBACK. The pointer had no notion of order, and the endpoint compared
// version strings for equality only — so publishing an older dist rolled every
// auto-updating device BACKWARD. On 2026-08-31 a device on d2d10d06 (the Aug 28
// release) was served c02ae379 (Aug 5) and applied it; that is how devices ended
// up stranded on the Aug-5 bundle carrying the iOS WASM crash. The guard now
// lives HERE, at the write, because a pointer that can only move forward is a
// stronger invariant than an endpoint that tries to detect a bad one.
//
// SIZE. The bundle is ~41 MB zipped, of which ~92 MB raw is public/data —
// openings-masters-db.json (36 MB), saintlouis-teachings.json (24 MB),
// corpus-spoken.json (13 MB) — files that essentially never change. Every update
// re-sent all of it to deliver a ~200 KB code fix, foreground-only, restarting
// from zero on each attempt. Measured: sessions where the download finished ran
// a median 548s; sessions where it failed, 240s. Content-addressing the files
// means the big static data transfers ONCE, ever, and a code change is a few
// hundred KB.

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, rmSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

// 🚨 PIN THE LENGTH. `git rev-parse --short` obeys core.abbrev, which defaults
// to AUTO — git lengthens the SHA whenever 7 characters would be ambiguous in
// that particular object database. Two machines building the SAME COMMIT can
// therefore mint different version strings: PostHog shows f929e5b vs f929e5b3,
// 90c89ee vs 90c89ee5, 7ba2cf9 vs 7ba2cf96 in the wild.
//
// The device compares version STRINGS, so that mismatch reads as "an update is
// available" for the bundle it is already running. --short=8 is explicit and
// stable across machines. (The endpoint ALSO collapses 7-vs-8 now, so legacy
// devices stop seeing a phantom update — but keep the pin: two defences.)
const version = (process.argv[2] || execSync('git rev-parse --short=8 HEAD').toString().trim()).replace(/[^A-Za-z0-9._-]/g, '');
const DIST = 'dist';
const ZIP = `ota-bundle-${version}.zip`;

// Monotonic rank. Commit timestamp (epoch seconds) is stable across machines
// and orders correctly for anything that lands on main.
const ordinal = Number(execSync('git show -s --format=%ct HEAD').toString().trim());
if (!Number.isFinite(ordinal) || ordinal <= 0) {
  console.error('❌ could not read the commit timestamp for the ordinal');
  process.exit(1);
}

if (!existsSync(DIST)) {
  console.error('❌ no dist/ — run `npm run build` first');
  process.exit(1);
}

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (!blobToken) { console.error('❌ BLOB_READ_WRITE_TOKEN not set'); process.exit(1); }
if (!redisUrl || !redisToken) { console.error('❌ Redis (UPSTASH_REDIS_REST_* / KV_REST_API_*) not set'); process.exit(1); }

const POINTER_URL =
  process.env.OTA_POINTER_URL ??
  'https://a0td9pnugiojdmfu.public.blob.vercel-storage.com/ota/latest.json';

const { put } = await import('@vercel/blob');
const { Redis } = await import('@upstash/redis');
const redis = new Redis({ url: redisUrl, token: redisToken });

// ── 0. Read the current pointer, for the forward-only guard + hash reuse ────
async function readCurrentPointer() {
  try {
    const fromRedis = await redis.get('ota:latest');
    if (fromRedis) return typeof fromRedis === 'string' ? JSON.parse(fromRedis) : fromRedis;
  } catch { /* fall through to the blob mirror */ }
  try {
    const res = await fetch(`${POINTER_URL}?cb=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) return JSON.parse(await res.text());
  } catch { /* no pointer yet */ }
  return null;
}

const current = await readCurrentPointer();
const force = process.env.OTA_PUBLISH_FORCE === '1';

// 🔒 FORWARD-ONLY. Refuse to move the pointer to an older commit. This is the
// invariant that makes the endpoint's job easy and that would have prevented
// the Aug-5 rollback outright.
if (current && typeof current.ordinal === 'number' && ordinal <= current.ordinal && !force) {
  console.error(
    `❌ REFUSING to publish ${version} (ordinal ${ordinal}) — the live pointer is ` +
    `${current.version} (ordinal ${current.ordinal}), which is newer or equal.\n` +
    `   Publishing would roll every auto-updating device BACKWARD.\n` +
    `   If this is a deliberate rollback, re-run with OTA_PUBLISH_FORCE=1.`,
  );
  process.exit(1);
}

// ── 1. Zip dist contents (whole-bundle fallback path) ──────────────────────
try { rmSync(ZIP, { force: true }); } catch { /* ignore */ }
execSync(`cd ${DIST} && zip -r -q -X ../${ZIP} .`, { stdio: 'inherit' });
const zipBytes = readFileSync(ZIP);
console.log(`[ota] zipped ${ZIP} — ${(zipBytes.length / 1024 / 1024).toFixed(2)} MB`);

const { url } = await put(`ota/bundles/${version}.zip`, zipBytes, {
  access: 'public',
  token: blobToken,
  contentType: 'application/zip',
  addRandomSuffix: false,
  allowOverwrite: true,
});
console.log(`[ota] uploaded whole bundle → ${url}`);

// ── 2. Per-file manifest, content-addressed ────────────────────────────────
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// SHA-256 hex of the raw file bytes — matches CryptoCipher.calcChecksum in the
// plugin (ios/Sources/CapacitorUpdaterPlugin/CryptoCipher.swift). No brotli:
// a `.br` suffix makes the plugin decompress and changes what is hashed, and
// the win here comes from NOT re-sending unchanged files, not from compression.
function sha256(buf) {
  return createHash('sha256').update(buf).digest('hex');
}

// Hashes we have already uploaded, read from the previous manifest — ONE blob
// read instead of a `head()` per file, which keeps blob ops per deploy in the
// low hundreds. (CLAUDE.md: a per-event blob tier once burned 79K ops against a
// 2K cap and paused the account. Content-addressing + this reuse set is what
// keeps a per-file scheme nowhere near that.)
let knownHashes = new Set();
if (current?.manifestUrl) {
  try {
    const res = await fetch(`${current.manifestUrl}?cb=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const prev = await res.json();
      if (Array.isArray(prev)) knownHashes = new Set(prev.map((e) => e.file_hash));
    }
  } catch { /* first delta publish, or the manifest is gone — upload everything */ }
}

const files = walk(DIST);
const manifest = [];
let uploaded = 0;
let reused = 0;
let uploadedBytes = 0;

for (const full of files) {
  const bytes = readFileSync(full);
  const hash = sha256(bytes);
  const fileName = relative(DIST, full).split(sep).join('/');
  const blobPath = `ota/files/${hash}`;
  const downloadUrl = `${new URL(url).origin}/${blobPath}`;

  if (knownHashes.has(hash)) {
    reused += 1;
  } else {
    await put(blobPath, bytes, {
      access: 'public',
      token: blobToken,
      contentType: 'application/octet-stream',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    knownHashes.add(hash);
    uploaded += 1;
    uploadedBytes += bytes.length;
  }
  manifest.push({ file_name: fileName, file_hash: hash, download_url: downloadUrl });
}

console.log(
  `[ota] delta manifest: ${manifest.length} files — ${uploaded} uploaded ` +
  `(${(uploadedBytes / 1024 / 1024).toFixed(2)} MB), ${reused} reused from the previous bundle`,
);

// ⚠️ FOLLOW-UP, deliberately not done here: `ota/files/` grows forever. Every
// file whose content ever changed leaves a permanent blob (content-addressed, so
// unchanged files never duplicate — but a year of daily deploys still adds up).
// Nothing breaks; it is a storage-count creep, not the per-EVENT write pattern
// that once paused the account. The right fix is a periodic sweep that deletes
// any ota/files/<hash> not referenced by the last N manifests. Do that as its own
// change, with the manifests as the retention roots — never delete opportunistically
// during a publish, or a concurrent device mid-download loses its files.
const manifestBlob = await put(`ota/manifests/${version}.json`, JSON.stringify(manifest), {
  access: 'public',
  token: blobToken,
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});
console.log(`[ota] manifest → ${manifestBlob.url}`);

// ── 3. Move the pointer forward ────────────────────────────────────────────
// history lets the ENDPOINT rank a device's CURRENT version, so it can refuse
// to hand back something the device is already ahead of. Capped so the pointer
// stays small — it is read on every single update check.
const HISTORY_CAP = 200;
const history = { ...(current?.history ?? {}), [version]: ordinal };
const trimmedHistory = Object.fromEntries(
  Object.entries(history)
    .sort((a, b) => b[1] - a[1])
    .slice(0, HISTORY_CAP),
);

const pointer = {
  version,
  url,
  ordinal,
  manifestUrl: manifestBlob.url,
  history: trimmedHistory,
  pin: null,
};

try {
  await redis.set('ota:latest', pointer);
  console.log('[ota] Redis pointer set');
} catch (err) {
  console.warn(`[ota] Redis pointer FAILED (${err instanceof Error ? err.message : err}) — Blob mirror still updates`);
}

// Static Blob mirror of the pointer — the endpoint's quota-proof fallback
// (2026-07-19: the Upstash free tier hit its monthly command cap and ~60% of
// device update checks silently no-opped; a public-URL GET has no quota).
const pointerBlob = await put('ota/latest.json', JSON.stringify(pointer), {
  access: 'public',
  token: blobToken,
  contentType: 'application/json',
  addRandomSuffix: false,
  allowOverwrite: true,
  cacheControlMaxAge: 60,
});
console.log(`[ota] pointer mirror → ${pointerBlob.url}`);

// Clean up the local zip so it can't leak into an artifact.
try { rmSync(ZIP, { force: true }); } catch { /* ignore */ }
console.log(`✅ [ota] published bundle version=${version} ordinal=${ordinal}`);
