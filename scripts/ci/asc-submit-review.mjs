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
import { appVersion } from './app-version.mjs';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const BUNDLE_ID = process.env.APP_BUNDLE_ID || 'com.chessacademy.pro';
const VERSION = appVersion();
const DRY_RUN = process.env.DRY_RUN === '1';
const DIAGNOSE = process.env.DIAGNOSE === '1';
// REGROUP — "1": a version already WAITING_FOR_REVIEW while opening products sit
// ready OUTSIDE its submission is pulled back (the submission cancelled) and
// resubmitted WITH them. Apple reviews an app's first one-time purchases only
// alongside an app version (2026-11-07: the 166 opening products' own
// submission was refused 409 "cannot be reviewed" while 4.0.8 waited alone).
const REGROUP = process.env.REGROUP === '1';

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

/** Every opening product Apple says is READY_TO_SUBMIT, with the IAP version
 *  a review item carries. Opening products only (`opening.` ids). */
async function readyOpeningIaps(appId) {
  const out = [];
  let url = `/v1/apps/${appId}/inAppPurchasesV2?limit=200&fields[inAppPurchases]=productId,state`;
  while (url) {
    const page = await api('GET', url, null, { soft: true });
    if (page.__error) { console.log(`inAppPurchasesV2 → ${page.__error} ${String(page.__body).slice(0, 300)}`); break; }
    for (const p of page.data || []) {
      if (!String(p.attributes?.productId || '').startsWith('opening.') || p.attributes?.state !== 'READY_TO_SUBMIT') continue;
      const vs = (await api('GET', `/v2/inAppPurchases/${p.id}/versions?limit=50`, null, { soft: true }))?.data || [];
      const v = vs.find((x) => x.attributes?.state === 'PREPARE_FOR_SUBMISSION' || x.attributes?.state === 'READY_TO_SUBMIT') || vs[0];
      out.push({ id: p.id, productId: p.attributes.productId, versionId: v?.id ?? null });
    }
    url = page.links?.next || null;
  }
  return out;
}

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

  const iaps = await readyOpeningIaps(app.id);
  console.log(`\nopening products ready to submit: ${iaps.length}${iaps.length ? ` (${iaps.slice(0, 5).map((i) => i.productId).join(', ')}${iaps.length > 5 ? ', …' : ''})` : ''}`);

  // REGROUP: pull a waiting version back so its first one-time purchases ride with it.
  let state2 = state;
  let cancelledId = null;
  if (REGROUP && state === 'WAITING_FOR_REVIEW' && iaps.length && subWithVersion && !DRY_RUN) {
    console.log(`\n↩︎ cancelling reviewSubmission ${subWithVersion.id} to resubmit v${VERSION} with ${iaps.length} opening products`);
    const c = await api('PATCH', `/v1/reviewSubmissions/${subWithVersion.id}`, { data: { type: 'reviewSubmissions', id: subWithVersion.id, attributes: { canceled: true } } }, { soft: true });
    if (c.__error) throw new Error(`cancel ${subWithVersion.id} → ${c.__error} ${String(c.__body).slice(0, 800)}`);
    // Wait until the version is free AND the old submission has finished
    // cancelling: the version cannot join a new submission while the old
    // one still holds it.
    let oldState = 'CANCELING';
    for (let i = 0; i < 60; i += 1) {
      await new Promise((r) => setTimeout(r, 5000));
      state2 = (await api('GET', `/v1/appStoreVersions/${version.id}`)).data?.attributes?.appStoreState;
      oldState = (await api('GET', `/v1/reviewSubmissions/${subWithVersion.id}`)).data?.attributes?.state;
      if (state2 !== 'WAITING_FOR_REVIEW' && oldState !== 'CANCELING') break;
    }
    console.log(`after cancel: version ${state2}, old submission ${oldState}`);
    cancelledId = subWithVersion.id;
    subWithVersion = null;
  }

  // Guard: only submit a version that ASC itself says is ready.
  const SUBMITTABLE = new Set(['READY_FOR_REVIEW', 'PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY']);
  if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PENDING_DEVELOPER_RELEASE', 'PROCESSING_FOR_APP_STORE', 'READY_FOR_SALE'].includes(state2)) {
    console.log(`\n✅ Nothing to do — version ${VERSION} is already ${state2} (already submitted / live).${iaps.length ? ` ${iaps.length} opening products are ready OUTSIDE it — run with regroup to send them with it.` : ''}`);
    return;
  }
  if (!SUBMITTABLE.has(state2)) {
    throw new Error(`Version ${VERSION} is in state ${state2}, not a submittable state. Aborting (fix readiness first).`);
  }

  // Confirm a build is attached (a submission with no build is rejected).
  const build = (await api('GET', `/v1/appStoreVersions/${version.id}/build`, null, { soft: true }))?.data;
  if (!build) throw new Error(`No build attached to version ${VERSION}. Attach a VALID build first.`);
  const buildNum = (await api('GET', `/v1/builds/${build.id}`)).data?.attributes?.version;
  console.log(`build attached: #${buildNum} (${build.id})`);

  // 1. Prefer the submission that already carries v2.8; else an open one; else create.
  let sub = subWithVersion
    || allSubs.find((s) => s.id !== cancelledId && s.attributes?.state === 'READY_FOR_REVIEW')
    || allSubs.find((s) => s.id !== cancelledId && OPEN_SUB_STATES.has(s.attributes?.state))
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
      // A 409 can mean "already sealed with its items" — but it can equally
      // mean we tried to add to an EMPTY sealed shell, and the old code then
      // flipped submitted=true on a submission containing NOTHING. That ships
      // an empty review to Apple and burns a review cycle (1-3 days) on an app
      // with live paying customers. Never assume; verify below.
      // 🚨 PRINT APPLE'S REASON, NOT JUST THE STATUS (2026-09-22). `__body`
      // has been captured by `api()` since it was written and thrown away
      // here, so nine minutes of release pipeline reported "add item → 409"
      // and nothing else. A bare status code cannot distinguish "already in
      // this submission" (benign) from "version not eligible" or "another
      // submission holds it" — which are three different fixes. The guard
      // below correctly refuses to submit an empty shell either way; this is
      // what tells a reader WHY it had to.
      console.log(`add item → ${add.__error} (will verify the submission actually carries ${VERSION})`);
      if (add.__body) console.log(`  apple says: ${String(add.__body).slice(0, 600)}`);
    } else {
      console.log(`added version ${VERSION} as a reviewSubmissionItem`);
    }
  }

  // 2a. The ready opening products ride with the version (their first review
  // must be alongside an app version). Already an item → Apple says 409; read it.
  for (const p of iaps) {
    if (!p.versionId) { console.log(`   ${p.productId}: no IAP version — skipped`); continue; }
    const r = await api('POST', '/v1/reviewSubmissionItems', {
      data: { type: 'reviewSubmissionItems', relationships: {
        reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } },
        inAppPurchaseVersion: { data: { type: 'inAppPurchaseVersions', id: p.versionId } },
      } },
    }, { soft: true });
    if (r.__error) console.log(`   ${p.productId}: add → ${r.__error} ${String(r.__body).replace(/\s+/g, ' ').slice(0, 700)}`);
  }

  // 2b. VERIFY the submission really contains this version before submitting.
  // This is the gate the 409-is-benign path skipped. Diagnose on 2026-08-03
  // found three stale READY_FOR_REVIEW shells with items=0 that the reuse
  // branch would happily pick up, so an unverified submit was a live risk.
  {
    const items = (await api(
      'GET',
      `/v1/reviewSubmissions/${sub.id}/items?include=appStoreVersion,inAppPurchaseVersion&limit=200`,
      null,
      { soft: true },
    ))?.data || [];
    const carries = items.some(
      (it) => it.relationships?.appStoreVersion?.data?.id === version.id,
    );
    const iapItems = items.filter((it) => it.relationships?.inAppPurchaseVersion?.data?.id).length;
    console.log(`submission ${sub.id} now has ${items.length} item(s); carries ${VERSION}: ${carries}; opening products: ${iapItems} of ${iaps.length} ready`);
    if (!carries) {
      throw new Error(
        `reviewSubmission ${sub.id} does NOT contain version ${VERSION} (${items.length} item(s)). ` +
        `Refusing to submit — flipping submitted=true here would send Apple an empty or wrong review. ` +
        `Delete the stale empty reviewSubmission shells in App Store Connect and re-run.`,
      );
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
  }, { soft: true });
  if (patched.__error) throw new Error(`submit ${sub.id} → ${patched.__error}\n${String(patched.__body).slice(0, 3000)}`);
  console.log(`submitted=true → reviewSubmission state=${patched.data?.attributes?.state}`);

  // 4. Re-read the version state.
  const after = (await api('GET', `/v1/appStoreVersions/${version.id}`)).data?.attributes?.appStoreState;
  console.log(`\n✅ v${VERSION} submitted for review. version state now: ${after}`);
}
main().catch((e) => { console.error('\n❌ submit failed:\n', e.message); process.exit(1); });
