// audit-fundamentals-tab-prod — post-deploy audit for the FUNDAMENTALS TAB after
// WO-4 J1 (2026-09-19): the FundamentalId → pillar join, and the tab reading the
// student's own record through it. Three instruments, MUTED (G1 — never a byte
// of TTS synthesised):
//   1. Playwright drives /coach/fundamentals on LIVE prod.
//   2. The app's own audit events land on a LOOPBACK listener sidecar (the prod
//      audit-stream is opt-in/off by default — CLAUDE.md §G2).
//   3. The Listen buttons' read-aloud is read off that listener as
//      `coach-narration-spoken` (the mute keeps the event, drops the audio) —
//      proving the tab SPOKE the pillar prose, not that a button existed.
//
// Contracts asserted (experience, not text-presence):
//   A. All seven sections render from the ONE exhaustive list, each with real
//      teaching prose (no blank card — the `?? ''` fallthrough is gone) and
//      every one of the app's fundamentals is listed with a status (the count
//      is DERIVED from FUNDAMENTAL_IDS, never typed here).
//   B. Fresh device = GREY: no pillar-standing line anywhere (absent ≠ mastered).
//   C. After seeding real `misconceptionTags` rows (two development-pillar
//      fundamentals filed under DIFFERENT sections, counted:false like the real
//      auto-analysis path writes them) and reloading, the development section
//      shows the rolled-up standing with the right count and names the worst —
//      only the pillar JOIN can add rows across sections. King-safety, which got
//      no rows, still shows nothing (grey honoured), and a NULL-pillar slip
//      (lost-the-opposition) lights no pillar.
//   D. Listen on the centre section → the listener heard the centre prose
//      spoken through the read-aloud path (instrument 3), gate-clean.
//   E. Vacuity: ≥1 listener event and 0 pageerrors.
//
// Surfaces this proves at runtime (named so the surface map records the reach):
// `fundamentalsCatalog` — `FUNDAMENTAL_PILLAR`, `SECTION_TEACHING`,
// `FUNDAMENTAL_SECTION_IDS`, `pillarStanding`, `getFundamentalCounts`;
// `FundamentalsPage`. The rows it seeds are the shape `autoAnalyzeGame`'s
// recording path writes (`counted:false`, `source:'auto-analysis'`).
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-fundamentals-tab-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { readFileSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECTIONS = ['opening-play', 'center', 'development', 'king-safety', 'pawn-structure', 'tactics-threats', 'endgame-technique'];
// DERIVED, NEVER TYPED (2026-09-20). This was `= 33` and went red the moment
// section 14 added three fundamentals — a constant about a DIFFERENT build,
// the same class of false red that failed the review audit on a game it was no
// longer auditing. The source of truth is the id list the app itself ships;
// read it out of the TS with a regex so this stays a plain .mjs with no build
// step, and FAIL LOUDLY if the shape ever changes rather than defaulting.
const FUNDAMENTAL_COUNT = (() => {
  const src = readFileSync(new URL('../src/services/principleAttribution.ts', import.meta.url), 'utf8');
  const block = /export const FUNDAMENTAL_IDS = \[([\s\S]*?)\] as const;/.exec(src);
  if (!block) throw new Error('FUNDAMENTAL_IDS not found — this audit counts the app\'s own list, it does not carry a number');
  const n = (block[1].match(/'[a-z-]+'/g) ?? []).length;
  if (n < 20) throw new Error(`parsed only ${n} fundamental ids — refusing to assert against a number I cannot trust`);
  return n;
})();

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);          // G1: audits run muted
await ctx.addInitScript(autoDismissCalibration);   // CSS-based, never a hanging click
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismissModals() {
  try { const g = page.locator('[data-testid="ai-consent-modal"]'); await g.waitFor({ timeout: 4000 }); await page.locator('[data-testid="ai-consent-allow"]').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}

/** Seed REAL misconceptionTags rows through raw IndexedDB (no app import), in
 *  the exact shape `logMisconception` writes and with `counted:false`, which is
 *  what the auto-analysis path writes for every imported/finished game. */
async function seedRows(rows) {
  return page.evaluate((rows) => new Promise((finish) => {
    let req;
    try { req = indexedDB.open('ChessAcademyDB'); } catch { return finish({ ok: false, reason: 'open-threw' }); }
    req.onerror = () => finish({ ok: false, reason: 'open-error' });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('misconceptionTags')) { db.close(); return finish({ ok: false, reason: 'no-store' }); }
      const tx = db.transaction('misconceptionTags', 'readwrite');
      const store = tx.objectStore('misconceptionTags');
      for (const r of rows) store.put(r);
      tx.oncomplete = () => { db.close(); finish({ ok: true, wrote: rows.length }); };
      tx.onerror = () => { db.close(); finish({ ok: false, reason: 'tx-error' }); };
    };
  }), rows);
}
const mkRow = (fundamentalId, tag, i) => ({
  id: `audit-wo4-${fundamentalId}-${i}`, tag, fundamentalId, source: 'auto-analysis', createdAt: Date.now() - i * 1000,
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', playedSan: 'Qh5', bestSan: 'Nf3',
  cpLoss: 120, gamePhase: 'opening', moveNumber: 2, sourceGameId: 'audit-wo4-game', status: 'open', masteryHits: 0, dueAt: Date.now(), counted: false,
});

try {
  // Attach the loopback listener (instruments 2 + 3) before any surface mounts.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(({ url, secret }) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });

  // ── A. The whole map renders from the one list ─────────────────────────────
  await page.goto(`${BASE}/coach/fundamentals`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="fundamentals-page"]').waitFor({ timeout: 30000 });
  let blank = [];
  for (const id of SECTIONS) {
    const sec = page.locator(`[data-testid="fundamental-section-${id}"]`);
    let ok = false;
    try { await sec.waitFor({ timeout: 15000 }); ok = true; } catch { /* absent */ }
    const prose = ok ? (await sec.locator('p').first().innerText()).trim() : '';
    if (prose.length < 80) blank.push(id);
    check(`A section ${id} renders with real teaching prose`, ok && prose.length >= 80, `${prose.length} chars`);
    if (ok && /\b(we|our|us)\b/i.test(prose)) check(`A section ${id} keeps the house perspective`, false, prose.slice(0, 100));
  }
  const items = await page.locator('[data-testid^="fundamental-item-"]:not([data-testid*="-listen-"]):not([data-testid*="-learn-"]):not([data-testid*="-drill-"])').count();
  const statuses = await page.locator('[data-testid^="fundamental-status-"]').count();
  check(`A all ${FUNDAMENTAL_COUNT} fundamentals listed, each with a status`, items === FUNDAMENTAL_COUNT && statuses === FUNDAMENTAL_COUNT, `items=${items} statuses=${statuses}`);

  // ── B. Fresh device is GREY — no standing line anywhere ───────────────────
  await page.waitForTimeout(1500); // the Dexie count read settles
  const standingFresh = await page.locator('[data-testid^="fundamental-pillar-standing-"]').count();
  check('B fresh device: no pillar-standing line (grey ≠ green)', standingFresh === 0, `count=${standingFresh}`);

  // ── C. Seed the student's record, reload, the JOIN fires ──────────────────
  const seeded = await seedRows([
    mkRow('early-queen-sortie', 'neglected-development', 1),   // section opening-play, pillar development
    mkRow('early-queen-sortie', 'neglected-development', 2),
    mkRow('knight-to-the-rim', 'misplaced-piece', 3),           // section development,  pillar development
    mkRow('lost-the-opposition', 'passive-king-endgame', 4),    // NULL pillar — must light nothing
  ]);
  check('C0 seeded misconceptionTags rows via raw IndexedDB', seeded.ok, JSON.stringify(seeded));
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="fundamentals-page"]').waitFor({ timeout: 30000 });
  const dev = page.locator('[data-testid="fundamental-pillar-standing-development"]');
  let devText = '';
  try { await dev.waitFor({ timeout: 15000 }); devText = (await dev.innerText()).trim(); } catch { /* absent */ }
  check('C1 development pillar reports the rolled-up standing (rows from TWO sections)', /3 times/.test(devText), devText || '(no standing line)');
  check('C2 …and names the worst fundamental under it', /early queen sortie/i.test(devText), devText);
  const eqs = (await page.locator('[data-testid="fundamental-status-early-queen-sortie"]').innerText()).trim();
  check('C3 the per-fundamental status shows the same record (slipped 2×)', /slipped 2/.test(eqs), eqs);
  const ks = await page.locator('[data-testid="fundamental-pillar-standing-king-safety"]').count();
  const ce = await page.locator('[data-testid="fundamental-pillar-standing-center"]').count();
  check('C4 king-safety + centre stay grey (no rows filed under them)', ks === 0 && ce === 0, `king-safety=${ks} center=${ce}`);
  const nonPillar = await page.locator('[data-testid="fundamental-pillar-standing-endgame-technique"]').count();
  check('C5 the NULL-pillar slip (lost-the-opposition) lights no pillar card', nonPillar === 0 && ks === 0, `endgame-technique=${nonPillar}`);

  // ── D. Listen speaks the pillar prose through the read-aloud path ────────
  const before = listener.getCapturedEvents().length;
  await page.locator('[data-testid="fundamental-listen-center"]').click({ force: true });
  await page.waitForTimeout(6000); // muted speak resolves on a text-proportional delay; batched POSTs flush ~1s
  const events = listener.getCapturedEvents();
  const spoken = events.filter((e) => /coach-narration-spoken|voice-speak-invoked/.test(e.kind ?? ''));
  const centreLine = spoken.find((e) => /cent(er|re)|e4, d4/i.test(`${e.summary ?? ''} ${e.details ?? ''} ${e.text ?? ''}`));
  check('D1 Listen (centre) reached the narration listener', spoken.length > 0, `${spoken.length} voice events (${events.length - before} new)`);
  check('D2 …and what it spoke is the centre teaching', !!centreLine, centreLine ? String(centreLine.summary ?? centreLine.text ?? '').slice(0, 120) : spoken.slice(-1).map((e) => String(e.summary ?? '').slice(0, 120)).join(' | '));

  // ── E. Vacuity + health ───────────────────────────────────────────────────
  check('E1 listener captured events (instrument 2 alive)', events.length > 0, `${events.length}`);
  check('E2 zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 300));
} finally {
  try { await browser.close(); } catch { /* already closed */ }
  await listener.stop();
}

const passed = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `fundamentals-tab-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, passed, total: results.length, results, pageErrors }, null, 2));
console.log(`\n${passed}/${results.length} checks green — report at ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
