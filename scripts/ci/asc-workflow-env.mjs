#!/usr/bin/env node
/**
 * asc-workflow-env — read (and optionally ADD to) the Xcode Cloud workflow's
 * build-time environment variables.
 *
 * WHY THIS EXISTS: the iOS bundle is built by Xcode Cloud's own `npm run build`
 * (ios/App/ci_scripts/ci_post_clone.sh), NOT by Vercel — so every `VITE_*` flag
 * the native app ships with is baked from the XCODE CLOUD environment. Setting
 * VITE_PAYWALL_ENABLED in Vercel only affects the web bundle (where billing is
 * keyless → isPro=true → the gate is dormant anyway). This is the only place
 * the native paywall flag can actually be flipped.
 *
 * 🚨 SAFETY — `environmentVariables` is a FULL-REPLACE attribute on the ASC
 * API, and SECRET values read back REDACTED (value omitted / isSecret true).
 * A naive read-modify-write therefore WIPES every secret var — which on this
 * project would destroy VITE_REVENUECAT_IOS_KEY and silently break billing on
 * the next build. So `--set` REFUSES to write whenever any existing var is
 * secret; the only safe path in that case is the App Store Connect UI.
 *
 * Read-only by default.
 *   node scripts/ci/asc-workflow-env.mjs
 *   node scripts/ci/asc-workflow-env.mjs --set KEY=VALUE
 */
import crypto from 'node:crypto';

const WORKFLOW = '9DB6F815-51CF-4E96-A4DB-F533F24B1EF7';

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
    method,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: r.status, j };
}

const setArg = process.argv.includes('--set')
  ? process.argv[process.argv.indexOf('--set') + 1]
  : null;

const res = await api('GET', `/v1/ciWorkflows/${WORKFLOW}`);
if (res.status >= 400) {
  console.error(`::error::GET ciWorkflow failed (${res.status})`, JSON.stringify(res.j).slice(0, 400));
  process.exit(1);
}
const attrs = res.j.data?.attributes ?? {};
const vars = attrs.environmentVariables ?? [];

console.log(`workflow: ${attrs.name ?? '?'}`);
console.log(`environment variables (${vars.length}):`);
for (const v of vars) {
  // Never print a value — only whether one is present and whether it's secret.
  const shape = v.isSecret ? 'SECRET (value not readable via API)' : `plain, ${String(v.value ?? '').length} chars`;
  console.log(`  - ${v.key}  [${shape}]`);
}

// The two flags that decide whether the native paywall can engage at all.
const has = (k) => vars.some((v) => v.key === k);
console.log('\n── paywall preconditions on the NATIVE build ──');
console.log(`  VITE_PAYWALL_ENABLED   present: ${has('VITE_PAYWALL_ENABLED')}`);
console.log(`  VITE_REVENUECAT_IOS_KEY present: ${has('VITE_REVENUECAT_IOS_KEY')}`);
console.log('  (the wall engages only when the flag is "true" AND a RevenueCat key exists)');

if (!setArg) process.exit(0);

// ---- write path ----
const eq = setArg.indexOf('=');
if (eq < 1) { console.error('::error::--set expects KEY=VALUE'); process.exit(1); }
const newKey = setArg.slice(0, eq);
const newValue = setArg.slice(eq + 1);

const anySecret = vars.some((v) => v.isSecret);
if (anySecret) {
  console.error(
    '\n::error::REFUSING to write. This workflow has SECRET environment variables whose ' +
    'values the API does not return, and `environmentVariables` is a full-replace ' +
    'attribute — writing would blank them (including the RevenueCat key, which would ' +
    'silently break billing on the next build). Set this var in the App Store Connect UI instead.',
  );
  process.exit(1);
}

const next = vars.filter((v) => v.key !== newKey).concat([{ key: newKey, value: newValue, isSecret: false }]);
const patch = await api('PATCH', `/v1/ciWorkflows/${WORKFLOW}`, {
  data: { type: 'ciWorkflows', id: WORKFLOW, attributes: { environmentVariables: next } },
});
if (patch.status >= 400) {
  console.error(`::error::PATCH failed (${patch.status})`, JSON.stringify(patch.j).slice(0, 400));
  process.exit(1);
}
console.log(`\n✓ set ${newKey} — takes effect on the NEXT iOS build (no build is triggered by this script).`);
