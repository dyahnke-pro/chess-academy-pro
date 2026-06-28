#!/usr/bin/env node
// App Privacy via ASC API. Two phases controlled by env:
//   Always: set the Privacy Policy URL on the en-US appInfoLocalization, and
//     DISCOVER the reference graph (categories / purposes / data protections /
//     grouping) + current appDataUsages + publish state — printed so we can map.
//   CREATE_USAGES=1: create the four data-usage declarations + publish.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID,
//   PRIVACY_URL (default https://chess-academy-pro.vercel.app/privacy),
//   CREATE_USAGES ("1" to create), PUBLISH ("1" to publish after create).

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const PRIVACY_URL = process.env.PRIVACY_URL || 'https://chess-academy-pro.vercel.app/privacy';
const CREATE_USAGES = process.env.CREATE_USAGES === '1';
const PUBLISH = process.env.PUBLISH === '1';

// The four data types we declare, mapped to Apple's category ids + the
// purpose / protection codes. Category/purpose/protection ids in the App
// Privacy API ARE stable enum strings.
const DECLARATIONS = [
  { category: 'GAMEPLAY_CONTENT',   purpose: 'APP_FUNCTIONALITY' },
  { category: 'PURCHASE_HISTORY',   purpose: 'APP_FUNCTIONALITY' },
  { category: 'PRODUCT_INTERACTION', purpose: 'ANALYTICS' },
  { category: 'CRASH_DATA',         purpose: 'APP_FUNCTIONALITY' },
];
const PROTECTIONS = ['DATA_NOT_LINKED_TO_YOU', 'DATA_NOT_USED_TO_TRACK_YOU'];

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

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);
  console.log(`app=${app.id}`);

  // ── 1. Privacy Policy URL on the en-US appInfoLocalization ────────────────
  const appInfos = (await api('GET', `/v1/apps/${app.id}/appInfos?limit=10`)).data;
  for (const info of appInfos) {
    const locs = (await api('GET', `/v1/appInfos/${info.id}/appInfoLocalizations?limit=50`, null, { soft: true })).data || [];
    const enUS = locs.find((l) => l.attributes?.locale === 'en-US');
    if (enUS) {
      const cur = enUS.attributes?.privacyPolicyUrl;
      if (cur === PRIVACY_URL) { console.log(`privacy URL already set on appInfo ${info.id}`); }
      else {
        const r = await api('PATCH', `/v1/appInfoLocalizations/${enUS.id}`, {
          data: { type: 'appInfoLocalizations', id: enUS.id, attributes: { privacyPolicyUrl: PRIVACY_URL } },
        }, { soft: true });
        console.log(r.__error ? `⚠️  privacy URL set failed (appInfo ${info.id}): ${r.__error} ${short(r)}` : `✅ privacy URL set on appInfo ${info.id}`);
      }
    }
  }

  // ── 2. Discover the reference graph ───────────────────────────────────────
  const cats = (await api('GET', '/v1/appDataUsageCategories?limit=200', null, { soft: true })).data || [];
  const purps = (await api('GET', '/v1/appDataUsagePurposes?limit=200', null, { soft: true })).data || [];
  const prots = (await api('GET', '/v1/appDataUsageDataProtections?limit=200', null, { soft: true })).data || [];
  console.log(`\ncategories (${cats.length}): ${cats.map((c) => c.id).join(', ')}`);
  console.log(`purposes (${purps.length}): ${purps.map((p) => p.id).join(', ')}`);
  console.log(`protections (${prots.length}): ${prots.map((p) => p.id).join(', ')}`);

  const existing = (await api('GET', `/v1/apps/${app.id}/appDataUsages?limit=200`, null, { soft: true })).data || [];
  console.log(`existing appDataUsages: ${existing.length}`);
  const pub = await api('GET', `/v1/apps/${app.id}/appDataUsagesPublishState`, null, { soft: true });
  console.log(`publishState: ${pub.data ? JSON.stringify(pub.data.attributes) : short(pub)}`);

  if (!CREATE_USAGES) { console.log('\n(discovery only — set CREATE_USAGES=1 to create)'); return; }

  // ── 3. Create the four declarations (category × protection × purpose) ─────
  // Discovery returned empty reference lists, so try the known enum codes
  // directly — the POST will report the valid ids if these are wrong.
  for (const d of DECLARATIONS) {
    for (const prot of PROTECTIONS) {
      const made = await api('POST', '/v1/appDataUsages', {
        data: { type: 'appDataUsages',
          relationships: {
            app: { data: { type: 'apps', id: app.id } },
            category: { data: { type: 'appDataUsageCategories', id: d.category } },
            dataProtection: { data: { type: 'appDataUsageDataProtections', id: prot } },
          } },
      }, { soft: true });
      console.log(made.__error ? `⚠️  ${d.category}/${prot}: ${made.__error} ${short(made)}` : `✅ ${d.category}/${prot}`);
    }
    const madeP = await api('POST', '/v1/appDataUsages', {
      data: { type: 'appDataUsages',
        relationships: {
          app: { data: { type: 'apps', id: app.id } },
          category: { data: { type: 'appDataUsageCategories', id: d.category } },
          purpose: { data: { type: 'appDataUsagePurposes', id: d.purpose } },
        } },
    }, { soft: true });
    console.log(madeP.__error ? `⚠️  ${d.category}/${d.purpose}: ${madeP.__error} ${short(madeP)}` : `✅ ${d.category}/${d.purpose}`);
  }

  if (PUBLISH) {
    const ps = await api('GET', `/v1/apps/${app.id}/appDataUsagesPublishState`, null, { soft: true });
    if (ps.data?.id) {
      const r = await api('PATCH', `/v1/appDataUsagesPublishStates/${ps.data.id}`, {
        data: { type: 'appDataUsagesPublishStates', id: ps.data.id, attributes: { published: true } },
      }, { soft: true });
      console.log(r.__error ? `⚠️  publish failed: ${r.__error} ${short(r)}` : '✅ privacy label PUBLISHED');
    } else { console.log('⚠️  no publishState id to publish'); }
  }
}
main().catch((e) => { console.error('\n❌ asc-privacy failed:\n', e.message); process.exit(1); });
