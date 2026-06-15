#!/usr/bin/env node
// Trigger an Xcode Cloud build of main and wait until the resulting build is
// VALID on App Store Connect. Used by the nightly job — per-push auto-builds are
// disabled (the workflow's branch trigger points at a dead branch), so this is
// the sole thing that produces a build.
//
// Env (same App Store Connect creds as distribute-testflight.mjs):
//   APP_STORE_CONNECT_API_KEY        base64 of the .p8
//   APP_STORE_CONNECT_API_KEY_ID
//   APP_STORE_CONNECT_API_ISSUER_ID
import crypto from 'node:crypto';

const WORKFLOW = '9DB6F815-51CF-4E96-A4DB-F533F24B1EF7';
const CI_PRODUCT = 'B64A226C-C522-4D72-8815-27552E3E67DE';
const APP = '6776418777';
const TIMEOUT_MS = 40 * 60 * 1000;

const need = (n) => { const v = process.env[n]; if (!v) { console.error(`::error::missing env ${n}`); process.exit(1); } return v; };
const KEY_ID = need('APP_STORE_CONNECT_API_KEY_ID');
const ISSUER_ID = need('APP_STORE_CONNECT_API_ISSUER_ID');
const PEM = Buffer.from(need('APP_STORE_CONNECT_API_KEY'), 'base64').toString('utf8');
const b64url = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' }))}`;
  return `${si}.${b64url(crypto.sign('sha256', Buffer.from(si), { key: crypto.createPrivateKey(PEM), dsaEncoding: 'ieee-p1363' }))}`;
}
async function api(method, path, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    method, headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Point the Xcode Cloud workflow's branch start condition at `pattern`.
// We keep auto-build OFF in steady state (a non-existent branch pattern) so a
// push to main NEVER auto-triggers a build — David wants ONE batched push, not
// a build per commit (2026-06-15). To create a deliberate build we briefly
// associate `main`, create the build, then disassociate again. A running
// ciBuildRun is NOT cancelled by changing the start condition, so the build
// completes after we flip the pattern back.
const IDLE_BRANCH_PATTERN = '__manual-batch-only__';
async function setWorkflowBranch(pattern) {
  const r = await api('PATCH', `/v1/ciWorkflows/${WORKFLOW}`, {
    data: { type: 'ciWorkflows', id: WORKFLOW, attributes: {
      branchStartCondition: { source: { isAllMatch: false, patterns: [{ pattern, isPrefix: false }] }, autoCancel: true },
    } },
  });
  if (r.status >= 400) console.error(`::warning::could not set workflow branch to ${pattern}:`, JSON.stringify(r.j).slice(0, 200));
  return r.status < 400;
}

const main = async () => {
  // Associate main so the manual build can be created, then disassociate
  // immediately after so no future push auto-builds.
  await setWorkflowBranch('main');
  const trig = await api('POST', '/v1/ciBuildRuns', { data: { type: 'ciBuildRuns', relationships: { workflow: { data: { type: 'ciWorkflows', id: WORKFLOW } } } } });
  await setWorkflowBranch(IDLE_BRANCH_PATTERN);
  if (trig.status >= 400) { console.error('::error::trigger failed', JSON.stringify(trig.j).slice(0, 300)); process.exit(1); }
  const runId = trig.j.data?.id;
  const number = trig.j.data?.attributes?.number;
  console.log(`triggered build run #${number} (${runId})`);

  const deadline = Date.now() + TIMEOUT_MS;
  let runDone = false;
  while (Date.now() < deadline) {
    if (!runDone) {
      const run = await api('GET', `/v1/ciBuildRuns/${runId}?fields[ciBuildRuns]=executionProgress,completionStatus`);
      const a = run.j.data?.attributes || {};
      console.log(`run #${number}: ${a.executionProgress} ${a.completionStatus || ''}`);
      if (a.completionStatus) {
        if (a.completionStatus !== 'SUCCEEDED') { console.error(`::error::build run #${number} ${a.completionStatus}`); process.exit(1); }
        runDone = true;
      } else { await sleep(45000); continue; }
    }
    // run succeeded — wait for the build to be VALID and print its id
    const builds = await api('GET', `/v1/builds?filter[app]=${APP}&limit=1&sort=-version&fields[builds]=version,processingState`);
    const b = builds.j.data?.[0];
    const st = b?.attributes?.processingState;
    console.log(`build ${b?.attributes?.version}: ${st}`);
    if (st === 'VALID') { console.log(`READY build=${b.attributes.version} id=${b.id}`); process.exit(0); }
    if (st === 'FAILED' || st === 'INVALID') { console.error(`::error::build ${b?.attributes?.version} ${st}`); process.exit(1); }
    await sleep(45000);
  }
  console.error('::error::timed out waiting for the build to become VALID');
  process.exit(1);
};
main().catch((e) => { console.error(e); process.exit(1); });
