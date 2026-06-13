#!/usr/bin/env node
// Decide whether the nightly job should do anything: only if main's current
// HEAD differs from the commit the last SUCCESSFUL Xcode Cloud build was built
// from. If nothing changed since the last build, we skip the whole nightly —
// no build, no web deploy, no TestFlight submission, no tester email.
//
// Prints `ship=true` or `ship=false` to $GITHUB_OUTPUT (and stdout).
// Env: GITHUB_SHA (current main), APP_STORE_CONNECT_API_* (App Store Connect).
import crypto from 'node:crypto';
import fs from 'node:fs';

const CI_PRODUCT = 'B64A226C-C522-4D72-8815-27552E3E67DE';
const need = (n) => { const v = process.env[n]; if (!v) { console.error(`::error::missing env ${n}`); process.exit(1); } return v; };
const CURRENT = (process.env.HEAD_SHA || process.env.GITHUB_SHA || '').trim();
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
  return r.json();
}
const setOut = (ship, reason) => {
  console.log(`ship=${ship} (${reason})`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ship=${ship}\n`);
};

const main = async () => {
  if (!CURRENT) { setOut(true, 'no GITHUB_SHA — ship to be safe'); return; }
  const runs = await api(`/v1/ciProducts/${CI_PRODUCT}/buildRuns?limit=10&sort=-number&fields[ciBuildRuns]=completionStatus,sourceCommit`);
  const lastSucceeded = (runs.data || []).find((r) => r.attributes?.completionStatus === 'SUCCEEDED');
  const lastSha = (lastSucceeded?.attributes?.sourceCommit?.commitSha || '').trim();
  if (!lastSha) { setOut(true, 'no prior successful build — ship'); return; }
  if (lastSha === CURRENT) { setOut(false, `main unchanged since last build (${lastSha.slice(0, 8)}) — skip`); return; }
  setOut(true, `main advanced ${lastSha.slice(0, 8)} -> ${CURRENT.slice(0, 8)} — ship`);
};
main().catch((e) => { console.error(e); setOut(true, 'check errored — ship to be safe'); });
