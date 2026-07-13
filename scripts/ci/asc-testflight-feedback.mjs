#!/usr/bin/env node
// Pull TestFlight beta feedback (tester screenshot notes + crash feedback)
// from App Store Connect and print any items newer than --since. This is the
// TestFlight half of the feedback-alert wiring; the in-app "Feedback" button
// is captured separately via the app's audit-stream.
//
// TestFlight feedback lives ONLY in App Store Connect (it never reaches the
// app's own analytics), so it must be polled from the ASC API — which is why
// this runs in CI where the ASC key lives, not in a Claude sandbox.
//
// Endpoints (App Store Connect API): betaFeedbackScreenshotSubmissions +
// betaFeedbackCrashSubmissions, filtered to the app, newest first. The script
// is defensive: if Apple's resource path differs on this account it prints the
// status + body instead of throwing, so the log says exactly what to fix.
//
// Env: ASC_KEY_P8 / ASC_KEY_ID / ASC_ISSUER_ID.
//   SINCE   ISO timestamp — only print feedback created after this (default: 24h ago)
//   APP_ID  override (default 6776418777)

import { createPrivateKey, sign as cryptoSign } from 'node:crypto';

const ASC = 'https://api.appstoreconnect.apple.com';
const KEY_ID = req('ASC_KEY_ID');
const ISSUER_ID = req('ASC_ISSUER_ID');
const APP = process.env.APP_ID || '6776418777';
const SINCE = process.env.SINCE ? new Date(process.env.SINCE) : new Date(Date.now() - 24 * 3600_000);

function req(n) { const v = process.env[n]; if (!v) throw new Error(`Missing env ${n}`); return v; }
function loadKey() { let p = req('ASC_KEY_P8'); if (!p.includes('BEGIN')) p = Buffer.from(p, 'base64').toString('utf8'); return createPrivateKey({ key: p, format: 'pem' }); }
const PK = loadKey();
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function jwt() {
  const now = Math.floor(Date.now() / 1000);
  const si = `${b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: ISSUER_ID, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' }))}`;
  return `${si}.${b64url(cryptoSign('sha256', Buffer.from(si), { key: PK, dsaEncoding: 'ieee-p1363' }))}`;
}
async function api(path) {
  const res = await fetch(path.startsWith('http') ? path : `${ASC}${path}`, {
    headers: { Authorization: `Bearer ${jwt()}` },
  });
  const t = await res.text();
  let body = null; try { body = t ? JSON.parse(t) : null; } catch { body = t; }
  return { status: res.status, body };
}

// Pull one feedback resource type, tolerating a 404 (endpoint not available on
// this account/entitlement) by reporting it instead of throwing.
async function pull(kind, resource) {
  const path = `/v1/apps/${APP}/${resource}?limit=50&sort=-createdDate&include=tester,build`;
  const { status, body } = await api(path);
  if (status === 404 || status === 403) {
    console.log(`\n[${kind}] endpoint returned ${status} — ${status === 403 ? 'the ASC key lacks the role/entitlement for TestFlight feedback (needs Admin/App Manager)' : 'resource not available on this account (Apple may name it differently)'}.`);
    if (typeof body === 'object' && body?.errors?.[0]?.detail) console.log(`   detail: ${body.errors[0].detail}`);
    return [];
  }
  if (status >= 400) {
    console.log(`\n[${kind}] error ${status}: ${JSON.stringify(body).slice(0, 300)}`);
    return [];
  }
  const testers = new Map();
  const builds = new Map();
  for (const inc of body?.included || []) {
    if (inc.type === 'betaTesters') testers.set(inc.id, inc.attributes);
    if (inc.type === 'builds') builds.set(inc.id, inc.attributes);
  }
  const items = (body?.data || []).map((d) => {
    const a = d.attributes || {};
    const testerId = d.relationships?.tester?.data?.id;
    const buildId = d.relationships?.build?.data?.id;
    const tester = testerId ? testers.get(testerId) : null;
    return {
      kind,
      id: d.id,
      created: a.createdDate || a.timestamp || null,
      comment: a.comment || a.feedbackType || '(no comment)',
      device: a.deviceModel || a.devicePlatform || '',
      os: a.osVersion || '',
      locale: a.locale || '',
      tester: tester ? `${tester.firstName || ''} ${tester.lastName || ''} <${tester.email || '?'}>`.trim() : (a.email || 'unknown tester'),
      build: buildId ? (builds.get(buildId)?.version || buildId) : '',
    };
  });
  return items;
}

async function main() {
  console.log(`app=${APP}  since=${SINCE.toISOString()}`);
  const screenshot = await pull('screenshot-feedback', 'betaFeedbackScreenshotSubmissions');
  const crash = await pull('crash-feedback', 'betaFeedbackCrashSubmissions');
  const all = [...screenshot, ...crash]
    .filter((f) => !f.created || new Date(f.created) > SINCE)
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));

  console.log(`\n══════════ TESTFLIGHT FEEDBACK (new since ${SINCE.toISOString()}) ══════════`);
  if (all.length === 0) {
    console.log('none');
  } else {
    for (const f of all) {
      console.log(`\n• [${f.kind}] ${f.created || '?'}  —  ${f.tester}`);
      console.log(`  ${f.device} ${f.os} ${f.locale}  build ${f.build}`);
      console.log(`  ${String(f.comment).replace(/\n/g, ' ').slice(0, 500)}`);
    }
  }
  console.log(`\nNEW_FEEDBACK_COUNT=${all.length}`);
}

main().catch((e) => { console.error('\n❌ asc-testflight-feedback failed:\n', e.message); process.exit(1); });
