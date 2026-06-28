#!/usr/bin/env node
// presubmit-telemetry-gate — pull the live error telemetry from PostHog and
// explain EVERY error class before a submit. This is the gate that was missing
// when the App Store build went out with a working-but-rough coach: the audits
// verify synthetic behavior; PostHog records what really breaks under real use.
//
// Usage:
//   node scripts/ci/presubmit-telemetry-gate.mjs            # last 7 days
//   node scripts/ci/presubmit-telemetry-gate.mjs 14         # last N days
//
// Reads the PostHog personal key the same way scripts/posthog-query.mjs does
// (POSTHOG_API_KEY / aliases / any phx_ env var).

const HOST = (process.env.POSTHOG_HOST || 'https://us.posthog.com').replace(/\/+$/, '');
const DAYS = Number(process.argv[2] || 7);

function resolveKey() {
  const direct = process.env.POSTHOG_API_KEY || process.env.POSTHOG_PERSONAL_API_KEY
    || process.env.Read_key_PostHog || process.env.POSTHOG_READ_API_KEY;
  if (direct) return direct;
  for (const [, v] of Object.entries(process.env)) {
    if (typeof v === 'string' && /^phx_[A-Za-z0-9]/.test(v)) return v;
  }
  return undefined;
}
const KEY = resolveKey();
if (!KEY) { console.error('POSTHOG_API_KEY not set — cannot read telemetry.'); process.exit(2); }

// Error/degradation events the app emits (analytics.ts). $exception is the
// PostHog auto-capture; the rest are explicit logAppAudit error kinds.
const ERROR_EVENTS = [
  '$exception', 'llm_error', 'lichess_error', 'tts_failure', 'voice_fallover',
  'eval_bar_analysis_failed', 'audit_stream_post_failed', 'coach_provider_retry',
  'coach_tool_callback_rejected', 'stockfish_variant_fallback', 'opening_generation_failed',
];

// Classification: which kinds are "working as designed" vs genuinely actionable.
const BENIGN = {
  'claim-validator-trip': 'guardrail WORKING — coach stated a board-false fact and it was stripped before reaching the user',
  'coach_provider_retry': 'transient — provider hiccup, auto-retried on the fallback provider',
  'stockfish_variant_fallback': 'expected — device picked a different Stockfish WASM build',
  'coach_narration_skipped': 'intentional — verbosity/dedup gate, not an error',
};

let projectId = process.env.POSTHOG_PROJECT_ID;
async function resolveProject() {
  if (projectId) return projectId;
  const res = await fetch(`${HOST}/api/projects/`, { headers: { Authorization: `Bearer ${KEY}` } });
  const d = await res.json();
  projectId = String(d.results?.[0]?.id);
  return projectId;
}
async function hogql(query) {
  const pid = await resolveProject();
  const res = await fetch(`${HOST}/api/projects/${pid}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
  });
  if (!res.ok) throw new Error(`PostHog ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results || [];
}

const inList = ERROR_EVENTS.map((e) => `'${e}'`).join(', ');

async function main() {
  console.log(`\n=== Pre-submit telemetry gate — last ${DAYS} days (PostHog) ===\n`);

  // 1. Per-event counts.
  const counts = await hogql(
    `SELECT event, count() AS c FROM events
     WHERE event IN (${inList}) AND timestamp > now() - INTERVAL ${DAYS} DAY
     GROUP BY event ORDER BY c DESC`);
  if (!counts.length) { console.log('No error events in the window. ✅'); return; }

  console.log('Error-event volume:');
  for (const [event, c] of counts) console.log(`  ${String(c).padStart(5)}  ${event}`);
  console.log('');

  // 2. $exception broken out by the real type. HogQL can't index into the
  //    nested $exception_list array cleanly, so pull the raw list strings +
  //    counts and parse type/value in JS.
  const rawLists = await hogql(
    `SELECT properties.$exception_list AS list, count() AS c
     FROM events WHERE event = '$exception' AND timestamp > now() - INTERVAL ${DAYS} DAY
     GROUP BY list ORDER BY c DESC LIMIT 60`);
  const exAgg = new Map(); // "type|value" -> count
  for (const [list, c] of rawLists) {
    let t = 'unknown', v = '';
    try { const first = JSON.parse(list)?.[0]; t = first?.type || 'unknown'; v = first?.value || ''; } catch { /* keep unknown */ }
    const k = `${t}|${v}`;
    exAgg.set(k, (exAgg.get(k) || 0) + Number(c));
  }
  const exTypes = [...exAgg.entries()]
    .map(([k, c]) => { const i = k.indexOf('|'); return [k.slice(0, i), k.slice(i + 1), c]; })
    .sort((a, b) => b[2] - a[2]);

  // 3. Top summaries for the explicit error kinds.
  const summaries = await hogql(
    `SELECT event, properties.summary AS summary, count() AS c
     FROM events WHERE event IN (${inList.replace("'$exception', ", '')})
       AND timestamp > now() - INTERVAL ${DAYS} DAY
     GROUP BY event, summary ORDER BY c DESC LIMIT 60`);

  let actionable = 0;
  console.log('── $exception, by type ───────────────────────────────');
  for (const [t, v, c] of exTypes) {
    const benign = BENIGN[t];
    const tag = benign ? `✅ ${benign}` : '⚠️  ACTIONABLE';
    if (!benign) actionable += Number(c);
    console.log(`  ${String(c).padStart(4)}  [${t || 'unknown'}] ${(v || '').slice(0, 90)}\n        ${tag}`);
  }

  console.log('\n── explicit error kinds, by summary ──────────────────');
  for (const [event, summary, c] of summaries) {
    const benign = BENIGN[event];
    if (!benign) actionable += Number(c);
    const tag = benign ? `✅ ${benign}` : '⚠️';
    console.log(`  ${String(c).padStart(4)}  ${event}: ${(summary || '(no summary)').slice(0, 110)}  ${tag}`);
  }

  console.log(`\n=== Verdict: ${actionable} actionable error event(s) in ${DAYS}d ===`);
  console.log(actionable === 0
    ? 'No unexplained errors. Safe to submit. ✅'
    : 'Review the ⚠️ items above and confirm each is understood/fixed before submitting.');
  // Informational gate — never hard-fail a build; surface for a human decision.
  process.exit(0);
}
main().catch((e) => { console.error('\n❌ telemetry gate failed:\n', e.message); process.exit(1); });
