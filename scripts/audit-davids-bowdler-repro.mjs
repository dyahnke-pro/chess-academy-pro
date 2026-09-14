/**
 * audit-davids-bowdler-repro — OBSERVATION run (not a gate) to pin the remaining
 * review-quality findings against DAVID'S OWN game (vribak vs Knight_Mare_01,
 * chess.com daily 1025633348, Sicilian Bowdler, student = Black, resigned).
 * Seeds it UNANALYZED, runs the real pipeline on prod, walks every ply, taps
 * "Show me" on flagged plies, and DUMPS: per-ply classification + spoken text,
 * the proposed-line narration (B3 generic / B4 cutoff / #5 "with check"), any
 * question cards (C1), and the stored classification of 8...Nxe4 (#11 verify).
 * MUTED (G1). Prod incantation:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-davids-bowdler-repro.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { readWalkPly } from './audit-lib/review-explore.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'chesscom-1025633348';
const PGN = '1. e4 c5 2. Bc4 d6 3. Qh5 e6 4. d3 Nf6 5. Qf3 a6 6. Bg5 Be7 7. Nd2 Qa5 8. Ne2 Nxe4 9. Be3 Ng5 10. Qg3 d5 11. Bxg5 dxc4 12. Bxe7 Kxe7 13. Qxg7 Rd8 14. Qxh7 Nc6 15. Qh4+ Ke8 16. Qxc4 Ne5 17. Qc3 Qc7 18. Ne4 b6 19. O-O Bb7 20. f3 Rac8 21. h3 Ng6 22. Qf6 Rd5 23. g4 Qb8 24. Rad1 Rc6 25. c4 Rd7 26. h4 e5 27. Qg7 Kd8 28. h5 Nf4 29. Qf8+ Kc7 30. Qxb8+ Kxb8 31. Nxf4 exf4 32. Kf2 Re6 33. g5 f5 34. gxf6 Bxe4 35. dxe4 Rxd1 36. Rxd1 Rxf6 37. Rd5 Rh6 38. Kg2 Kc7 39. Kh3 Kc6 40. Kg4 1-0';
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };
const txt = async (p, sel) => { try { const l = p.locator(sel).first(); return (await l.count()) ? (await l.innerText({ timeout: 3000 })).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
const until = async (fn, ms, step = 500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(autoDismissCalibration);
  const listener = await attachVoiceListener(ctx);
  const page = await ctx.newPage();
  await blockTtsNetwork(page);
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  const spoken = () => listener.getCapturedEvents().filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText).map((e) => String(e.narrationText));

  const dismiss = async () => {
    for (let i = 0; i < 6; i++) {
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
  await page.waitForTimeout(2000);

  // SEED — David's real Bowdler game, UNANALYZED. Student = Black (Knight_Mare_01).
  const seed = await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, pgn, white: 'vribak', black: 'Knight_Mare_01', result: '1-0', date: '2026.09.13', event: "Let's Play!", eco: 'B20', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Knight_Mare_01'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid: GID, pgn: PGN }).catch((e) => ({ error: String(e) }));
  console.log(`[seed] ${JSON.stringify(seed)}`);

  // OPEN + analyze (real pipeline, up to 300s).
  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled', { timeout: 3000 }).catch(() => 'x')) === null; };
  const ready = await until(startable, 300000, 2000);
  console.log(`[analyze] startable=${ready}`);

  // #11 — dump stored classification for every student (Black) move.
  const annots = await page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const g = await new Promise((res, rej) => { const t = db.transaction('games', 'readonly'); const rq = t.objectStore('games').get(gid); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    return { depth: g?.analysisDepth, fully: g?.fullyAnalyzed, rows: (g?.annotations ?? []).map((a) => `${a.moveNumber}${a.color === 'black' ? '...' : '.'}${a.san} [${a.classification}] eval=${a.evaluation} best=${a.bestMove}`) };
  }, GID).catch((e) => ({ error: String(e) }));
  console.log(`[engine] depth=${annots.depth} fully=${annots.fully}`);
  (annots.rows ?? []).forEach((r) => console.log(`[engine] ${r}`));
  const nxe4 = (annots.rows ?? []).find((r) => /Nxe4/.test(r));
  console.log(`[#11 Nxe4] ${nxe4 || 'NOT FOUND'}`);

  if (!ready) { console.log('ANALYSIS NEVER SETTLED'); await listener.stop(); await browser.close(); process.exit(1); }

  // Start walk, step every ply via Forward, capturing badge + spoken + cards.
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  // Pause auto-play so we control stepping.
  const st0 = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
  if (st0 === 'playing') await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);

  const perPly = [];
  const cards = [];
  const showMe = [];
  const total = (await readWalkPly(page))?.total ?? 80;
  for (let step = 0; step < total + 2; step++) {
    const info = await readWalkPly(page);
    const n = info?.n ?? 0;
    // dismiss + record any question card
    for (const [card, dismissBtn] of [
      ['review-find-shot-card', '[data-testid="review-find-shot-skip"]'],
      ['review-trap-card', '[data-testid="review-trap-pick-leave"]'],
      ['review-trap-reveal', '[data-testid="review-trap-done"]'],
      ['review-turning-point-card', '[data-testid="review-turning-point-confirm"]'],
      ['review-turning-point-reveal', '[data-testid="review-turning-point-done"]'],
    ]) {
      if (await has(page, `[data-testid="${card}"]`)) {
        const cardText = await txt(page, `[data-testid="${card}"]`);
        cards.push({ ply: n, card, text: cardText });
        await page.locator(dismissBtn).first().click({ timeout: 2000, force: true }).catch(() => undefined);
        await page.waitForTimeout(300);
      }
    }
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const banner = await txt(page, '[data-testid="review-narration-banner"]');
    perPly.push({ ply: n, badge, banner });

    // On a flagged ply, tap Show-me and capture the proposed-line narration.
    if (/inaccuracy|mistake|blunder|miss/i.test(badge) && await has(page, '[data-testid="walk-show-me-btn"]')) {
      const before = spoken().length;
      await page.locator('[data-testid="walk-show-me-btn"]').first().click({ timeout: 2000, force: true }).catch(() => undefined);
      await until(() => spoken().length >= before + 2, 60000, 800);
      await page.waitForTimeout(1500);
      showMe.push({ ply: n, badge, lines: spoken().slice(before) });
      // resume paused state for stepping
      const stx = await page.locator('[data-testid="review-play-pause-btn"]').first().getAttribute('data-state').catch(() => null);
      if (stx === 'playing') await page.locator('[data-testid="review-play-pause-btn"]').first().click({ timeout: 2000 }).catch(() => undefined);
    }

    if (n >= (info?.total ?? total)) break;
    const fwd = page.locator('[data-testid="review-forward-btn"]').first();
    if (!(await fwd.count())) break;
    await fwd.click({ timeout: 2000, force: true }).catch(() => undefined);
    await page.waitForTimeout(500);
  }

  const allSpoken = spoken();
  const out = {
    game: GID, startable: ready, engineDepth: annots.depth, nxe4,
    checkRedundancy: allSpoken.filter((t) => /with check|comes with check|forces .*king/i.test(t)),
    perPly, cards, showMe,
    spokenCount: allSpoken.length, errs,
  };
  const dir = `audit-reports/bowdler-repro-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify(out, null, 2));
  console.log(`\n[cards] ${cards.length}`); cards.forEach((c) => console.log(`  ply ${c.ply} ${c.card}: ${c.text.slice(0, 160)}`));
  console.log(`\n[show-me proposed lines] ${showMe.length}`); showMe.forEach((s) => { console.log(`  ply ${s.ply} [${s.badge}]:`); s.lines.forEach((l) => console.log(`     • ${l}`)); });
  console.log(`\n[check-narration lines]`); out.checkRedundancy.forEach((t) => console.log(`  • ${t}`));
  console.log(`\n[errs] ${errs.length}`); errs.forEach((e) => console.log(`  ${e}`));
  console.log(`\nreport → ${dir}/report.json`);
  await listener.stop();
  await browser.close();
};
run().catch((e) => { console.error(e); process.exit(1); });
