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
 * 🚨 THIS SCRIPT IS READ-ONLY. `--set` exists only to explain why it can't run.
 *
 * `environmentVariables` is a FULL-REPLACE attribute on the ASC API, and the
 * API does not disclose secret values. Verified 2026-08-06: it returned
 * `environmentVariables: []` for a workflow that demonstrably DOES carry
 * build-time vars — the shipped app completes real RevenueCat purchases, which
 * is impossible unless VITE_REVENUECAT_IOS_KEY is baked in by this very
 * workflow's `npm run build`. So secrets are omitted from the response
 * entirely, not returned redacted, and an empty list can NEVER be read as
 * "nothing would be lost".
 *
 * That makes a safe read-modify-write impossible: any PATCH would blank every
 * undisclosed secret and silently break billing on the next build. Set flags
 * in the App Store Connect UI (Xcode Cloud → Workflow → Environment).
 *
 *   node scripts/ci/asc-workflow-env.mjs            # read
 *   node scripts/ci/asc-workflow-env.mjs --set K=V  # refuses, explains why
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

// 🚨 Verified 2026-08-06: this API returns `environmentVariables: []` for a
// workflow that demonstrably DOES carry build-time vars — the shipped app
// makes real RevenueCat purchases, which is impossible without
// VITE_REVENUECAT_IOS_KEY baked in by this very workflow's `npm run build`.
// So Apple omits secret vars from the response entirely rather than listing
// them with isSecret:true. An empty (or all-plain) list therefore CANNOT be
// read as "nothing would be lost" — and because `environmentVariables` is a
// full-replace attribute, a PATCH built from it would silently blank every
// undisclosed secret, killing billing on the next build.
//
// There is no way to write safely through this API without being able to read
// back what's already there, so the write path is disabled outright. Set the
// variable in the App Store Connect UI (Xcode Cloud → Workflow → Environment).
console.error(
  `\n::error::REFUSING to write ${newKey}=${'*'.repeat(Math.min(newValue.length, 8))}.\n` +
  '  This API does NOT disclose secret environment variables, and\n' +
  '  `environmentVariables` is a FULL-REPLACE attribute — so a PATCH built from\n' +
  '  what we can read would blank every undisclosed secret, including\n' +
  '  VITE_REVENUECAT_IOS_KEY. That silently breaks billing on the next build.\n' +
  '  Set it in the App Store Connect UI instead: Xcode Cloud → Workflow → Environment.',
);
process.exit(1);
