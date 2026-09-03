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
// 🔒 IT IS ALSO THE DRIFT DETECTOR FOR src/data/pricing.ts. The tiers moved on
// 2026-08-24 and nobody updated the repo, so for ten days the Terms of Service
// told customers $7.99 while Apple billed them $3.99 — with every test green,
// because a gate comparing those constants to EACH OTHER cannot see that they
// stopped describing the store. Nothing in a vitest run can: the answer is
// behind credentials that only exist here.
//
// So this script, which already has to read the live price, now also reads
// src/data/pricing.ts and FAILS on disagreement. In a dry run it compares
// against what Apple charges today; under APPLY it compares against the price
// just written, and fails AFTER the write with the remaining task named. A red
// job that says "the store moved, the repo did not" is the point — a warning
// is what got ignored last time.
//
//   APPLY=1        actually create the prices (default: dry run)
//   PRESERVE=1     keep existing subscribers on their current price
//   TERRITORY      base territory to price from (default USA)
//   MONTHLY_USD / YEARLY_USD   target prices (default 3.99 / 34.99)
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const APP = '6776418777';
const TERRITORY = process.env.TERRITORY || 'USA';
const APPLY = process.env.APPLY === '1';
const PRESERVE = process.env.PRESERVE === '1';
// A price CHANGE on an already-approved subscription needs an effective date,
// and Apple requires it STRICTLY IN THE FUTURE — startDate=today is rejected
// 409 "a future date is expected, and must be on or after <tomorrow>" (hit
// 2026-08-24). With startDate:null it instead 409s "Initial price cannot be
// created again after subscription is approved". So default to TOMORROW (UTC);
// the decrease takes effect then and existing subscribers migrate down.
const START_DATE = process.env.START_DATE
  || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

// Parse src/data/pricing.ts rather than importing it — this is a .mjs run by
// bare node, and the constants are plain string literals. Returns null per
// field if the shape is not what we expect, which is itself reported: a
// silently-unparsed file would make the drift check pass by doing nothing.
function repoPrices() {
  const path = new URL('../../src/data/pricing.ts', import.meta.url);
  let src;
  try { src = readFileSync(path, 'utf8'); }
  catch (e) { return { error: `cannot read src/data/pricing.ts: ${e.message}` }; }
  const grab = (name) => {
    const m = src.match(new RegExp(`export const ${name}\\s*=\\s*'\\$(\\d+\\.\\d{2})'`));
    return m ? Number(m[1]) : null;
  };
  const monthly = grab('PRICE_MONTHLY');
  const yearly = grab('PRICE_YEARLY');
  if (monthly === null || yearly === null) {
    return { error: 'could not parse PRICE_MONTHLY / PRICE_YEARLY out of src/data/pricing.ts — did the shape change?' };
  }
  return { monthly, yearly };
}

/** productId → the constant in pricing.ts that must describe it. */
const REPO_FIELD = {
  chess_academy_pro_monthly: 'monthly',
  chess_academy_pro_yearly: 'yearly',
};

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
  /** productId → the price that is true once this run finishes. */
  const effective = {};
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

    if (!APPLY) {
      planned += 1;
      // In a dry run nothing changes, so the price the repo must describe is
      // the one Apple charges right now — not the target we were asked about.
      const live = Number(curPoint?.attributes?.customerPrice);
      if (Number.isFinite(live)) effective[productId] = live;
      console.log('   (dry run — not created)\n');
      continue;
    }

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
    effective[productId] = usd;
    planned += 1;
  }

  console.log(APPLY
    ? `done — ${planned} price(s) written. Verify in App Store Connect before announcing.`
    : `dry run complete — ${planned} price(s) would be written. Re-run with APPLY=1 to commit.`);

  // ── DRIFT CHECK ────────────────────────────────────────────────────────────
  // The store is the source of truth; src/data/pricing.ts only describes it, on
  // the Terms of Service and Support pages. Disagreement means those pages are
  // quoting customers a price they are not charged.
  const repo = repoPrices();
  if (repo.error) fail(repo.error);

  const drift = [];
  for (const [productId, live] of Object.entries(effective)) {
    const field = REPO_FIELD[productId];
    if (!field) continue;                      // a product the prose never quotes
    if (repo[field] !== live) drift.push({ productId, field, live, repo: repo[field] });
  }

  if (!Object.keys(effective).length) {
    // Nothing was resolved, so the check verified nothing. Say that rather than
    // reporting a pass — a drift detector that silently checks zero products is
    // how the drift survived in the first place.
    fail('no prices were resolved, so the pricing.ts drift check verified NOTHING');
  }

  console.log(`\npricing.ts: monthly $${repo.monthly.toFixed(2)} · yearly $${repo.yearly.toFixed(2)} — checked against ${Object.keys(effective).length} live product(s)`);

  if (drift.length) {
    for (const d of drift) {
      console.error(`::error::${d.productId}: the store ${APPLY ? 'is now' : 'charges'} $${d.live.toFixed(2)} but src/data/pricing.ts says $${d.repo.toFixed(2)} — the Terms of Service and Support pages are quoting a price customers are not charged`);
    }
    fail(APPLY
      ? `prices WERE written successfully — the remaining task is to set ${drift.map((d) => `PRICE_${d.field.toUpperCase()} = '$${d.live.toFixed(2)}'`).join(' and ')} in src/data/pricing.ts and ship it`
      : `src/data/pricing.ts disagrees with the live store on ${drift.length} product(s)`);
  }
  console.log('✅ src/data/pricing.ts matches the live store prices');
};

main().catch((e) => fail(String(e?.stack || e).slice(0, 500)));
