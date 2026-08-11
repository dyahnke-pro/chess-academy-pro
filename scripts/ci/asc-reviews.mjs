#!/usr/bin/env node
// Pull recent App Store customer reviews via the App Store Connect API and
// print them (rating, title, body, nickname, territory, date). Read-only —
// no state mutation. Used to confirm real reviews landed without relying on
// a screenshot or someone's recollection.
//
// Env:
//   ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID   ASC API key (same as sibling scripts)
//   APP_BUNDLE_ID   default com.chessacademy.pro
//   SINCE_DAYS      only print reviews created within this many days (default 30)

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const SINCE_DAYS = Number(process.env.SINCE_DAYS || 30);

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

async function api(path) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    headers: { Authorization: `Bearer ${jwt()}` },
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}\n${t}`);
  return t ? JSON.parse(t) : {};
}

async function all(path) {
  const out = [];
  let url = path;
  for (let page = 0; page < 50 && url; page++) {
    const r = await api(url);
    out.push(...(r.data || []));
    url = r.links?.next ? r.links.next.replace(ASC, '') : null;
  }
  return out;
}

async function main() {
  const app = (await api(`/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`app not found for bundleId ${BUNDLE_ID}`);
  console.log(`app=${app.id} (${app.attributes?.name || BUNDLE_ID})`);

  const reviews = await all(
    `/v1/apps/${app.id}/customerReviews?sort=-createdDate&limit=200` +
    `&fields[customerReviews]=rating,title,body,reviewerNickname,createdDate,territory`
  );
  console.log(`total reviews fetched: ${reviews.length}`);

  const cutoff = Date.now() - SINCE_DAYS * 24 * 60 * 60 * 1000;
  const recent = reviews.filter((r) => new Date(r.attributes?.createdDate).getTime() >= cutoff);
  console.log(`\n═══ reviews within last ${SINCE_DAYS} day(s): ${recent.length} ═══\n`);
  for (const r of recent) {
    const a = r.attributes || {};
    console.log(`[${a.createdDate}] ${a.rating}★ "${a.title || ''}" — ${a.reviewerNickname || 'anonymous'} (${a.territory})`);
    if (a.body) console.log(`  ${a.body}`);
    console.log('');
  }

  if (reviews.length > 0) {
    const newest = reviews[0].attributes;
    console.log(`most recent review overall: [${newest.createdDate}] ${newest.rating}★ by ${newest.reviewerNickname || 'anonymous'}`);
  }
}

main().catch((e) => { console.error('\n❌ asc-reviews failed:\n', e.message); process.exit(1); });
