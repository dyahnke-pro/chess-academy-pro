#!/usr/bin/env node
// Fill the app-level submission requirements via ASC API: copyright, primary/
// secondary category, content-rights declaration. DISCOVER where age rating +
// review-detail live, and (if reachable) set the age-rating declaration.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   COPYRIGHT, PRIMARY_CATEGORY, PRIMARY_SUBCAT, SECONDARY_CATEGORY,
//   CONTENT_RIGHTS (DOES_NOT_USE_THIRD_PARTY_CONTENT|USES_THIRD_PARTY_CONTENT),
//   SET_AGE_RATING ("1").

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.0';
const COPYRIGHT = process.env.COPYRIGHT || '2026 David Yahnke';
const PRIMARY_CATEGORY = process.env.PRIMARY_CATEGORY || 'GAMES';
const PRIMARY_SUBCAT = process.env.PRIMARY_SUBCAT || 'GAMES_BOARD';
const SECONDARY_CATEGORY = process.env.SECONDARY_CATEGORY || 'EDUCATION';
const CONTENT_RIGHTS = process.env.CONTENT_RIGHTS || 'DOES_NOT_USE_THIRD_PARTY_CONTENT';
const SET_AGE_RATING = process.env.SET_AGE_RATING === '1';

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
const short = (o) => String(o.__body || '').replace(/\s+/g, ' ').slice(0, 220);
const m = (ok, label, note) => console.log(`${ok ? '✅' : '⚠️ '} ${label}${note ? ` — ${note}` : ''}`);

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const version = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);
  console.log(`app=${app.id} version=${version.id}`);

  // ── Copyright (version attribute) ─────────────────────────────────────────
  {
    const r = await api('PATCH', `/v1/appStoreVersions/${version.id}`, {
      data: { type: 'appStoreVersions', id: version.id, attributes: { copyright: COPYRIGHT } },
    }, { soft: true });
    m(!r.__error, `copyright = "${COPYRIGHT}"`, r.__error ? `${r.__error} ${short(r)}` : '');
  }

  // ── appInfo: category + content rights ────────────────────────────────────
  const appInfos = (await api('GET', `/v1/apps/${app.id}/appInfos?limit=10`)).data;
  // The editable appInfo is the one not in a READY_FOR_DISTRIBUTION state.
  const editable = appInfos.find((i) => i.attributes?.appStoreState && i.attributes.appStoreState !== 'READY_FOR_DISTRIBUTION') || appInfos[0];
  console.log(`appInfo=${editable.id} state=${editable.attributes?.appStoreState}`);

  {
    const r = await api('PATCH', `/v1/appInfos/${editable.id}`, {
      data: { type: 'appInfos', id: editable.id,
        attributes: { primarySubcategoryOne: PRIMARY_SUBCAT },
        relationships: {
          primaryCategory: { data: { type: 'appCategories', id: PRIMARY_CATEGORY } },
          secondaryCategory: { data: { type: 'appCategories', id: SECONDARY_CATEGORY } },
        } },
    }, { soft: true });
    m(!r.__error, `category = ${PRIMARY_CATEGORY}/${PRIMARY_SUBCAT} + ${SECONDARY_CATEGORY}`, r.__error ? `${r.__error} ${short(r)}` : '');
  }

  // Content rights declaration: PATCH on the app (newer) or appInfo (older).
  {
    let r = await api('PATCH', `/v1/apps/${app.id}`, {
      data: { type: 'apps', id: app.id, attributes: { contentRightsDeclaration: CONTENT_RIGHTS } },
    }, { soft: true });
    m(!r.__error, `content rights = ${CONTENT_RIGHTS}`, r.__error ? `${r.__error} ${short(r)}` : '');
  }

  // ── Discover age rating + review detail ───────────────────────────────────
  for (const probe of [
    `/v1/appInfos/${editable.id}/ageRatingDeclaration`,
    `/v1/appInfos/${editable.id}?include=ageRatingDeclaration`,
    `/v1/apps/${app.id}/ageRatingDeclaration`,
  ]) {
    const r = await api('GET', probe, null, { soft: true });
    const id = r.data?.id || r.included?.find?.((i) => i.type === 'ageRatingDeclarations')?.id;
    console.log(`age-rating probe ${probe.split('?')[0].split('/').slice(-2).join('/')}: ${r.__error ? `${r.__error}` : (id ? `id=${id}` : 'reachable, no id')}`);
    if (id && SET_AGE_RATING) {
      const attrs = {
        alcoholTobaccoOrDrugUseOrReferences: 'NONE', contests: 'NONE', gamblingSimulated: 'NONE',
        gambling: false, horrorOrFearThemes: 'NONE', matureOrSuggestiveThemes: 'NONE',
        medicalOrTreatmentInformation: 'NONE', profanityOrCrudeHumor: 'NONE',
        sexualContentGraphicAndNudity: 'NONE', sexualContentOrNudity: 'NONE',
        violenceCartoonOrFantasy: 'NONE', violenceRealistic: 'NONE',
        violenceRealisticProlongedGraphicOrSadistic: 'NONE', unrestrictedWebAccess: false,
        kidsAgeBand: null, seventeenPlus: false,
      };
      const pr = await api('PATCH', `/v1/ageRatingDeclarations/${id}`, {
        data: { type: 'ageRatingDeclarations', id, attributes: attrs },
      }, { soft: true });
      m(!pr.__error, 'age rating set (all NONE → 4+)', pr.__error ? `${pr.__error} ${short(pr)}` : '');
      break;
    }
  }

  const rd = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`, null, { soft: true });
  console.log(`review detail: ${rd.data ? JSON.stringify(rd.data.attributes) : (rd.__error ? rd.__error : 'none')}`);
}
main().catch((e) => { console.error('\n❌ asc-appinfo failed:\n', e.message); process.exit(1); });
