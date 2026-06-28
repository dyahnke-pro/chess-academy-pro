#!/usr/bin/env node
// Diagnose what keeps the subscriptions in MISSING_METADATA and fix the
// API-addressable pieces: ensure territory availability (all territories) and
// report intro-offer (free trial) presence. Re-reads state at the end.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';

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

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const groups = (await api('GET', `/v1/apps/${app.id}/subscriptionGroups?limit=50`)).data;

  for (const g of groups) {
    const subs = (await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)).data;
    for (const s of subs) {
      const pid = s.attributes?.productId;
      console.log(`\n=== ${pid} (state=${s.attributes?.state}) ===`);

      const locs = (await api('GET', `/v1/subscriptions/${s.id}/subscriptionLocalizations?limit=10`, null, { soft: true })).data || [];
      console.log(`  localizations: ${locs.map((l) => `${l.attributes?.locale}:${l.attributes?.name || '∅'}`).join(', ') || 'NONE'}`);

      const prices = (await api('GET', `/v1/subscriptions/${s.id}/prices?include=subscriptionPricePoint&limit=10`, null, { soft: true })).data || [];
      console.log(`  prices: ${prices.length}`);

      const shot = await api('GET', `/v1/subscriptions/${s.id}/appStoreReviewScreenshot`, null, { soft: true });
      console.log(`  reviewScreenshot: ${shot.data?.id ? `yes (${shot.data.attributes?.assetDeliveryState?.state})` : 'NONE'}`);

      const intro = (await api('GET', `/v1/subscriptions/${s.id}/introductoryOffers?limit=10`, null, { soft: true })).data || [];
      console.log(`  introductoryOffers (free trial): ${intro.length ? intro.map((o) => `${o.attributes?.offerMode}/${o.attributes?.duration}`).join(', ') : 'NONE — 7-day trial NOT configured'}`);

      const avail = await api('GET', `/v1/subscriptions/${s.id}/subscriptionAvailability`, null, { soft: true });
      const hasAvail = !!avail.data?.id;
      console.log(`  availability: ${hasAvail ? `yes (allTerritories=${avail.data.attributes?.availableInAllTerritories})` : 'NONE'}`);

      if (!hasAvail) {
        const made = await api('POST', '/v1/subscriptionAvailabilities', {
          data: { type: 'subscriptionAvailabilities', attributes: { availableInAllTerritories: true },
            relationships: { subscription: { data: { type: 'subscriptions', id: s.id } } } },
        }, { soft: true });
        console.log(made.__error ? `  ⚠️  availability set failed: ${made.__error} ${String(made.__body).slice(0, 160)}` : '  ✅ availability set (all territories)');
      }

      const fresh = await api('GET', `/v1/subscriptions/${s.id}`);
      console.log(`  → state now: ${fresh.data.attributes?.state}`);
    }
  }
}
main().catch((e) => { console.error('\n❌ sub-complete failed:\n', e.message); process.exit(1); });
