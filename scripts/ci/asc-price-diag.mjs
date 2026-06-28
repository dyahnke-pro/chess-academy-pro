#!/usr/bin/env node
// Diagnose + repair the app price schedule. Dumps the raw appPriceSchedule,
// the app->appPriceSchedule relationship, and (if absent) re-creates Free and
// re-reads. Env: ASC_KEY_P8/_ID/_ISSUER_ID, APP_BUNDLE_ID.

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
async function api(method, path, body, { soft = true } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text();
  if (!res.ok) { if (soft) return { __error: res.status, __body: t }; throw new Error(`${method} ${path} → ${res.status}\n${t}`); }
  return t ? JSON.parse(t) : {};
}

async function dumpSchedule(app, label) {
  console.log(`\n--- ${label} ---`);
  const rel = await api('GET', `/v1/apps/${app.id}?include=appPriceSchedule`);
  console.log('app.relationships.appPriceSchedule:', JSON.stringify(rel.data?.relationships?.appPriceSchedule || null));
  const sched = await api('GET', `/v1/apps/${app.id}/appPriceSchedule?include=manualPrices,baseTerritory`);
  if (sched.__error) { console.log(`GET appPriceSchedule → ${sched.__error}: ${sched.__body}`); return null; }
  console.log('appPriceSchedule.data:', JSON.stringify(sched.data || null));
  const prices = (sched.included || []).filter((x) => x.type === 'appPrices');
  for (const p of prices) {
    const ppId = p.relationships?.appPricePoint?.data?.id;
    if (!ppId) { console.log('  appPrice with no price point:', p.id); continue; }
    const pp = await api('GET', `/v1/appPricePoints/${ppId}`);
    console.log(`  appPrice ${p.id} → customerPrice=${pp.data?.attributes?.customerPrice} start=${p.attributes?.startDate}`);
  }
  return sched.data ? prices : null;
}

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  console.log(`app=${app.id}`);

  let prices = await dumpSchedule(app, 'BEFORE');

  const isFree = prices && prices.length === 0
    ? false
    : (prices || []).some(() => false); // we resolve free below from price points already printed
  // Determine free presence by re-reading price points inline:
  let free = false;
  if (prices) {
    for (const p of prices) {
      const ppId = p.relationships?.appPricePoint?.data?.id;
      if (!ppId) continue;
      const pp = await api('GET', `/v1/appPricePoints/${ppId}`);
      const cp = pp.data?.attributes?.customerPrice;
      if (cp === '0.00' || cp === '0' || Number(cp) === 0) free = true;
    }
  }
  console.log(`\nfree detected = ${free}, schedule present = ${!!prices}`);

  if (free) { console.log('\n✅ Already Free — nothing to repair.'); return; }

  // Find the USD 0.00 (free) price point and (re)create the schedule.
  let freeId = null;
  let url = `/v1/apps/${app.id}/appPricePoints?filter[territory]=USA&include=territory&limit=200`;
  for (let page = 0; page < 10 && url && !freeId; page++) {
    const r = await api('GET', url);
    for (const pp of r.data || []) {
      const cp = pp.attributes?.customerPrice;
      if (cp === '0.00' || cp === '0' || Number(cp) === 0) { freeId = pp.id; break; }
    }
    url = r.links?.next || null;
  }
  if (!freeId) throw new Error('could not find the free (0.00) price point for USA');
  console.log(`\nfree price point = ${freeId}`);

  const created = await api('POST', '/v1/appPriceSchedules', {
    data: {
      type: 'appPriceSchedules',
      relationships: {
        app: { data: { type: 'apps', id: app.id } },
        baseTerritory: { data: { type: 'territories', id: 'USA' } },
        manualPrices: { data: [{ type: 'appPrices', id: '${price1}' }] },
      },
    },
    included: [{
      type: 'appPrices',
      id: '${price1}',
      attributes: { startDate: null, endDate: null },
      relationships: { appPricePoint: { data: { type: 'appPricePoints', id: freeId } } },
    }],
  });
  if (created.__error) { console.error(`⚠️  create failed: ${created.__error}\n${created.__body}`); process.exit(1); }
  console.log('POST appPriceSchedules → 2xx, created schedule id:', created.data?.id);

  // Re-read immediately.
  await dumpSchedule(app, 'AFTER (immediate)');
}
main().catch((e) => { console.error('\n❌ price-diag failed:\n', e.message); process.exit(1); });
