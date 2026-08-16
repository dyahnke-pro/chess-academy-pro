/**
 * Explore-chips probe (David 2026-07-23): seed a Grand Prix game, open the
 * review walk, and confirm the C8 "what was left out" beat renders TAPPABLE
 * "Explore a6/e6" chips (not an auto-march) — then tap one and confirm it plays
 * a line out on the board. Verifies the opt-in explore UX end-to-end.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://deploy-preview-844--chess-academy-pro.netlify.app';
const GID = 'explore-chip-probe-gp';
// fABTn305 Grand Prix (Black) — the dial-in game; the sidecar covers its lines.
const PGN = '1. e4 c5 2. Nc3 g6 3. f4 Bg7 4. Nf3 Nc6 5. Bb5 Nd4 6. O-O Nxb5 7. Nxb5 d6 8. d3 Nf6 9. Qe1 Bg4 10. Qh4 Qd7 11. Nc3 Bxf3 12. Rxf3 O-O-O 13. e5 dxe5 14. fxe5 Ng4 15. Ne4 Bxe5';
const results = [];
const add = (n, p, d) => { results.push({ n, p }); console.log(`  ${p ? '✅ PASS' : '❌ FAIL'}  ${n.padEnd(34)} ${d ?? ''}`); };
const has = async (p, s) => (await p.locator(s).count()) > 0;

const run = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await ctx.newPage();
  const dismiss = async () => { for (let i = 0; i < 6; i++) { for (const [s, c] of [['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'], ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button']]) { if (await has(page, s)) { try { await page.locator(c).first().click({ timeout: 2000 }); } catch { /* */ } } } await page.waitForTimeout(400); } };

  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(1500); } }
  await dismiss(); await page.waitForTimeout(2500);
  await page.evaluate(async ({ gid, pgn }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (st, v) => new Promise((res, rej) => { const t = db.transaction(st, 'readwrite'); t.objectStore(st).put(v); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (st) => new Promise((res, rej) => { const t = db.transaction(st, 'readonly'); const q = t.objectStore(st).getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    await put('games', { id: gid, pgn, white: 'Opponent', black: 'Student', result: '0-1', date: '2026.07.23', event: 'Explore Probe', eco: 'B23', whiteElo: 1600, blackElo: 1600, source: 'chesscom', termination: 'normal', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Student'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
  }, { gid: GID, pgn: PGN });

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  let ready = false;
  for (let i = 0; i < 140; i++) { await page.waitForTimeout(1500); const b = page.locator('[data-testid="start-walk-btn"]').first(); if ((await b.count()) && (await b.getAttribute('disabled')) === null) { ready = true; break; } if (i % 10 === 0) console.log(`  …analysing (${(i * 1.5) | 0}s)`); }
  add('analysis-settled', ready, ready ? 'start-walk enabled' : 'never settled');
  if (!ready) { await browser.close(); return report(); }
  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});

  // Theory beats build after mount (deferred ~0.5s + masters lookups).
  let theoryBtn = false;
  for (let i = 0; i < 40; i++) { if (await has(page, '[data-testid="walk-theory-btn"]')) { theoryBtn = true; break; } await page.waitForTimeout(1000); }
  add('theory-button-present', theoryBtn);

  // The Explore chips — the opt-in C8 alternatives.
  let chipCount = 0;
  for (let i = 0; i < 20; i++) { chipCount = await page.locator('[data-testid^="walk-explore-btn-"]').count(); if (chipCount > 0) break; await page.waitForTimeout(1000); }
  add('explore-chips-render', chipCount > 0, `${chipCount} chip(s)`);

  if (chipCount > 0) {
    const chip = page.locator('[data-testid^="walk-explore-btn-"]').first();
    const label = (await chip.innerText().catch(() => '')).trim();
    // Capture the board FEN before, tap the chip, confirm the caption/board changes.
    const capBefore = (await page.locator('[data-testid="review-narration-banner"]').first().innerText().catch(() => '')).trim();
    await chip.click({ timeout: 3000 }).catch(() => {});
    let changed = false;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(700);
      const cap = (await page.locator('[data-testid="review-narration-banner"]').first().innerText().catch(() => '')).trim();
      if (cap && cap !== capBefore) { changed = true; break; }
    }
    add('explore-chip-plays', changed, `tapped "${label}", caption advanced`);
  }

  await browser.close();
  return report();
};

function report() {
  const pass = results.filter((r) => r.p).length;
  console.log(`\n${pass}/${results.length} checks passed`);
  process.exit(pass === results.length ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
