#!/usr/bin/env node
// Find the latest VALID build for APP_VERSION and attach it to the version.
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.2';

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
async function api(method, path, body) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${t}`);
  return t ? JSON.parse(t) : {};
}

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const version = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);

  // Currently-attached build
  const cur = await api('GET', `/v1/appStoreVersions/${version.id}/build`);
  const curNum = cur.data ? cur.data.attributes?.version : null;
  console.log(`currently attached build: ${curNum || 'none'}`);

  // All builds for this pre-release version
  const builds = (await api('GET', `/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${VERSION}&limit=50&sort=-version`)).data;
  console.log('builds for ' + VERSION + ':');
  for (const b of builds) console.log(`  #${b.attributes?.version} processing=${b.attributes?.processingState} expired=${b.attributes?.expired}`);

  const valid = builds.filter((b) => b.attributes?.processingState === 'VALID' && !b.attributes?.expired);
  if (!valid.length) throw new Error('no VALID non-expired builds');
  // highest numeric build number
  valid.sort((a, b) => Number(b.attributes.version) - Number(a.attributes.version));
  const latest = valid[0];
  const latestNum = latest.attributes.version;

  if (String(latestNum) === String(curNum)) {
    console.log(`\n✅ already on the latest build (#${latestNum}) — up to date.`);
    return;
  }
  await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, {
    data: { type: 'builds', id: latest.id },
  });
  console.log(`\n✅ attached latest build #${latestNum} (was ${curNum || 'none'}).`);
}
main().catch((e) => { console.error('\n❌ attach-latest-build failed:\n', e.message); process.exit(1); });
