#!/usr/bin/env node
// Enable the Push Notifications capability on the app's bundle id in the
// Apple Developer portal, through the App Store Connect API (David 2026-11-25).
//
// The app now carries the aps-environment entitlement
// (scripts/ios-push-entitlements.mjs). A provisioning profile only includes
// push when its App ID has the capability; Xcode Cloud's automatic signing
// regenerates profiles from the App ID, so once this runs the next build is
// signed for push. Idempotent: a bundle id that already has it is left alone.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID.
// DRY_RUN=1 reports what it would do and changes nothing.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const DRY = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
function loadKey() { let p = req('ASC_KEY_P8'); if (!p.includes('BEGIN')) p = Buffer.from(p, 'base64').toString('utf8'); return createPrivateKey({ key: p, format: 'pem' }); }
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
  const res = await fetch(`${ASC}${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${t}`);
  return t ? JSON.parse(t) : {};
}

async function main() {
  // filter[identifier] is a prefix match — pick the exact one.
  const list = await api('GET', `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&limit=50`);
  const bundle = (list.data || []).find((b) => b.attributes?.identifier === BUNDLE_ID);
  if (!bundle) throw new Error(`bundle id ${BUNDLE_ID} not found in the developer portal`);
  console.log(`bundleId ${BUNDLE_ID} = ${bundle.id} (${bundle.attributes?.platform})`);

  const caps = await api('GET', `/v1/bundleIds/${bundle.id}/bundleIdCapabilities`);
  const types = (caps.data || []).map((c) => c.attributes?.capabilityType);
  console.log(`capabilities now: ${types.join(', ') || '(none)'}`);
  if (types.includes('PUSH_NOTIFICATIONS')) {
    console.log('✅ PUSH_NOTIFICATIONS already enabled — nothing to do.');
    return;
  }
  if (DRY) {
    console.log('DRY_RUN — would enable PUSH_NOTIFICATIONS. Nothing changed.');
    return;
  }
  await api('POST', '/v1/bundleIdCapabilities', {
    data: {
      type: 'bundleIdCapabilities',
      attributes: { capabilityType: 'PUSH_NOTIFICATIONS' },
      relationships: { bundleId: { data: { type: 'bundleIds', id: bundle.id } } },
    },
  });
  console.log('✅ PUSH_NOTIFICATIONS enabled. The next Xcode Cloud build signs with a push-capable profile.');
}
main().catch((e) => { console.error('\n❌ asc-push-capability failed:\n', e.message); process.exit(1); });
