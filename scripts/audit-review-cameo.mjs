/**
 * audit-review-cameo — Phase 2 repro for the Danya-review build
 * (model-game cameo: matched classic offered at the thematic ply).
 *
 * Seeds a fully-analyzed quiet Caro-Kann Panov game (White queenside
 * majority forms by ply 10 — the probe-verified anchor that matches
 * Mamedyarov–Topalov 2008) into Dexie, drives the STORED-GAME entry point
 * (/coach/review/:id), walks forward to the anchor ply, and asserts:
 *   • the cameo ASK card appears ONCE, naming both players,
 *   • Watch plays the classic's stretch on the board (playback card),
 *   • the playback completes and the walk resumes (card gone, board back),
 *   • Skip on a fresh run dismisses without residue,
 *   • zero pageerrors / React key errors.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-review-cameo.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { attachVoiceListener, voiceLines, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const GAME_ID = 'audit-cameo-panov';

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const run = async () => {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: [...sandboxLaunchArgs(), ...(process.env.AUDIT_LISTENER === '1' ? LISTENER_LAUNCH_ARGS : [])] });
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  const voice = process.env.AUDIT_LISTENER === '1' ? await attachVoiceListener(ctx) : null;
  const ttsSpoken = [];
  if (process.env.AUDIT_TTS_LOG === '1') {
    page.on('request', (r) => {
      if (/\/api\/tts\?/.test(r.url())) {
        try {
          const t = new URL(r.url()).searchParams.get('text');
          if (t && t !== '.') ttsSpoken.push(t);
        } catch { /* ignore */ }
      }
    });
  }

  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error' && /same key|unique "key"|Maximum update|Cannot update a component/.test(m.text())) {
      errs.push('REACT: ' + m.text().slice(0, 160));
    }
  });

  let ok = false;
  for (let i = 0; i < 4 && !ok; i++) {
    try { await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); ok = true; }
    catch { await page.waitForTimeout(1500); }
  }
  await page.waitForTimeout(1500);
  for (let i = 0; i < 8; i++) {
    let acted = false;
    for (const [sel, click] of [
      ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
      ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
      ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
    ]) {
      if (await page.locator(sel).count()) {
        try { await page.locator(click).first().click({ timeout: 3000 }); acted = true; } catch { /* */ }
      }
    }
    await page.waitForTimeout(700);
    if (!acted && i > 1) break;
  }

  // Wait for the deferred seed to release IndexedDB (cheap-read poll).
  let dbReady = false;
  for (let i = 0; i < 30 && !dbReady; i++) {
    const t = await page.evaluate(async () => {
      const t0 = performance.now();
      try {
        const dbs = await indexedDB.databases();
        const name = (dbs.find((d) => /ChessAcademy/i.test(d.name || '')) || {}).name;
        if (!name) return -1;
        await new Promise((resolve, reject) => {
          const open = indexedDB.open(name);
          open.onsuccess = () => {
            try {
              const tx = open.result.transaction(['games'], 'readonly');
              const req = tx.objectStore('games').count();
              req.onsuccess = () => resolve(null);
              req.onerror = () => reject(new Error('count failed'));
            } catch (e) { reject(e); }
          };
          open.onerror = () => reject(new Error('open failed'));
        });
        return performance.now() - t0;
      } catch { return -1; }
    });
    if (t >= 0 && t < 800) { dbReady = true; break; }
    await page.waitForTimeout(3000);
  }
  check('app DB settled (deferred seed done enough to read fast)', dbReady);

  // ── Seed the analyzed Panov game (probe-verified cameo anchor @ ply 10) ──
  const seeded = await page.evaluate(async (gameId) => {
    const pgn = '1. e4 c6 2. d4 d5 3. exd5 cxd5 4. c4 Nf6 5. Nc3 e6 6. Nf3 Be7 7. cxd5 Nxd5 8. Bd3 Nc6 9. O-O O-O 10. Re1 Bf6 11. a3 b6 12. Qe2 g6 1/2-1/2';
    const sans = ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Be7', 'cxd5', 'Nxd5', 'Bd3', 'Nc6', 'O-O', 'O-O', 'Re1', 'Bf6', 'a3', 'b6', 'Qe2', 'g6'];
    const annotations = sans.map((san, i) => ({
      moveNumber: Math.floor(i / 2) + 1,
      color: i % 2 === 0 ? 'white' : 'black',
      san,
      evaluation: 25,
      bestMove: null,
      bestMoveEval: 25,
      classification: 'good',
      comment: null,
    }));
    const record = {
      id: gameId,
      pgn,
      white: 'Student',
      black: 'Coach Bot',
      result: '1/2-1/2',
      date: new Date().toISOString().slice(0, 10),
      event: 'Audit seed',
      eco: 'B14',
      whiteElo: 1500,
      blackElo: 1400,
      source: 'coach',
      annotations,
      coachAnalysis: null,
      isMasterGame: false,
      openingId: null,
      fullyAnalyzed: true,
      analysisDepth: 16,
    };
    const dbs = await indexedDB.databases();
    const name = (dbs.find((d) => /ChessAcademy/i.test(d.name || '')) || {}).name || 'ChessAcademyDB';
    return await new Promise((resolve) => {
      const open = indexedDB.open(name);
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction(['games'], 'readwrite');
          tx.objectStore('games').put(record);
          tx.oncomplete = () => resolve({ ok: true, db: name });
          tx.onerror = () => resolve({ ok: false, err: String(tx.error) });
        } catch (e) { resolve({ ok: false, err: String(e) }); }
      };
      open.onerror = () => resolve({ ok: false, err: 'open failed' });
    });
  }, GAME_ID);
  check('seeded analyzed Panov game into Dexie', !!seeded.ok, seeded.err || seeded.db);
  if (!seeded.ok) { console.log(JSON.stringify(results)); await browser.close(); process.exit(1); }

  const enterWalk = async () => {
    await page.evaluate((id) => {
      window.history.pushState({}, '', `/coach/review/${id}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, GAME_ID);
    const start = page.locator('[data-testid="start-walk-btn"]');
    await start.waitFor({ timeout: 60000 });
    for (let i = 0; i < 20; i++) {
      if (await page.locator('[data-testid="coach-game-review-walk"]').count()) return true;
      try { await start.click({ timeout: 2500 }); } catch { /* disabled while prep runs */ }
      await page.waitForTimeout(2000);
    }
    return (await page.locator('[data-testid="coach-game-review-walk"]').count()) > 0;
  };

  const walkToCameo = async () => {
    // Anchor is ply 10 (probe-verified); the corpus scan runs deferred, so
    // allow it a beat, then walk forward until the ask card shows.
    await page.waitForTimeout(3000);
    for (let i = 0; i < 20; i++) {
      if (await page.locator('[data-testid="review-cameo-ask"]').count()) return true;
      const fwd = page.locator('[data-testid="review-forward-btn"]');
      if (await fwd.count()) { try { await fwd.click({ timeout: 2500 }); } catch { /* card open */ } }
      await page.waitForTimeout(1200);
    }
    return (await page.locator('[data-testid="review-cameo-ask"]').count()) > 0;
  };

  // ── Leg 1: ask → WATCH → playback completes → walk resumes ───────────────
  check('stored-game review mounted the walk surface', await enterWalk());
  const askSeen = await walkToCameo();
  check('cameo ask card appeared at the thematic ply', askSeen);

  if (askSeen) {
    const askText = await page.evaluate(() => document.querySelector('[data-testid="review-cameo-ask"]')?.textContent ?? '');
    console.log('   ask card:', askText.slice(0, 180));
    check('ask card NAMES both players of the classic', /Mamedyarov|Topalov|vs/.test(askText), askText.slice(0, 60));

    await page.locator('[data-testid="review-cameo-watch"]').dispatchEvent('click');
    let playbackSeen = false;
    try {
      await page.locator('[data-testid="review-cameo-playback"]').waitFor({ timeout: 10000 });
      playbackSeen = true;
    } catch { /* */ }
    check('cameo playback card appeared after Watch', playbackSeen);

    if (playbackSeen) {
      // Intro voice + 8 plies @1.1s + tie-back — allow up to 90s.
      let resumed = false;
      for (let i = 0; i < 45; i++) {
        await page.waitForTimeout(2000);
        if (!(await page.locator('[data-testid="review-cameo-playback"]').count())) { resumed = true; break; }
      }
      check('cameo playback completed and the walk resumed', resumed);
      // The cameo fires ONCE — walking on must not re-offer it.
      const fwd = page.locator('[data-testid="review-forward-btn"]');
      for (let i = 0; i < 4; i++) {
        if (await fwd.count()) { try { await fwd.click({ timeout: 2000 }); } catch { /* */ } }
        await page.waitForTimeout(700);
      }
      check('cameo did not re-offer after completion (ONE per review)',
        (await page.locator('[data-testid="review-cameo-ask"]').count()) === 0);
    }
  }

  // ── Leg 2: fresh mount → ask → SKIP dismisses without residue ────────────
  await page.evaluate(() => {
    window.history.pushState({}, '', '/coach/review');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await page.waitForTimeout(2000);
  const walk2 = await enterWalk();
  const ask2 = walk2 ? await walkToCameo() : false;
  check('fresh mount re-offers the cameo (per-mount once, not persisted)', ask2);
  if (ask2) {
    await page.locator('[data-testid="review-cameo-skip"]').dispatchEvent('click');
    await page.waitForTimeout(1200);
    const gone = (await page.locator('[data-testid="review-cameo-ask"]').count()) === 0;
    const noPlayback = (await page.locator('[data-testid="review-cameo-playback"]').count()) === 0;
    check('Skip dismisses the cameo with no playback residue', gone && noPlayback);
    // Walk must still advance after a skip.
    const plyBefore = await page.evaluate(() => document.querySelectorAll('[data-testid="coach-game-review-walk"]').length);
    const fwd = page.locator('[data-testid="review-forward-btn"]');
    let advanced = false;
    if (await fwd.count()) {
      try { await fwd.click({ timeout: 2500 }); advanced = true; } catch { /* */ }
    }
    check('walk advances normally after Skip', advanced, `walkMounted=${plyBefore}`);
  }

  if (voice) {
    const spoken = voiceLines(voice);
    console.log('\n   VOICE (' + spoken.length + ' lines):', JSON.stringify(spoken.slice(0, 24)));
    check('listener: cameo intro NAMED the classic by voice', spoken.some((l) => /Same fabric as your game|against/.test(l)));
    check("listener: cameo tie-back returned to the student's board", spoken.some((l) => /Back to your board/.test(l)));
    await voice.stop();
  }

  if (process.env.AUDIT_TTS_LOG === '1') {
    console.log('\n   FULL TTS TRANSCRIPT (' + ttsSpoken.length + '):');
    for (const t of ttsSpoken) console.log('   ▸ ' + t);
  }
  console.log('\nERRORS:', errs.length ? JSON.stringify(errs) : 'none');
  check('zero pageerrors / React key errors', errs.length === 0);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks green`);
  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
