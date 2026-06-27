// Mic diagnostics — pull the live audit-stream and print ONLY the
// voiceInputService mic events, fully expanded, so a "mic is unavailable"
// report from a real device (the native iOS/TestFlight app, where the mic
// path can't be exercised in headless Playwright) becomes a concrete cause
// instead of a guess.
//
// The native mic path emits, per tap:
//   mic-start-requested  — the tap landed; carries the capability snapshot
//                          (and, on the native grant path, the raw
//                          SpeechRecognition.available() result + permState)
//   mic-started          — recognition.start() / native start() succeeded
//   mic-start-failed      — available()/permission/start failed; `summary`
//                          carries the exact reason, `details` the snapshot
//   mic-error            — a recognition.onerror fired (raw error string)
//   mic-gave-up          — auto-restart thrashed past the cap
//
// USAGE (after reproducing on the device with the app OPEN):
//   AUDIT_STREAM_SECRET=<secret> node scripts/audit-mic-diagnostics.mjs
//   # window defaults to the last 30 min; override with SINCE_MS.
//
// Env:
//   PROD_URL             prod origin (default https://chess-academy-pro.vercel.app)
//   AUDIT_STREAM_SECRET  x-audit-secret header value (required)
//   SINCE_MS             only events newer than this epoch-ms (default: 30 min ago)
//   OUT_FILE             optional path to also write the filtered JSON

import { writeFile } from 'node:fs/promises';

const PROD_URL = (process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const SINCE_MS = Number(process.env.SINCE_MS ?? Date.now() - 30 * 60_000);
const OUT_FILE = process.env.OUT_FILE ?? '';

const MIC_KINDS = new Set([
  'mic-start-requested',
  'mic-started',
  'mic-start-failed',
  'mic-error',
  'mic-gave-up',
]);

function fmtDetails(details) {
  if (!details) return '';
  let obj = details;
  if (typeof details === 'string') {
    try { obj = JSON.parse(details); } catch { return `      ${details}`; }
  }
  return Object.entries(obj)
    .map(([k, v]) => `      ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n');
}

async function main() {
  if (!SECRET) {
    console.error('[mic-diagnostics] AUDIT_STREAM_SECRET not set — pass it inline (it lives in the session env / Vercel prod env).');
    process.exit(2);
  }
  const url = `${PROD_URL}/api/audit-stream?since=${SINCE_MS}`;
  let res;
  try {
    res = await fetch(url, { headers: { 'x-audit-secret': SECRET }, cache: 'no-store' });
  } catch (err) {
    console.error(`[mic-diagnostics] fetch failed: ${err.message}`);
    process.exit(2);
  }
  const body = await res.text();
  if (res.status === 401) {
    console.error('[mic-diagnostics] 401 — the secret does not match prod env. Reconcile AUDIT_STREAM_SECRET.');
    process.exit(2);
  }
  if (!res.ok) {
    console.error(`[mic-diagnostics] ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
    process.exit(2);
  }
  let parsed;
  try { parsed = JSON.parse(body); } catch {
    console.error(`[mic-diagnostics] non-JSON response: ${body.slice(0, 300)}`);
    process.exit(2);
  }
  const all = Array.isArray(parsed) ? parsed : (parsed.events ?? []);
  const mic = all
    .filter((e) => MIC_KINDS.has(e.kind))
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));

  console.log(`[mic-diagnostics] storage=${parsed.storage ?? 'n/a'} total=${all.length} mic=${mic.length} since=${new Date(SINCE_MS).toISOString()}`);
  if (mic.length === 0) {
    console.log('[mic-diagnostics] NO mic events in the window. Reproduce with the app OPEN (tap the mic), then re-run within 24h.');
    process.exit(0);
  }

  for (const e of mic) {
    const t = e.timestamp ? new Date(e.timestamp).toISOString() : '?';
    const flag = e.kind === 'mic-start-failed' || e.kind === 'mic-error' || e.kind === 'mic-gave-up' ? '  ⛔' : '  ✓';
    console.log(`${flag} ${t}  ${e.kind}`);
    if (e.summary) console.log(`      ${e.summary}`);
    const d = fmtDetails(e.details);
    if (d) console.log(d);
  }

  // Headline cause: the most recent failure, if any.
  const lastFail = [...mic].reverse().find((e) => e.kind === 'mic-start-failed' || e.kind === 'mic-error' || e.kind === 'mic-gave-up');
  console.log('');
  if (lastFail) {
    console.log(`[mic-diagnostics] HEADLINE: ${lastFail.kind} — ${lastFail.summary ?? '(no summary)'}`);
  } else {
    console.log('[mic-diagnostics] no failures in the window — mic started cleanly each tap.');
  }

  if (OUT_FILE) await writeFile(OUT_FILE, JSON.stringify(mic, null, 2));
}

main().catch((e) => { console.error('[mic-diagnostics] FATAL', e); process.exit(2); });
