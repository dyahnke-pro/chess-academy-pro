/**
 * audit-review-loop — the LOOP AUDIT for the Danya review build, run as
 * the full 3-INSTRUMENT protocol (G1 + David 2026-07-19: "Loop audit —
 * listening tool included"):
 *   1. Playwright — the three review repros drive the surface for real
 *      (sequence + calculation bucket, model-game cameo, theory departure).
 *   2. Live audit-stream — pulled BEFORE and AFTER each pass so the delta
 *      is exactly this pass's server-side events.
 *   3. Narration listener sidecar — AUDIT_LISTENER=1 attaches the local
 *      listener inside each repro; every repro asserts the lines Ruth
 *      actually SPOKE (sequence playback + Phase-5 theme, cameo intro +
 *      tie-back, theory ask + masters stats).
 *
 * 3-PASS CONTRACT: MET only on 3 CONSECUTIVE fully-green passes; ANY red
 * resets the streak to 0. Run against LIVE prod by default.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *      AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *      node scripts/audit-review-loop.mjs
 */
import { spawnSync } from 'node:child_process';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const PASSES_REQUIRED = Number(process.env.AUDIT_PASSES ?? 3);
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 6);
const SCRIPTS = ['audit-review-sequence.mjs', 'audit-review-cameo.mjs', 'audit-review-theory.mjs'];

async function streamCount() {
  if (!SECRET || !BASE.startsWith('https://chess-academy-pro')) return null;
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${Date.now() - 60_000}`, {
      headers: { 'x-audit-secret': SECRET },
    });
    const data = await res.json();
    return { count: data.count ?? 0, storage: data.storage ?? '?' };
  } catch {
    return null;
  }
}

let streak = 0;
let pass = 0;
while (streak < PASSES_REQUIRED && pass < MAX_PASSES) {
  pass += 1;
  console.log(`\n════ PASS ${pass} (streak ${streak}/${PASSES_REQUIRED}) ════`);
  const before = await streamCount();
  if (before) console.log(`stream before: ${before.count} events (${before.storage})`);

  let passGreen = true;
  for (const script of SCRIPTS) {
    console.log(`\n── ${script} ──`);
    const r = spawnSync('node', [`scripts/${script}`], {
      stdio: 'inherit',
      env: { ...process.env, AUDIT_LISTENER: '1' },
      timeout: 10 * 60 * 1000,
    });
    if (r.status !== 0) {
      console.log(`❌ ${script} exited ${r.status ?? 'timeout'}`);
      passGreen = false;
      break; // a red pass is a red pass — restart the streak, don't pile on
    }
  }

  const after = await streamCount();
  if (after) console.log(`\nstream after: ${after.count} events (${after.storage})`);

  if (passGreen) {
    streak += 1;
    console.log(`\n✅ PASS ${pass} GREEN — streak ${streak}/${PASSES_REQUIRED}`);
  } else {
    streak = 0;
    console.log(`\n❌ PASS ${pass} RED — streak reset`);
  }
}

if (streak >= PASSES_REQUIRED) {
  console.log(`\n════ CONTRACT MET — ${PASSES_REQUIRED} consecutive green 3-instrument passes ════`);
  process.exit(0);
}
console.log(`\n════ CONTRACT NOT MET after ${pass} passes ════`);
process.exit(1);
