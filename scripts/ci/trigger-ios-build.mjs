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
// Which branch Xcode Cloud builds. Defaults to `main` so the nightly
// daily-deploy is unchanged; overridable (e.g. to build a release branch that
// deliberately excludes content on main — the App Store rejection resubmission
// builds the pro-free corrections branch, David 2026-07-02).
const BUILD_BRANCH = process.env.BUILD_BRANCH || 'main';

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

// Resolve the scmGitReference id for the target BRANCH so we can name the branch
// EXPLICITLY in the ciBuildRuns POST (Apple's documented path) instead of relying
// on the mutated workflow branch-condition. The implicit approach left the build
// dependent on workflow state a cancelled run could corrupt; an explicit
// sourceBranchOrTag sidesteps that. Returns null on any failure so the caller
// falls back to the implicit POST (never makes a working path worse).
async function resolveGitRef(branchName) {
  try {
    const repos = await api('GET', `/v1/ciProducts/${CI_PRODUCT}/primaryRepositories?limit=10`);
    const repoId = repos.j.data?.[0]?.id;
    if (!repoId) { console.error('::warning::no primary repository for ciProduct', JSON.stringify(repos.j).slice(0, 200)); return null; }
    let path = `/v1/scmRepositories/${repoId}/gitReferences?limit=200`;
    for (let page = 0; page < 5 && path; page += 1) {
      const refs = await api('GET', path);
      const hit = (refs.j.data || []).find((x) => x.attributes?.kind === 'BRANCH' && x.attributes?.name === branchName);
      if (hit) { console.log(`resolved ${branchName} gitReference ${hit.id} (repo ${repoId})`); return hit.id; }
      const next = refs.j.links?.next;
      path = next ? next.replace('https://api.appstoreconnect.apple.com', '') : null;
    }
    console.error(`::warning::no BRANCH gitReference named ${branchName} found`);
    return null;
  } catch (e) { console.error('::warning::resolveGitRef failed:', String(e).slice(0, 200)); return null; }
}

const main = async () => {
  // Associate the target branch so the manual build can be created, then
  // disassociate immediately after so no future push auto-builds.
  console.log(`building branch: ${BUILD_BRANCH}`);
  await setWorkflowBranch(BUILD_BRANCH);
  // Name the branch explicitly when we can (preferred); fall back to the
  // workflow's branch condition when the reference can't be resolved.
  const gitRefId = await resolveGitRef(BUILD_BRANCH);
  const baseRel = { workflow: { data: { type: 'ciWorkflows', id: WORKFLOW } } };
  const explicitRel = gitRefId
    ? { ...baseRel, sourceBranchOrTag: { data: { type: 'scmGitReferences', id: gitRefId } } }
    : baseRel;
  console.log(`build trigger: ${gitRefId ? `explicit sourceBranchOrTag=${BUILD_BRANCH} (implicit fallback armed)` : 'implicit (workflow branch condition)'}`);
  // Apple's POST /v1/ciBuildRuns intermittently returns a 500 UNEXPECTED_ERROR
  // (documented transient server bug — retrying the IDENTICAL request usually
  // succeeds). Previously a single 500 hard-failed the whole build; on a night
  // when Apple's API is flaky that means NO build ever ships. Retry 5xx (and
  // 429) with exponential backoff; a 4xx is a real client error, fail fast.
  //
  // 2026-06-21: a 3-day, 100%-consistent 500 on this POST (while reads + the
  // ciWorkflows PATCH succeed with the same key) is NOT a transient blip. The
  // explicit `sourceBranchOrTag` relationship is the prime suspect — Apple can
  // 500 on a relationship shape it no longer accepts. So once the explicit form
  // has 500'd, drop it and retry with the IMPLICIT form (workflow branch
  // condition only), alternating, so we exercise both shapes before giving up.
  let trig;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    // attempts 1-2 explicit; 3+ implicit (only meaningful when gitRefId exists)
    const relationships = (attempt >= 3 || !gitRefId) ? baseRel : explicitRel;
    trig = await api('POST', '/v1/ciBuildRuns', { data: { type: 'ciBuildRuns', relationships } });
    if (trig.status < 400) break;
    if (trig.status < 500 && trig.status !== 429) break; // real client error — don't retry
    if (attempt === 6) break;
    const waitMs = Math.min(60000, 5000 * 2 ** (attempt - 1));
    const shape = relationships === explicitRel ? 'explicit' : 'implicit';
    console.error(`::warning::ciBuildRuns ${trig.status} [${shape}] (attempt ${attempt}/6) — retrying in ${waitMs / 1000}s: ${JSON.stringify(trig.j).slice(0, 150)}`);
    await sleep(waitMs);
  }
  await setWorkflowBranch(IDLE_BRANCH_PATTERN);
  // Full (untruncated) error on final failure — the detail/meta may name the
  // real cause (workflow/scm/signing) instead of the generic "UNEXPECTED_ERROR".
  if (trig.status >= 400) { console.error(`::error::trigger failed after retries (status ${trig.status}):`, JSON.stringify(trig.j)); process.exit(1); }
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
