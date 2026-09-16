// probe-turning-card — an ISOLATED repro for ONE interaction: answering the
// post-game turning-point card. Not part of the audit matrix.
//
// Why it exists: four full prod audit runs (~55 min each) were spent failing the
// THESIS row on a driver bug. Iterating a single click at that cost is not
// engineering. This seeds the same game, opens the review, JUMPS to the end with
// the Forward control instead of waiting out ~10 minutes of auto-advance, and
// then drives only the card — reporting exactly what it sees at each step.
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';
import { readWalkPly } from './audit-lib/review-explore.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = `probe-turning-${Date.now()}`;
const PGN = '1. e4 c5 2. c3 Nf6 3. e5 Nd5 4. d4 cxd4 5. cxd4 Nc6 6. Nc3 Nb6 7. Nf3 d6 8. exd6 Qxd6 9. Be2 Bg4 10. Nb5 Qd7 11. Bf4 Nd5 12. Ne5 Bxe2 13. Qxe2 Nxf4 14. Nxd7 Nxe2 15. Nc7+ Kxd7 16. Nxa8 Nexd4 17. Rd1 e5 18. a3 Bc5 19. b4 Nxb4 20. axb4 Bxb4+ 21. Kf1 Rxa8 22. Rb1 a5 23. h4 Rc8 0-1';
const SANS = (() => { const c = new Chess(); c.loadPgn(PGN); return c.history(); })();
const log = (m) => console.log(m);
const has = async (p, s) => { try { return (await p.locator(s).count()) > 0; } catch { return false; } };
const until = async (fn, ms, step = 300) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(autoDismissCalibration);
  const listener = await attachVoiceListener(ctx);
  const page = await ctx.newPage();
  await blockTtsNetwork(page);
  // MODALS BLOCK EVERYTHING. Omitting this made the probe's first run report
  // "walk startable: false" — the consent / calibration / page-help overlays
  // swallow the first clicks, exactly the harness defect CLAUDE.md warns about.
  const dismiss = async () => {
    for (let i = 0; i < 6; i++) {
      for (const [s2, c] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(page, s2)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
      await page.waitForTimeout(400);
    }
  };
  const spoken = () => listener.getCapturedEvents()
    .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText)
    .map((e) => ({ text: String(e.narrationText) }));

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismiss();
  await page.waitForTimeout(2500);
  await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (s, v) => new Promise((res, rej) => { const t = db.transaction(s, 'readwrite'); t.objectStore(s).put(v); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (s) => new Promise((res, rej) => { const t = db.transaction(s, 'readonly'); const rq = t.objectStore(s).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, pgn, white: 'KaiserlicheHoheit', black: 'Knight_Mare_01', result: '0-1', date: '2026.09.03', event: "Let's Play!", eco: 'B22', whiteElo: 1392, blackElo: 1378, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Knight_Mare_01'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
  }, { gid: GID, pgn: PGN });

  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  const cardSel = `[data-testid="review-game-card-${GID}"]`;
  log(`[probe] game card: ${await until(() => has(page, cardSel), 25000)}`);
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await dismiss();
  const startable = () => has(page, '[data-testid="review-forward-btn"]');
  log(`[probe] walk startable: ${await until(startable, 300000, 1000)}`);

  // PAUSE, then jump to the end by clicking Forward — minutes, not ten.
  await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 3000 }).catch(() => undefined);
  const readPly = async () => readWalkPly(page);
  for (let i = 0; i < SANS.length + 12; i++) {
    const p = await readPly();
    if (p && p.n >= p.total) break;
    await page.locator('[data-testid="review-forward-btn"]').first().click({ timeout: 2000, force: true }).catch(() => undefined);
    await page.waitForTimeout(220);
  }
  log(`[probe] ply after jump: ${JSON.stringify(await readPly())}`);

  const cardUp = await until(() => has(page, '[data-testid="review-turning-point-card"]'), 30000, 400);
  log(`[probe] turning card present: ${cardUp}`);
  if (!cardUp) { await listener.stop(); await browser.close(); process.exit(1); }

  const chips = await page.locator('[data-testid^="turning-point-pick-"]').count();
  log(`[probe] chips: ${chips}`);
  const chip = page.locator('[data-testid^="turning-point-pick-"]').first();
  const tid = await chip.getAttribute('data-testid');
  log(`[probe] first chip testid: ${tid}`);

  await chip.click({ timeout: 3000, force: true }).catch((e) => log(`[probe] chip click threw: ${String(e).slice(0, 80)}`));
  const confirmUp = await until(() => has(page, '[data-testid="review-turning-point-confirm"]'), 8000, 250);
  log(`[probe] after tap 1 → confirm present: ${confirmUp}; card still present: ${await has(page, '[data-testid="review-turning-point-card"]')}`);

  if (confirmUp) {
    await page.locator('[data-testid="review-turning-point-confirm"]').first().click({ timeout: 3000, force: true }).catch(() => undefined);
  } else {
    await chip.click({ timeout: 3000, force: true }).catch(() => undefined);
  }
  const revealUp = await until(() => has(page, '[data-testid="review-turning-point-reveal"]'), 10000, 250);
  const spoke = await until(() => spoken().some((x) => /^(You called it\.|Not quite\.)/.test(x.text)), 12000, 250);
  log(`[probe] reveal element: ${revealUp}; reveal SPOKEN: ${spoke}`);
  const rev = spoken().filter((x) => /^(You called it\.|Not quite\.)/.test(x.text));
  for (const r of rev) log(`[probe] REVEAL TEXT: ${r.text.slice(0, 220)}`);
  log(`[probe] total spoken lines: ${spoken().length}`);

  await listener.stop();
  await browser.close();
  process.exit(spoke ? 0 : 1);
};
run().catch(async (e) => { console.error('fatal:', e); process.exit(2); });
