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
  // Optional: delete a stale reviewSubmissionItem that pins the version to an
  // old (rejected) submission, blocking re-add to a fresh submission.
  if (process.env.DELETE_ITEM) {
    const d = await api('DELETE', `/v1/reviewSubmissionItems/${process.env.DELETE_ITEM}`);
    console.log(`DELETE item ${process.env.DELETE_ITEM}: ${d.status === 204 ? 'OK (204)' : d.status + ' ' + JSON.stringify(d.j).slice(0, 400)}`);
  }
  // Optional: directly (re)submit an EXISTING review submission by id — the
  // API equivalent of the web "Resubmit to App Review" on the rejected one.
  if (process.env.RESUBMIT_SUB) {
    const id = process.env.RESUBMIT_SUB;
    const cur = await api('GET', `/v1/reviewSubmissions/${id}`);
    console.log(`resubmit target ${id}: state=${cur.j.data?.attributes?.state} submitted=${cur.j.data?.attributes?.submitted}`);
    const r = await api('PATCH', `/v1/reviewSubmissions/${id}`, { data: { type: 'reviewSubmissions', id, attributes: { submitted: true } } });
    console.log(`RESUBMIT ${id}: ${r.status} ${r.status >= 400 ? JSON.stringify(r.j).slice(0, 600) : 'state=' + r.j.data?.attributes?.state}`);
    return;
  }
  // Optional: cancel a dangling/empty review submission.
  if (process.env.CANCEL_SUB) {
    const c = await api('PATCH', `/v1/reviewSubmissions/${process.env.CANCEL_SUB}`, { data: { type: 'reviewSubmissions', id: process.env.CANCEL_SUB, attributes: { canceled: true } } });
    console.log(`CANCEL submission ${process.env.CANCEL_SUB}: ${c.status} ${c.status >= 400 ? JSON.stringify(c.j).slice(0, 300) : 'state=' + c.j.data?.attributes?.state}`);
  }
  console.log('══════════ APP STORE VERSIONS ══════════');
  const vers = await api('GET', `/v1/apps/${APP}/appStoreVersions?limit=20&fields[appStoreVersions]=versionString,appStoreState,platform,createdDate`);
  if (vers.status >= 400) { console.error(`::error::versions ${vers.status} ${JSON.stringify(vers.j).slice(0, 300)}`); process.exit(1); }
  (vers.j.data || []).sort((a, b) => String(b.attributes.createdDate).localeCompare(String(a.attributes.createdDate)));
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

  // Review submission state (the unified submission model). No platform filter
  // so we see terminal/rejected ones too; include items to see what holds the version.
  const subs = await api('GET', `/v1/apps/${APP}/reviewSubmissions?limit=50&include=items&fields[reviewSubmissions]=state,submitted,platform,createdDate`);
  console.log('\nreview submissions (all):');
  for (const s of subs.j.data || []) {
    const items = (s.relationships?.items?.data || []).length;
    console.log(`  ${s.id} state=${s.attributes.state} submitted=${s.attributes.submitted} platform=${s.attributes.platform} items=${items} created=${s.attributes.createdDate}`);
  }
  if (process.env.DUMP_SUB) {
    const one = await api('GET', `/v1/reviewSubmissions/${process.env.DUMP_SUB}?include=items`);
    console.log(`\nDUMP ${process.env.DUMP_SUB}:\n` + JSON.stringify(one.j, null, 1).slice(0, 2000));
    // item states
    const its = await api('GET', `/v1/reviewSubmissions/${process.env.DUMP_SUB}/items?include=appStoreVersion`);
    console.log('items:\n' + JSON.stringify(its.j, null, 1).slice(0, 2000));
  }

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

  // 3) Reuse an existing non-terminal review submission (avoid spawning dupes);
  //    otherwise create one. Then add the version item + submit.
  const reusable = (subs.j.data || []).find((s) => !['COMPLETE', 'CANCELING', 'CANCELED'].includes(s.attributes.state));
  let submissionId = reusable?.id;
  if (submissionId) console.log(`reusing submission ${submissionId} (state=${reusable.attributes.state})`);
  if (!submissionId) {
    const create = await api('POST', `/v1/reviewSubmissions`, { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: APP } } } } });
    console.log(`create submission: ${create.status} ${create.status >= 400 ? JSON.stringify(create.j).slice(0, 600) : ''}`);
    submissionId = create.j.data?.id;
  }
  if (!submissionId) { console.error('::error::no review submission id'); process.exit(1); }

  const addItem = await api('POST', `/v1/reviewSubmissionItems`, { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: submissionId } }, appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } } } } });
  console.log(`add version item: ${addItem.status}`);
  if (addItem.status >= 400) console.log('addItem error FULL:\n' + JSON.stringify(addItem.j, null, 1));

  if (process.env.SUBMIT_FINAL !== '0') {
    const submit = await api('PATCH', `/v1/reviewSubmissions/${submissionId}`, { data: { type: 'reviewSubmissions', id: submissionId, attributes: { submitted: true } } });
    console.log(`SUBMIT: ${submit.status} ${submit.status >= 400 ? JSON.stringify(submit.j).slice(0, 400) : 'state=' + submit.j.data?.attributes?.state}`);
  }
};
main().catch((e) => { console.error(e); process.exit(1); });
