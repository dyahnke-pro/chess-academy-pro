/**
 * Theory-lecture probe (David 2026-07-21): seed a game with a SIDELINE opening,
 * open the review walk, tap "Opening theory", and READ the caption stream —
 * asserting the lecture (a) walks dive moves with per-step narration in the
 * "SAN — why" register, (b) paces them readably (captions persist, no flash),
 * (c) states a computed line comparison at the sideline beat.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const GID = 'theory-probe-iqp';
const PGN = '1. e4 c5 2. Nf3 e6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 d5 6. exd5 exd5 7. Be2 Be7 8. O-O O-O 9. Bg5 Be6 10. Re1 Nc6 11. Nxc6 bxc6 12. Bf3 Qd6 13. Na4 Rab8 14. c4 dxc4 15. Bxc6 Rb4 16. b3 cxb3 17. Qxb3 Rxa4 18. Qxa4 Bd5 19. Bxd5 Nxd5 20. Rad1 Qc6 21. Qxc6';
const results = [];
const add = (n, p, d) => { results.push({ n, p }); console.log(`  ${p ? '✅ PASS' : '❌ FAIL'}  ${n.padEnd(30)} ${d}`); };
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
    await put('games', { id: gid, pgn, white: 'Student', black: 'Opponent', result: '1-0', date: '2026.07.21', event: 'Theory Probe', eco: 'B40', whiteElo: 1400, blackElo: 1400, source: 'chesscom', termination: 'normal', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = 'Student'; p.preferences.coachNarration = 'full'; await put('profiles', p); }
  }, { gid: GID, pgn: PGN });

  await page.goto(`${BASE}/coach/review/${GID}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  let ready = false;
  for (let i = 0; i < 140; i++) { await page.waitForTimeout(1500); const b = page.locator('[data-testid="start-walk-btn"]').first(); if ((await b.count()) && (await b.getAttribute('disabled')) === null) { ready = true; break; } if (i % 10 === 0) console.log(`  …analysing (${(i * 1.5) | 0}s)`); }
  if (!ready) { console.log('[FATAL] analysis never settled'); process.exit(1); }
  await page.locator('[data-testid="start-walk-btn"]').first().click().catch(() => {});
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => {});

  // The theory button appears once beats are built (deferred ~0.5s + lookups).
  let theoryBtn = false;
  for (let i = 0; i < 30; i++) { if (await has(page, '[data-testid="walk-theory-btn"]')) { theoryBtn = true; break; } await page.waitForTimeout(1000); }
  add('theory-button-present', theoryBtn, theoryBtn ? 'walk-theory-btn mounted' : 'never appeared');
  if (!theoryBtn) { await browser.close(); process.exit(1); }
  await page.locator('[data-testid="walk-theory-btn"]').first().click({ timeout: 3000 }).catch(() => {});

  // READ the caption stream for up to 4.5 min: sample the narration banner every
  // 700ms, recording each DISTINCT caption + its dwell time.
  const seen = [];
  let last = ''; let lastAt = Date.now();
  const t0 = Date.now();
  while (Date.now() - t0 < 270000) {
    const txt = (await page.locator('[data-testid="review-narration-banner"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (txt && txt !== last) {
      if (last) seen[seen.length - 1].dwellMs = Date.now() - lastAt;
      seen.push({ txt, dwellMs: null });
      last = txt; lastAt = Date.now();
    }
    // Lecture over? The Stop-theory button reverts to Opening theory.
    const btnTxt = (await page.locator('[data-testid="walk-theory-btn"]').first().innerText().catch(() => ''));
    if (seen.length > 3 && /Opening theory/i.test(btnTxt)) break;
    await page.waitForTimeout(700);
  }
  console.log(`\n===== CAPTION STREAM (${seen.length} distinct) =====`);
  seen.forEach((s, i) => console.log(`  [${String(i + 1).padStart(2)}] (${s.dwellMs === null ? 'last' : Math.round(s.dwellMs / 100) / 10 + 's'}) ${s.txt.slice(0, 220)}`));

  add('lecture-captions-flow', seen.length >= 5, `${seen.length} distinct captions`);
  const diveSteps = seen.filter((s) => /^[NBRQKa-h][a-hx1-8=+#O-]* — /.test(s.txt));
  add('dive-steps-narrated', diveSteps.length >= 2, `${diveSteps.length} captions in the "SAN — why" dive register`);
  const compared = seen.some((s) => /scores? .*%|score about the same|sharper, more forcing|quiet, maneuvering/i.test(s.txt));
  add('line-comparison-computed', compared, compared ? 'computed pros/cons clause spoken' : 'no comparison clause seen');
  const paced = seen.filter((s) => s.dwellMs !== null && s.dwellMs < 900).length;
  add('paced-not-flashed', paced <= Math.max(1, Math.floor(seen.length * 0.2)), `${paced}/${seen.length} captions dwelt <0.9s`);

  const fails = results.filter((r) => !r.p).length;
  console.log(`\n===== THEORY PROBE: ${fails === 0 ? '✅ MEETS' : '❌ FAILS'} (${results.length - fails}/${results.length}) =====`);
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
};
run().catch((e) => { console.error('FATAL', e); process.exit(1); });
