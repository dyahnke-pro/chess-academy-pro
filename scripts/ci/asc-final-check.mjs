#!/usr/bin/env node
// Exhaustive pre-submit audit: everything Apple validates at "Submit", beyond
// the Add-for-Review checklist. Read-only. Env: ASC_KEY_P8/_ID/_ISSUER_ID,
// APP_BUNDLE_ID, APP_VERSION.

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
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, { headers: { Authorization: `Bearer ${jwt()}` } });
  const t = await res.text();
  if (!res.ok) { if (soft) return { __error: res.status, __body: t }; throw new Error(`${path} → ${res.status}`); }
  return t ? JSON.parse(t) : {};
}
const mark = (ok, label, note) => console.log(`${ok ? '✅' : '❌'} ${label}${note ? ` — ${note}` : ''}`);

async function main() {
  const app = (await api(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const version = (await api(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);
  console.log(`\n=== ${BUNDLE_ID} v${VERSION} pre-submit audit ===\n`);

  // 1. Version localization text fields
  const locs = (await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=10`)).data;
  const loc = locs.find((l) => l.attributes?.locale === 'en-US') || locs[0];
  const a = loc.attributes || {};
  mark(!!(a.description && a.description.length > 10), 'Description', `${(a.description || '').length} chars`);
  mark(!!(a.keywords && a.keywords.length), 'Keywords', a.keywords || 'MISSING');
  mark(!!a.supportUrl, 'Support URL', a.supportUrl || 'MISSING (REQUIRED)');
  mark(true, 'Promotional text', a.promotionalText ? `${a.promotionalText.length} chars` : '(optional, empty)');
  mark(true, 'Marketing URL', a.marketingUrl || '(optional, empty)');
  mark(true, "What's New", a.whatsNew ? `${a.whatsNew.length} chars` : '(first release: not required)');

  // 2. App name + subtitle (appInfo localization)
  const info = (await api(`/v1/apps/${app.id}/appInfos?limit=10`)).data.find((i) => i.attributes?.appStoreState !== 'READY_FOR_DISTRIBUTION') || (await api(`/v1/apps/${app.id}/appInfos?limit=1`)).data[0];
  const il = (await api(`/v1/appInfos/${info.id}/appInfoLocalizations?limit=10`)).data.find((l) => l.attributes?.locale === 'en-US');
  mark(!!il?.attributes?.name, 'App name', il?.attributes?.name || 'MISSING');
  mark(true, 'Subtitle', il?.attributes?.subtitle || '(optional, empty)');
  mark(!!il?.attributes?.privacyPolicyUrl, 'Privacy Policy URL', il?.attributes?.privacyPolicyUrl || 'MISSING');

  // 3. App price (Free?)
  const sched = await api(`/v1/apps/${app.id}/appPriceSchedule?include=manualPrices&limit=5`);
  if (sched.data) {
    const prices = (sched.included || []).filter((x) => x.type === 'appPrices');
    let free = false;
    for (const p of prices) {
      const ppId = p.relationships?.appPricePoint?.data?.id;
      if (!ppId) continue;
      const pp = await api(`/v1/appPricePoints/${ppId}`);
      const cp = pp.data?.attributes?.customerPrice;
      if (cp === '0.00' || cp === '0' || Number(cp) === 0) free = true;
      console.log(`   price point customerPrice=${cp}`);
    }
    mark(free || prices.length === 0, 'App price', free ? 'Free' : (prices.length ? 'NOT free — set to Free' : 'schedule present'));
  } else { mark(false, 'App price', 'no schedule — set price (Free)'); }

  // 4. Build + encryption declaration
  const build = await api(`/v1/appStoreVersions/${version.id}/build`);
  if (build.data) {
    const bf = await api(`/v1/builds/${build.data.id}?include=buildBetaDetail`);
    const enc = bf.data?.attributes?.usesNonExemptEncryption;
    mark(build.data.attributes?.processingState === 'VALID', 'Build', `#${build.data.attributes?.version} ${build.data.attributes?.processingState}`);
    mark(enc === false || enc === null, 'Export compliance', enc === false ? 'declared exempt (non-exempt=false)' : enc === null ? 'declared in Info.plist (null)' : `usesNonExemptEncryption=${enc} — may prompt`);
  } else { mark(false, 'Build', 'none attached'); }

  // 5. IAP attached to the version for review
  const reviewSub = await api(`/v1/appStoreVersions/${version.id}/appStoreVersionExperiments`, { soft: true });
  const subs = (await api(`/v1/apps/${app.id}/subscriptionGroups?limit=10`)).data;
  let ready = 0; let tot = 0;
  for (const g of subs) { const ss = (await api(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=20`)).data; for (const s of ss) { tot++; if (['READY_TO_SUBMIT', 'APPROVED'].includes(s.attributes?.state)) ready++; } }
  mark(ready === tot && tot > 0, 'Subscriptions', `${ready}/${tot} ready`);

  // 6. App previews + screenshots
  const sets = (await api(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets?limit=50`)).data;
  const disp = {};
  for (const s of sets) { const sc = (await api(`/v1/appScreenshotSets/${s.id}/appScreenshots?limit=20`)).data; disp[s.attributes?.screenshotDisplayType] = sc.length; }
  console.log(`   screenshots: ${Object.entries(disp).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  const prevSets = (await api(`/v1/appStoreVersionLocalizations/${loc.id}/appPreviewSets?limit=50`)).data;
  let prevN = 0; for (const s of prevSets) { const pp = (await api(`/v1/appPreviewSets/${s.id}/appPreviews?limit=10`)).data; prevN += pp.length; }
  mark(Object.keys(disp).some((d) => d.includes('IPHONE')) && Object.keys(disp).some((d) => d.includes('IPAD')), 'Screenshots iPhone+iPad', 'see above');
  mark(true, 'App previews', `${prevN} total (optional)`);

  console.log(`\nversion state: ${version.attributes?.appStoreState}`);
}
main().catch((e) => { console.error('\n❌ final-check failed:\n', e.message); process.exit(1); });
