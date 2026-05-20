// Pull the live audit-stream buffer from prod and print recent events.
// Used by the post-deploy audit workflow to close gate G2 automatically:
// after the Playwright run drives the surfaces, this dumps what the app
// actually emitted so a human (or the next session) can eyeball it in the
// Action log / artifact.
//
// Env:
//   PROD_URL             prod origin (default https://chess-academy-pro.vercel.app)
//   AUDIT_STREAM_SECRET  x-audit-secret header value (required; from repo secret)
//   SINCE_MS             only events newer than this epoch-ms (default: 30 min ago)
//   OUT_FILE             optional path to also write the raw JSON

import { writeFile } from 'node:fs/promises';

const PROD_URL = (process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const SINCE_MS = Number(process.env.SINCE_MS ?? Date.now() - 30 * 60_000);
const OUT_FILE = process.env.OUT_FILE ?? '';

async function main() {
  if (!SECRET) {
    console.log('[pull-audit-stream] AUDIT_STREAM_SECRET not set — skipping (configure the repo secret to enable).');
    process.exit(0);
  }
  const url = `${PROD_URL}/api/audit-stream?since=${SINCE_MS}`;
  let res;
  try {
    res = await fetch(url, { headers: { 'x-audit-secret': SECRET }, cache: 'no-store' });
  } catch (err) {
    console.error(`[pull-audit-stream] fetch failed: ${err.message}`);
    process.exit(0); // non-fatal — don't fail the audit over a stream blip
  }
  const body = await res.text();
  if (res.status === 401) {
    console.error('[pull-audit-stream] 401 — repo AUDIT_STREAM_SECRET does not match prod env. Reconcile them.');
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
