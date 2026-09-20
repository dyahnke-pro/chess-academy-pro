/**
 * Verifies the audit-stream contract on PROD — three halves, and the third is
 * the one David asked for on 2026-09-19 ("i no longer want audits to fill
 * redis"):
 *   1. a fresh device makes ZERO POSTs to /api/audit-stream (opt-in, 2026-09-11)
 *   2. a device that EXPLICITLY configures a stream still POSTs — proven against
 *      the LOOPBACK SIDECAR, never against prod, so this audit itself writes
 *      nothing to the shared Upstash budget (it used to point the enabled device
 *      at prod and post a real batch there every run)
 *   3. an AUDIT-MARKED page (every audit mutes TTS, and that mute IS the marker)
 *      configured with the PROD stream URL makes ZERO network POSTs — the client
 *      gate in appAuditor.isAuditMarkedPage refuses the remote — and a direct
 *      POST to prod carrying `x-audit-marked` is acknowledged with stored:0 —
 *      the server gate. Two gates, one marker; an audit cannot fill Redis.
 * Check 2 is what stops this being a "it got quieter, ship it" result; check 3
 * is what stops the budget being spent by the very scripts that watch it.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
// Three page loads run in sequence, so the settle is per load. The auditor's
// first remote flush lands within ~6s of boot (STREAM_BATCH_FLUSH_MS); 20s
// leaves margin and keeps the whole run inside the vacuity checker's window
// (`audit-vacuity-check.mjs`, 90s default) so a blank app is noticed as FAIL
// rather than reported HUNG.
const SETTLE_MS = Number(process.env.SETTLE_MS ?? 20000);

/** Load prod once with `seed` injected; return the URLs of every audit-stream POST the page attempted. */
async function run(label, seed, { muted = true } = {}) {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  // This audit measures REQUEST COUNTS, not audio — synthesising would bill
  // real TTS money to learn nothing (CLAUDE.md G1: audits run muted). Check 2
  // runs UNMUTED on purpose: the mute is the audit marker, and check 2 has to
  // show that a real user's opt-in still streams. Its stream target is the
  // loopback listener, so nothing reaches prod either way; TTS is blocked by
  // the route below so it still costs nothing.
  if (muted) await ctx.addInitScript(muteTtsForAudit);
  if (seed) await ctx.addInitScript(seed);
  const page = await ctx.newPage();
  await page.route('**/api/tts**', (route) => route.fulfill({ status: 204, body: '' }));
  const posts = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && /audit-stream/.test(r.url())) posts.push(r.url());
  });
  await page.goto(`${URL}/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(SETTLE_MS);
  await browser.close();
  console.log(`  ${label}: ${posts.length} audit-stream POST(s)`);
  return posts;
}

// 1. default is OFF
const fresh = await run('fresh device (default)', null);

// 2. explicit opt-in still streams — to the sidecar, so prod's Redis is untouched
const listener = await startAuditListener();
const sidecarUrl = `${listener.url}`;
const secret = LOCAL_LISTENER_SECRET;
const opted = await run('explicitly enabled → loopback sidecar', new Function(`
  localStorage.setItem('auditStreamUrl', ${JSON.stringify(sidecarUrl)});
  localStorage.setItem('auditStreamSecret', ${JSON.stringify(secret)});
`), { muted: false });
const sidecarGot = listener.getCapturedEvents().length;
await listener.stop();
console.log(`  sidecar received ${sidecarGot} event(s)`);

// 3a. an audit-marked page pointed at PROD makes no network POST (client gate)
const marked = await run('AUDIT-MARKED page → prod URL', () => {
  localStorage.setItem('auditStreamUrl', 'https://chess-academy-pro.vercel.app/api/audit-stream');
  localStorage.setItem('auditStreamSecret', 'probe-secret-not-valid');
});
const markedToProd = marked.filter((u) => !/127\.0\.0\.1|localhost/.test(u));

// 3b. the server stores nothing that carries the marker (server gate). The
// secret is required for the handler to reach the POST branch at all; without
// it prod answers 401, which proves nothing about the gate.
let serverRefused = null;
const prodSecret = process.env.AUDIT_STREAM_SECRET ?? '';
if (prodSecret) {
  const r = await fetch(`${URL}/api/audit-stream`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-audit-secret': prodSecret, 'x-audit-marked': '1' },
    body: JSON.stringify({ timestamp: Date.now(), kind: 'bad-fen', category: 'subsystem', summary: 'optin-audit probe', source: 'audit-stream-optin-prod' }),
  });
  const j = await r.json().catch(() => ({}));
  serverRefused = r.status === 200 && j.stored === 0 && j.refused === 'audit';
  console.log(`  server gate: HTTP ${r.status} ${JSON.stringify(j)}`);
} else {
  console.log('  server gate: SKIPPED (AUDIT_STREAM_SECRET not set — cannot reach the POST branch)');
}

const ok1 = fresh.length === 0;
const ok2 = opted.length > 0 && sidecarGot > 0;
const ok3a = markedToProd.length === 0;
const ok3b = serverRefused !== false;
console.log(`\n  [${ok1 ? 'PASS' : 'FAIL'}] default is OFF (expected 0, got ${fresh.length})`);
console.log(`  [${ok2 ? 'PASS' : 'FAIL'}] explicit opt-in still streams — to the sidecar (posts=${opted.length}, sidecar events=${sidecarGot})`);
console.log(`  [${ok3a ? 'PASS' : 'FAIL'}] audit-marked page never POSTs to prod (expected 0, got ${markedToProd.length})`);
console.log(`  [${ok3b ? 'PASS' : serverRefused === null ? 'SKIP' : 'FAIL'}] server stores nothing carrying x-audit-marked`);
process.exit(ok1 && ok2 && ok3a && ok3b ? 0 : 1);
