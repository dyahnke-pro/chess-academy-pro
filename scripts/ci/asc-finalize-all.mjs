#!/usr/bin/env node
// Drive everything API-able toward submission, probe the rest, print a
// readiness map. MUTATES: subscription localizations (clears MISSING_METADATA),
// app price (Free). PROBES (read-only): subscription prices, age rating, privacy,
// version state. Does NOT submit.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '2.8';

// Per-product display name (≤30) + description shown on the manage-subscription
// screen. Keyed by productId suffix.
const SUB_COPY = {
  monthly: {
    name: 'Chess Academy Pro Monthly',
    description: 'Unlimited AI coach, 42 opening masterclasses, tactics built from your games, and full Stockfish analysis. Auto-renews monthly until canceled.',
  },
  yearly: {
    name: 'Chess Academy Pro Annual',
    description: 'A full year of Pro at the best price: unlimited AI coach, masterclasses, tactics, and analysis. Auto-renews yearly until canceled.',
  },
};

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
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) {
    if (soft) return { __error: res.status, __body: t };
    throw new Error(`${method} ${path} → ${res.status}\n${t}`);
  }
  return t ? JSON.parse(t) : {};
}

const report = [];
const mark = (k, ok, note) => { report.push({ k, ok, note }); console.log(`${ok ? '✅' : '⚠️ '} ${k}${note ? ` — ${note}` : ''}`); };

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);
  const version = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);
  if (!version) throw new Error(`No version ${VERSION}`);
  console.log(`app=${app.id} version=${version.id} state=${version.attributes?.appStoreState}\n`);

  // ── 1. Subscription localizations + price probe ───────────────────────────
  const groups = (await api('GET', `/v1/apps/${app.id}/subscriptionGroups?limit=50`)).data;
  for (const g of groups) {
    const subs = (await api('GET', `/v1/subscriptionGroups/${g.id}/subscriptions?limit=50&include=subscriptionLocalizations,prices`)).data;
    for (const s of subs) {
      const pid = s.attributes?.productId || '';
      const copy = pid.includes('yearly') || pid.includes('annual') ? SUB_COPY.yearly : SUB_COPY.monthly;
      // localization
      const locs = (await api('GET', `/v1/subscriptions/${s.id}/subscriptionLocalizations?limit=50`)).data;
      const enUS = locs.find((l) => l.attributes?.locale === 'en-US');
      if (enUS) {
        await api('PATCH', `/v1/subscriptionLocalizations/${enUS.id}`, {
          data: { type: 'subscriptionLocalizations', id: enUS.id, attributes: { name: copy.name, description: copy.description } },
        });
        mark(`sub ${pid} localization`, true, `updated "${copy.name}"`);
      } else {
        await api('POST', '/v1/subscriptionLocalizations', {
          data: { type: 'subscriptionLocalizations', attributes: { locale: 'en-US', name: copy.name, description: copy.description },
            relationships: { subscription: { data: { type: 'subscriptions', id: s.id } } } },
        });
        mark(`sub ${pid} localization`, true, `created "${copy.name}"`);
      }
      // price probe
      const prices = (await api('GET', `/v1/subscriptions/${s.id}/prices?limit=5`, null, { soft: true }));
      const hasPrice = Array.isArray(prices.data) && prices.data.length > 0;
      mark(`sub ${pid} price`, hasPrice, hasPrice ? 'price set' : 'NO PRICE — set in console / RevenueCat');
      mark(`sub ${pid} state`, s.attributes?.state === 'READY_TO_SUBMIT' || s.attributes?.state === 'APPROVED', `state=${s.attributes?.state}`);
    }
  }

  // ── 2. App pricing → Free ─────────────────────────────────────────────────
  const sched = await api('GET', `/v1/apps/${app.id}/appPriceSchedule`, null, { soft: true });
  if (sched.__error) {
    // No schedule yet → create a Free one. Need the free price point (USA base).
    const pts = await api('GET', `/v1/apps/${app.id}/appPricePoints?filter[territory]=USA&limit=200`, null, { soft: true });
    const free = Array.isArray(pts.data) ? pts.data.find((p) => p.attributes?.customerPrice === '0.00' || p.attributes?.customerPrice === '0') : null;
    if (free) {
      try {
        await api('POST', '/v1/appPriceSchedules', {
          data: { type: 'appPriceSchedules',
            relationships: { app: { data: { type: 'apps', id: app.id } },
              baseTerritory: { data: { type: 'territories', id: 'USA' } },
              manualPrices: { data: [{ type: 'appPrices', id: '${new}' }] } },
          },
          included: [{ type: 'appPrices', id: '${new}', attributes: { startDate: null },
            relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } } }],
        });
        mark('app pricing → Free', true, 'created free price schedule');
      } catch (e) {
        mark('app pricing → Free', false, `API set failed — set "Free" in console. (${String(e.message).split('\n')[0]})`);
      }
    } else {
      mark('app pricing → Free', false, 'free price point not found — set "Free" in console');
    }
  } else {
    mark('app pricing', true, 'price schedule already exists');
  }

  // ── 3. Age rating probe (Apple moved this in 2025) ────────────────────────
  const arVersion = await api('GET', `/v1/appStoreVersions/${version.id}?include=ageRatingDeclaration`, null, { soft: true });
  const arApp = await api('GET', `/v1/apps/${app.id}?include=ageRatingDeclaration`, null, { soft: true });
  const arId = arVersion.included?.find?.((i) => i.type === 'ageRatingDeclarations')?.id
    || arApp.included?.find?.((i) => i.type === 'ageRatingDeclarations')?.id;
  mark('age rating', !!arId, arId ? `declaration ${arId} reachable` : 'not in API — do the questionnaire in console (→ 4+)');

  // ── 4. Privacy probe ──────────────────────────────────────────────────────
  const usages = await api('GET', `/v1/apps/${app.id}/appDataUsages?limit=5`, null, { soft: true });
  mark('app privacy', false, usages.__error ? 'set in console (data label is yours)' : `${(usages.data || []).length} usages present — finish in console`);

  // ── 5. Version readiness ──────────────────────────────────────────────────
  console.log(`\nVersion state: ${version.attributes?.appStoreState}`);
  console.log('\n— readiness —');
  for (const r of report) console.log(`${r.ok ? '✅' : '⬜'} ${r.k}${r.note ? `: ${r.note}` : ''}`);
}
main().catch((e) => { console.error('\n❌ finalize-all failed:\n', e.message); process.exit(1); });
