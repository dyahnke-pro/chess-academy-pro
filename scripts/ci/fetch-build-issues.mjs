#!/usr/bin/env node
// Diagnostic: fetch the LATEST Xcode Cloud build run's actions + issues from
// App Store Connect and print them, so a failed build's reason is visible in the
// GitHub Actions log (the ASC build log isn't otherwise reachable from CI/CC).
// Needs the same APP_STORE_CONNECT_API_* secrets as trigger-ios-build.mjs.
import crypto from 'node:crypto';

const CI_PRODUCT = 'B64A226C-C522-4D72-8815-27552E3E67DE';
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
async function api(path) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, { headers: { Authorization: `Bearer ${jwt()}` } });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}

const runId = process.argv[2]; // optional explicit ciBuildRun id
const APP = '6776418777';
// Print the highest already-uploaded build numbers (CFBundleVersion) per
// version — this is the number a new build must EXCEED.
const builds = await api(`/v1/builds?filter[app]=${APP}&sort=-uploadedDate&limit=10&fields[builds]=version,uploadedDate,processingState`);
console.log('recent uploaded builds (version = CFBundleVersion):');
for (const b of builds.j?.data ?? []) {
  console.log(`   build ${b.attributes?.version}  ${b.attributes?.processingState}  ${b.attributes?.uploadedDate}`);
}
console.log('');

let run;
if (runId) {
  run = (await api(`/v1/ciBuildRuns/${runId}`)).j?.data;
} else {
  const runs = await api(`/v1/ciProducts/${CI_PRODUCT}/buildRuns?limit=1&sort=-number&fields[ciBuildRuns]=number,executionProgress,completionStatus,startReason`);
  run = runs.j?.data?.[0];
}
if (!run) { console.error('no build run found', JSON.stringify(run)); process.exit(1); }
console.log(`build run #${run.attributes?.number}  progress=${run.attributes?.executionProgress}  status=${run.attributes?.completionStatus}  (${run.id})`);

const actions = await api(`/v1/ciBuildRuns/${run.id}/actions?fields[ciBuildActions]=name,actionType,executionProgress,completionStatus,issueCounts`);
for (const a of actions.j?.data ?? []) {
  const at = a.attributes ?? {};
  console.log(`\n── action: ${at.name} [${at.actionType}] progress=${at.executionProgress} status=${at.completionStatus} issues=${JSON.stringify(at.issueCounts)}`);
  const issues = await api(`/v1/ciBuildActions/${a.id}/issues?limit=50&fields[ciIssues]=issueType,message,category,fileSource`);
  for (const is of issues.j?.data ?? []) {
    const it = is.attributes ?? {};
    console.log(`   • [${it.issueType}] ${it.category ?? ''} ${it.message ?? ''}`.slice(0, 600));
  }
  if ((issues.j?.data ?? []).length === 0) console.log('   (no structured issues — likely a script/log failure; check artifacts)');
}
