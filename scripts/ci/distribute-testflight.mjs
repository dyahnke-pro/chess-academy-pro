#!/usr/bin/env node
// Distribute the latest VALID Xcode Cloud build to TestFlight: internal group
// (instant, no review) + external group (after Beta App Review). Idempotent —
// safe to re-run; already-assigned / already-submitted states are tolerated.
//
// Credentials come from env (set as GitHub Actions secrets, or exported locally):
//   APP_STORE_CONNECT_API_KEY        base64 of the .p8 private key
//   APP_STORE_CONNECT_API_KEY_ID     e.g. 756B4W9NYV
//   APP_STORE_CONNECT_API_ISSUER_ID  e.g. 576ea9e6-...
// Optional env:
//   TF_BUILD_ID        distribute a specific build id (default: latest VALID)
//   TF_WHATS_NEW       "What to Test" text for external review
//   TF_INTERNAL_GROUP  internal beta group id   (default below)
//   TF_EXTERNAL_GROUP  external beta group id   (default below)
import crypto from 'node:crypto';

const APP = '6776418777';
const INTERNAL_GROUP = process.env.TF_INTERNAL_GROUP || 'b8cf21ed-84a6-4d22-a40d-2d65bf0e6a8a'; // "Chess Academy Pro"
const EXTERNAL_GROUP = process.env.TF_EXTERNAL_GROUP || 'e039d746-a637-49c0-8426-edabb5f8fe7d'; // "Beta Test"
const WHATS_NEW = process.env.TF_WHATS_NEW || 'Latest build. Please test general navigation, scrolling, and coach/voice narration, and report anything broken.';

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
// Apple's relationship endpoints intermittently return 500 UNEXPECTED_ERROR
// (build 52, 2026-06-15: the internal assign 500'd, so the build nearly never
// reached the internal tester — David's "I want builds right away"). Retry
// transient 5xx with backoff so a build reliably reaches testers.
async function apiRetry(method, path, body, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i++) {
    last = await api(method, path, body);
    if (last.status < 500) return last;
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
  return last;
}

const main = async () => {
  let buildId = process.env.TF_BUILD_ID;
  if (!buildId) {
    const builds = await api('GET', `/v1/builds?filter[app]=${APP}&filter[processingState]=VALID&limit=1&sort=-uploadedDate&fields[builds]=version`);
    buildId = builds.j.data?.[0]?.id;
    if (!buildId) { console.error('::error::no VALID build found'); process.exit(1); }
    console.log(`Latest VALID build: ${builds.j.data[0].attributes.version} (${buildId})`);
  }

  // Export compliance (HTTPS-only = exempt) so the build is installable.
  const comp = await api('PATCH', `/v1/builds/${buildId}`, { data: { type: 'builds', id: buildId, attributes: { usesNonExemptEncryption: false } } });
  console.log(`compliance: ${comp.status === 200 ? 'set' : comp.status}`);

  // Internal group — instant, no review. Retry on transient 5xx so the build
  // reliably reaches the internal tester (David) right away.
  const intl = await apiRetry('POST', `/v1/betaGroups/${INTERNAL_GROUP}/relationships/builds`, { data: [{ type: 'builds', id: buildId }] });
  console.log(`internal assign: ${intl.status === 204 ? 'OK' : intl.status} ${intl.status >= 400 ? JSON.stringify(intl.j).slice(0, 160) : ''}`);

  // "What to Test" on the build's en-US localization (create or update).
  const locs = await api('GET', `/v1/builds/${buildId}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale`);
  const en = (locs.j.data || []).find((l) => l.attributes.locale === 'en-US');
  if (en) {
    await api('PATCH', `/v1/betaBuildLocalizations/${en.id}`, { data: { type: 'betaBuildLocalizations', id: en.id, attributes: { whatsNew: WHATS_NEW } } });
  } else {
    await api('POST', `/v1/betaBuildLocalizations`, { data: { type: 'betaBuildLocalizations', attributes: { locale: 'en-US', whatsNew: WHATS_NEW }, relationships: { build: { data: { type: 'builds', id: buildId } } } } });
  }
  console.log('whatsNew: set');

  // GUARD: never submit for Beta App Review without a non-empty "What to Test".
  // An empty whatsNew silently blocks the review submission (the build sits in
  // the external group but never enters review — exactly what happened to
  // build 46, which David had to submit by hand). Re-read it and confirm before
  // submitting; bail loudly if it didn't stick.
  const verify = await api('GET', `/v1/builds/${buildId}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`);
  const verifyEn = (verify.j.data || []).find((l) => l.attributes.locale === 'en-US');
  const whatsNewValue = (verifyEn?.attributes?.whatsNew || '').trim();
  if (!whatsNewValue) {
    console.error('::error::"What to Test" is empty after set — refusing to submit for review (it would silently never enter review). Aborting external submission.');
    process.exit(1);
  }
  console.log(`whatsNew verified (${whatsNewValue.length} chars)`);

  // External group + Beta App Review.
  const ext = await apiRetry('POST', `/v1/betaGroups/${EXTERNAL_GROUP}/relationships/builds`, { data: [{ type: 'builds', id: buildId }] });
  console.log(`external assign: ${ext.status === 204 ? 'OK' : ext.status} ${ext.status >= 400 ? JSON.stringify(ext.j).slice(0, 200) : ''}`);

  const sub = await api('POST', `/v1/betaAppReviewSubmissions`, { data: { type: 'betaAppReviewSubmissions', relationships: { build: { data: { type: 'builds', id: buildId } } } } });
  if (sub.status >= 400 && JSON.stringify(sub.j).includes('already exists')) console.log('beta review: already submitted');
  else console.log(`beta review submit: ${sub.status} ${sub.status >= 400 ? JSON.stringify(sub.j).slice(0, 200) : `state=${sub.j.data?.attributes?.betaReviewState}`}`);

  console.log('\nDone. Internal testers can install now; external testers get it after Beta App Review approval.');
};
main().catch((e) => { console.error(e); process.exit(1); });
