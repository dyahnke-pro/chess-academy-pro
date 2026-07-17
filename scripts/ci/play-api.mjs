// play-api.mjs — session-level Google Play Developer API access, the analog of
// the asc-*.mjs App Store Connect scripts. Same shape: pure `node:crypto`, no
// deps, credential from env. Where ASC uses an ES256 API key + a per-call JWT,
// Google uses an RS256 SERVICE-ACCOUNT JWT exchanged for a short-lived OAuth2
// token, then the androidpublisher v3 "edits" API.
//
// Credential (any ONE, checked in this order):
//   PLAY_SERVICE_ACCOUNT_JSON_B64 — base64 of the service-account JSON (the CI +
//                                   env-config secret; matches android-play.yml)
//   PLAY_JSON_KEY_PATH            — path to the JSON key file (fastlane's var)
//   GOOGLE_APPLICATION_CREDENTIALS — path to the JSON key file (gcloud default)
//
// The invited service account needs "Release to testing tracks" (+ "Manage
// testing track testers" / "View app information") on com.chessacademy.pro.
//
// Usage:
//   node scripts/ci/play-api.mjs whoami   — auth only; prove the key works
//   node scripts/ci/play-api.mjs status   — list every track + release (read-only)
//
// status opens a Play "edit" transaction, reads tracks + bundles, then ABORTS
// the edit (DELETE) so nothing is ever committed — a pure read, safe to run.
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const PACKAGE = 'com.chessacademy.pro';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
const SCOPE = 'https://www.googleapis.com/auth/androidpublisher';

const b64url = (b) =>
  Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Load the service-account JSON from whichever env var is present. */
function loadServiceAccount() {
  const b64 = process.env.PLAY_SERVICE_ACCOUNT_JSON_B64;
  const path = process.env.PLAY_JSON_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let raw;
  if (b64) {
    raw = Buffer.from(b64, 'base64').toString('utf8');
  } else if (path) {
    raw = readFileSync(path, 'utf8');
  } else {
    console.error(
      '::error::no Play credential — set PLAY_SERVICE_ACCOUNT_JSON_B64 (base64 of the JSON key), ' +
        'PLAY_JSON_KEY_PATH, or GOOGLE_APPLICATION_CREDENTIALS',
    );
    process.exit(1);
  }
  let sa;
  try {
    sa = JSON.parse(raw);
  } catch {
    console.error('::error::the Play credential is not valid JSON (bad base64 or truncated key?)');
    process.exit(1);
  }
  if (!sa.client_email || !sa.private_key) {
    console.error('::error::the JSON is missing client_email / private_key — not a service-account key');
    process.exit(1);
  }
  return sa;
}

/** Mint an RS256 service-account JWT and exchange it for an OAuth2 access token. */
async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const signingInput =
    `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.` +
    b64url(
      JSON.stringify({ iss: sa.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
    );
  const sig = b64url(
    crypto.sign('RSA-SHA256', Buffer.from(signingInput), crypto.createPrivateKey(sa.private_key)),
  );
  const assertion = `${signingInput}.${sig}`;
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    console.error(`::error::token exchange failed (${r.status}): ${JSON.stringify(j)}`);
    process.exit(1);
  }
  return j.access_token;
}

/** androidpublisher call with the bearer token; returns parsed JSON (or text). */
async function api(token, method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const t = await r.text();
  let j;
  try {
    j = t ? JSON.parse(t) : {};
  } catch {
    j = t;
  }
  return { ok: r.ok, status: r.status, body: j };
}

const main = async () => {
  const cmd = process.argv[2] || 'status';
  const sa = loadServiceAccount();
  const token = await getAccessToken(sa);

  if (cmd === 'whoami') {
    console.log(`✓ authenticated as ${sa.client_email}`);
    console.log(`  project: ${sa.project_id ?? '(unknown)'}`);
    console.log(`  package: ${PACKAGE}`);
    console.log('  token acquired — the service account can reach the Play Developer API.');
    return;
  }

  if (cmd === 'status') {
    // Open a read-only edit, list tracks + bundles, then ABORT (never commit).
    const edit = await api(token, 'POST', `/applications/${PACKAGE}/edits`);
    if (!edit.ok) {
      console.error(`::error::could not open an edit (${edit.status}): ${JSON.stringify(edit.body)}`);
      if (edit.status === 401 || edit.status === 403) {
        console.error(
          '  → the service account is authenticated but lacks access to this app. In Play Console → ' +
            'Users and permissions → the play-ci account → grant "Release to testing tracks" on ' +
            `${PACKAGE}.`,
        );
      }
      process.exit(1);
    }
    const editId = edit.body.id;
    try {
      const tracks = await api(token, 'GET', `/applications/${PACKAGE}/edits/${editId}/tracks`);
      const bundles = await api(token, 'GET', `/applications/${PACKAGE}/edits/${editId}/bundles`);
      console.log(`✓ ${sa.client_email} can read ${PACKAGE}\n`);
      const codes = (bundles.body.bundles ?? []).map((b) => b.versionCode).sort((a, b) => a - b);
      console.log(`Uploaded bundles (versionCodes): ${codes.length ? codes.join(', ') : '(none)'}\n`);
      const list = tracks.body.tracks ?? [];
      if (!list.length) {
        console.log('No tracks have a release yet.');
      }
      for (const t of list) {
        console.log(`Track: ${t.track}`);
        for (const rel of t.releases ?? []) {
          const vc = (rel.versionCodes ?? []).join(', ');
          console.log(
            `  • ${rel.name ?? '(unnamed)'} — status=${rel.status} versionCodes=[${vc}]` +
              (rel.userFraction ? ` fraction=${rel.userFraction}` : ''),
          );
        }
      }
    } finally {
      // Read-only: throw the edit away so nothing is ever committed.
      await api(token, 'DELETE', `/applications/${PACKAGE}/edits/${editId}`);
    }
    return;
  }

  console.error(`::error::unknown command "${cmd}" — use: whoami | status`);
  process.exit(1);
};

main().catch((e) => {
  console.error(`::error::${e?.stack || e}`);
  process.exit(1);
});
