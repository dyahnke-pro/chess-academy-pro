#!/usr/bin/env node
// Finalize an App Store version via the ASC API (no submit): select the build,
// set the age-rating declaration. Reversible operations only — does NOT submit.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   SET_BUILD   — build number (CFBundleVersion) to attach, e.g. 79 (optional)
//   SET_AGE_RATING — "1" to PATCH the age-rating declaration (optional)

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.2';
const SET_BUILD = process.env.SET_BUILD || '';
const SET_AGE_RATING = process.env.SET_AGE_RATING === '1';

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

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);
  const versions = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
  const version = versions.find((v) => v.attributes?.versionString === VERSION);
  if (!version) throw new Error(`No version ${VERSION}`);
  console.log(`app=${app.id} version=${version.id} state=${version.attributes?.appStoreState}`);

  if (SET_BUILD) {
    // Find the build by CFBundleVersion under this pre-release version.
    const builds = (await api(
      'GET',
      `/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${VERSION}&filter[version]=${SET_BUILD}&limit=5`,
    )).data;
    if (!builds.length) throw new Error(`No build ${SET_BUILD} under ${VERSION}`);
    const build = builds[0];
    console.log(`build ${SET_BUILD} → ${build.id} (processing=${build.attributes?.processingState})`);
    await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, {
      data: { type: 'builds', id: build.id },
    });
    console.log(`✓ attached build ${SET_BUILD} to version ${VERSION}`);
  }

  if (SET_AGE_RATING) {
    // Honest "all clear" chess-app declaration → 4+. NOT in Kids Category.
    const decl = (await api('GET', `/v1/appStoreVersions/${version.id}/ageRatingDeclaration`)).data;
    const attrs = {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gamblingSimulated: 'NONE',
      gambling: false,
      horrorOrFearThemes: 'NONE',
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
      unrestrictedWebAccess: false,
      kidsAgeBand: null,
      seventeenPlus: false,
    };
    await api('PATCH', `/v1/ageRatingDeclarations/${decl.id}`, {
      data: { type: 'ageRatingDeclarations', id: decl.id, attributes: attrs },
    });
    console.log('✓ age-rating declaration set (all NONE / not Kids Category → 4+)');
  }

  console.log('\n✅ finalize-asc-version done (no submit).');
}
main().catch((e) => { console.error('\n❌ finalize failed:\n', e.message); process.exit(1); });
