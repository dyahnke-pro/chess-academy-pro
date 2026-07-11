// Pull the live audit-stream buffer from prod and print recent events.
// Used by the post-deploy audit workflow to close gate G2 automatically:
// after the Playwright run drives the surfaces, this dumps what the app
// actually emitted so a human (or the next session) can eyeball it in the
// Action log / artifact.
//
// Env:
//   PROD_URL             prod origin (default https://chess-academy-pro.vercel.app)
//   AUDIT_STREAM_SECRET  x-audit-secret header value (preferred when set)
//   VERCEL_TOKEN         fallback read credential — the endpoint verifies it
//                        against this Vercel project server-side (GET-only).
//                        CI already holds it for deploys, so G2 needs NO new
//                        GitHub secret and cannot silently rot (2026-07-11).
//   SINCE_MS             only events newer than this epoch-ms (default: 30 min ago)
//   OUT_FILE             optional path to also write the raw JSON

import { writeFile } from 'node:fs/promises';

const PROD_URL = (process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const SINCE_MS = Number(process.env.SINCE_MS ?? Date.now() - 30 * 60_000);
const OUT_FILE = process.env.OUT_FILE ?? '';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN ?? '';

async function main() {
  if (!SECRET && !VERCEL_TOKEN) {
    // Visible warning annotation, not a silent log: without a credential the
    // G2 audit-stream pull is skipped and the post-deploy audit can't prove
    // what the app emitted (David 2026-06-30 — the repo secret was unset, so
    // every G2 step quietly no-op'd while the job still went green).
    console.log('::warning title=G2 audit-stream pull skipped::neither AUDIT_STREAM_SECRET nor VERCEL_TOKEN is set — gate G2 cannot pull the live audit-stream.');
    console.log('[pull-audit-stream] no credential — skipping.');
    process.exit(0);
  }
  const url = `${PROD_URL}/api/audit-stream?since=${SINCE_MS}`;
  // Prefer the shared secret; fall back to the Vercel token (the endpoint
  // verifies it against this project server-side, GET-only).
  const headers = SECRET ? { 'x-audit-secret': SECRET } : { 'x-vercel-token': VERCEL_TOKEN };
  let res;
  try {
    res = await fetch(url, { headers, cache: 'no-store' });
  } catch (err) {
    console.error(`[pull-audit-stream] fetch failed: ${err.message}`);
    process.exit(0); // non-fatal — don't fail the audit over a stream blip
  }
  const body = await res.text();
  if (res.status === 401) {
    console.error(SECRET
      ? '[pull-audit-stream] 401 — repo AUDIT_STREAM_SECRET does not match prod env. Reconcile them.'
      : '[pull-audit-stream] 401 — VERCEL_TOKEN was rejected by the endpoint (no project read access?).');
    console.log('::warning title=G2 audit-stream pull unauthorized::the credential presented to /api/audit-stream was rejected — gate G2 did not run.');
    process.exit(0);
  }
  if (!res.ok) {
    console.error(`[pull-audit-stream] ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
    process.exit(0);
  }
  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    console.error(`[pull-audit-stream] non-JSON response: ${body.slice(0, 300)}`);
    process.exit(0);
  }
  const events = Array.isArray(parsed) ? parsed : (parsed.events ?? []);
  console.log(`[pull-audit-stream] storage=${parsed.storage ?? 'n/a'} events=${events.length} since=${new Date(SINCE_MS).toISOString()}`);
  if (events.length === 0) {
    console.log('[pull-audit-stream] no events — app probably not open during the window. (Fine.)');
  } else {
    const byKind = {};
    for (const e of events) byKind[e.kind] = (byKind[e.kind] ?? 0) + 1;
    console.log('[pull-audit-stream] by kind:');
    for (const [k, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) console.log(`    ${n.toString().padStart(4)}  ${k}`);
  }
  if (OUT_FILE) {
    await writeFile(OUT_FILE, JSON.stringify(parsed, null, 2));
    console.log(`[pull-audit-stream] raw → ${OUT_FILE}`);
  }
}

main();
