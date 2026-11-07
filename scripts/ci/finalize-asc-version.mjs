#!/usr/bin/env node
// Finalize an App Store version via the ASC API (no submit): select the build,
// set the age-rating declaration. Reversible operations only — does NOT submit.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   SET_BUILD   — build number (CFBundleVersion) to attach, e.g. 79 (optional)
//   SET_AGE_RATING — "1" to PATCH the age-rating declaration (optional)

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { appVersion } from './app-version.mjs';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = appVersion();
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
    // THE ANSWERS STILL BLANK, AND ONLY THOSE (submit 2026-11-07: Apple added
    // questions to the age rating — ads, chat, weapons, loot boxes … — and one
    // left blank refused the review with ATTRIBUTE.REQUIRED). An answer already
    // given is never overwritten; a blank one gets this app's honest answer: a
    // chess app with no ads, no user-to-user chat or shared content, nothing
    // mature → 4+, not in the Kids Category. A blank question this table has no
    // answer for is printed, never guessed.
    // The declaration hangs off the version (older API) or the editable appInfo.
    const readDecl = async () => {
      try { const d = (await api('GET', `/v1/appStoreVersions/${version.id}/ageRatingDeclaration`)).data; if (d) return d; } catch { /* the newer API */ }
      const infos = (await api('GET', `/v1/apps/${app.id}/appInfos?limit=10`)).data;
      const info = infos.find((i) => i.attributes?.appStoreState && i.attributes.appStoreState !== 'READY_FOR_DISTRIBUTION') || infos[0];
      return (await api('GET', `/v1/appInfos/${info.id}/ageRatingDeclaration`)).data;
    };
    const decl = await readDecl();
    const before = decl.attributes || {};
    // Korea's GRAC number exists only for a game Korea rated; kidsAgeBand only in
    // the Kids Category; the info URL is the developer's choice.
    const OPTIONAL = new Set(['kidsAgeBand', 'developerAgeRatingInfoUrl', 'koreaAgeRatingOverride', 'gracRatingClassificationNumber']);
    const HONEST = {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE', contests: 'NONE', gamblingSimulated: 'NONE', gambling: false,
      horrorOrFearThemes: 'NONE', matureOrSuggestiveThemes: 'NONE', medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE', sexualContentGraphicAndNudity: 'NONE', sexualContentOrNudity: 'NONE',
      violenceCartoonOrFantasy: 'NONE', violenceRealistic: 'NONE', violenceRealisticProlongedGraphicOrSadistic: 'NONE',
      unrestrictedWebAccess: false, seventeenPlus: false,
      advertising: false, ageAssurance: false, gunsOrOtherWeapons: 'NONE', healthOrWellnessTopics: false,
      lootBox: false, messagingAndChat: false, parentalControls: false, userGeneratedContent: false,
      ageRatingOverride: 'NONE', ageRatingOverrideV2: 'NONE',
      // Not a social-media app (no profiles, feeds or user-to-user posting).
      socialMedia: false, socialMediaAgeRestricted: false,
    };
    console.log(`age rating before: ${JSON.stringify(before)}`);
    const blank = Object.keys(before).filter((k) => (before[k] === null || before[k] === undefined) && !OPTIONAL.has(k));
    const fill = Object.fromEntries(blank.filter((k) => k in HONEST).map((k) => [k, HONEST[k]]));
    const unknown = blank.filter((k) => !(k in HONEST));
    console.log(`blank: ${blank.join(', ') || 'none'}${unknown.length ? ` · NO ANSWER KNOWN for: ${unknown.join(', ')}` : ''}`);
    if (Object.keys(fill).length) {
      const patch = (attributes) => api('PATCH', `/v1/ageRatingDeclarations/${decl.id}`, {
        data: { type: 'ageRatingDeclarations', id: decl.id, attributes },
      });
      try {
        await patch(fill);
      } catch (e) {
        // "Age restricted" is a follow-up to "is it social media": Apple may
        // refuse it once social media is no. Answer the rest without it.
        if (!('socialMediaAgeRestricted' in fill)) throw e;
        console.log(`PATCH refused (${String(e.message).split('\n')[0]}) — retrying without socialMediaAgeRestricted`);
        delete fill.socialMediaAgeRestricted;
        await patch(fill);
      }
      const after = (await readDecl()).attributes || {};
      console.log(`✓ answered ${Object.keys(fill).join(', ')} · after: ${JSON.stringify(after)}`);
    } else {
      console.log('✓ nothing blank that this table answers');
    }
    if (unknown.length) process.exitCode = 1;
  }

  console.log('\n✅ finalize-asc-version done (no submit).');
}
main().catch((e) => { console.error('\n❌ finalize failed:\n', e.message); process.exit(1); });
