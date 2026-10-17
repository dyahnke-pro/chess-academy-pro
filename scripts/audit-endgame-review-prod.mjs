// audit-endgame-review-prod — post-deploy audit for the ENDGAME SPACED-REVIEW
// ALGO (David 2026-10-17: "The spaced reps for end game. I want it wired in"
// → "Make sure the algo is attached as well"). MUTED (G1).
//   1. Playwright drives /coach/endgame on live prod.
//   2. The app's own `endgame-review` rows land on the loopback listener.
//   3. Nothing here speaks; the listener is the second instrument.
//
// Contracts (EMIT + ASSERT):
//   R1 fresh device: no "Due for review" row, and a due row reporting 0.
//   R2 seeded record (raw IndexedDB): the RUNG decides, not the play count —
//      a rung-3 position played 3 days ago is NOT due although it was played
//      only once, a rung-0 one played 2 days ago IS, a fresh play is not.
//      ENDGAME REVIEW due row counts exactly the due positions.
//   R3 the page lists the due lessons with their counts.
//   R4 one tap opens the lesson itself.
//   R5 vacuity: listener alive, rows read, zero pageerrors.
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-endgame-review-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const DAY = 24 * 60 * 60 * 1000;
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
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
  return details;
}).filter(Boolean);
const lastDue = () => rowsOf('endgame-review').filter((r) => r.event === 'due').at(-1) ?? null;

async function seed(rows) {
  return page.evaluate((rows) => new Promise((finish) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onerror = () => finish({ ok: false });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('endgameProgress')) { db.close(); return finish({ ok: false, reason: 'no-store' }); }
      const tx = db.transaction(['endgameProgress'], 'readwrite');
      for (const r of rows) tx.objectStore('endgameProgress').put(r);
      tx.oncomplete = () => { db.close(); finish({ ok: true }); };
      tx.onerror = () => { db.close(); finish({ ok: false }); };
    };
  }), rows);
}

try {
  // ── R1 fresh device ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/coach/endgame?tab=pawn-endings`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.waitForTimeout(5000);
  const freshRow = await page.locator('[data-testid="endgame-due-reviews"]').count();
  const freshDue = lastDue();
  check('R1 fresh device: no due row, and the due list reports none', freshRow === 0 && (!freshDue || freshDue.positions === 0), `row=${freshRow} due=${JSON.stringify(freshDue)}`);

  // ── R2 the rung decides ───────────────────────────────────────────────────
  const now = Date.now();
  const seeded = await seed([
    { id: 'opposition::a', lessonId: 'opposition', fen: 'a', mastered: false, timesPlayed: 1, totalWrongAttempts: 2, lastPlayedAt: now - 2 * DAY, reviewStep: 0 },
    { id: 'opposition::b', lessonId: 'opposition', fen: 'b', mastered: false, timesPlayed: 1, totalWrongAttempts: 0, lastPlayedAt: now - DAY / 24, reviewStep: 0 },
    { id: 'lucena-position::a', lessonId: 'lucena-position', fen: 'a', mastered: true, timesPlayed: 1, totalWrongAttempts: 0, lastPlayedAt: now - 3 * DAY, reviewStep: 3 },
    { id: 'lucena-position::b', lessonId: 'lucena-position', fen: 'b', mastered: false, timesPlayed: 4, totalWrongAttempts: 3, lastPlayedAt: now - 2 * DAY, reviewStep: 0 },
  ]);
  check('R0 seeded the record through raw IndexedDB', seeded.ok, JSON.stringify(seeded));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="endgame-due-reviews"]').waitFor({ timeout: 30000 }).catch(() => {});
  const due = lastDue();
  check('R2 ENDGAME REVIEW due row counts exactly the due positions (the rung decides, not the play count)',
    due && due.event === 'due' && due.lessons === 2 && due.positions === 2, JSON.stringify(due));

  // ── R3 the page lists them ────────────────────────────────────────────────
  const opp = (await page.locator('[data-testid="endgame-due-opposition"]').innerText().catch(() => '')).trim();
  const luc = (await page.locator('[data-testid="endgame-due-lucena-position"]').innerText().catch(() => '')).trim();
  check('R3 the page lists both due lessons with their counts', /1 position due/.test(opp) && /1 position due/.test(luc), `${opp} | ${luc}`);

  // ── R4 one tap opens the lesson ───────────────────────────────────────────
  await page.locator('[data-testid="endgame-due-opposition"]').click();
  await page.waitForTimeout(2000);
  const onPicker = await page.locator('[data-testid="endgame-lesson-opposition"]').count();
  const inLesson = await page.locator('[data-testid="endgame-drill-mode-adaptive"], [data-testid="endgame-replay-narration"]').count();
  check('R4 one tap opens the Opposition lesson itself', onPicker === 0 && inLesson > 0, `picker=${onPicker} lesson=${inLesson}`);

  // ── R5 vacuity ────────────────────────────────────────────────────────────
  check('R5a listener captured events', listener.getCapturedEvents().length > 0, `${listener.getCapturedEvents().length}`);
  check('R5b endgame-review rows read off the wire', rowsOf('endgame-review').length >= 2, `${rowsOf('endgame-review').length}`);
  check('R5c zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 300));
} finally {
  try { await browser.close(); } catch { /* */ }
  await listener.stop();
}

const passed = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `endgame-review-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, passed, total: results.length, results, pageErrors }, null, 2));
console.log(`\n${passed}/${results.length} checks green — report at ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
