#!/usr/bin/env node
// Read-only: query App Store Connect for the TestFlight PUBLIC LINK state of each
// beta group, plus the latest build. Prints ONLY non-secret values (group name,
// publicLinkEnabled, the shareable publicLink URL). Never prints the key/JWT.
// Creds come from the same GH Actions secrets the distribute script uses.
import crypto from 'node:crypto';

const APP = process.env.TF_APP_ID || '6776418777';
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
async function api(path) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}

const main = async () => {
  // App name sanity.
  const app = await api(`/v1/apps/${APP}?fields[apps]=name,bundleId`);
  console.log(`App: ${app.j.data?.attributes?.name} (${app.j.data?.attributes?.bundleId}) [${app.status}]`);

  // Every beta group + its public-link state.
  const groups = await api(`/v1/apps/${APP}/betaGroups?fields[betaGroups]=name,isInternalGroup,publicLinkEnabled,publicLink,publicLinkLimitEnabled,publicLinkLimit&limit=50`);
  if (groups.status !== 200) { console.error(`::error::betaGroups query failed: ${groups.status} ${JSON.stringify(groups.j).slice(0, 300)}`); process.exit(1); }
  console.log(`\n=== BETA GROUPS (${groups.j.data?.length || 0}) ===`);
  for (const g of groups.j.data || []) {
    const a = g.attributes;
    console.log(`\n• ${a.name}  ${a.isInternalGroup ? '(internal)' : '(external)'}  id=${g.id}`);
    console.log(`    publicLinkEnabled: ${a.publicLinkEnabled}`);
    console.log(`    publicLink:        ${a.publicLink || '(none — toggle it on in App Store Connect)'}`);
    if (a.publicLinkLimitEnabled) console.log(`    tester cap:        ${a.publicLinkLimit}`);
  }

  // Latest VALID build so we know the beta is live.
  const builds = await api(`/v1/builds?filter[app]=${APP}&filter[processingState]=VALID&limit=1&sort=-uploadedDate&fields[builds]=version,uploadedDate`);
  const b = builds.j.data?.[0];
  console.log(`\n=== LATEST VALID BUILD ===\n${b ? `${b.attributes.version} (uploaded ${b.attributes.uploadedDate})` : '(none)'}`);
};
main().catch((e) => { console.error(e); process.exit(1); });
