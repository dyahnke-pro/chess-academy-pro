#!/usr/bin/env node
// Metadata fix for the App Store rejection (Guidelines 3.1.2 + 2.3.2):
//   - append a clearly-labelled SUBSCRIPTION block to the en-US description
//     (2.3.2 — paid content identified as requiring purchase), and
//   - include functional Terms of Use (EULA) + Privacy Policy links in the
//     description (3.1.2 — required subscription metadata links).
//
// Idempotent: keys off a marker line, so re-running never double-appends and
// never clobbers the existing marketing copy — it only adds the block once.
// Read-only unless APPLY=1.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   APPLY ("1" to PATCH; otherwise dry-run prints the diff).

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.0';
const APPLY = process.env.APPLY === '1';

const PRIVACY_URL = 'https://chess-academy-pro.vercel.app/privacy';
// Apple's standard EULA (used when no custom EULA is supplied in ASC).
const EULA_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const MARKER = '— SUBSCRIPTION —';
const BLOCK = [
  '',
  '',
  MARKER,
  'Chess Academy Pro requires an auto-renewing Pro subscription to unlock its',
  'features — the AI coach, guided opening masterclasses, tactics training, full',
  'Stockfish game analysis, and the weaknesses trainer. Start with a 7-day free',
  'trial, then $7.99/month or $79.99/year.',
  '',
  'Payment is charged to your Apple ID at confirmation of purchase. Your',
  'subscription automatically renews unless canceled at least 24 hours before the',
  'end of the current period; manage or cancel anytime in your App Store account',
  'settings. Any unused portion of a free trial is forfeited when you purchase a',
  'subscription.',
  '',
  `Privacy Policy: ${PRIVACY_URL}`,
  `Terms of Use (EULA): ${EULA_URL}`,
].join('\n');

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function loadKey() { let p = req('ASC_KEY_P8'); if (!p.includes('BEGIN')) p = Buffer.from(p, 'base64').toString('utf8'); return createPrivateKey({ key: p, format: 'pem' }); }
const PK = loadKey();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' }))}`;
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
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);
  const versions = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
  const version = versions.find((v) => v.attributes?.versionString === VERSION);
  if (!version) throw new Error(`No iOS version ${VERSION}`);
  console.log(`app=${app.id} version=${VERSION} state=${version.attributes?.appStoreState}`);

  const locs = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=50`)).data;
  const enUS = locs.find((l) => l.attributes?.locale === 'en-US') || locs[0];
  if (!enUS) throw new Error('no version localization');
  const current = enUS.attributes?.description || '';

  if (current.includes(MARKER)) {
    console.log('✅ description already carries the SUBSCRIPTION + legal-links block — nothing to do.');
    return;
  }

  const next = current + BLOCK;
  if (next.length > 4000) {
    console.log(`⚠️  new description is ${next.length} chars (>4000 limit). Trim marketing copy first.`);
  }
  console.log(`\n── appended block (${BLOCK.length} chars) ──\n${BLOCK}\n── new length: ${next.length}/4000 ──`);

  if (!APPLY) { console.log('\n(dry-run — set APPLY=1 to PATCH the live listing)'); return; }

  const r = await api('PATCH', `/v1/appStoreVersionLocalizations/${enUS.id}`, {
    data: { type: 'appStoreVersionLocalizations', id: enUS.id, attributes: { description: next } },
  }, { soft: true });
  console.log(r.__error ? `⚠️  description PATCH failed: ${r.__error} ${String(r.__body).slice(0, 300)}` : '✅ description updated with SUBSCRIPTION + EULA/Privacy links');
}
main().catch((e) => { console.error('\n❌ asc-listing-fix failed:\n', e.message); process.exit(1); });
