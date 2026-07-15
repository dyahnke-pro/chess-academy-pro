#!/usr/bin/env node
// Create the App Store version if it does not exist yet. Apple does NOT
// auto-create the appStoreVersion when a build is uploaded, so every downstream
// script (finalize / attach / readiness / submit) that looks it up by
// versionString throws "No version X" until this runs. Idempotent: if the
// version already exists it reports and no-ops. Optionally sets the en-US
// "What's New" release notes (WHATS_NEW env) — required by Apple for an update,
// but reversible until submit, so it's safe to set a draft and refine later.
//
// Reversible / no submit. Manual trigger only.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   WHATS_NEW    — release notes for the en-US localization (optional)
//   RELEASE_TYPE — MANUAL | AFTER_APPROVAL | SCHEDULED (default AFTER_APPROVAL)

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '3.2';
const WHATS_NEW = process.env.WHATS_NEW || '';
const PROMO_TEXT = process.env.PROMO_TEXT || '';
const RELEASE_TYPE = process.env.RELEASE_TYPE || 'AFTER_APPROVAL';

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
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);

  const versions = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
  let version = versions.find((v) => v.attributes?.versionString === VERSION);

  if (version) {
    console.log(`✓ version ${VERSION} already exists → ${version.id} (state ${version.attributes?.appStoreState})`);
  } else {
    console.log(`version ${VERSION} not found — creating…`);
    version = (await api('POST', '/v1/appStoreVersions', {
      data: {
        type: 'appStoreVersions',
        attributes: { platform: 'IOS', versionString: VERSION, releaseType: RELEASE_TYPE },
        relationships: { app: { data: { type: 'apps', id: app.id } } },
      },
    })).data;
    console.log(`✅ created version ${VERSION} → ${version.id} (releaseType ${RELEASE_TYPE})`);
  }

  // Ensure an en-US localization exists (Apple usually clones it from the prior
  // version, but create it if absent) and set the "What's New" notes if given.
  const locs = (await api('GET', `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=20`)).data;
  let enUS = locs.find((l) => l.attributes?.locale === 'en-US');
  const setAttrs = {
    ...(WHATS_NEW ? { whatsNew: WHATS_NEW } : {}),
    ...(PROMO_TEXT ? { promotionalText: PROMO_TEXT } : {}),
  };
  if (!enUS) {
    console.log('en-US localization missing — creating…');
    enUS = (await api('POST', '/v1/appStoreVersionLocalizations', {
      data: {
        type: 'appStoreVersionLocalizations',
        attributes: { locale: 'en-US', ...setAttrs },
        relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } },
      },
    })).data;
    console.log(`✅ created en-US localization → ${enUS.id}`);
  } else if (Object.keys(setAttrs).length) {
    await api('PATCH', `/v1/appStoreVersionLocalizations/${enUS.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: enUS.id, attributes: setAttrs },
    });
    if (WHATS_NEW) console.log(`✅ set "What's New" on en-US (${WHATS_NEW.length} chars)`);
    if (PROMO_TEXT) console.log(`✅ set Promotional text on en-US (${PROMO_TEXT.length} chars)`);
  } else {
    const a = enUS.attributes || {};
    console.log(`en-US localization → ${enUS.id}`);
    console.log(`  whatsNew: ${a.whatsNew ? `"${a.whatsNew.slice(0, 50)}…"` : 'EMPTY'}`);
    console.log(`  promotionalText: ${a.promotionalText ? `"${a.promotionalText.slice(0, 50)}…"` : 'EMPTY'}`);
  }

  console.log('\n✅ create-asc-version done (no submit).');
}
main().catch((e) => { console.error('\n❌ create-asc-version failed:\n', e.message); process.exit(1); });
