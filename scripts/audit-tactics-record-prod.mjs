// audit-tactics-record-prod — post-deploy audit for TACTICS READING THE WHOLE
// STUDENT RECORD (David 2026-10-01: "The algo is generated from users entire
// data base. Not just puzzles."). Three instruments, MUTED (G1):
//   1. Playwright drives /tactics/adaptive.
//   2. The app's own audit rows land on a LOOPBACK listener sidecar (§G2).
//   3. Voice: the listener's coach-narration-spoken rows (muted, text only).
//
// Contracts (algo-audit rule: EMIT + ASSERT):
//   A. Fresh device: the first puzzle consults the record — a
//      `puzzle-themes-targeted` row exists and every target is GREY (nothing
//      recorded, so nothing is red).
//   B. Seed real holes from GAMES (mistakePuzzles rows: forks + pins) through
//      raw IndexedDB and start again: TACTICS RECORD red-leads — the first
//      target comes from the record (from:'red', fork or pin), and the first
//      puzzle shown carries that theme.
//   C. Vacuity + health: ≥1 listener event, ≥2 target rows, 0 pageerrors.
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-tactics-record-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { seedWeaknessProfile } from './audit-lib/seed-weakness-profile.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(stampAuditRunId(`tactics-record-${Math.random().toString(36).slice(2, 8)}`));
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismissModals() {
  try { const g = page.locator('[data-testid="ai-consent-modal"]'); await g.waitFor({ timeout: 4000 }); await page.locator('[data-testid="ai-consent-allow"]').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
}
const rowsOf = (kind) => listener.getCapturedEvents().filter((e) => e.kind === kind).map((e) => {
  let details = null;
  try { details = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details ?? null); } catch { /* */ }
  return { summary: String(e.summary ?? ''), details };
});

/** Open the adaptive trainer, start Easy, wait for the board and the row. */
async function startEasy(sinceRows) {
  await page.goto(`${BASE}/tactics/adaptive`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="difficulty-easy"]').waitFor({ timeout: 60000 });
  await page.locator('[data-testid="difficulty-easy"]').click({ force: true });
  await page.locator('[data-testid="puzzle-board"]').waitFor({ timeout: 60000 });
  let row = null;
  for (let i = 0; i < 20 && !row; i += 1) { await page.waitForTimeout(500); row = rowsOf('puzzle-themes-targeted')[sinceRows] ?? null; }
  const heading = (await page.locator('[data-testid="tactic-type-heading"]').innerText().catch(() => '')).trim();
  return { row, heading };
}

try {
  // ── A. Fresh device: the first puzzle reads the (empty) record ────────────
  const a = await startEasy(0);
  const aTargets = a.row?.details?.targets ?? [];
  check('A TACTICS RECORD first-puzzle-consults-record — a target row exists on puzzle one', !!a.row, a.row ? a.row.summary : 'no row');
  check('A2 fresh device: every target is GREY (nothing recorded → nothing red)', aTargets.length > 0 && aTargets.every((t) => t.from === 'grey'), JSON.stringify(aTargets));

  // ── B. Real holes from games → the record leads ──────────────────────────
  const seeded = await seedWeaknessProfile(page);
  check('B0 seeded fork + pin holes from games through raw IndexedDB', seeded.ok, JSON.stringify(seeded));
  const before = rowsOf('puzzle-themes-targeted').length;
  const b = await startEasy(before);
  const first = b.row?.details?.targets?.[0];
  check('B TACTICS RECORD red-leads — the first target comes from the record (red: fork or pin)',
    first?.from === 'red' && ['fork', 'pin'].includes(first?.theme), b.row ? b.row.summary : 'no row');
  check('B2 the row counts the open holes it read (≥1)', (b.row?.details?.openHoles ?? 0) >= 1, `openHoles=${b.row?.details?.openHoles}`);
  check('B3 the first puzzle shown trains that theme', first && new RegExp(first.theme === 'pin' ? 'pin' : 'fork', 'i').test(b.heading), `heading="${b.heading}" target=${first?.theme}`);

  // ── C. Vacuity + health ───────────────────────────────────────────────────
  check('C1 listener captured events (instrument 2 alive)', listener.getCapturedEvents().length > 0, `${listener.getCapturedEvents().length}`);
  check('C2 ≥2 target rows read off the wire', rowsOf('puzzle-themes-targeted').length >= 2);
  check('C3 zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 300));
} finally {
  try { await browser.close(); } catch { /* already closed */ }
  await listener.stop();
}

const passed = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `tactics-record-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, passed, total: results.length, results, pageErrors }, null, 2));
console.log(`\n${passed}/${results.length} checks green — report at ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
