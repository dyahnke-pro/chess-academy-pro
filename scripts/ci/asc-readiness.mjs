#!/usr/bin/env node
// Read-only submission readiness probe: reports the state of every item the
// "Add for Review" checklist requires, straight from the ASC API.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '2.8';

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
async function api(path, { soft = true } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
  });
  const t = await res.text();
  if (!res.ok) { if (soft) return { __error: res.status, __body: t }; throw new Error(`${path} → ${res.status}`); }
  return t ? JSON.parse(t) : {};
}
const mark = (ok, label, note) => console.log(`${ok ? '✅' : '❌'} ${label}${note ? ` — ${note}` : ''}`);

async function main() {
  const app = (await api(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const appFull = await api(`/v1/apps/${app.id}`);
  const version = (await api(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);
  console.log(`\n=== ${BUNDLE_ID} v${VERSION} — state ${version.attributes?.appStoreState} ===\n`);

  mark(!!version.attributes?.copyright, 'Copyright', version.attributes?.copyright || 'MISSING');
  mark(!!appFull.data.attributes?.contentRightsDeclaration, 'Content Rights', appFull.data.attributes?.contentRightsDeclaration || 'MISSING');

  // Category
  const info = (await api(`/v1/apps/${app.id}/appInfos?limit=10`)).data.find((i) => i.attributes?.appStoreState !== 'READY_FOR_DISTRIBUTION') || (await api(`/v1/apps/${app.id}/appInfos?limit=1`)).data[0];
  const infoFull = await api(`/v1/appInfos/${info.id}?include=primaryCategory,secondaryCategory,primarySubcategoryOne`);
  const rel = infoFull.data.relationships || {};
  const primCat = rel.primaryCategory?.data?.id;
  const secCat = rel.secondaryCategory?.data?.id;
  mark(!!primCat, 'Primary category', primCat ? `${primCat}${secCat ? ` + ${secCat}` : ''}` : 'MISSING');

  // Age rating
  const ar = await api(`/v1/appInfos/${info.id}/ageRatingDeclaration`);
  if (ar.data) {
    const a = ar.data.attributes || {};
    const answered = Object.values(a).some((v) => v !== null && v !== undefined);
    mark(answered, 'Age rating', JSON.stringify(a).slice(0, 300));
  } else { mark(false, 'Age rating', 'no declaration'); }

  // Contact / review detail
  const rd = await api(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`);
  if (rd.data) {
    const a = rd.data.attributes || {};
    const ok = a.contactFirstName && a.contactLastName && a.contactPhone && a.contactEmail;
    mark(!!ok, 'Contact info', `${a.contactFirstName || '∅'} ${a.contactLastName || '∅'} / ${a.contactEmail || '∅'} / ${a.contactPhone || '∅'}`);
  } else { mark(false, 'Contact info', 'not created'); }

  // Screenshots per display
  const screenSets = (await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=10`)).data;
  const loc = screenSets.find((l) => l.attributes?.locale === 'en-US') || screenSets[0];
  const sets = loc ? (await api(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`)).data : [];
  const displays = {};
  for (const s of sets) {
    const dt = s.attributes?.screenshotDisplayType;
    const shots = (await api(`/v1/appScreenshotSets/${s.id}/appScreenshots?limit=20`)).data || [];
    displays[dt] = shots.length;
  }
  console.log(`screenshot sets: ${Object.entries(displays).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}`);
  const hasIpad = Object.keys(displays).some((d) => d.includes('IPAD'));
  mark(hasIpad, '13" iPad screenshots', hasIpad ? 'present' : 'MISSING (required because the build supports iPad)');

  // IAPs attached
  const iaps = (await api(`/v1/appStoreVersions/${version.id}/appStoreVersionExperiments`, { soft: true }));
  const subs = (await api(`/v1/apps/${app.id}/subscriptionGroups?limit=10`)).data;
  let ready = 0; let total = 0;
  for (const g of subs) {
    const ss = (await api(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=20`)).data;
    for (const s of ss) { total++; if (s.attributes?.state === 'READY_TO_SUBMIT' || s.attributes?.state === 'APPROVED') ready++; }
  }
  mark(ready === total && total > 0, 'Subscriptions ready', `${ready}/${total} READY_TO_SUBMIT`);
}
main().catch((e) => { console.error('\n❌ readiness failed:\n', e.message); process.exit(1); });
