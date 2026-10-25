#!/usr/bin/env node
// Create the App Store products for openings sold one at a time — one
// NON-CONSUMABLE per row of src/data/opening-products.json, $0.99 each (David
// 2026-10-25: "Let's try selling the openings. I like the 0.99" → "À la carte").
//
// Runs where the credentials live (workflow "ASC — opening products"); a Claude
// session has none of the APP_STORE_CONNECT_* secrets.
//
// 🔒 DRY RUN BY DEFAULT. Nothing is written unless APPLY=1. A product id is
// FOREVER — Apple never lets one be reused, even after deletion — so the first
// real run should be ONE product (ONLY=italian-game), checked in TestFlight,
// before the other 131.
//
// IDEMPOTENT. Every step reads before it writes, so a run that stopped half way
// (a rate limit, a network drop) is finished by running it again.
//
// Per product, in order: create the in-app purchase → its version + en-US
// display name/description → the USA price at PRICE_OPENING → sold in every
// territory → the review screenshot → (SUBMIT=1) submitted for review.
//
// 🔒 IT IS ALSO THE DRIFT DETECTOR for PRICE_OPENING in src/data/pricing.ts,
// the same job asc-set-sub-price.mjs does for the subscription: every existing
// opening product's live USA price must equal it, or the run fails.
//
// Env:
//   APP_STORE_CONNECT_API_KEY (base64 .p8), _KEY_ID, _ISSUER_ID
//   APPLY=1            write (default: dry run)
//   SUBMIT=1           also submit each ready product for App Review
//   ONLY=a,b           limit to these opening ids (or product ids)
//   SCREENSHOT_PATH    review screenshot (default fastlane/review/opening-unlock.png)
import crypto from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';

const APP = '6776418777';
const TERRITORY = 'USA';
const APPLY = process.env.APPLY === '1';
const SUBMIT = process.env.SUBMIT === '1';
const ONLY = (process.env.ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const SHOT = process.env.SCREENSHOT_PATH || 'fastlane/review/opening-unlock.png';
const ASC = 'https://api.appstoreconnect.apple.com';
// Apple's inline-creation id: the literal text "${…}" (409 INVALID_ID otherwise).
const LOCAL_PRICE_ID = `\${price0}`;

const need = (name) => {
  const v = process.env[name];
  if (!v) { console.error(`::error::missing env ${name}`); process.exit(1); }
  return v;
};
const KEY_ID = need('APP_STORE_CONNECT_API_KEY_ID');
const ISSUER_ID = need('APP_STORE_CONNECT_API_ISSUER_ID');
const PEM = Buffer.from(need('APP_STORE_CONNECT_API_KEY'), 'base64').toString('utf8');

const b64url = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }))}`;
  const der = crypto.sign('sha256', Buffer.from(si), { key: crypto.createPrivateKey(PEM), dsaEncoding: 'ieee-p1363' });
  return `${si}.${b64url(der)}`;
}
async function api(method, path, body) {
  for (let attempt = 0; ; attempt += 1) {
    const r = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
      method,
      headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch { j = t; }
    // Rate limit / transient: back off and retry (the 132-product run makes
    // ~1,000 calls; Apple's hourly budget is 3,600).
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
      continue;
    }
    return { status: r.status, j };
  }
}
const short = (r) => JSON.stringify(r.j).slice(0, 400);
const fail = (msg) => { console.error(`::error::${msg}`); process.exit(1); };
async function all(path) {
  const out = [];
  let next = path;
  while (next) {
    const page = await api('GET', next);
    if (page.status >= 400) return { status: page.status, j: page.j, data: out };
    out.push(...(page.j.data || []));
    next = page.j.links?.next ?? null;
  }
  return { status: 200, data: out };
}

function repoOpeningPrice() {
  const src = readFileSync(new URL('../../src/data/pricing.ts', import.meta.url), 'utf8');
  const m = src.match(/export const PRICE_OPENING\s*=\s*'\$(\d+\.\d{2})'/);
  if (!m) fail('could not parse PRICE_OPENING out of src/data/pricing.ts — did the shape change?');
  return m[1];
}

const reviewNote = (price) => [
  'Unlocks one opening course for good: its Learn, Practice and Play lessons on every line.',
  'To reach it: open the Openings tab, complete a lesson on one opening (the free one), then',
  `tap Learn on a different opening — the screen offers "Unlock for $${price}" for that opening.`,
  'Watch and browsing stay free on every opening.',
].join(' ');

const main = async () => {
  const price = repoOpeningPrice();
  const { products } = JSON.parse(readFileSync(new URL('../../src/data/opening-products.json', import.meta.url), 'utf8'));
  const targets = ONLY.length ? products.filter((p) => ONLY.includes(p.openingId) || ONLY.includes(p.productId)) : products;
  if (ONLY.length && targets.length !== ONLY.length) fail(`ONLY named ${ONLY.length}, matched ${targets.length} — check the ids`);
  console.log(APPLY ? `⚠️  APPLY=1 — this WILL create live products${SUBMIT ? ' AND submit them for review' : ''}` : '🔍 DRY RUN — nothing will be written (APPLY=1 to commit)');
  console.log(`${targets.length} of ${products.length} opening products · price ${price} ${TERRITORY} · screenshot ${SHOT}${existsSync(SHOT) ? '' : ' (MISSING)'}\n`);

  // Every in-app purchase the app already has, by product id.
  const existing = await all(`/v1/apps/${APP}/inAppPurchasesV2?limit=200&fields[inAppPurchases]=productId,name,state,inAppPurchaseType`);
  if (existing.status >= 400) fail(`inAppPurchasesV2 ${existing.status} ${short(existing)}`);
  const byProductId = new Map(existing.data.map((d) => [d.attributes.productId, d]));
  console.log(`the app has ${existing.data.length} in-app purchase(s) today\n`);

  let territories = null;
  const drift = [];
  const tally = { created: 0, localized: 0, priced: 0, available: 0, screenshot: 0, submitted: 0, ready: 0, planned: 0 };
  const versionsToSubmit = [];

  for (const p of targets) {
    let iap = byProductId.get(p.productId);
    const tag = `${p.productId} (${p.name})`;
    if (!iap) {
      if (!APPLY) { console.log(`➕ ${tag} — would create`); tally.planned += 1; continue; }
      const r = await api('POST', '/v2/inAppPurchases', {
        data: {
          type: 'inAppPurchases',
          attributes: { name: `Opening ${p.openingId}`.slice(0, 64), productId: p.productId, inAppPurchaseType: 'NON_CONSUMABLE', reviewNote: reviewNote(price), familySharable: false },
          relationships: { app: { data: { type: 'apps', id: APP } } },
        },
      });
      if (r.status >= 400) fail(`create ${tag}: ${r.status} ${short(r)}`);
      iap = r.j.data;
      tally.created += 1;
      console.log(`➕ ${tag} — created ${iap.id}`);
    } else {
      console.log(`✓ ${tag} — exists ${iap.id} state=${iap.attributes.state}`);
    }
    const id = iap.id;

    // ── Display name + description (version-based; legacy fallback). ──
    let versionId = null;
    const versions = await api('GET', `/v2/inAppPurchases/${id}/versions?limit=50`);
    if (versions.status < 400) {
      const open = (versions.j.data || []).find((v) => ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'APPROVED'].includes(v.attributes?.state));
      versionId = open?.id ?? null;
      if (!versionId && APPLY) {
        const v = await api('POST', '/v1/inAppPurchaseVersions', { data: { type: 'inAppPurchaseVersions', relationships: { inAppPurchase: { data: { type: 'inAppPurchases', id } } } } });
        if (v.status >= 400) fail(`version ${tag}: ${v.status} ${short(v)}`);
        versionId = v.j.data.id;
      }
    }
    const locs = versionId
      ? await api('GET', `/v1/inAppPurchaseVersions/${versionId}/localizations?limit=50`)
      : await api('GET', `/v2/inAppPurchases/${id}/inAppPurchaseLocalizations?limit=50`);
    const hasEn = locs.status < 400 && (locs.j.data || []).some((l) => l.attributes?.locale === 'en-US');
    if (!hasEn) {
      if (!APPLY) console.log('   would add en-US name/description');
      else {
        const body = versionId
          ? { data: { type: 'inAppPurchaseLocalizations', attributes: { locale: 'en-US', name: p.name, description: p.description }, relationships: { version: { data: { type: 'inAppPurchaseVersions', id: versionId } } } } }
          : { data: { type: 'inAppPurchaseLocalizations', attributes: { locale: 'en-US', name: p.name, description: p.description }, relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } } } } };
        const r = await api('POST', versionId ? '/v2/inAppPurchaseLocalizations' : '/v1/inAppPurchaseLocalizations', body);
        if (r.status >= 400) fail(`localization ${tag}: ${r.status} ${short(r)}`);
        tally.localized += 1;
      }
    }

    // ── Price: read the live USA price; set it when there is none. ──
    const cur = await api('GET', `/v1/inAppPurchasePriceSchedules/${id}/manualPrices?filter[territory]=${TERRITORY}&include=inAppPurchasePricePoint&limit=50`);
    const curPoint = cur.status < 400 ? (cur.j.included || []).find((i) => i.type === 'inAppPurchasePricePoints') : null;
    const live = curPoint?.attributes?.customerPrice ?? null;
    if (live !== null) {
      if (Number(live) !== Number(price)) drift.push(`${p.productId} sells at ${live}, PRICE_OPENING says ${price}`);
    } else if (!APPLY) {
      console.log(`   would price at ${price} ${TERRITORY}`);
    } else {
      const points = await all(`/v2/inAppPurchases/${id}/pricePoints?filter[territory]=${TERRITORY}&limit=200`);
      if (points.status >= 400) fail(`pricePoints ${tag}: ${points.status} ${short(points)}`);
      const point = points.data.find((pt) => Number(pt.attributes.customerPrice) === Number(price));
      if (!point) fail(`${tag}: no ${TERRITORY} price point at ${price}`);
      const r = await api('POST', '/v1/inAppPurchasePriceSchedules', {
        data: {
          type: 'inAppPurchasePriceSchedules',
          relationships: {
            inAppPurchase: { data: { type: 'inAppPurchases', id } },
            baseTerritory: { data: { type: 'territories', id: TERRITORY } },
            manualPrices: { data: [{ type: 'inAppPurchasePrices', id: LOCAL_PRICE_ID }] },
          },
        },
        included: [{
          type: 'inAppPurchasePrices',
          id: LOCAL_PRICE_ID,
          attributes: { startDate: null },
          relationships: {
            inAppPurchaseV2: { data: { type: 'inAppPurchases', id } },
            inAppPurchasePricePoint: { data: { type: 'inAppPurchasePricePoints', id: point.id } },
          },
        }],
      });
      if (r.status >= 400) fail(`price ${tag}: ${r.status} ${short(r)}`);
      tally.priced += 1;
    }

    // ── Sold in every territory. ──
    const avail = await api('GET', `/v2/inAppPurchases/${id}/inAppPurchaseAvailability`);
    const hasAvail = avail.status < 400 && avail.j.data;
    if (!hasAvail) {
      if (!APPLY) console.log('   would make it available in every territory');
      else {
        if (!territories) {
          const t = await all('/v1/territories?limit=200');
          if (t.status >= 400) fail(`territories ${t.status} ${short(t)}`);
          territories = t.data.map((d) => ({ type: 'territories', id: d.id }));
        }
        const r = await api('POST', '/v1/inAppPurchaseAvailabilities', {
          data: {
            type: 'inAppPurchaseAvailabilities',
            attributes: { availableInNewTerritories: true },
            relationships: {
              inAppPurchase: { data: { type: 'inAppPurchases', id } },
              availableTerritories: { data: territories },
            },
          },
        });
        if (r.status >= 400) fail(`availability ${tag}: ${r.status} ${short(r)}`);
        tally.available += 1;
      }
    }

    // ── Review screenshot (reserve → PUT → commit). ──
    const shot = await api('GET', `/v2/inAppPurchases/${id}/appStoreReviewScreenshot`);
    const hasShot = shot.status < 400 && shot.j.data;
    if (!hasShot) {
      if (!existsSync(SHOT)) console.log(`   ⚠ no review screenshot at ${SHOT} — cannot be submitted until one is attached`);
      else if (!APPLY) console.log('   would attach the review screenshot');
      else {
        const bytes = readFileSync(SHOT);
        const reserve = await api('POST', '/v1/inAppPurchaseAppStoreReviewScreenshots', {
          data: {
            type: 'inAppPurchaseAppStoreReviewScreenshots',
            attributes: { fileName: basename(SHOT), fileSize: statSync(SHOT).size },
            relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id } } },
          },
        });
        if (reserve.status >= 400) fail(`screenshot reserve ${tag}: ${reserve.status} ${short(reserve)}`);
        for (const op of reserve.j.data.attributes.uploadOperations || []) {
          const chunk = bytes.subarray(op.offset, op.offset + op.length);
          const headers = Object.fromEntries((op.requestHeaders || []).map((h) => [h.name, h.value]));
          const up = await fetch(op.url, { method: op.method, headers, body: chunk });
          if (!up.ok) fail(`screenshot upload ${tag}: ${up.status}`);
        }
        const md5 = crypto.createHash('md5').update(bytes).digest('hex');
        const commit = await api('PATCH', `/v1/inAppPurchaseAppStoreReviewScreenshots/${reserve.j.data.id}`, {
          data: { type: 'inAppPurchaseAppStoreReviewScreenshots', id: reserve.j.data.id, attributes: { uploaded: true, sourceFileChecksum: md5 } },
        });
        if (commit.status >= 400) fail(`screenshot commit ${tag}: ${commit.status} ${short(commit)}`);
        tally.screenshot += 1;
      }
    }

    // Re-read the state Apple now reports.
    const after = await api('GET', `/v2/inAppPurchases/${id}?fields[inAppPurchases]=state`);
    const state = after.j?.data?.attributes?.state ?? 'unknown';
    console.log(`   state=${state}`);
    if (state === 'READY_TO_SUBMIT') {
      tally.ready += 1;
      versionsToSubmit.push({ id, versionId, tag });
    }
  }

  // ── Submit for App Review (review submissions; legacy fallback). ──
  if (SUBMIT && APPLY && versionsToSubmit.length) {
    const sub = await api('POST', '/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP } } } } });
    const submissionId = sub.status < 400 ? sub.j.data.id : null;
    for (const v of versionsToSubmit) {
      let ok = false;
      if (submissionId && v.versionId) {
        const item = await api('POST', '/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } }, inAppPurchaseVersion: { data: { type: 'inAppPurchaseVersions', id: v.versionId } } } } });
        ok = item.status < 400;
      }
      if (!ok) {
        const legacy = await api('POST', '/v1/inAppPurchaseSubmissions', { data: { type: 'inAppPurchaseSubmissions', relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: v.id } } } } });
        if (legacy.status >= 400) fail(`submit ${v.tag}: ${legacy.status} ${short(legacy)}`);
      }
      tally.submitted += 1;
    }
    if (submissionId) {
      const done = await api('PATCH', `/v1/reviewSubmissions/${submissionId}`, { data: { type: 'reviewSubmissions', id: submissionId, attributes: { submitted: true } } });
      if (done.status >= 400) fail(`review submission ${submissionId}: ${done.status} ${short(done)}`);
    }
  }

  console.log(`\nsummary: ${JSON.stringify(tally)}`);
  if (drift.length) fail(`PRICE_OPENING drift:\n  ${drift.join('\n  ')}\nThe store moved; src/data/pricing.ts did not.`);
};

main().catch((e) => fail(e?.stack || String(e)));
