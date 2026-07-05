#!/usr/bin/env node
// Add a FREE-TRIAL introductory offer to an App Store subscription via the
// App Store Connect API. Written to add the 7-day free trial to the YEARLY
// plan (chess_academy_pro_yearly) so it matches the monthly plan — the paywall
// reads the trial straight from the product (introPrice.price === 0), so no
// app rebuild is needed once this lands.
//
// Idempotent: if the target subscription already has a FREE_TRIAL introductory
// offer, it prints that and exits 0 without creating a duplicate.
//
// Credentials come from env (GitHub Actions secrets, same as distribute-testflight):
//   APP_STORE_CONNECT_API_KEY        base64 of the .p8 private key
//   APP_STORE_CONNECT_API_KEY_ID     e.g. 756B4W9NYV
//   APP_STORE_CONNECT_API_ISSUER_ID  e.g. 576ea9e6-...
// Optional env:
//   SUB_PRODUCT_ID   subscription product id to target (default: yearly)
//   TRIAL_DURATION   ASC duration enum (default: ONE_WEEK)
import crypto from 'node:crypto';

const APP = '6776418777';
const PRODUCT_ID = process.env.SUB_PRODUCT_ID || 'chess_academy_pro_yearly';
const DURATION = process.env.TRIAL_DURATION || 'ONE_WEEK';

const KEY_ID = need('APP_STORE_CONNECT_API_KEY_ID');
const ISSUER_ID = need('APP_STORE_CONNECT_API_ISSUER_ID');
const PEM = Buffer.from(need('APP_STORE_CONNECT_API_KEY'), 'base64').toString('utf8');

function need(name) {
  const v = process.env[name];
  if (!v) { console.error(`::error::missing env ${name}`); process.exit(1); }
  return v;
}
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }))}`;
  const der = crypto.sign('sha256', Buffer.from(si), { key: crypto.createPrivateKey(PEM), dsaEncoding: 'ieee-p1363' });
  return `${si}.${b64url(der)}`;
}
async function api(method, path, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}

const main = async () => {
  // 1. Find every subscription across all groups.
  const groups = await api('GET', `/v1/apps/${APP}/subscriptionGroups?limit=200`);
  if (groups.status >= 400) { console.error(`::error::subscriptionGroups ${groups.status} ${JSON.stringify(groups.j).slice(0, 300)}`); process.exit(1); }
  const groupIds = (groups.j.data || []).map((g) => g.id);
  console.log(`subscription groups: ${groupIds.length}`);

  const allSubs = [];
  for (const gid of groupIds) {
    const subs = await api('GET', `/v1/subscriptionGroups/${gid}/subscriptions?limit=200&fields[subscriptions]=productId,name,state`);
    for (const s of subs.j.data || []) allSubs.push(s);
  }

  // 1b. DIAGNOSTIC report — the info that tells us if 2.1(b) is really cleared:
  //     each sub's state, whether it has a localized name + a review screenshot
  //     (missing either ⇒ "Missing Metadata"), and its intro offers.
  console.log('\n══════════ SUBSCRIPTION DIAGNOSTIC ══════════');
  for (const s of allSubs) {
    const locs = await api('GET', `/v1/subscriptions/${s.id}/subscriptionLocalizations?limit=200&fields[subscriptionLocalizations]=locale,name`);
    const shot = await api('GET', `/v1/subscriptions/${s.id}/appStoreReviewScreenshot?fields[subscriptionAppStoreReviewScreenshots]=assetDeliveryState`);
    const offs = await api('GET', `/v1/subscriptions/${s.id}/introductoryOffers?limit=200&fields[subscriptionIntroductoryOffers]=offerMode,duration,numberOfPeriods,endDate`);
    const locNames = (locs.j.data || []).map((l) => `${l.attributes.locale}:${l.attributes.name}`);
    const hasShot = !!(shot.j && shot.j.data && shot.j.data.id);
    const offerStr = (offs.j.data || []).map((o) => `${o.attributes.offerMode}/${o.attributes.duration}`).join(', ') || 'none';
    console.log(`\n  ${s.attributes.productId} — ${s.attributes.name}`);
    console.log(`    state:            ${s.attributes.state}`);
    console.log(`    localizations:    ${locNames.length ? locNames.join(', ') : '⚠ NONE (→ Missing Metadata)'}`);
    console.log(`    review screenshot:${hasShot ? ' present' : ' ⚠ MISSING (→ Missing Metadata)'}`);
    console.log(`    intro offers:     ${offerStr}`);
  }

  // 1c. App-version state (is 2.8 in review / what state?).
  const vers = await api('GET', `/v1/apps/${APP}/appStoreVersions?limit=5&fields[appStoreVersions]=versionString,appStoreState,createdDate&sort=-createdDate`);
  console.log('\n══════════ APP STORE VERSIONS ══════════');
  for (const v of vers.j.data || []) console.log(`  ${v.attributes.versionString} — ${v.attributes.appStoreState}`);
  console.log('════════════════════════════════════════\n');

  const sub = allSubs.find((s) => s.attributes.productId === PRODUCT_ID);
  if (!sub) { console.error(`::error::subscription with productId=${PRODUCT_ID} not found`); process.exit(1); }
  console.log(`target for free trial: ${sub.attributes.productId} [${sub.attributes.state}] (${sub.id})`);

  // 2. Already has a free-trial introductory offer? Then we're done.
  const existing = await api('GET', `/v1/subscriptions/${sub.id}/introductoryOffers?limit=200&fields[subscriptionIntroductoryOffers]=offerMode,duration,numberOfPeriods,startDate,endDate`);
  const offers = existing.j.data || [];
  console.log(`existing introductory offers: ${offers.length}`);
  for (const o of offers) console.log(`  · ${o.attributes.offerMode} ${o.attributes.duration} x${o.attributes.numberOfPeriods} (end=${o.attributes.endDate ?? 'none'})`);
  const activeFreeTrial = offers.find((o) => o.attributes.offerMode === 'FREE_TRIAL' && !o.attributes.endDate);
  if (activeFreeTrial) {
    console.log(`\n✓ Yearly already has an open-ended FREE_TRIAL (${activeFreeTrial.attributes.duration}) — nothing to do.`);
    return;
  }

  // 3. Create the free-trial offer. No territory ⇒ all territories; no price
  //    point needed for FREE_TRIAL; no end date ⇒ open-ended.
  const body = {
    data: {
      type: 'subscriptionIntroductoryOffers',
      attributes: { duration: DURATION, offerMode: 'FREE_TRIAL', numberOfPeriods: 1 },
      relationships: { subscription: { data: { type: 'subscriptions', id: sub.id } } },
    },
  };
  const created = await api('POST', '/v1/subscriptionIntroductoryOffers', body);
  console.log(`\ncreate: ${created.status}`);
  if (created.status >= 400) {
    console.error(`::error::create failed ${created.status} ${JSON.stringify(created.j)}`);
    process.exit(1);
  }
  console.log(`✓ Created FREE_TRIAL ${DURATION} on ${PRODUCT_ID} (offer id ${created.j.data?.id}).`);
  console.log('The paywall will show the yearly trial automatically — no rebuild needed.');
};
main().catch((e) => { console.error(e); process.exit(1); });
