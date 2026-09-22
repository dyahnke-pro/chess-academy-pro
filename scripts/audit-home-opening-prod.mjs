// audit-home-opening-prod — post-deploy audit for THE HOME-OPENING COMPUTER
// (WO-HOME-OPENING-01 A2 + A3, 2026-09-22). Three instruments, MUTED (G1 —
// never a byte of TTS):
//   1. Playwright drives /weaknesses on LIVE prod.
//   2. The app's own audit events land on a LOOPBACK listener sidecar (the
//      prod stream is opt-in/off — §G2); this is where the ALGO rows are read.
//   3. (voice) nothing on this surface speaks; the listener is instrument 2.
//
// Contracts (algo-audit rule: EMIT + ASSERT — the decision must be observable):
//   A. Fresh device: no card (nothing to crown), no chosen family emitted.
//   B. Seed a real record through raw IndexedDB (40 Pirc as Black, 3 Elephant
//      Gambit as Black at 0%, 12 Vienna as White) and reload:
//      HOME OPENING chosen-by-volume-over-floor — the row for Black names the
//      Pirc, lists the Elephant with clearsFloor:false, carries a floor ≥ 10;
//      the card prints the same family and game count (one computation, one
//      sentence). White = Vienna.
//   C. ANALYSIS ORDER home-games-first-past-the-cap — tapping Analyze emits
//      `analysis-batch-ordered` with homeCount = 52 > the 50-game package and a
//      batch of 52, then the run is abandoned (the point is the ORDER).
//   D. One-tap change: choosing the 3-game Elephant makes it the student's
//      pick, the row says `student chose`, and it SURVIVES a reload (a
//      recompute never overwrites a student choice).
//   E. Vacuity: ≥1 listener event, ≥2 algo rows, 0 pageerrors.
//
// Run:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//       AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-home-opening-prod.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const USER = 'audit-home-student';
// The ONE opening key (A1) is slug(eco-name); these are the app's own ids.
const PIRC = { key: 'b07-pirc-defense', eco: 'B07', pgn: '1. e4 d6 2. d4 Nf6 3. Nc3 g6 4. Nf3 Bg7 5. Be2 O-O 6. O-O c6 *' };
const ELEPHANT = { key: 'c40-elephant-gambit', eco: 'C40', pgn: '1. e4 e5 2. Nf3 d5 3. exd5 e4 4. Qe2 Nf6 5. d3 *' };
const VIENNA = { key: 'c25-vienna-game', eco: 'C25', pgn: '1. e4 e5 2. Nc3 Nf6 3. Bc4 Nc6 4. d3 Bc5 *' };
const OPENING_KEY_REV = '2026-09-22-one-opening-key';

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);          // G1: audits run muted
await ctx.addInitScript(autoDismissCalibration);   // CSS-based, never a hanging click
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismissModals() {
  try { const g = page.locator('[data-testid="ai-consent-modal"]'); await g.waitFor({ timeout: 4000 }); await page.locator('[data-testid="ai-consent-allow"]').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}
const rowsOf = (kind) => listener.getCapturedEvents().filter((e) => e.kind === kind).map((e) => {
  let details = null;
  try { details = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details ?? null); } catch { /* */ }
  return { summary: String(e.summary ?? ''), details };
});

function mkGames(spec, colour, n, winRate, tag) {
  return Array.from({ length: n }, (_, i) => {
    const win = i < Math.round(n * winRate);
    const result = colour === 'white' ? (win ? '1-0' : '0-1') : (win ? '0-1' : '1-0');
    return {
      id: `audit-home-${tag}-${i}`, pgn: spec.pgn, white: colour === 'white' ? USER : `opp-${tag}-${i}`, black: colour === 'black' ? USER : `opp-${tag}-${i}`,
      result, date: `2026-0${1 + (i % 9)}-${String(1 + (i % 27)).padStart(2, '0')}`, event: 'audit', eco: spec.eco, whiteElo: 1500, blackElo: 1500,
      source: 'chesscom', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: spec.key, openingKeyRev: OPENING_KEY_REV,
    };
  });
}
/** Seed games + the username through raw IndexedDB (no app import). */
async function seed(games) {
  return page.evaluate(({ games, user }) => new Promise((finish) => {
    let req;
    try { req = indexedDB.open('ChessAcademyDB'); } catch { return finish({ ok: false, reason: 'open-threw' }); }
    req.onerror = () => finish({ ok: false, reason: 'open-error' });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('games') || !db.objectStoreNames.contains('profiles')) { db.close(); return finish({ ok: false, reason: 'no-store' }); }
      const tx = db.transaction(['games', 'profiles'], 'readwrite');
      const gs = tx.objectStore('games');
      for (const g of games) gs.put(g);
      const ps = tx.objectStore('profiles');
      const all = ps.getAll();
      all.onsuccess = () => { for (const p of all.result ?? []) { p.preferences = { ...(p.preferences ?? {}), chessComUsername: user, homeOpenings: undefined }; ps.put(p); } };
      tx.oncomplete = () => { db.close(); finish({ ok: true, wrote: games.length }); };
      tx.onerror = () => { db.close(); finish({ ok: false, reason: 'tx-error' }); };
    };
  }), { games, user: USER });
}

try {
  // ── A. Fresh device: nothing to crown ─────────────────────────────────────
  await page.goto(`${BASE}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.waitForTimeout(6000);
  const cardFresh = await page.locator('[data-testid="home-opening-card"]').count();
  const chosenFresh = rowsOf('home-opening-chosen').filter((r) => r.details?.chosen);
  check('A fresh device: no home-opening card and no chosen family emitted', cardFresh === 0 && chosenFresh.length === 0, `card=${cardFresh} rows=${chosenFresh.length}`);

  // ── B. A real record → the computer's pick, by volume, over the floor ────
  const seeded = await seed([...mkGames(PIRC, 'black', 40, 0.49, 'pirc'), ...mkGames(ELEPHANT, 'black', 3, 0, 'ele'), ...mkGames(VIENNA, 'white', 12, 0.6, 'vie')]);
  check('B0 seeded 55 games + username through raw IndexedDB', seeded.ok, JSON.stringify(seeded));
  await page.goto(`${BASE}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="home-opening-card"]').waitFor({ timeout: 30000 });
  const blackName = (await page.locator('[data-testid="home-opening-black-name"]').innerText()).trim();
  const whiteName = (await page.locator('[data-testid="home-opening-white-name"]').innerText()).trim();
  check('B1 card: Black home = Pirc Defense with its 40 games', /Pirc Defense/.test(blackName) && /40 games/.test(blackName), blackName);
  check('B2 card: White home = Vienna Game with its 12 games', /Vienna Game/.test(whiteName) && /12 games/.test(whiteName), whiteName);
  await page.waitForTimeout(1500);
  const black = rowsOf('home-opening-chosen').find((r) => r.details?.colour === 'black' && r.details?.chosen);
  const ele = black?.details?.candidates?.find((c) => c.family === 'Elephant Gambit');
  check('B3 HOME OPENING chosen-by-volume-over-floor — the row names the Pirc, the Elephant has clearsFloor:false, floor ≥ 10',
    black?.details?.chosen?.family === 'Pirc Defense' && black?.details?.chosen?.games === 40 && ele?.clearsFloor === false && (black?.details?.floor?.minGames ?? 0) >= 10,
    black ? black.summary : 'no row');
  check('B4 the row and the card are ONE computation (same family + count)', black?.details?.chosen?.family === 'Pirc Defense' && /40 games/.test(blackName));

  // ── C. Analysis order: home games first, past the cap ─────────────────────
  const analyze = page.locator('[data-testid="analyze-games-cta"]').first();
  let ordered = null;
  try {
    await analyze.waitFor({ timeout: 15000 });
    await analyze.click({ force: true });
    for (let i = 0; i < 30 && !ordered; i += 1) { await page.waitForTimeout(1000); ordered = rowsOf('analysis-batch-ordered')[0] ?? null; }
  } catch { /* fall through to the check */ }
  check('C ANALYSIS ORDER home-games-first-past-the-cap — batch = 52 home games (> the 50 package), none of the rest',
    ordered?.details?.homeCount === 52 && ordered?.details?.batch === 52 && ordered?.details?.packageSize === 50,
    ordered ? ordered.summary : 'no analysis-batch-ordered row');
  // Abandon the Stockfish run — the ORDER was the contract, not 52 analyses.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1000);

  // ── D. One-tap change, and it survives a reload ───────────────────────────
  await page.goto(`${BASE}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="home-opening-card"]').waitFor({ timeout: 30000 });
  await page.locator('[data-testid="home-opening-change-black"]').click({ force: true });
  const opt = page.locator('[data-testid="home-opening-option-black-elephant-gambit"]');
  await opt.waitFor({ timeout: 10000 });
  const optText = (await opt.innerText()).trim();
  check('D1 the change list marks the 3-game line "thin" (the floor is stated, not hidden)', /thin/.test(optText), optText);
  await opt.click({ force: true });
  await page.waitForTimeout(2000);
  const picked = (await page.locator('[data-testid="home-opening-black-name"]').innerText()).trim();
  check('D2 card now shows Elephant Gambit as the student\'s pick', /Elephant Gambit/.test(picked) && /your pick/i.test(picked), picked);
  const studentRow = rowsOf('home-opening-chosen').find((r) => /student chose/.test(r.summary));
  check('D3 the row says the STUDENT chose it (source student)', studentRow?.details?.chosen?.source === 'student' && studentRow?.details?.chosen?.family === 'Elephant Gambit', studentRow ? studentRow.summary : 'no row');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissModals();
  await page.locator('[data-testid="home-opening-card"]').waitFor({ timeout: 30000 });
  const afterReload = (await page.locator('[data-testid="home-opening-black-name"]').innerText()).trim();
  check('D4 the student choice survives a reload — a recompute never overwrites it', /Elephant Gambit/.test(afterReload) && /your pick/i.test(afterReload), afterReload);

  // ── E. Vacuity + health ───────────────────────────────────────────────────
  const events = listener.getCapturedEvents();
  check('E1 listener captured events (instrument 2 alive)', events.length > 0, `${events.length}`);
  check('E2 ≥2 algo rows read off the wire', rowsOf('home-opening-chosen').length + rowsOf('analysis-batch-ordered').length >= 2);
  check('E3 zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  check('RUN completed without a harness exception', false, String(e).slice(0, 300));
} finally {
  try { await browser.close(); } catch { /* already closed */ }
  await listener.stop();
}

const passed = results.filter((r) => r.ok).length;
const dir = path.join('audit-reports', `home-opening-${new Date().toISOString().replace(/[:.]/g, '-')}`);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ base: BASE, passed, total: results.length, results, pageErrors }, null, 2));
console.log(`\n${passed}/${results.length} checks green — report at ${dir}/report.json`);
process.exit(passed === results.length ? 0 : 1);
