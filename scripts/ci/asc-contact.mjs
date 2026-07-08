#!/usr/bin/env node
// Create/patch the App Review contact + notes (appStoreReviewDetail) via ASC API.
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   CONTACT_FIRST, CONTACT_LAST, CONTACT_PHONE, CONTACT_EMAIL, REVIEW_NOTES.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.0';
const FIRST = process.env.CONTACT_FIRST || 'David';
const LAST = process.env.CONTACT_LAST || 'Yahnke';
const PHONE = process.env.CONTACT_PHONE || '+16305182417';
const EMAIL = process.env.CONTACT_EMAIL || 'dyahnke@gmail.com';
const NOTES = process.env.REVIEW_NOTES ||
  'The app offers a 7-day free trial, then $7.99/month or $79.99/year (auto-renewable). ' +
  'No account or login is required to use the app. To test the subscription: open the app, ' +
  'tap Start Free Trial on the paywall, and confirm with a StoreKit sandbox account. ' +
  'Chess engine analysis runs on-device (Stockfish); the AI coach voice and chat are powered ' +
  'by secure cloud services.';

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
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
async function api(method, path, body, { soft = false } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) { if (soft) return { __error: res.status, __body: t }; throw new Error(`${method} ${path} → ${res.status}\n${t}`); }
  return t ? JSON.parse(t) : {};
}

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const version = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);
  const attrs = { contactFirstName: FIRST, contactLastName: LAST, contactPhone: PHONE, contactEmail: EMAIL, demoAccountRequired: false, notes: NOTES };

  const existing = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`, null, { soft: true });
  if (existing.data?.id) {
    await api('PATCH', `/v1/appStoreReviewDetails/${existing.data.id}`, {
      data: { type: 'appStoreReviewDetails', id: existing.data.id, attributes: attrs },
    });
    console.log(`✅ review detail updated (${FIRST} ${LAST} / ${EMAIL} / ${PHONE})`);
  } else {
    await api('POST', '/v1/appStoreReviewDetails', {
      data: { type: 'appStoreReviewDetails', attributes: attrs,
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } },
    });
    console.log(`✅ review detail created (${FIRST} ${LAST} / ${EMAIL} / ${PHONE})`);
  }
}
main().catch((e) => { console.error('\n❌ asc-contact failed:\n', e.message); process.exit(1); });
