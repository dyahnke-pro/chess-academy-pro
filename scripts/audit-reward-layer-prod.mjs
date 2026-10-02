// audit-reward-layer-prod — post-deploy audit for the REWARD LAYER on Tactics
// (David 2026-10-01: deep-run, the Long tab, the move-count pips, the light).
// Three instruments, MUTED (G1):
//   1. Playwright PLAYS real puzzles by clicking board squares.
//   2. The app's own audit rows land on a LOOPBACK listener sidecar (§G2).
//   3. Voice: listener coach-narration-spoken rows (muted, text only).
//
// Contracts (algo-audit rule: EMIT + ASSERT on `deep-run-step`):
//   A. DEEP RUN depth climbs — the first puzzle is asked AND served at 2
//      moves, the header shows 2 pips; solving it banks 2 and the next ask
//      is 3 moves deep.
//   B. A wrong move ENDS the run (the run-over card) and the best is kept.
//   C. The light fired: the reward canvas is mounted and a banner showed.
//   D. LONG tab: the first puzzle is 3–4 moves deep (counted, not tagged).
//   E. Vacuity + health: ≥2 deep-run-step rows, listener alive, 0 pageerrors.
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-reward-layer-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(stampAuditRunId(`reward-layer-${Math.random().toString(36).slice(2, 8)}`));
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
let bannerSeen = '';
page.on('console', () => undefined);

async function dismissModals() {
  try { const g = page.locator('[data-testid="ai-consent-modal"]'); await g.waitFor({ timeout: 4000 }); await page.locator('[data-testid="ai-consent-allow"]').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
}
const rowsOf = (kind) => listener.getCapturedEvents().filter((e) => e.kind === kind).map((e) => {
  let details = null;
  try { details = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details ?? null); } catch { /* */ }
  return { summary: String(e.summary ?? ''), details };
});
async function waitRow(kind, n, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const r = rowsOf(kind);
    if (r.length >= n) return r[n - 1];
    await page.waitForTimeout(300);
  }
  return null;
}
/** The puzzle record, read straight from the app's IndexedDB. */
async function readPuzzle(id) {
  return page.evaluate((pid) => new Promise((res) => {
    const open = indexedDB.open('ChessAcademyDB');
    open.onsuccess = () => {
      const tx = open.result.transaction('puzzles', 'readonly');
      const g = tx.objectStore('puzzles').get(pid);
      g.onsuccess = () => res(g.result ?? null);
      g.onerror = () => res(null);
    };
    open.onerror = () => res(null);
  }), id);
}
async function clickMove(uci) {
  await page.locator(`[data-square="${uci.slice(0, 2)}"]`).first().click({ force: true });
  await page.waitForTimeout(150);
  await page.locator(`[data-square="${uci.slice(2, 4)}"]`).first().click({ force: true });
}
/** Play every solver move of a Lichess-format line (opponent replies auto). */
async function solve(p) {
  const moves = p.moves.trim().split(/\s+/);
  await page.waitForTimeout(1200); // the setup move auto-plays at 600ms
  for (let i = 1; i < moves.length; i += 2) {
    await clickMove(moves[i]);
    await page.waitForTimeout(1100); // opponent reply at 400ms
  }
}
async function watchBanner() {
  for (let i = 0; i < 20; i += 1) {
    const t = await page.locator('[data-testid="reward-banner"]').innerText().catch(() => '');
    if (t) { bannerSeen = t; return; }
    await page.waitForTimeout(200);
  }
}

try {
  // ── A. Deep run climbs ────────────────────────────────────────────────────
  await page.goto(`${BASE}/tactics/deep-run`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  const start = page.locator('[data-testid="deep-run-start"]');
  await start.waitFor({ timeout: 60000 });
  for (let i = 0; i < 120 && await start.isDisabled(); i += 1) await page.waitForTimeout(500);
  await start.click();
  const r1 = await waitRow('deep-run-step', 1);
  check('A DEEP RUN depth climbs — first ask is 2 moves deep', r1?.details?.askedDepth === 2, r1?.summary ?? 'no row');
  check('A1 the first puzzle served IS 2 moves (counted)', r1?.details?.servedDepth === 2, `served=${r1?.details?.servedDepth}`);
  await page.locator('[data-testid="puzzle-board"]').waitFor({ timeout: 30000 });
  const pips = await page.locator('[data-testid="move-pips"] [data-testid^="pip-"]').count();
  check('A2 the header shows the move count as pips (2)', pips === 2, `${pips} pips`);
  const p1 = r1?.details?.puzzleId ? await readPuzzle(r1.details.puzzleId) : null;
  if (p1) {
    const bannerWatch = watchBanner();
    await solve(p1);
    await bannerWatch;
  }
  // The solved board holds for the concept; NEXT names the coming depth.
  const nextBtn = page.locator('[data-testid="deep-run-next"]');
  const nextShown = await nextBtn.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  const nextText = nextShown ? await nextBtn.innerText() : '';
  check('A5 the solved board HOLDS for the concept; NEXT names the coming depth', nextShown && /3 moves/i.test(nextText), `"${nextText}"`);
  if (nextShown) await nextBtn.click();
  const r2 = await waitRow('deep-run-step', 2, 20000);
  check('A3 solving it asks one move DEEPER (3) — or climbs rating when capped', !!r2 && (r2.details.askedDepth === 3 || r2.details.capped), r2?.summary ?? 'no second row');
  check('A6 a clean solve pitches the next puzzle HARDER (run rating climbed)', !!r1 && !!r2 && r2.details.targetRating > r1.details.targetRating, `${r1?.details?.targetRating} → ${r2?.details?.targetRating}`);
  const banked = await page.locator('[data-testid="deep-run-banked"]').getAttribute('data-value').catch(() => null);
  check('A4 the score banked the 2 moves', banked === '2', `banked=${banked}`);

  // ── B. Unlimited tries (David 2026-10-02): a wrong move climbs the hint
  //    ladder and the run goes ON; only Show solution ends it. ─────────────
  const p2 = r2?.details?.puzzleId ? await readPuzzle(r2.details.puzzleId) : null;
  if (p2) {
    await page.waitForTimeout(1500);
    const c = new Chess(p2.fen);
    const ms = p2.moves.trim().split(/\s+/);
    c.move({ from: ms[0].slice(0, 2), to: ms[0].slice(2, 4), promotion: ms[0][4] });
    const wrong = c.moves({ verbose: true }).find((m) => `${m.from}${m.to}` !== ms[1].slice(0, 4));
    if (wrong) await clickMove(`${wrong.from}${wrong.to}`);
  }
  await page.waitForTimeout(2500);
  const overEarly = await page.locator('[data-testid="deep-run-over"]').count();
  const stillPlaying = await page.locator('[data-testid="show-solution-button"]').count();
  check('B a wrong move does NOT end the run — the board is back in play', !!p2 && overEarly === 0 && stillPlaying === 1, `over=${overEarly} showSolution=${stillPlaying}`);
  if (stillPlaying) await page.locator('[data-testid="show-solution-button"]').click();
  const over = await page.locator('[data-testid="deep-run-over"]').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  check('B1 Show solution ENDS the run', over);
  const best = Number(await page.locator('[data-testid="deep-run-best"]').innerText().then((t) => t.replace(/\D/g, '')).catch(() => '0'));
  check('B2 the best is remembered (≥ the 2 banked)', best >= 2, `best=${best}`);

  // ── C. The light ──────────────────────────────────────────────────────────
  check('C the reward canvas is mounted app-wide', await page.locator('[data-testid="reward-layer"]').count() === 1);
  check('C2 a reward banner showed on the climb', /level up|calculator|high score/i.test(bannerSeen), `banner="${bannerSeen}"`);

  // ── D. Long tab ───────────────────────────────────────────────────────────
  await page.goto(`${BASE}/tactics/long`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('[data-testid="puzzle-board"]').waitFor({ timeout: 90000 });
  const longPips = await page.locator('[data-testid="move-pips"] [data-testid^="pip-"]').count();
  check('D LONG tab serves a 3–4 move puzzle (counted, not tagged)', longPips >= 3 && longPips <= 4, `${longPips} pips`);

  // ── E. Vacuity + health ───────────────────────────────────────────────────
  check('E1 listener captured events (instrument 2 alive)', listener.getCapturedEvents().length > 0, `${listener.getCapturedEvents().length}`);
  check('E2 ≥2 deep-run-step rows read off the wire', rowsOf('deep-run-step').length >= 2);
  check('E3 zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 300));
} finally {
  try { await browser.close(); } catch { /* already closed */ }
  await listener.stop();
}

const passed = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `reward-layer-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, passed, total: results.length, results, pageErrors }, null, 2));
console.log(`\n${passed}/${results.length} checks green — report at ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
