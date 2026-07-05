#!/usr/bin/env node
// Inspect (and optionally drive) the App Store review resubmission for the
// iOS app via the App Store Connect API. READ-ONLY by default — prints the
// version state, attached build, and review-submission state so we know
// exactly what we're working with before touching anything. Set SUBMIT=1 to
// attach the target build + submit for review.
//
// Env (GitHub Actions secrets, same as distribute-testflight):
//   APP_STORE_CONNECT_API_KEY / _KEY_ID / _ISSUER_ID
// Optional:
//   TARGET_BUILD_VERSION   build number to attach (default: latest VALID)
//   REVIEWER_NOTES         App Review notes text
//   SUBMIT=1               actually attach build + submit (default: read-only)
import crypto from 'node:crypto';

const APP = '6776418777';
const KEY_ID = need('APP_STORE_CONNECT_API_KEY_ID');
const ISSUER_ID = need('APP_STORE_CONNECT_API_ISSUER_ID');
const PEM = Buffer.from(need('APP_STORE_CONNECT_API_KEY'), 'base64').toString('utf8');

function need(n) { const v = process.env[n]; if (!v) { console.error(`::error::missing env ${n}`); process.exit(1); } return v; }
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }))}`;
  const der = crypto.sign('sha256', Buffer.from(si), { key: crypto.createPrivateKey(PEM), dsaEncoding: 'ieee-p1363' });
  return `${si}.${b64url(der)}`;
}
async function api(method, path, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}

const main = async () => {
  console.log('══════════ APP STORE VERSIONS ══════════');
  const vers = await api('GET', `/v1/apps/${APP}/appStoreVersions?limit=10&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate&sort=-createdDate`);
  if (vers.status >= 400) { console.error(`::error::versions ${vers.status} ${JSON.stringify(vers.j).slice(0, 300)}`); process.exit(1); }
  for (const v of vers.j.data || []) {
    console.log(`  ${v.attributes.versionString} [${v.attributes.platform}] state=${v.attributes.appStoreState} (${v.id})`);
  }
  // The version we resubmit = the newest non-live editable one.
  const editable = (vers.j.data || []).find((v) =>
    ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY', 'WAITING_FOR_REVIEW', 'IN_REVIEW'].includes(v.attributes.appStoreState));
  const version = editable || (vers.j.data || [])[0];
  if (!version) { console.error('::error::no app store version found'); process.exit(1); }
  console.log(`\ntarget version: ${version.attributes.versionString} state=${version.attributes.appStoreState} (${version.id})`);

  // Currently-attached build
  const curBuild = await api('GET', `/v1/appStoreVersions/${version.id}/build?fields[builds]=version`);
  console.log(`attached build: ${curBuild.j.data ? curBuild.j.data.attributes?.version + ' (' + curBuild.j.data.id + ')' : 'NONE'}`);

  // Latest VALID build we could attach
  const builds = await api('GET', `/v1/builds?filter[app]=${APP}&filter[processingState]=VALID&limit=5&sort=-uploadedDate&fields[builds]=version,uploadedDate`);
  console.log('\nrecent VALID builds:');
  for (const b of builds.j.data || []) console.log(`  ${b.attributes.version} (${b.id}) ${b.attributes.uploadedDate}`);
  const wantVer = process.env.TARGET_BUILD_VERSION;
  const targetBuild = wantVer ? (builds.j.data || []).find((b) => b.attributes.version === wantVer) : (builds.j.data || [])[0];
  console.log(`\nbuild to attach: ${targetBuild ? targetBuild.attributes.version + ' (' + targetBuild.id + ')' : 'NONE FOUND'}`);

  // Review submission state (the unified submission model)
  const subs = await api('GET', `/v1/apps/${APP}/reviewSubmissions?filter[platform]=IOS&limit=5&fields[reviewSubmissions]=state,submitted,platform`);
  console.log('\nreview submissions:');
  for (const s of subs.j.data || []) console.log(`  ${s.id} state=${s.attributes.state} submitted=${s.attributes.submitted}`);

  // App review detail (reviewer notes / contact) for the version
  const detail = await api('GET', `/v1/appStoreVersions/${version.id}/appStoreReviewDetail?fields[appStoreReviewDetails]=notes,contactFirstName,contactLastName,contactEmail`);
  console.log(`\napp review detail: ${detail.j.data ? 'exists (' + detail.j.data.id + ') notes=' + JSON.stringify((detail.j.data.attributes?.notes || '').slice(0, 80)) : 'NONE'}`);

  if (process.env.SUBMIT !== '1') {
    console.log('\n(READ-ONLY — set SUBMIT=1 to attach build + submit for review)');
    return;
  }
  console.log('\n=== SUBMIT MODE ===');
  if (!targetBuild) { console.error('::error::no build to attach'); process.exit(1); }

  // 1) Attach the build to the version
  const attach = await api('PATCH', `/v1/appStoreVersions/${version.id}/relationships/build`, { data: { type: 'builds', id: targetBuild.id } });
  console.log(`attach build: ${attach.status === 204 ? 'OK' : attach.status + ' ' + JSON.stringify(attach.j).slice(0, 200)}`);

  // 2) Reviewer notes
  const notes = process.env.REVIEWER_NOTES;
  if (notes) {
    if (detail.j.data) {
      const u = await api('PATCH', `/v1/appStoreReviewDetails/${detail.j.data.id}`, { data: { type: 'appStoreReviewDetails', id: detail.j.data.id, attributes: { notes } } });
      console.log(`review notes update: ${u.status}`);
    } else {
      const c = await api('POST', `/v1/appStoreReviewDetails`, { data: { type: 'appStoreReviewDetails', attributes: { notes }, relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
      console.log(`review notes create: ${c.status}`);
    }
  }

  // 3) Create a review submission (if none open) and add the version, then submit
  let submissionId = (subs.j.data || []).find((s) => s.attributes.state === 'READY_FOR_REVIEW' || s.attributes.state === 'COMPLETING')?.id;
  if (!submissionId) {
    const create = await api('POST', `/v1/reviewSubmissions`, { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP } } } } });
    console.log(`create submission: ${create.status} ${create.status >= 400 ? JSON.stringify(create.j).slice(0, 300) : ''}`);
    submissionId = create.j.data?.id;
  }
  if (!submissionId) { console.error('::error::no review submission id'); process.exit(1); }

  const addItem = await api('POST', `/v1/reviewSubmissionItems`, { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } }, appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
  console.log(`add version item: ${addItem.status} ${addItem.status >= 400 ? JSON.stringify(addItem.j).slice(0, 300) : ''}`);

  const submit = await api('PATCH', `/v1/reviewSubmissions/${submissionId}`, { data: { type: 'reviewSubmissions', id: submissionId, attributes: { submitted: true } } });
  console.log(`SUBMIT: ${submit.status} ${submit.status >= 400 ? JSON.stringify(submit.j).slice(0, 300) : 'state=' + submit.j.data?.attributes?.state}`);
};
main().catch((e) => { console.error(e); process.exit(1); });
