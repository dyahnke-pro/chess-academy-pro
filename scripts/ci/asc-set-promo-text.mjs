#!/usr/bin/env node
// Set the App Store "Promotional Text" (the developer note shown atop the
// description) via the App Store Connect API. Promotional text is one of the
// few metadata fields editable ANYTIME with no new build and no App Review, so
// this goes live within minutes on the live version — and we also set it on any
// in-flight (editable) version so it carries forward with the next build.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, PROMO_TEXT (<=170 chars),
//      APP_ID (default 6776418777), LOCALE (default en-US).

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const APP = process.env.APP_ID || '6776418777';
const LOCALE = process.env.LOCALE || 'en-US';
const PROMO = req('PROMO_TEXT');

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
if (PROMO.length > 170) throw new Error(`PROMO_TEXT is ${PROMO.length} chars — App Store max is 170`);

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
  console.log(`app=${APP}  locale=${LOCALE}  promoText (${PROMO.length} chars):\n  "${PROMO}"\n`);

  // Newest few versions, with their localizations included so we can target the
  // en-US promotional text on each editable/live version.
  const versions = await api(
    'GET',
    `/v1/apps/${APP}/appStoreVersions?limit=5&include=appStoreVersionLocalizations&fields[appStoreVersions]=versionString,appStoreState,appStoreVersionLocalizations&fields[appStoreVersionLocalizations]=locale`,
  );
  const locById = new Map();
  for (const inc of versions.included || []) {
    if (inc.type === 'appStoreVersionLocalizations') locById.set(inc.id, inc.attributes?.locale);
  }

  let applied = 0;
  for (const v of versions.data || []) {
    const state = v.attributes?.appStoreState;
    const vs = v.attributes?.versionString;
    const locs = v.relationships?.appStoreVersionLocalizations?.data || [];
    const enLoc = locs.find((l) => locById.get(l.id) === LOCALE);
    if (!enLoc) { console.log(`  v${vs} [${state}] — no ${LOCALE} localization, skipped`); continue; }

    const patched = await api('PATCH', `/v1/appStoreVersionLocalizations/${enLoc.id}`, {
      data: { type: 'appStoreVersionLocalizations', id: enLoc.id, attributes: { promotionalText: PROMO } },
    }, { soft: true });

    if (patched.__error) {
      // Some states (IN_REVIEW, PENDING_APPLE_RELEASE) lock metadata — that's
      // expected, not a failure of the run; report and move on.
      console.log(`  v${vs} [${state}] — not editable (${patched.__error}), skipped`);
    } else {
      console.log(`  v${vs} [${state}] — ✅ promotional text set`);
      applied++;
    }
  }

  console.log(`\nUpdated ${applied} version localization(s).`);
  if (applied === 0) {
    console.error('::error::no version localization was editable — nothing updated');
    process.exit(1);
  }
  console.log('Live-version promotional text updates on the App Store within minutes (no review).');
}
main().catch((e) => { console.error('\n❌ asc-set-promo-text failed:\n', e.message); process.exit(1); });
