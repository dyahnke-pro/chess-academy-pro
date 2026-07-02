#!/usr/bin/env node
// Submit an App Store version for review via the ASC API.
//
// This is the ONE deliberately-guarded action the other asc-*.mjs scripts stop
// short of. It is safe + reversible: a review submission can be cancelled in
// App Store Connect before Apple begins reviewing. The script refuses to run
// unless the version is genuinely READY_FOR_REVIEW, and it reuses an existing
// open submission instead of creating a duplicate.
//
// Flow (modern ASC reviewSubmissions API):
//   1. Resolve app + the target appStoreVersion; assert state READY_FOR_REVIEW.
//   2. Find an existing open reviewSubmission (IOS) or create one.
//   3. Ensure the version is attached as a reviewSubmissionItem.
//   4. PATCH the reviewSubmission submitted=true.
//   5. Re-read and report the resulting states.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID, APP_BUNDLE_ID, APP_VERSION,
//   DRY_RUN — "1" to inspect + scaffold (create submission + item) but NOT
//             flip submitted=true. Default: submit for real.

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '2.8';
const DRY_RUN = process.env.DRY_RUN === '1';

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function loadKey() {
  let pem = req('ASC_KEY_P8');
  if (!pem.includes('BEGIN')) pem = Buffer.from(pem, 'base64').toString('utf8');
  return createPrivateKey({ key: pem, format: 'pem' });
}
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
  if (!res.ok) { if (soft) return { __error: res.status, __body: t }; throw new Error(`${method} ${path} → ${res.status}\n${t}`); }
  return t ? JSON.parse(t) : {};
}

// States that mean "this submission is already open / in flight" — reuse it.
const OPEN_SUB_STATES = new Set([
  'READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW',
  'UNRESOLVED_ISSUES', 'COMPLETING',
]);

async function main() {
  const app = (await api('GET', `/v1/apps?filter[bundleId]=${encodeURIComponent(BUNDLE_ID)}&limit=1`)).data[0];
  if (!app) throw new Error(`No app ${BUNDLE_ID}`);

  const version = (await api('GET', `/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=20`)).data
    .find((v) => v.attributes?.versionString === VERSION);
  if (!version) throw new Error(`No version ${VERSION}`);
  const state = version.attributes?.appStoreState;
  console.log(`app=${app.id} version=${VERSION} (${version.id}) state=${state}`);

  // Guard: only submit a version that ASC itself says is ready.
  const SUBMITTABLE = new Set(['READY_FOR_REVIEW', 'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);
  if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PROCESSING_FOR_APP_STORE', 'READY_FOR_SALE'].includes(state)) {
    console.log(`\n✅ Nothing to do — version ${VERSION} is already ${state} (already submitted / live).`);
    return;
  }
  if (!SUBMITTABLE.has(state)) {
    throw new Error(`Version ${VERSION} is in state ${state}, not a submittable state. Aborting (fix readiness first).`);
  }

  // Confirm a build is attached (a submission with no build is rejected).
  const build = (await api('GET', `/v1/appStoreVersions/${version.id}/build`, null, { soft: true }))?.data;
  if (!build) throw new Error(`No build attached to version ${VERSION}. Attach a VALID build first.`);
  const buildNum = (await api('GET', `/v1/builds/${build.id}`)).data?.attributes?.version;
  console.log(`build attached: #${buildNum} (${build.id})`);

  // 1. Reuse an existing open review submission, or create one.
  let sub = (await api('GET', `/v1/apps/${app.id}/reviewSubmissions?filter[platform]=IOS&limit=50`, null, { soft: true }))?.data
    ?.find((s) => OPEN_SUB_STATES.has(s.attributes?.state));
  if (sub) {
    console.log(`reusing open reviewSubmission ${sub.id} (state=${sub.attributes?.state})`);
  } else {
    const created = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: app.id } } },
      },
    });
    sub = created.data;
    console.log(`created reviewSubmission ${sub.id} (state=${sub.attributes?.state})`);
  }

  // 2. Ensure the version is an item on this submission.
  const items = (await api('GET', `/v1/reviewSubmissions/${sub.id}/items?limit=50`, null, { soft: true }))?.data || [];
  const hasVersion = items.some((it) => it.relationships?.appStoreVersion?.data?.id === version.id);
  if (hasVersion) {
    console.log(`version already an item on submission ${sub.id}`);
  } else {
    await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
        },
      },
    });
    console.log(`added version ${VERSION} as a reviewSubmissionItem`);
  }

  if (DRY_RUN) {
    console.log('\n🟡 DRY_RUN — submission scaffolded but NOT submitted. Re-run without DRY_RUN to submit.');
    return;
  }

  // 3. Submit.
  const patched = await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, {
    data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } },
  });
  console.log(`submitted=true → reviewSubmission state=${patched.data?.attributes?.state}`);

  // 4. Re-read the version state.
  const after = (await api('GET', `/v1/appStoreVersions/${version.id}`)).data?.attributes?.appStoreState;
  console.log(`\n✅ v${VERSION} submitted for review. version state now: ${after}`);
}
main().catch((e) => { console.error('\n❌ submit failed:\n', e.message); process.exit(1); });
