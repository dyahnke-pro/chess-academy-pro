#!/usr/bin/env node
/**
 * audit-review-reopen-probe — IS THE SLOW REOPEN THE PRODUCT, OR THE SEQUENCE?
 *
 * `audit-review-overhaul-prod` reports "REOPEN instant-no-rerun: startable in
 * 26.8s" and the contract it cites is the 2026-09-05 overhaul's "reopening an
 * ALREADY-ANALYZED review is instant, no re-run". But that audit reopens only
 * AFTER waiting out the background deep dive, and its own comment concedes the
 * dive "rewrote the annotations, so this open regenerates the walk's narration
 * (the cache key changed)". So it measures the ONE case where regeneration is
 * legitimate and calls the result the instant-reopen contract.
 *
 * This probe separates them. Same seeded game, three measurements:
 *   A. FIRST open — real analysis. The baseline, expected to be slow.
 *   B. REOPEN with NO intervening dive — the actual contract. Should be a cache
 *      HIT: `review-walk-skipped` in the app's own audit stream, near-zero wait.
 *   C. REOPEN after the dive — what the overhaul audit measures. Regeneration
 *      is expected here; the number is what we are entitled to argue about.
 *
 * The app's OWN event decides the verdict, not the clock: `review-walk-skipped`
 * means the cache served it, `review-segments-generated` means it rebuilt. A
 * timing alone cannot tell those apart, which is why the row has been arguable
 * for two days.
 *
 * Muted (G1) — it reads events and timings, never audio.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OUT = `audit-reports/review-reopen-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const GID = 'reopen-probe-alapin';
const PGN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6 9. Be2 Bg4 10. Nb5 Qd7 11. Bf4 Nd5 12. Ne5 Bxe2 13. Qxe2 Nxf4 14. Nxd7 Nxe2 15. Nc7+ Kxd7 16. Nxa8 Nexd4 17. Rd1 e5 18. a3 Bc5 19. b4 Nxb4 20. axb4 Bxb4+ 21. Kf1 Rxa8 22. Rb1 a5 23. h4 Rc8 0-1';
const rows = [];
const log = (m) => { console.log(m); };
const rec = (id, pass, detail) => { rows.push({ id, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${id} — ${detail}`); };
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const has = (page, sel) => page.locator(sel).first().count().then((n) => n > 0).catch(() => false);
async function until(fn, ms, step = 500) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await fn()) return true; await sleep(step); }
  return false;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const listener = await startAuditListener();
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });
  const page = await ctx.newPage();

  const events = () => listener.getCapturedEvents().map((e) => `${e.kind ?? ''} ${e.summary ?? ''}`);
  const sawSince = (mark, re) => events().slice(mark).some((t) => re.test(t));

  const dismiss = async () => {
    for (const [gate, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]']]) {
      try { const g = page.locator(gate); await g.waitFor({ timeout: 4000 }); await page.locator(btn).click(); } catch { /* absent */ }
    }
    try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2000 }); await page.keyboard.press('Escape'); } catch { /* absent */ }
  };

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismiss();
  await sleep(4000);
  const seed = await page.evaluate(async ({ gid, pgn }) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    await put('games', { id: gid, pgn, white: 'KaiserlicheHoheit', black: 'Knight_Mare_01', result: '0-1', date: '2026.09.03', event: 'probe', eco: 'B22', whiteElo: 1392, blackElo: 1378, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await new Promise((res, rej) => { const t = db.transaction('profiles', 'readonly'); const rq = t.objectStore('profiles').getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Knight_Mare_01'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
    return { games: 1, profiles: profs.length };
  }, { gid: GID, pgn: PGN }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  const cardSel = `[data-testid="review-game-card-${GID}"]`;
  const startable = async () => {
    const b = page.locator('[data-testid="start-walk-btn"]').first();
    return (await b.count()) > 0 && (await b.getAttribute('disabled', { timeout: 3000 }).catch(() => 'x')) === null;
  };
  const openAndTime = async (label) => {
    await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismiss();
    const listed = await until(() => has(page, cardSel), 25000);
    if (!listed) return { label, ms: -1, listed: false };
    const mark = events().length;
    const t = Date.now();
    await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
    const ok = await until(startable, 300000, 250);
    const ms = Date.now() - t;
    return {
      label, ms, listed: true, ok,
      cacheHit: sawSince(mark, /review-walk-skipped/),
      regenerated: sawSince(mark, /review-segments-generated/),
      spinner: await has(page, '[data-testid="review-analyze-spinner"]'),
      pill: await has(page, '[data-testid="review-deepening-pill"]'),
    };
  };

  const A = await openAndTime('A first-open');
  log(`[A] ${JSON.stringify(A)}`);
  rec('A first-open analyses (baseline, slow is correct)', A.ok === true, `${(A.ms / 1000).toFixed(1)}s cacheHit=${A.cacheHit} regenerated=${A.regenerated}`);

  // B — reopen IMMEDIATELY, before the background dive can rewrite anything.
  const B = await openAndTime('B reopen-no-dive');
  log(`[B] ${JSON.stringify(B)}`);
  rec('B reopen with NO intervening dive is served from cache',
    B.cacheHit === true && B.ms < 8000,
    `${(B.ms / 1000).toFixed(1)}s cacheHit=${B.cacheHit} regenerated=${B.regenerated} spinner=${B.spinner} pill=${B.pill}`);

  // C — let the dive finish, then reopen. Regeneration is EXPECTED here.
  const diveDone = await until(async () => !(await has(page, '[data-testid="review-deepening-pill"]')), 300000, 2000);
  log(`[dive] finished=${diveDone}`);
  const C = await openAndTime('C reopen-after-dive');
  log(`[C] ${JSON.stringify(C)}`);
  rec('C reopen AFTER the dive regenerates (expected) without re-analysing',
    C.ok === true && !C.spinner,
    `${(C.ms / 1000).toFixed(1)}s cacheHit=${C.cacheHit} regenerated=${C.regenerated} spinner=${C.spinner} pill=${C.pill}`);

  writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, rows, A, B, C, events: events().slice(-120) }, null, 2));
  console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} — ${OUT}/report.json`);
  console.log('VERDICT: B is the real contract. If B is a cache hit and fast, the product is fine and the overhaul row is mis-scoped to C.');
  await browser.close().catch(() => {});
  await listener.stop().catch(() => {});
  process.exit(0);
}
main().catch((e) => { console.error('crashed:', e); process.exit(1); });
