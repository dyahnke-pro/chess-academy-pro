#!/usr/bin/env node
// Attach the App Review screenshot (the paywall) to each auto-renewable
// subscription via the ASC API. Required for first-time subscription review.
// reserve (POST subscriptionAppStoreReviewScreenshots) → chunked PUT → commit
// (uploaded:true + md5) → poll assetDeliveryState.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID,
//   SCREENSHOT_PATH (default fastlane/review/paywall.png)

import { createHash, createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const SHOT = process.env.SCREENSHOT_PATH || 'fastlane/review/paywall.png';

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function loadKey() {
  let pem = req('ASC_KEY_P8');
  if (!pem.includes('BEGIN')) pem = Buffer.from(pem, 'base64').toString('utf8');
  return createPrivateKey({ key: pem, format: 'pem' });
}
const PK = loadKey();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function jwt() {
  const h = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const p = { iss: ISSUER_ID, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' };
  const si = `${b64url(JSON.stringify(h))}.${b64url(JSON.stringify(p))}`;
  return `${si}.${b64url(cryptoSign('sha256', Buffer.from(si), { key: PK, dsaEncoding: 'ieee-p1363' }))}`;
}
async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${t}`);
  return t ? JSON.parse(t) : {};
}

async function listSubscriptions(appId) {
  const groups = (await api('GET', `/v1/apps/${appId}/subscriptionGroups?limit=50`)).data;
  const subs = [];
  for (const g of groups) {
    const r = (await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)).data;
    for (const s of r) subs.push(s);
  }
  return subs;
}

async function clearScreenshot(subId) {
  try {
    const r = await api('GET', `/v1/subscriptions/${subId}/appStoreReviewScreenshot`);
    if (r.data?.id) {
      await api('DELETE', `/v1/subscriptionAppStoreReviewScreenshots/${r.data.id}`);
      console.log(`    deleted existing screenshot ${r.data.id}`);
    }
  } catch { /* none present */ }
}

async function uploadFor(subId, productId) {
  const bytes = readFileSync(SHOT);
  const fileName = basename(SHOT);
  const md5 = createHash('md5').update(bytes).digest('hex');

  await clearScreenshot(subId);

  const reserved = await api('POST', '/v1/subscriptionAppStoreReviewScreenshots', {
    data: {
      type: 'subscriptionAppStoreReviewScreenshots',
      attributes: { fileName, fileSize: bytes.length },
      relationships: { subscription: { data: { type: 'subscriptions', id: subId } } },
    },
  });
  const id = reserved.data.id;
  for (const op of reserved.data.attributes.uploadOperations || []) {
    const chunk = bytes.subarray(op.offset, op.offset + op.length);
    const headers = {};
    for (const h of op.requestHeaders || []) headers[h.name] = h.value;
    const put = await fetch(op.url, { method: op.method || 'PUT', headers, body: chunk });
    if (!put.ok) throw new Error(`chunk PUT → ${put.status} ${await put.text()}`);
  }
  await api('PATCH', `/v1/subscriptionAppStoreReviewScreenshots/${id}`, {
    data: { type: 'subscriptionAppStoreReviewScreenshots', id, attributes: { uploaded: true, sourceFileChecksum: md5 } },
  });

  const deadline = Date.now() + 4 * 60 * 1000;
  for (;;) {
    const r = await api('GET', `/v1/subscriptionAppStoreReviewScreenshots/${id}`);
    const state = r.data.attributes?.assetDeliveryState?.state;
    if (state === 'COMPLETE') { console.log(`    ✓ ${productId} screenshot processed (${id})`); return; }
    if (state === 'FAILED') throw new Error(`${productId} screenshot failed: ${JSON.stringify(r.data.attributes?.assetDeliveryState)}`);
    if (Date.now() > deadline) throw new Error(`${productId} screenshot timed out (state ${state})`);
    await new Promise((res) => setTimeout(res, 4000));
  }
}

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);
  const subs = await listSubscriptions(app.id);
  if (!subs.length) throw new Error('No subscriptions found');
  console.log(`Subscriptions: ${subs.map((s) => `${s.attributes?.productId}(${s.attributes?.state})`).join(', ')}`);

  for (const s of subs) {
    console.log(`Uploading review screenshot for ${s.attributes?.productId}…`);
    await uploadFor(s.id, s.attributes?.productId || s.id);
  }
  console.log(`\n✅ Attached review screenshot to ${subs.length} subscription(s).`);
}
main().catch((e) => { console.error('\n❌ subscription screenshot upload failed:\n', e.message); process.exit(1); });
