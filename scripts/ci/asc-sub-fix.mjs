#!/usr/bin/env node
// Fix the three remaining subscription blockers via ASC API:
//   A. subscription GROUP localization (display name) — the likely
//      MISSING_METADATA root (RevenueCat skips it).
//   B. Monthly territory availability (all territories).
//   C. Yearly 7-day free-trial introductory offer (all territories), to match
//      Monthly so users get the trial on either plan.
// Re-reads subscription state at the end. All mutations soft-logged.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, GROUP_NAME.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const GROUP_NAME = process.env.GROUP_NAME || 'Chess Academy Pro';

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
const short = (o) => String(o.__body || '').replace(/\s+/g, ' ').slice(0, 200);

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  const groups = (await api('GET', `/v1/apps/${app.id}/subscriptionGroups?limit=50`)).data;

  // ── A. Subscription group localization ────────────────────────────────────
  for (const g of groups) {
    const locs = (await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptionGroupLocalizations?limit=20`, null, { soft: true })).data || [];
    const enUS = locs.find((l) => l.attributes?.locale === 'en-US');
    if (enUS) {
      console.log(`A. group ${g.id} localization: exists ("${enUS.attributes?.name}")`);
    } else {
      const made = await api('POST', '/v1/subscriptionGroupLocalizations', {
        data: { type: 'subscriptionGroupLocalizations', attributes: { locale: 'en-US', name: GROUP_NAME },
          relationships: { subscriptionGroup: { data: { type: 'subscriptionGroups', id: g.id } } } },
      }, { soft: true });
      console.log(made.__error ? `A. ⚠️  group localization create failed: ${made.__error} ${short(made)}` : `A. ✅ group localization created ("${GROUP_NAME}")`);
    }
  }

  // territory list (for trial / availability that need explicit territories)
  let territoryIds = [];
  try {
    let url = '/v1/territories?limit=200';
    const r = await api('GET', url, null, { soft: true });
    territoryIds = (r.data || []).map((t) => t.id);
  } catch { /* ignore */ }
  console.log(`(territories available: ${territoryIds.length})`);

  for (const g of groups) {
    const subs = (await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=50`)).data;
    for (const s of subs) {
      const pid = s.attributes?.productId || '';
      const isYearly = pid.includes('yearly') || pid.includes('annual');

      // ── B. Monthly availability ──
      if (!isYearly) {
        const avail = await api('GET', `/v1/subscriptions/${s.id}/subscriptionAvailability`, null, { soft: true });
        if (!avail.data?.id) {
          const made = await api('POST', '/v1/subscriptionAvailabilities', {
            data: { type: 'subscriptionAvailabilities', attributes: { availableInAllTerritories: true },
              relationships: { subscription: { data: { type: 'subscriptions', id: s.id } } } },
          }, { soft: true });
          console.log(made.__error ? `B. ⚠️  ${pid} availability failed: ${made.__error} ${short(made)}` : `B. ✅ ${pid} availability set`);
        } else { console.log(`B. ${pid} availability: already set`); }
      }

      // ── C. Yearly free trial ──
      if (isYearly) {
        const offers = (await api('GET', `/v1/subscriptions/${s.id}/introductoryOffers?limit=10`, null, { soft: true })).data || [];
        if (offers.length) {
          console.log(`C. ${pid} trial: already present (${offers.length})`);
        } else if (territoryIds.length) {
          const made = await api('POST', '/v1/subscriptionIntroductoryOffers', {
            data: { type: 'subscriptionIntroductoryOffers',
              attributes: { duration: 'ONE_WEEK', numberOfPeriods: 1, offerMode: 'FREE_TRIAL' },
              relationships: { subscription: { data: { type: 'subscriptions', id: s.id } },
                territories: { data: territoryIds.map((id) => ({ type: 'territories', id })) } } },
          }, { soft: true });
          console.log(made.__error ? `C. ⚠️  ${pid} trial failed: ${made.__error} ${short(made)}` : `C. ✅ ${pid} 7-day free trial created (all territories)`);
        }
      }

      const fresh = await api('GET', `/v1/subscriptions/${s.id}`);
      console.log(`   → ${pid} state now: ${fresh.data.attributes?.state}`);
    }
  }
}
main().catch((e) => { console.error('\n❌ sub-fix failed:\n', e.message); process.exit(1); });
