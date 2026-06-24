// DEEP functional audit of the opening detail surface (David 2026-06-24:
// "dive in deep, make it 100%"). Drives every WLPP rung + section viewer like a
// real first-time user, asserting each function mounts its surface and capturing
// every console error / React correctness warning / page error per step.
//
// Network resource failures (TTS/Polly/explorer can't be reached from a headless
// localhost run) are environmental, not product bugs — filtered out. JS errors
// and React warnings (key/update-depth) are real and fail the step.
//
// Run: AUDIT_SANDBOX=1 [AUDIT_OPENING=vienna-game] node scripts/audit-openings-functional-deep.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const OPENING = process.env.AUDIT_OPENING || 'vienna-game';
const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
// Pro openings route via /openings/pro/<player>/<id>; masterclass via /openings/<id>.
const PRO_PLAYER = process.env.AUDIT_PLAYER || (OPENING.startsWith('pro-') ? OPENING.split('-')[1] : '');
const OPENING_URL = PRO_PLAYER ? `${BASE}/openings/pro/${PRO_PLAYER}/${OPENING}` : `${BASE}/openings/${OPENING}`;

const results = [];
const breaks = [];
function rec(step, ok, detail) { results.push({ step, ok, detail }); console.log(`[deep] ${ok ? 'PASS' : 'FAIL'} — ${step}${detail ? ` :: ${detail}` : ''}`); }

const REACT_WARN = /Encountered two children with the same key|unique "key"|Each child in a list|Maximum update depth|Cannot update a component|Warning:/i;
// environmental noise — NOT product bugs (headless localhost can't reach prod APIs/TTS)
const NOISE = /Failed to load resource|ERR_CONNECTION|ERR_NETWORK|favicon|DevTools|\/api\/tts|polly|lichess|explorer|net::|status of 4|status of 5|ResizeObserver/i;

async function main() {
  const browser = await chromium.launch({
    headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs(),
    ...(isLocal ? {} : { proxy: { server: process.env.HTTPS_PROXY || process.env.HTTP_PROXY } }),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { const t = m.text(); if ((m.type() === 'error' || REACT_WARN.test(t)) && !NOISE.test(t)) errs.push(t.slice(0, 200)); });
  page.on('pageerror', (e) => { const t = String(e); if (!NOISE.test(t)) errs.push('PAGEERROR ' + t.slice(0, 200)); });
  const drain = () => errs.splice(0);

  const detail = page.locator('[data-testid="opening-detail"]');
  async function gotoDetail() {
    await page.goto(OPENING_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { const bub = page.locator('[data-testid="strength-calibration-bubble"]'); await bub.waitFor({ state: 'visible', timeout: 6000 }); await page.locator('[data-testid="skill-band-intermediate"]').click(); await bub.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* */ }
    // Fully CLOSE the page-help modal (it auto-opens and overlays the page —
    // clicking the wrong button leaves it covering content). Use its real close.
    try { const m = page.locator('[data-testid="page-help-modal"]'); if (await m.count()) { await page.locator('[data-testid="page-help-close"]').click({ timeout: 3000 }); await m.waitFor({ state: 'detached', timeout: 5000 }); } } catch { /* */ }
    await detail.waitFor({ state: 'visible', timeout: 75000 });
  }
  async function step(name, fn) {
    drain();
    let ok = true, det = '';
    try { det = (await fn()) || ''; } catch (e) { ok = false; det = String(e.message || e).split('\n')[0].slice(0, 130); }
    const got = drain();
    if (got.length) { ok = false; det = (det ? det + ' | ' : '') + `JS/React errors: ${got.slice(0, 2).join(' || ')}`; got.forEach((e) => breaks.push({ step: name, err: e })); }
    rec(name, ok, det);
    return ok;
  }
  async function waitSeed() { for (let i = 0; i < 18; i++) { if (await page.locator('[data-testid^="model-game-card-"]').count()) return true; await page.waitForTimeout(5000); } return false; }

  try {
    await gotoDetail();
    await step('cold load: model games self-populate (no reload)', async () => { if (!(await waitSeed())) throw new Error('model games empty after ~90s'); return 'populated'; });
    await step('cold load: middlegame plans present', async () => { if (!(await page.locator('[data-testid="middlegame-plans-section"]').count())) throw new Error('plans empty'); return 'present'; });
    await step('cold load: common mistakes present', async () => { if (!(await page.locator('[data-testid="common-mistakes-section"]').count())) throw new Error('mistakes empty'); return 'present'; });
    // Endgame plans: only some openings have them. If the data has any, the
    // section must self-populate cold (the EndgamePlansSection cold-load fix);
    // if the opening has none, it correctly self-hides.
    if (process.env.AUDIT_EXPECT_ENDGAME === '1') {
      // Endgame plans are variation-scoped (they self-hide on the main line and
      // show under the variation they belong to). Find the first variation tab
      // that surfaces the endgame section — it must populate without a reload.
      await step('cold load: endgame plans self-populate (on a variation tab)', async () => {
        const n = await page.locator('[data-testid^="variation-tab-"]').count();
        for (let i = 0; i < n; i++) {
          await page.locator('[data-testid^="variation-tab-"]').nth(i).click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
          if (await page.locator('[data-testid="endgame-plans-section"]').count()) return `populated on tab #${i}`;
        }
        throw new Error('endgame section never appeared on any variation tab');
      });
      await gotoDetail();
    }

    // Unlock the WLPP ladder. The expert-pass BUTTON works (handler/write/logic
    // verified via JS-dispatch + on-device), but Playwright's headless pointer
    // can't reliably hit the thin text-link — so per CLAUDE.md G1 we SEED the
    // unlock (a direct openings-store write) to drive the downstream rungs.
    await step('seed-unlock the WLPP ladder (write works; rungs unlock)', async () => {
      const r = await seedUnlockedOpenings(page, [OPENING]);
      if (!r.ok || r.updated < 1) throw new Error('seed write failed: ' + JSON.stringify(r));
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
      try { const m = page.locator('[data-testid="page-help-modal"]'); if (await m.count()) { await page.locator('[data-testid="page-help-close"]').click({ timeout: 3000 }); await m.waitFor({ state: 'detached', timeout: 5000 }); } } catch { /* */ }
      await detail.waitFor({ state: 'visible', timeout: 75000 });
      await page.waitForTimeout(1200);
      const lLocked = await page.locator('[data-testid="learn-btn"]').first().getAttribute('data-locked');
      if (lLocked === 'true') throw new Error('Learn STILL locked after seed-unlock');
      return 'all rungs unlocked';
    });

    // Each MAIN-LINE rung mounts its surface (re-nav between to isolate).
    for (const [tid, label] of [['walkthrough-btn', 'Watch'], ['learn-btn', 'Learn'], ['practice-btn', 'Practice'], ['play-btn', 'Play']]) {
      await step(`main line: ${label} rung mounts`, async () => {
        const btn = page.locator(`[data-testid="${tid}"]`).first();
        if (!(await btn.count())) throw new Error('rung button missing');
        if ((await btn.getAttribute('data-locked')) === 'true') throw new Error('rung still LOCKED after unlock-all');
        await btn.click({ force: true });
        await page.waitForTimeout(2800);
        if (await detail.isVisible().catch(() => true)) throw new Error('rung click was a no-op (stayed on detail)');
        return 'mounted ' + (await page.locator('[data-testid="opening-play-mode"],[data-testid="practice-mode"],[data-testid="memory-move-narration"],[data-testid="walkthrough-play-pause"],[data-testid="line-player-complete"]').count() ? '(known surface)' : '(left detail)');
      });
      await gotoDetail();
    }

    // Variation tab + its Watch.
    await step('variation tab 0: switch + Watch mounts', async () => {
      const tab = page.locator('[data-testid="variation-tab-0"]');
      if (!(await tab.count())) return 'no variation tabs';
      await tab.click(); await page.waitForTimeout(1200);
      const u = page.locator('[data-testid="unlock-all-btn"]').first();
      if (await u.count()) { await u.click({ force: true }); await page.waitForTimeout(300); await u.click({ force: true }); await page.waitForTimeout(700); }
      const w = page.locator('[data-testid="walkthrough-btn"]').first();
      if ((await w.getAttribute('data-locked')) === 'true') throw new Error('variation Watch LOCKED after unlock');
      await w.click({ force: true }); await page.waitForTimeout(2500);
      if (await detail.isVisible().catch(() => true)) throw new Error('variation Watch no-op');
      return 'mounted';
    });
    await gotoDetail();

    // Middlegame plan action mounts.
    await step('middlegame plan action mounts', async () => {
      const sec = page.locator('[data-testid="middlegame-plans-section"]');
      if (!(await sec.count())) return 'no plans section';
      await sec.scrollIntoViewIfNeeded();
      const act = sec.locator('button').first();
      if (!(await act.count())) throw new Error('no plan action');
      await act.click({ force: true }); await page.waitForTimeout(2200);
      if (await detail.isVisible().catch(() => true)) throw new Error('plan action no-op');
      return 'mounted';
    });
    await gotoDetail();

    // Common-mistake (pitfall): expand the card, then launch its Watch.
    await step('common-mistake (pitfall) Watch mounts', async () => {
      const sec = page.locator('[data-testid="common-mistakes-section"]');
      if (!(await sec.count())) return 'no mistakes section';
      await sec.scrollIntoViewIfNeeded();
      await page.locator('[data-testid="mistake-toggle-0"]').click({ force: true });
      await page.waitForTimeout(600);
      const w = page.locator('[data-testid="pitfall-watch-0"]');
      if (!(await w.count())) throw new Error('pitfall-watch button absent after expand');
      await w.click({ force: true }); await page.waitForTimeout(2200);
      if (await detail.isVisible().catch(() => true)) throw new Error('pitfall Watch no-op');
      return 'mounted';
    });
    await gotoDetail();

    // Model game viewer + compass click-to-move end-to-end.
    await waitSeed();
    await step('model game viewer + compass click-to-move', async () => {
      const card = page.locator('[data-testid^="model-game-card-"]').first();
      await card.scrollIntoViewIfNeeded(); await card.click({ force: true });
      await page.locator('[data-testid="model-game-viewer"]').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('[data-testid="model-game-explore"]').click({ force: true });
      await page.locator('[data-square="e2"]').click({ force: true, timeout: 5000 }); await page.waitForTimeout(300);
      await page.locator('[data-square="e4"]').click({ force: true, timeout: 5000 }); await page.waitForTimeout(1200);
      const txt = await page.getByText(/Exploring:/).first().textContent().catch(() => '');
      if (!/e4/.test(txt || '')) throw new Error('click-to-move did not register');
      return 'explore+move ok';
    });
    await gotoDetail();

    // ADVERSARIAL: rapid variation-tab thrash — the React-key / stale-state class.
    await step('adversarial: rapid tab thrash (no React key/update warnings)', async () => {
      for (let i = 0; i < 4; i++) for (const t of ['variation-tab-main', 'variation-tab-0', 'variation-tab-4', 'variation-tab-1', 'variation-tab-6']) {
        const tab = page.locator(`[data-testid="${t}"]`); if (await tab.count()) await tab.click({ force: true }).catch(() => {});
      }
      await page.waitForTimeout(1500);
      return 'thrashed ~20 tab switches';
    });

    // ADVERSARIAL: open a rung and immediately re-nav (mount/unmount race).
    await step('adversarial: launch Watch then instantly re-nav (unmount race)', async () => {
      const w = page.locator('[data-testid="walkthrough-btn"]').first();
      if (await w.count()) { await w.click({ force: true }); await page.waitForTimeout(150); }
      await page.goto(OPENING_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await detail.waitFor({ state: 'visible', timeout: 10000 });
      return 'survived';
    });
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n[deep] ${passed}/${results.length} steps clean | ${breaks.length} real break(s)`);
  breaks.slice(0, 15).forEach((b) => console.log(`   BREAK @ ${b.step}: ${b.err}`));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
main().catch((e) => { console.error('[deep] fatal', e); process.exit(2); });
