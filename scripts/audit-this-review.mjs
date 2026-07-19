/**
 * audit-this-review — proper CONTENT audit of ONE real game's post-game review,
 * held to the saved requirements (CLAUDE.md REAL-GAME EXPERIENCE AUDIT STANDARD
 * + the tape rubric R1–R10). Seeds the game UNANALYZED, runs the genuine prod
 * pipeline, walks EVERY ply, and dumps the actual coach narration text per move
 * + whether voice fired (listener) — so we judge CONTENT, not just "it rendered".
 *
 * Game: Knight_Mare_01 (White, student) beat iankane21 — B06 Modern Defense.
 * Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_LISTENER=1 \
 *      AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-this-review.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { attachVoiceListener, voiceLines, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'chesscom-996014340';
const PGN = '1. e4 d6 2. d4 g6 3. f4 e6 4. Be3 b6 5. c4 Bg7 6. Qd2 Nf6 7. Bd3 Na6 8. Nf3 c6 9. O-O Nc7 10. e5 Nd7 11. exd6 Na6 12. Nc3 Nf8 13. c5 g5 14. fxg5 e5 15. Nxe5 Nd7 16. Nxc6 1-0';

const log = (s) => console.log(s);
const txt = async (p, sel) => { try { const l = p.locator(sel).first(); return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...(process.env.AUDIT_LISTENER === '1' ? LISTENER_LAUNCH_ARGS : [])] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  const voice = process.env.AUDIT_LISTENER === '1' ? await attachVoiceListener(ctx) : null;
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));

  const dismiss = async () => {
    for (let i = 0; i < 8; i++) {
      for (const [s, c] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2500 }); } catch { /* */ } } }
      await page.waitForTimeout(500);
    }
  };

  // 1. Boot the app so ChessAcademyDB + a profile exist.
  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss();
  await page.waitForTimeout(3000);

  // 2. Seed the game UNANALYZED + set student identity (you = White) + full narration.
  const seed = await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', {
      id: gid, pgn, white: 'Knight_Mare_01', black: 'iankane21', result: '1-0',
      date: '2026.07.17', event: 'Daily Chess', eco: 'B06', whiteElo: 1292, blackElo: 887,
      source: 'chesscom', termination: 'resigned', annotations: null, coachAnalysis: null,
      isMasterGame: false, openingId: null, fullyAnalyzed: false,
    });
    const profs = await getAll('profiles');
    for (const p of profs) {
      p.preferences = p.preferences || {};
      p.preferences.chessComUsername = 'Knight_Mare_01';
      p.preferences.coachNarration = 'full';
      await put('profiles', p);
    }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  // 3. Open the review — genuine pipeline analyzes it.
  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();

  // 4. Wait for analysis to settle (start-walk-btn enables), up to ~150s.
  let ready = false;
  for (let i = 0; i < 100; i++) {
    await page.waitForTimeout(1500);
    const btn = page.locator('[data-testid="start-walk-btn"]').first();
    if ((await btn.count()) && (await btn.getAttribute('disabled')) === null) { ready = true; break; }
    if (i % 6 === 0) log(`  …waiting for analysis (${(i * 1.5).toFixed(0)}s)`);
  }
  log(`[analysis] start-walk-btn ready=${ready}`);

  // 5. Capture the SUMMARY screen content (opening name, recap, chips) BEFORE the walk.
  log('\n===== SUMMARY SCREEN =====');
  for (const sel of ['[data-testid="review-opening-name"]', '[data-testid="review-recap"]', '[data-testid="review-book-departure"]', '[data-testid="review-summary"]']) {
    const t = await txt(page, sel); if (t) log(`  ${sel}: ${t}`);
  }
  // fallback: dump the visible body text region so we don't miss unlabeled panels
  const bodyText = (await txt(page, 'main')) || (await txt(page, 'body'));
  log('  [body excerpt] ' + bodyText.slice(0, 900));

  if (!ready) { log('\n[FAIL] analysis never settled — cannot walk.'); if (voice) await voice.stop(); await browser.close(); return; }

  // 6. Start the walk.
  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await has(page, '[data-testid="review-forward-btn"]'))) { log('[FAIL] walk did not mount'); if (voice) await voice.stop(); await browser.close(); return; }

  // 7. Step EVERY ply, capture narration text + badge per move.
  log('\n===== PLY-BY-PLY WALK (narration content) =====');
  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  const plies = [];
  let last = '';
  for (let ply = 1; ply <= 40; ply++) {
    await fwd.click().catch(() => {});
    await page.waitForTimeout(700);
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const narr = await txt(page, '[data-testid="review-narration-banner"]');
    const moveTxt = await txt(page, '[data-testid="review-move-indicator"]');
    plies.push({ ply, move: moveTxt, badge, narr, changed: narr !== last });
    log(`  ply ${String(ply).padStart(2)} ${moveTxt.padEnd(14)} [${(badge || '-').padEnd(10)}] ${narr || '(no narration banner)'}`);
    last = narr;
    if ((await fwd.getAttribute('disabled')) !== null) { log(`  (forward disabled — end of walk at ply ${ply})`); break; }
  }

  const withNarr = plies.filter((p) => p.narr && p.narr.length > 3).length;
  log(`\n[narration coverage] ${withNarr}/${plies.length} plies had a narration banner`);

  if (voice) {
    const lines = voiceLines(voice);
    log(`[voice] ${lines.length} spoken lines captured`);
    log('  ' + JSON.stringify(lines.slice(0, 20)));
  }
  log(`[errors] ${errs.length ? JSON.stringify(errs) : 'none'}`);

  if (voice) await voice.stop();
  await browser.close();
};
run().catch((e) => { console.error('fatal:', e); process.exit(1); });
