#!/usr/bin/env node
// Read-only submission readiness probe: reports the state of every item the
// "Add for Review" checklist requires, straight from the ASC API.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';
import { appVersion } from './app-version.mjs';
import { pickSubmissionAppInfo } from './app-info-pick.mjs';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = appVersion();

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
  const allVersions = (await api(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data;
  const version = allVersions.find((v) => v.attributes?.versionString === VERSION);
  if (!version) {
    // Diagnose instead of crashing on undefined.attributes — a readiness probe
    // must report the state, and "the version doesn't exist yet" IS the state.
    // Apple does NOT auto-create the appStoreVersion on build upload; run
    // create-asc-version.yml (create-asc-version.mjs) first.
    console.log(`\n=== ${BUNDLE_ID} v${VERSION} ===\n`);
    mark(false, `appStoreVersion ${VERSION}`, 'DOES NOT EXIST — run create-asc-version.yml to create it first');
    const existing = allVersions.map((v) => `${v.attributes?.versionString} (${v.attributes?.appStoreState})`).join(', ');
    console.log(`existing iOS versions: ${existing || 'none'}`);
    process.exit(1);
  }
  console.log(`\n=== ${BUNDLE_ID} v${VERSION} — state ${version.attributes?.appStoreState} ===\n`);

  mark(!!version.attributes?.copyright, 'Copyright', version.attributes?.copyright || 'MISSING');
  mark(!!appFull.data.attributes?.contentRightsDeclaration, 'Content Rights', appFull.data.attributes?.contentRightsDeclaration || 'MISSING');

  // Category
  const info = pickSubmissionAppInfo((await api(`/v1/apps/${app.id}/appInfos?limit=10`)).data);
  const infoFull = await api(`/v1/appInfos/${info.id}?include=primaryCategory,secondaryCategory,primarySubcategoryOne`);
  const rel = infoFull.data.relationships || {};
  const primCat = rel.primaryCategory?.data?.id;
  const secCat = rel.secondaryCategory?.data?.id;
  mark(!!primCat, 'Primary category', primCat ? `${primCat}${secCat ? ` + ${secCat}` : ''}` : 'MISSING');

  // Age rating
  const ar = await api(`/v1/appInfos/${info.id}/ageRatingDeclaration`);
  if (ar.data) {
    const a = ar.data.attributes || {};
    // EVERY question answered, not any one (submit 2026-11-07: this read went
    // green with a new required question blank, and Apple refused the review).
    // Korea's GRAC number exists only for a game Korea rated; kidsAgeBand only in
    // the Kids Category; the info URL is the developer's choice.
    const OPTIONAL = new Set(['kidsAgeBand', 'developerAgeRatingInfoUrl', 'koreaAgeRatingOverride', 'gracRatingClassificationNumber']);
    const blank = Object.keys(a).filter((k) => (a[k] === null || a[k] === undefined) && !OPTIONAL.has(k));
    mark(blank.length === 0, 'Age rating', blank.length ? `BLANK: ${blank.join(', ')}` : 'every question answered');
    console.log(`   ${JSON.stringify(a)}`);
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
    for (const s of ss) {
      total++;
      const st = s.attributes?.state;
      if (st === 'READY_TO_SUBMIT' || st === 'APPROVED') ready++;
      // Per-subscription state so a "0/N ready" result is diagnosable — a
      // sub sitting in WAITING_FOR_REVIEW is fine (reviewed with the app);
      // MISSING_METADATA / DEVELOPER_ACTION_NEEDED will get the app rejected.
      console.log(`   • ${s.attributes?.name || s.attributes?.productId || s.id}: ${st}`);
    }
  }
  mark(ready === total && total > 0, 'Subscriptions ready', `${ready}/${total} READY_TO_SUBMIT`);

  // PRICES, TRIAL AND THE OPENING PRODUCT AS THE STORE SELLS THEM (read only)
  // — the description quotes them, so they are read off App Store Connect,
  // never off memory (2026-11-07: the description said $3.99 / $34.99 while
  // src/data/pricing.ts said $1.99 / $14.99).
  const { readFileSync } = await import('node:fs');
  const pricing = readFileSync('src/data/pricing.ts', 'utf8');
  const priceOf = (name) => pricing.match(new RegExp(`export const ${name}\\s*=\\s*'\\$(\\d+\\.\\d{2})'`))?.[1] ?? null;
  const today = new Date().toISOString().slice(0, 10);
  for (const g of subs) {
    const ss = (await api(`/v1/subscriptionGroups/${g.id}/subscriptions?limit=20`)).data;
    for (const s of ss) {
      const pr = await api(`/v1/subscriptions/${s.id}/prices?filter[territory]=USA&limit=200&include=subscriptionPricePoint`);
      const points = new Map((pr.included || []).filter((i) => i.type === 'subscriptionPricePoints').map((i) => [i.id, i]));
      const rows = (pr.data || []).map((d) => ({ start: d.attributes?.startDate ?? null, price: points.get(d.relationships?.subscriptionPricePoint?.data?.id)?.attributes?.customerPrice ?? null }));
      const live = rows.filter((r) => r.start === null || r.start <= today).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')).at(-1)?.price ?? null;
      const later = rows.filter((r) => r.start !== null && r.start > today).map((r) => `${r.price} from ${r.start}`);
      const offers = (await api(`/v1/subscriptions/${s.id}/introductoryOffers?limit=200&include=territory`));
      const usOffer = (offers.data || []).find((o) => o.relationships?.territory?.data?.id === 'USA') ?? (offers.data || [])[0];
      const trial = usOffer ? `${usOffer.attributes?.offerMode} ${usOffer.attributes?.duration} ×${usOffer.attributes?.numberOfPeriods}` : 'none';
      const period = s.attributes?.subscriptionPeriod;
      const expected = period === 'ONE_YEAR' ? priceOf('PRICE_YEARLY') : priceOf('PRICE_MONTHLY');
      mark(live !== null && expected !== null && Number(live) === Number(expected), `Price ${s.attributes?.productId} (${period})`,
        `USA ${live ?? 'none'}${later.length ? ` (scheduled: ${later.join(', ')})` : ''}; pricing.ts says ${expected ?? '?'}; intro offer: ${trial}`);
    }
  }
  const openingIaps = await api(`/v1/apps/${app.id}/inAppPurchasesV2?limit=200&fields[inAppPurchases]=productId,name,state`);
  const states = {};
  for (const p of openingIaps.data || []) states[p.attributes?.state] = (states[p.attributes?.state] ?? 0) + 1;
  console.log(`opening products: ${(openingIaps.data || []).length} — ${Object.entries(states).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const sample = (openingIaps.data || [])[0];
  if (sample) {
    const mp = await api(`/v1/inAppPurchasePriceSchedules/${sample.id}/manualPrices?filter[territory]=USA&include=inAppPurchasePricePoint&limit=50`);
    const live = (mp.included || []).find((i) => i.type === 'inAppPurchasePricePoints')?.attributes?.customerPrice ?? null;
    mark(live !== null && Number(live) === Number(priceOf('PRICE_OPENING')), `Opening price (${sample.attributes?.productId})`, `USA ${live ?? 'none'}; pricing.ts says ${priceOf('PRICE_OPENING')}`);
  }
  const locs = (await api(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=20`)).data || [];
  const en = locs.find((l) => l.attributes?.locale === 'en-US') ?? locs[0];
  const desc = en?.attributes?.description ?? '';
  const quoted = [...desc.matchAll(/\$\d+\.\d{2}/g)].map((m) => m[0]);
  console.log(`live description (${en?.attributes?.locale ?? '?'}): ${desc.length} chars; prices quoted: ${quoted.join(', ') || 'none'}; first line: ${desc.split('\n')[0]}`);
}
main().catch((e) => { console.error('\n❌ readiness failed:\n', e.message); process.exit(1); });
