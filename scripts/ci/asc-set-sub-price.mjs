#!/usr/bin/env node
// Change the price of an App Store subscription, via the App Store Connect API.
//
// David 2026-08-16: $7.99/mo → $3.99/mo, and $79.99/yr → $34.99/yr.
//
// The yearly target came from him as an EFFECTIVE MONTHLY: "best value should
// be equal to 2.99/mo". That is $35.88/yr, which is not an Apple tier — Apple
// prices by tier and they land on .99. $34.99 is the nearest tier AT OR BELOW
// it: $2.92/mo effective, so the 2.99 claim holds instead of rounding up
// against the customer. ($35.99 would be $3.00/mo — over the line he drew.)
//
// Against $3.99/mo that is 27% off, ~3.2 months free — a "BEST VALUE" badge
// that means something, where 39.99 was only ~16%.
//
// 🔒 DRY RUN BY DEFAULT. This writes to a LIVE store with paying subscribers,
// and a price is not a thing to discover you got wrong afterwards. Nothing is
// created unless APPLY=1 is set explicitly. The dry run resolves and prints the
// exact price point it WOULD use, per product, so the change can be read before
// it is made.
//
// WHAT THIS DOES AND DOES NOT DO TO EXISTING SUBSCRIBERS. A new
// `subscriptionPrices` entry sets the price for NEW subscribers. Whether
// existing subscribers move to it is `preserveCurrentPrice`: false migrates
// them (Apple applies a DECREASE without asking consent), true leaves them on
// what they pay now. Default here is to MIGRATE, because this is a price cut
// and leaving two paying members above the public price is the worse outcome —
// set PRESERVE=1 to override.
//
// Credentials (GitHub Actions secrets — absent from a Claude session):
//   APP_STORE_CONNECT_API_KEY        base64 of the .p8 private key
//   APP_STORE_CONNECT_API_KEY_ID
//   APP_STORE_CONNECT_API_ISSUER_ID
// Optional env:
//   APPLY=1        actually create the prices (default: dry run)
//   PRESERVE=1     keep existing subscribers on their current price
//   TERRITORY      base territory to price from (default USA)
//   MONTHLY_USD / YEARLY_USD   target prices (default 3.99 / 34.99)
import crypto from 'node:crypto';

const APP = '6776418777';
const TERRITORY = process.env.TERRITORY || 'USA';
const APPLY = process.env.APPLY === '1';
const PRESERVE = process.env.PRESERVE === '1';
// A price CHANGE on an already-approved subscription needs an effective date.
// With startDate:null Apple treats the POST as setting the INITIAL price and
// rejects it 409 "Initial price cannot be created again after subscription is
// approved" (hit 2026-08-24 on the live monthly). Default to today (UTC); a
// decrease takes effect from this date and existing subscribers migrate down.
const START_DATE = process.env.START_DATE || new Date().toISOString().slice(0, 10);

/** productId → target price, as a plain number of dollars. */
const TARGETS = {
  chess_academy_pro_monthly: Number(process.env.MONTHLY_USD || '3.99'),
  chess_academy_pro_yearly: Number(process.env.YEARLY_USD || '34.99'),
};

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
const fail = (msg) => { console.error(`::error::${msg}`); process.exit(1); };

const main = async () => {
  console.log(APPLY ? '⚠️  APPLY=1 — this WILL change live prices' : '🔍 DRY RUN — nothing will be written (set APPLY=1 to commit)');
  console.log(`territory=${TERRITORY} · existing subscribers: ${PRESERVE ? 'KEPT on current price' : 'MIGRATED to the new price'}\n`);

  // 1. Every subscription under the app, across all groups.
  const groups = await api('GET', `/v1/apps/${APP}/subscriptionGroups?limit=200`);
  if (groups.status >= 400) fail(`subscriptionGroups ${groups.status} ${JSON.stringify(groups.j).slice(0, 300)}`);

  const subs = [];
  for (const g of groups.j.data || []) {
    const r = await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=200&fields[subscriptions]=productId,name,state`);
    if (r.status >= 400) fail(`subscriptions ${r.status} ${JSON.stringify(r.j).slice(0, 300)}`);
    for (const s of r.j.data || []) subs.push(s);
  }
  console.log(`found ${subs.length} subscription(s): ${subs.map((s) => s.attributes.productId).join(', ')}\n`);

  let planned = 0;
  for (const [productId, usd] of Object.entries(TARGETS)) {
    const sub = subs.find((s) => s.attributes.productId === productId);
    if (!sub) { console.log(`⏭  ${productId} — not found on this app, skipping`); continue; }

    // 2. Current price — for THIS territory. The prices endpoint returns every
    //    territory Apple sells in, so taking the first included price point
    //    reports some other market's number as if it were ours. The first dry
    //    run did exactly that and claimed "currently 29.99", which is not what
    //    anyone pays here. Filter, then read.
    const cur = await api('GET',
      `/v1/subscriptions/${sub.id}/prices?filter[territory]=${TERRITORY}&limit=200&include=subscriptionPricePoint`);
    const curPoint = (cur.j.included || []).find((i) => i.type === 'subscriptionPricePoints');
    console.log(`${productId}: currently ${curPoint?.attributes?.customerPrice ?? 'unknown'} ${TERRITORY} → target ${usd.toFixed(2)}`);

    // 3. Resolve the price POINT. Apple prices by tier, not by arbitrary
    //    number, so the target has to match a real point in this territory —
    //    asking for 3.99 when the tier is 3.99 is fine, asking for 3.98 is not.
    //
    //    PAGINATE. A single limit=200 page is not the whole ladder: the yearly
    //    subscription's tiers ran past it, so 34.99 came back "not a tier" AND
    //    the nearby-tier hint came back empty — a failure that told us nothing,
    //    because the answer was on page two.
    const pricePoints = [];
    let next = `/v1/subscriptions/${sub.id}/pricePoints?filter[territory]=${TERRITORY}&limit=200`;
    while (next) {
      const page = await api('GET', next);
      if (page.status >= 400) fail(`pricePoints ${page.status} ${JSON.stringify(page.j).slice(0, 300)}`);
      pricePoints.push(...(page.j.data || []));
      const link = page.j.links?.next;
      next = link ? link.replace('https://api.appstoreconnect.apple.com', '') : null;
    }
    const priceOf = (p) => Number(p.attributes.customerPrice);
    const match = pricePoints.find((p) => priceOf(p) === usd);
    if (!match) {
      // Show the real ladder around the target rather than a fixed ±1.50
      // window that can legitimately contain nothing — the point of failing
      // here is to say what to ask for instead.
      const sorted = [...pricePoints].sort((a, b) => priceOf(a) - priceOf(b));
      const i = sorted.findIndex((p) => priceOf(p) > usd);
      const around = (i < 0 ? sorted.slice(-6) : sorted.slice(Math.max(0, i - 3), i + 3)).map(priceOf);
      fail(`${productId}: no ${TERRITORY} price point at ${usd.toFixed(2)} — ${pricePoints.length} tiers exist; nearest: ${around.join(', ') || 'none'}`);
    }
    console.log(`   price point ${match.id} = ${match.attributes.customerPrice} ${TERRITORY}`);

    if (!APPLY) { planned += 1; console.log('   (dry run — not created)\n'); continue; }

    const res = await api('POST', '/v1/subscriptionPrices', {
      data: {
        type: 'subscriptionPrices',
        attributes: { preserveCurrentPrice: PRESERVE, startDate: START_DATE },
        relationships: {
          subscription: { data: { type: 'subscriptions', id: sub.id } },
          subscriptionPricePoint: { data: { type: 'subscriptionPricePoints', id: match.id } },
        },
      },
    });
    if (res.status >= 400) fail(`${productId}: create price ${res.status} ${JSON.stringify(res.j).slice(0, 400)}`);
    console.log(`   ✅ created price ${res.j?.data?.id}\n`);
    planned += 1;
  }

  console.log(APPLY
    ? `done — ${planned} price(s) written. Verify in App Store Connect before announcing.`
    : `dry run complete — ${planned} price(s) would be written. Re-run with APPLY=1 to commit.`);
};

main().catch((e) => fail(String(e?.stack || e).slice(0, 500)));
