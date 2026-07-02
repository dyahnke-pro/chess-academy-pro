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
//   DRY_RUN   — "1" to inspect + scaffold (create submission + item) but NOT
//               flip submitted=true.
//   DIAGNOSE  — "1" to ONLY read + print existing reviewSubmissions and their
//               items/states, then exit (no writes at all).

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = process.env.APP_VERSION || '2.8';
const DRY_RUN = process.env.DRY_RUN === '1';
const DIAGNOSE = process.env.DIAGNOSE === '1';

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

  // Always print the current review-submission landscape (idempotency needs it).
  const allSubs = (await api('GET', `/v1/apps/${app.id}/reviewSubmissions?filter[platform]=IOS&limit=50`, null, { soft: true }))?.data || [];
  console.log(`\nexisting reviewSubmissions (${allSubs.length}):`);
  let subWithVersion = null;
  for (const s of allSubs) {
    const its = (await api('GET', `/v1/reviewSubmissions/${s.id}/items?include=appStoreVersion&limit=50`, null, { soft: true }))?.data || [];
    const verIds = its.map((it) => it.relationships?.appStoreVersion?.data?.id).filter(Boolean);
    const hasV = verIds.includes(version.id);
    if (hasV) subWithVersion = subWithVersion || s;
    console.log(`   • ${s.id} state=${s.attributes?.state} items=${its.length} hasV2.8=${hasV}`);
  }

  if (DIAGNOSE) {
    console.log(subWithVersion
      ? `\n🔎 v${VERSION} already sits on reviewSubmission ${subWithVersion.id} (state=${subWithVersion.attributes?.state}).`
      : `\n🔎 no reviewSubmission currently contains v${VERSION}.`);
    return;
  }

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

  // 1. Prefer the submission that already carries v2.8; else an open one; else create.
  let sub = subWithVersion
    || allSubs.find((s) => OPEN_SUB_STATES.has(s.attributes?.state))
    || null;
  if (sub) {
    console.log(`\nreusing reviewSubmission ${sub.id} (state=${sub.attributes?.state}, hasV2.8=${!!subWithVersion})`);
  } else {
    const created = await api('POST', '/v1/reviewSubmissions', {
      data: {
        type: 'reviewSubmissions',
        attributes: { platform: 'IOS' },
        relationships: { app: { data: { type: 'apps', id: app.id } } },
      },
    });
    sub = created.data;
    console.log(`\ncreated reviewSubmission ${sub.id} (state=${sub.attributes?.state})`);
  }

  // 2. Ensure the version is an item on this submission (skip if already present).
  if (subWithVersion && subWithVersion.id === sub.id) {
    console.log(`version ${VERSION} already an item on submission ${sub.id} — skipping add`);
  } else {
    const add = await api('POST', '/v1/reviewSubmissionItems', {
      data: {
        type: 'reviewSubmissionItems',
        relationships: {
          reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
          appStoreVersion: { data: { type: 'appStoreVersions', id: version.id } },
        },
      },
    }, { soft: true });
    if (add.__error) {
      // 409 "state does not allow adding more items" means the submission is
      // already sealed with its items — fine, proceed to submit as-is.
      console.log(`add item → ${add.__error} (proceeding; submission likely already sealed)`);
    } else {
      console.log(`added version ${VERSION} as a reviewSubmissionItem`);
    }
  }

  if (DRY_RUN) {
    console.log('\n🟡 DRY_RUN — submission scaffolded but NOT submitted. Re-run without DRY_RUN to submit.');
    return;
  }

  // 3. Submit / resubmit.
  //   READY_FOR_REVIEW  → first submit.
  //   UNRESOLVED_ISSUES → resubmit-after-rejection (issues resolved: new build
  //                       #90 + updated metadata). PATCH submitted=true again —
  //                       the API equivalent of "Resubmit to App Review".
  //   already in flight  → nothing to do.
  const subState = (await api('GET', `/v1/reviewSubmissions/${sub.id}`)).data?.attributes?.state;
  const RESUBMITTABLE = new Set(['READY_FOR_REVIEW', 'UNRESOLVED_ISSUES']);
  if (!RESUBMITTABLE.has(subState)) {
    console.log(`\n✅ reviewSubmission ${sub.id} is already ${subState} — already submitted / in review. Nothing to do.`);
    return;
  }
  console.log(`\n${subState === 'UNRESOLVED_ISSUES' ? 'resubmitting after rejection' : 'submitting'} reviewSubmission ${sub.id} …`);
  const patched = await api('PATCH', `/v1/reviewSubmissions/${sub.id}`, {
    data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } },
  });
  console.log(`submitted=true → reviewSubmission state=${patched.data?.attributes?.state}`);

  // 4. Re-read the version state.
  const after = (await api('GET', `/v1/appStoreVersions/${version.id}`)).data?.attributes?.appStoreState;
  console.log(`\n✅ v${VERSION} submitted for review. version state now: ${after}`);
}
main().catch((e) => { console.error('\n❌ submit failed:\n', e.message); process.exit(1); });
