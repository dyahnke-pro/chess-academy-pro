#!/usr/bin/env node
// Upload App Preview videos to App Store Connect via the ASC API directly.
//
// fastlane `deliver` silently drops app-preview videos (fastlane#15755 /
// #14589) — it only ships screenshots. This script does the real ASC flow:
//   reserve (POST appPreviews) → chunked PUT to the pre-signed uploadOperations
//   → commit (PATCH uploaded:true + md5) → poll assetDeliveryState until COMPLETE
//   → order the set.
//
// Auth: ASC API key (ES256 JWT). Env:
//   ASC_KEY_P8           — PKCS#8 .p8 PEM contents (or base64 of it)
//   ASC_KEY_ID           — key id (kid)
//   ASC_ISSUER_ID        — issuer id
//   APP_BUNDLE_ID        — e.g. com.chessacademy.pro
//   APP_VERSION          — e.g. 2.8
//   PREVIEW_LOCALE       — default en-US
//   PREVIEW_TYPE         — default IPHONE_67 (886x1920 set)
//   PREVIEW_DIR          — default fastlane/screenshots/en-US
//
// Files matching IPHONE_67_*.mov in PREVIEW_DIR are uploaded in filename order.
// Existing previews in the target set are deleted first so re-runs are clean.

import { createHash, createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ASC = 'https://api.appstoreconnect.apple.com';

const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.0';
const LOCALE = process.env.PREVIEW_LOCALE || 'en-US';
const PREVIEW_TYPE = process.env.PREVIEW_TYPE || 'IPHONE_67';
const PREVIEW_DIR = process.env.PREVIEW_DIR || 'fastlane/screenshots/en-US';

function req(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function loadPrivateKey() {
  let pem = req('ASC_KEY_P8');
  if (!pem.includes('BEGIN')) pem = Buffer.from(pem, 'base64').toString('utf8');
  return createPrivateKey({ key: pem, format: 'pem' });
}
const PRIVATE_KEY = loadPrivateKey();

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function jwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  // ES256 needs the raw r||s (IEEE P1363) signature, not DER.
  const sig = cryptoSign('sha256', Buffer.from(signingInput), { key: PRIVATE_KEY, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${b64url(sig)}`;
}

async function api(method, path, body) {
  const url = path.startsWith('http') ? path : `${ASC}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${jwt()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}\n${text}`);
  }
  return text ? JSON.parse(text) : {};
}

async function findApp() {
  const r = await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`);
  if (!r.data?.length) throw new Error(`No app for bundleId ${BUNDLE_ID}`);
  return r.data[0].id;
}

async function findVersion(appId) {
  // Editable iOS version matching VERSION.
  const r = await api('GET', `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=20`);
  const v = (r.data || []).find((x) => x.attributes?.versionString === VERSION);
  if (!v) throw new Error(`No iOS appStoreVersion ${VERSION} (found: ${(r.data || []).map((x) => x.attributes?.versionString).join(', ')})`);
  return v.id;
}

async function findLocalization(versionId) {
  const r = await api('GET', `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`);
  const loc = (r.data || []).find((x) => x.attributes?.locale === LOCALE);
  if (!loc) throw new Error(`No localization ${LOCALE}`);
  return loc.id;
}

async function getOrCreatePreviewSet(locId) {
  const r = await api('GET', `/v1/appStoreVersionLocalizations/${locId}/appPreviewSets?limit=50`);
  const existing = (r.data || []).find((x) => x.attributes?.previewType === PREVIEW_TYPE);
  if (existing) return existing.id;
  const created = await api('POST', '/v1/appPreviewSets', {
    data: {
      type: 'appPreviewSets',
      attributes: { previewType: PREVIEW_TYPE },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: locId } } },
    },
  });
  return created.data.id;
}

async function clearSet(setId) {
  const r = await api('GET', `/v1/appPreviewSets/${setId}/appPreviews?limit=50`);
  for (const p of r.data || []) {
    await api('DELETE', `/v1/appPreviews/${p.id}`);
    console.log(`  deleted existing preview ${p.id}`);
  }
}

async function uploadOne(setId, filePath, fileName) {
  const bytes = readFileSync(filePath);
  const md5 = createHash('md5').update(bytes).digest('hex');

  // 1. Reserve.
  const reserved = await api('POST', '/v1/appPreviews', {
    data: {
      type: 'appPreviews',
      attributes: { fileSize: bytes.length, fileName, mimeType: 'video/quicktime' },
      relationships: { appPreviewSet: { data: { type: 'appPreviewSets', id: setId } } },
    },
  });
  const previewId = reserved.data.id;
  const ops = reserved.data.attributes.uploadOperations || [];
  if (!ops.length) throw new Error(`No uploadOperations returned for ${fileName}`);

  // 2. Chunked PUT to the pre-signed URLs.
  for (const op of ops) {
    const chunk = bytes.subarray(op.offset, op.offset + op.length);
    const headers = {};
    for (const h of op.requestHeaders || []) headers[h.name] = h.value;
    const put = await fetch(op.url, { method: op.method || 'PUT', headers, body: chunk });
    if (!put.ok) throw new Error(`chunk PUT ${op.offset}+${op.length} → ${put.status} ${await put.text()}`);
  }

  // 3. Commit.
  await api('PATCH', `/v1/appPreviews/${previewId}`, {
    data: { type: 'appPreviews', id: previewId, attributes: { uploaded: true, sourceFileChecksum: md5 } },
  });

  // 4. Poll asset processing.
  const deadline = Date.now() + 5 * 60 * 1000;
  for (;;) {
    const r = await api('GET', `/v1/appPreviews/${previewId}`);
    const state = r.data.attributes?.assetDeliveryState?.state;
    if (state === 'COMPLETE') {
      console.log(`  ✓ ${fileName} processed (preview ${previewId})`);
      return previewId;
    }
    if (state === 'FAILED' || r.data.attributes?.assetDeliveryState?.errors?.length) {
      throw new Error(`${fileName} processing failed: ${JSON.stringify(r.data.attributes?.assetDeliveryState)}`);
    }
    if (Date.now() > deadline) throw new Error(`${fileName} processing timed out (last state ${state})`);
    await new Promise((res) => setTimeout(res, 5000));
  }
}

async function orderSet(setId, orderedIds) {
  await api('PATCH', `/v1/appPreviewSets/${setId}/relationships/appPreviews`, {
    data: orderedIds.map((id) => ({ type: 'appPreviews', id })),
  });
}

async function main() {
  const files = readdirSync(PREVIEW_DIR)
    .filter((f) => f.startsWith(`${PREVIEW_TYPE}_`) && /\.(mov|m4v|mp4)$/i.test(f))
    .sort();
  if (!files.length) throw new Error(`No ${PREVIEW_TYPE}_*.mov in ${PREVIEW_DIR}`);
  console.log(`Previews to upload (in order): ${files.join(', ')}`);

  const appId = await findApp();
  const versionId = await findVersion(appId);
  const locId = await findLocalization(versionId);
  const setId = await getOrCreatePreviewSet(locId);
  console.log(`app=${appId} version=${versionId} loc=${locId} set=${setId}`);

  await clearSet(setId);

  const ids = [];
  for (const f of files) {
    console.log(`Uploading ${f}…`);
    ids.push(await uploadOne(setId, join(PREVIEW_DIR, f), f));
  }
  await orderSet(setId, ids);
  console.log(`\n✅ Uploaded ${ids.length} app previews to ${PREVIEW_TYPE} / ${LOCALE} for v${VERSION}.`);
}

main().catch((e) => {
  console.error('\n❌ App preview upload failed:\n', e.message);
  process.exit(1);
});
