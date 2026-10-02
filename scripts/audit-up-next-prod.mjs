// audit-up-next-prod — post-deploy audit for the UP-NEXT LOOP (David
// 2026-10-01): one pick, short bites, today's ring, the heat map.
// Three instruments, MUTED (G1):
//   1. Playwright PLAYS the bites by clicking real board squares.
//   2. The app's own audit rows land on a LOOPBACK listener sidecar (§G2).
//   3. Voice: listener coach-narration-spoken rows (muted, text only).
//
// Contracts (algo-audit rule: EMIT + ASSERT on `up-next-chosen`):
//   A. UP NEXT fresh-device ring — a first visit gets three bites
//      (deep-run, warm-up, long) and the bar leads with Deep Run.
//   B. HEAT MAP fresh device is all grey — never "mastered".
//   C. Tapping the bar starts the bite; three Deep Run puzzles finish it and
//      the ring reads 1/3 back on Home.
//   D. The warm-up (2 puzzles) and the long puzzle close the ring — a
//      `today-ring-closed` row lands and Home says "done".
//   E. Vacuity + health.
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-up-next-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { until } from './audit-lib/wedge-watch.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 420, height: 900 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(stampAuditRunId(`up-next-${Math.random().toString(36).slice(2, 8)}`));
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
const banners = [];

const rowsOf = (kind) => listener.getCapturedEvents().filter((e) => e.kind === kind).map((e) => {
  let details = null;
  try { details = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details ?? null); } catch { /* */ }
  return { summary: String(e.summary ?? ''), details };
});
async function dismissModals() {
  try { const g = page.locator('[data-testid="ai-consent-modal"]'); await g.waitFor({ timeout: 4000 }); await page.locator('[data-testid="ai-consent-allow"]').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
}
async function readPuzzle(id) {
  return page.evaluate((pid) => new Promise((res) => {
    const open = indexedDB.open('ChessAcademyDB');
    open.onsuccess = () => {
      const g = open.result.transaction('puzzles', 'readonly').objectStore('puzzles').get(pid);
      g.onsuccess = () => res(g.result ?? null);
      g.onerror = () => res(null);
    };
    open.onerror = () => res(null);
  }), id);
}
/** The app's own review prompt can open after a clean solve and cover the
 *  board — a real user closes it, so the audit does too. */
async function closeReviewPrompt() {
  const close = page.locator('[data-testid="review-prompt-close"]');
  if (await close.count()) await close.first().click().catch(() => {});
}
async function clickMove(uci) {
  await closeReviewPrompt();
  await page.locator(`[data-square="${uci.slice(0, 2)}"]`).first().click({ force: true });
  await page.waitForTimeout(150);
  await page.locator(`[data-square="${uci.slice(2, 4)}"]`).first().click({ force: true });
}
/** Solve whichever puzzle is on the board (read by its data-puzzle-id). */
const solvedIds = new Set();
let reviewHold = null;
async function solveCurrent() {
  const board = page.locator('[data-testid="puzzle-board"]');
  await board.waitFor({ timeout: 90000 });
  // Wait for a puzzle we have NOT solved yet — after NEXT the old board can
  // still be mounted for a beat, and re-solving it is a silent no-op.
  let id = await board.getAttribute('data-puzzle-id');
  for (let i = 0; i < 60 && (!id || solvedIds.has(id)); i += 1) {
    await page.waitForTimeout(500);
    id = await page.locator('[data-testid="puzzle-board"]').getAttribute('data-puzzle-id').catch(() => null);
  }
  if (!id || solvedIds.has(id)) return false;
  // A cold lazy pool (the long bundle) can swap the first board for the real
  // puzzle a beat later — solve only once the id has held still for 2s.
  for (let i = 0; i < 20; i += 1) {
    await page.waitForTimeout(2000);
    const again = await page.locator('[data-testid="puzzle-board"]').getAttribute('data-puzzle-id').catch(() => null);
    if (again === id) break;
    id = again;
  }
  if (!id || solvedIds.has(id)) return false;
  solvedIds.add(id);
  const p = id ? await readPuzzle(id) : null;
  if (!p) return false;
  const moves = p.moves.trim().split(/\s+/);
  await page.waitForTimeout(1300);
  for (let i = 1; i < moves.length; i += 2) {
    await clickMove(moves[i]);
    await page.waitForTimeout(1100);
  }
  return true;
}
async function watchBanners(ms) {
  // Collect every banner for the whole window — the predicate never ends the
  // wait early; `until` bounds each read against the remaining budget.
  await until(async () => {
    const t = await page.locator('[data-testid="reward-banner"]').innerText().catch(() => '');
    if (t && banners[banners.length - 1] !== t) banners.push(t);
    return false;
  }, ms, 250);
}
async function home() {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="up-next-bar"], [data-testid="today-ring"]').first().waitFor({ timeout: 90000 });
}

try {
  // ── A + B. Fresh device ───────────────────────────────────────────────────
  await home();
  const chosen = rowsOf('up-next-chosen')[0];
  const kinds = chosen?.details?.ring?.map((r) => r.kind) ?? [];
  check('A UP NEXT fresh-device ring — three bites, Deep Run first', kinds.length === 3 && kinds[0] === 'deep-run', JSON.stringify(kinds));
  check('A2 the bar leads with Deep Run', /deep run/i.test(await page.locator('[data-testid="up-next-label"]').innerText()));
  check('A3 the ring reads 0/3', /0\/3/.test(await page.locator('[data-testid="today-ring-label"]').innerText()));
  await page.goto(`${BASE}/weaknesses`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="heat-map"]').waitFor({ timeout: 60000 });
  const heat = rowsOf('heat-map-shown').at(-1);
  check('B HEAT MAP fresh device is all grey — never "mastered"', heat && heat.details.red.length === 0 && heat.details.green.length === 0, heat?.summary ?? 'no row');

  // ── C. Deep Run bite ─────────────────────────────────────────────────────
  await home();
  await page.locator('[data-testid="up-next-bar"]').click();
  await page.waitForURL(/deep-run/, { timeout: 15000 });
  check('C the bar opens the bite (an up-next-opened row)', rowsOf('up-next-opened').length >= 1, rowsOf('up-next-opened')[0]?.summary);
  const start = page.locator('[data-testid="deep-run-start"]');
  await start.waitFor({ timeout: 60000 });
  for (let i = 0; i < 120 && await start.isDisabled(); i += 1) await page.waitForTimeout(500);
  await start.click();
  for (let n = 0; n < 3; n += 1) {
    await solveCurrent();
    const next = page.locator('[data-testid="deep-run-next"]');
    if (await next.waitFor({ timeout: 30000 }).then(() => true).catch(() => false)) {
      if (n < 2) { await next.click(); await next.waitFor({ state: "detached", timeout: 15000 }).catch(() => {}); }
    }
  }
  await watchBanners(3000);
  await home();
  await page.waitForTimeout(1500);
  check('C2 three Deep Run puzzles fill one third of the ring', /1\/3/.test(await page.locator('[data-testid="today-ring-label"]').innerText()), await page.locator('[data-testid="today-ring-label"]').innerText());

  // ── D. Close the ring ────────────────────────────────────────────────────
  for (let bite = 0; bite < 2; bite += 1) {
    await home();
    const kind = await page.locator('[data-testid="up-next-bar"]').getAttribute('data-pick-kind');
    await page.locator('[data-testid="up-next-bar"]').click();
    const count = kind === 'warm-up' ? 2 : 1;
    console.log(`[D] bite ${bite} kind=${kind}`);
    for (let n = 0; n < count; n += 1) {
      const solved = await solveCurrent();
      const pid = await page.locator('[data-testid="puzzle-board"]').getAttribute('data-puzzle-id').catch(() => null);
      console.log(`[D]   puzzle ${n} solved=${solved} board=${pid} url=${page.url()}`);
      await page.waitForTimeout(3500);
      if (!reviewHold && await page.locator('[data-testid="review-prompt"]').count()) {
        const held = await page.locator('[data-testid="puzzle-board"]').getAttribute('data-puzzle-id').catch(() => null);
        reviewHold = { held, solvedId: pid, cont: await page.locator('[data-testid="concept-continue"]').count() };
      }
      await closeReviewPrompt();
      const cont = page.locator('[data-testid="concept-continue"], [data-testid="next-puzzle-btn"]');
      if (await cont.count()) await cont.first().click().catch(() => {});
    }
    await watchBanners(3000);
  }
  check('D4 the review prompt opens over the SOLVED board, held behind Continue — never over the next puzzle',
    !!reviewHold && reviewHold.held === reviewHold.solvedId && reviewHold.cont > 0, JSON.stringify(reviewHold));
  const closed = rowsOf('today-ring-closed')[0];
  check('D UP NEXT ring closes — a today-ring-closed row', !!closed, closed?.summary ?? 'no row');
  await home();
  check('D2 Home says today is done', /done/i.test(await page.locator('[data-testid="today-ring-label"]').innerText()), await page.locator('[data-testid="today-ring-label"]').innerText());
  check('D3 the finish rewards fired (banners)', banners.some((b) => /done/i.test(b)), JSON.stringify(banners));

  // ── E. Vacuity + health ───────────────────────────────────────────────────
  check('E1 listener captured events', listener.getCapturedEvents().length > 0, `${listener.getCapturedEvents().length}`);
  check('E2 zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 300));
} finally {
  try { await browser.close(); } catch { /* */ }
  await listener.stop();
}

const passed = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `up-next-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, passed, total: results.length, results, banners, pageErrors }, null, 2));
console.log(`\n${passed}/${results.length} checks green — report at ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
