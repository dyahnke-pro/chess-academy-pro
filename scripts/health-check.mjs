// health-check — synthetic uptime probe for prod (David 2026-06-02).
//
// Run on a schedule by .github/workflows/health-check.yml. Hits the live app
// shell + the load-bearing API endpoints; exits non-zero if a CRITICAL check
// fails, which fails the GitHub Action and emails the repo owner — so you know
// prod / TTS / the audit-stream is down before a tester tells you.
//
// Local: `AUDIT_STREAM_SECRET=… node scripts/health-check.mjs`
//        `HEALTH_URL=https://… node scripts/health-check.mjs` to point elsewhere.

const BASE = (process.env.HEALTH_URL || 'https://chess-academy-pro.vercel.app').replace(/\/+$/, '');
const SECRET = process.env.AUDIT_STREAM_SECRET || '';

/** @type {{name:string,critical:boolean,ok:boolean,detail:string,skipped?:boolean}[]} */
const results = [];

async function check(name, critical, fn) {
  try {
    const r = await fn();
    results.push({ name, critical, ...r });
  } catch (e) {
    results.push({ name, critical, ok: false, detail: String(e?.message ?? e) });
  }
}

// 1. App shell loads + ships a hashed entry bundle (CRITICAL).
await check('homepage', true, async () => {
  const res = await fetch(`${BASE}/?cb=${Date.now()}`, { signal: AbortSignal.timeout(15000) });
  const body = await res.text();
  const hasShell = /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(body);
  return { ok: res.ok && hasShell, detail: `HTTP ${res.status}; app shell ${hasShell ? 'present' : 'MISSING'}` };
});

// 2. Audit-stream endpoint healthy (CRITICAL when the secret is available).
//    A misconfigured response means a Preview deploy got aliased to prod.
await check('audit-stream', !!SECRET, async () => {
  if (!SECRET) return { ok: true, skipped: true, detail: 'skipped (AUDIT_STREAM_SECRET not set)' };
  const res = await fetch(`${BASE}/api/audit-stream?since=${Date.now() - 60000}`, {
    headers: { 'x-audit-secret': SECRET },
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.text();
  const misconfigured = body.includes('misconfigured');
  return { ok: res.ok && !misconfigured, detail: `HTTP ${res.status}${misconfigured ? ' — SERVER MISCONFIGURED (preview aliased to prod?)' : ''}` };
});

// 3. Lichess explorer proxy reachable (WARN — third-party-backed, can be flaky;
//    a 5xx is the app's fault, anything else is upstream).
await check('lichess-explorer', false, async () => {
  const res = await fetch(`${BASE}/api/lichess-explorer?source=masters&play=`, { signal: AbortSignal.timeout(20000) });
  return { ok: res.status < 500, detail: `HTTP ${res.status}` };
});

let failed = false;
console.log(`# prod health check — ${BASE}\n`);
for (const r of results) {
  const icon = r.skipped ? '○' : r.ok ? '✓' : r.critical ? '✗' : '⚠';
  console.log(`  ${icon} ${r.name}: ${r.detail}`);
  if (!r.ok && r.critical) failed = true;
}
console.log(failed ? '\nHEALTH CHECK FAILED — a critical endpoint is down.' : '\nhealth check OK');
process.exit(failed ? 1 : 0);
