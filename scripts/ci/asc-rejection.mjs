#!/usr/bin/env node
// Diagnostic: pull everything the App Store Connect API exposes about the
// most recent App Review submission + rejection for this app, so a rejected
// version's reason (or the API's lack thereof) is visible in the CI log.
//
// Env: APP_STORE_CONNECT_API_KEY (base64 or raw PEM) / APP_STORE_CONNECT_API_KEY_ID
//      / APP_STORE_CONNECT_API_ISSUER_ID.  APP_ID / APP_VERSION optional.
import crypto from 'node:crypto';

const APP = process.env.APP_ID || '6776418777';
const VERSION = process.env.APP_VERSION || '2.8';
const need = (n) => { const v = process.env[n]; if (!v) { console.error(`::error::missing env ${n}`); process.exit(1); } return v; };
const KEY_ID = need('APP_STORE_CONNECT_API_KEY_ID');
const ISSUER_ID = need('APP_STORE_CONNECT_API_ISSUER_ID');
let PEM = need('APP_STORE_CONNECT_API_KEY');
if (!PEM.includes('BEGIN')) PEM = Buffer.from(PEM, 'base64').toString('utf8');

const b64url = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }))}`;
  return `${si}.${b64url(crypto.sign('sha256', Buffer.from(si), { key: crypto.createPrivateKey(PEM), dsaEncoding: 'ieee-p1363' }))}`;
}
async function api(path) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, { headers: { Authorization: `Bearer ${jwt()}` } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j, raw: t };
}
const dump = (label, res) => {
  console.log(`\n──────── ${label}  [HTTP ${res.status}] ────────`);
  console.log(typeof res.j === 'string' ? res.j.slice(0, 3000) : JSON.stringify(res.j, null, 2).slice(0, 6000));
};

// 1. Versions + states
const versions = await api(`/v1/apps/${APP}/appStoreVersions?filter[platform]=IOS&limit=20&fields[appStoreVersions]=versionString,appStoreState,createdDate,reviewType`);
console.log('=== App Store versions (state) ===');
let vid = null;
for (const v of versions.j?.data ?? []) {
  const a = v.attributes ?? {};
  console.log(`   v${a.versionString}  ${a.appStoreState}  review=${a.reviewType}  ${a.createdDate}  (${v.id})`);
  if (a.versionString === VERSION) vid = v.id;
}
if (!vid) { console.error(`\n::warning:: version ${VERSION} not found`); }

// 2. The rejected version's submission + review detail
if (vid) {
  dump(`appStoreVersions/${vid} (submission + reviewDetail)`,
    await api(`/v1/appStoreVersions/${vid}?include=appStoreVersionSubmission,appStoreReviewDetail`));
  dump(`appStoreVersions/${vid}/appStoreReviewDetail`,
    await api(`/v1/appStoreVersions/${vid}/appStoreReviewDetail`));
}

// 3. reviewSubmissions (the submission-based flow) + items + rejection info
const rs = await api(`/v1/reviewSubmissions?filter[app]=${APP}&filter[platform]=IOS&sort=-submittedDate&limit=5&include=items&fields[reviewSubmissions]=state,platform,submittedDate,items`);
dump('reviewSubmissions (latest 5)', rs);
const latest = rs.j?.data?.[0];
if (latest) {
  console.log(`\n>>> latest reviewSubmission ${latest.id}  state=${latest.attributes?.state}  submitted=${latest.attributes?.submittedDate}`);
  dump(`reviewSubmissions/${latest.id}/items`, await api(`/v1/reviewSubmissions/${latest.id}/items?include=appStoreVersion,appCustomProductPageVersion`));
  // Rejections carried on submission items (if the API exposes them at all)
  for (const it of (await api(`/v1/reviewSubmissions/${latest.id}/items`)).j?.data ?? []) {
    dump(`reviewSubmissionItem ${it.id} (full)`, await api(`/v1/reviewSubmissionItems/${it.id}`));
  }
}

// 4. Best-effort: try known/likely rejection endpoints and show whether they exist
for (const p of [
  `/v1/appStoreVersions/${vid}/appStoreVersionSubmission`,
  `/v1/appStoreVersions/${vid}/appStoreReviewDetail`,
]) {
  if (vid) dump(`probe ${p}`, await api(p));
}

console.log('\nNOTE: the App Review "Resolution Center" reviewer MESSAGE text is not part of the public ASC API — it is only in the ASC web UI / the private Olympus session. If nothing above carries the message body, that is the reason, not a bug.');
