/**
 * audit-review-mobile-layout — reproduce David's iPhone report (2026-07-21,
 * IMG_4565): "pickers don't pop up … couldn't scroll down to see the rest of the
 * buttons or the written narration." The regular audits run at 414×896, TALLER
 * than a real iPhone's usable height after Safari's chrome (~660px), so they never
 * reproduced the flex-1 scroll-middle collapsing under a w-full board. This one
 * runs at a realistic SHORT viewport and asserts, when a picker opens:
 *   (1) the picker is actually ON-SCREEN (its rect intersects the viewport), and
 *   (2) the surface is SCROLLABLE (scrollHeight > clientHeight), and
 *   (3) the narration banner + nav controls + bottom bar are reachable.
 *
 * Run (prod): AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-review-mobile-layout.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'mobile-layout-iqp';
// iqp — student=White, a real blunder at move ~16 (b3) that fires the why-picker.
const PGN = '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d5 6. exd5 exd5 7. Be2 Be7 8. O-O O-O 9. Bg5 Be6 10. Re1 Nc6 11. Nxc6 bxc6 12. Bf3 Qd6 13. Na4 Rab8 14. c4 dxc4 15. Bxc6 Rb4 16. b3 cxb3 17. Qxb3 Rxa4 18. Qxa4 Bd5 19. Bxd5 Nxd5 20. Rad1 Qc6 21. Qxc6';
const results = [];
const add = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}  ${name.padEnd(28)} ${detail}`); };
const has = async (page, sel) => (await page.locator(sel).count()) > 0;

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  // 390×660 ≈ an iPhone 14/15 in Safari with the URL bar + toolbar showing — the
  // usable height David actually has (his 2796px screen ÷ 3 = 932 CSS px, minus
  // ~270px of chrome). This is the height the 896px audits never stressed.
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 660 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 140)));

  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      for (const [s, c] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
      await page.waitForTimeout(400);
    }
  };

  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss();
  await page.waitForTimeout(2500);

  await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, pgn, white: 'Student', black: 'Opponent', result: '1-0', date: '2026.07.21', event: 'Mobile Layout', eco: 'B40', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'normal', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Student'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
  }, { gid: GID, pgn: PGN });

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();

  let ready = false;
  for (let i = 0; i < 130; i++) {
    await page.waitForTimeout(1500);
    const btn = page.locator('[data-testid="start-walk-btn"]').first();
    if ((await btn.count()) && (await btn.getAttribute('disabled')) === null) { ready = true; break; }
    if (i % 10 === 0) console.log(`  …analysing (${(i * 1.5).toFixed(0)}s)`);
  }
  if (!ready) { console.log('[FATAL] analysis never settled'); await browser.close(); process.exit(1); }

  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});

  // 1) The surface must be SCROLLABLE on a short phone (the whole point).
  const scrollInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="coach-game-review-walk"]');
    if (!el) return null;
    return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, innerHeight: window.innerHeight };
  });
  if (scrollInfo) add('surface-scrollable', scrollInfo.scrollHeight > scrollInfo.clientHeight + 20, `scrollH=${scrollInfo.scrollHeight} clientH=${scrollInfo.clientHeight} vh=${scrollInfo.innerHeight}`);
  else add('surface-scrollable', false, 'walk container not found');

  // 2) Step forward until a picker/card opens, then assert it's ON-SCREEN.
  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  const CARDS = ['discussion-reason-picker', 'review-find-shot-card', 'review-cameo-ask', 'review-turning-point-card', 'review-rewind-card'];
  let cardSel = null;
  for (let step = 0; step < 60 && !cardSel; step++) {
    for (const c of CARDS) { if (await has(page, `[data-testid="${c}"]`)) { cardSel = c; break; } }
    if (cardSel) break;
    await fwd.click({ timeout: 2000, force: true }).catch(() => {});
    await page.waitForTimeout(500);
  }
  if (!cardSel) {
    add('picker-fired', false, 'no picker/card opened in 60 steps');
  } else {
    add('picker-fired', true, `first card: ${cardSel}`);
    await page.waitForTimeout(1200); // let the auto-scroll settle
    const vis = await page.evaluate((sel) => {
      const el = document.querySelector(`[data-testid="${sel}"]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // Fraction of the card that is within the viewport vertically.
      const visibleTop = Math.max(r.top, 0);
      const visibleBottom = Math.min(r.bottom, vh);
      const shown = Math.max(0, visibleBottom - visibleTop);
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height), vh, shownPx: Math.round(shown), frac: r.height ? shown / r.height : 0 };
    }, cardSel);
    if (vis) {
      // The card must be meaningfully on-screen: at least its top edge in view and
      // ≥ 40% of it shown (a blocking picker the user can't see == a hang).
      const onScreen = vis.top < vis.vh - 40 && vis.bottom > 40 && (vis.frac >= 0.4 || vis.shownPx >= 160);
      add('picker-on-screen', onScreen, `top=${vis.top} bottom=${vis.bottom} vh=${vis.vh} shown=${vis.shownPx}px (${(vis.frac * 100).toFixed(0)}%)`);
    } else add('picker-on-screen', false, 'card vanished before measure');

    // 3) The picker's action buttons must be tappable (in-viewport). For the
    //    why-picker, the reason options.
    if (cardSel === 'discussion-reason-picker') {
      const optOk = await page.evaluate(() => {
        const opt = document.querySelector('[data-testid="discussion-reason-option"]');
        if (!opt) return { found: false };
        const r = opt.getBoundingClientRect();
        return { found: true, inView: r.top >= 0 && r.bottom <= window.innerHeight + 4 && r.top < window.innerHeight };
      });
      add('picker-buttons-tappable', optOk.found ? optOk.inView : false, optOk.found ? `reason option inView=${optOk.inView}` : 'no reason option');
    }
  }

  // 4) The narration banner + bottom bar must be reachable by scrolling.
  const bannerReachable = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="review-narration-banner"]');
    return !!b;
  });
  add('narration-present', bannerReachable, bannerReachable ? 'narration banner in DOM' : 'banner missing');

  // scroll to the very bottom and confirm the Play Again / Back to Coach bar shows.
  await page.evaluate(() => { const el = document.querySelector('[data-testid="coach-game-review-walk"]'); if (el) el.scrollTo({ top: el.scrollHeight }); });
  await page.waitForTimeout(600);
  const barVisible = await page.evaluate(() => {
    const bar = document.querySelector('[data-testid="review-bottom-bar"]');
    if (!bar) return false;
    const r = bar.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  });
  add('bottom-bar-reachable', barVisible, barVisible ? 'Play Again / Back to Coach reachable by scroll' : 'bottom bar not reachable');

  add('no-errors', errs.length === 0, errs.length ? errs.slice(0, 2).join(' | ') : 'none');

  const fails = results.filter((r) => !r.pass).length;
  console.log(`\n===== MOBILE LAYOUT: ${fails === 0 ? '✅ MEETS' : '❌ FAILS'} (${results.length - fails}/${results.length}) =====`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
};

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
