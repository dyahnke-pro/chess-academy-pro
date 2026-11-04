// ONE GAME, EVERYTHING REVIEW WEIGHS (David 2026-11-04: "one game with
// everything" → "review is best because its the most indepth"). The app runs
// on the local dev server (the page imports the leaf by its source path, so a
// built bundle cannot be used), the game is seeded unanalyzed, Review opens it
// with the real engine and the real data, and every row the deciding places
// report (`src/services/everythingEvents.ts`) is collected from the page, plus
// the gem index's hits on the game's line. Muted: nothing is synthesised.
//
//   npx vite --port 5173 --strictPort &
//   node scripts/everything-one-game.mjs <out.json> [game.json]
//
// The game file is { sans, studentSide, white?, black?, result? } — default
// the Gotham–Jelena miniature (src/test/fixtures/gotham-jelena.json).
// EVERYTHING_GAME_ID=<id> instead opens one of David's own games from his data
// drop (`node scripts/read-data-drop.mjs --latest`), with his whole record
// loaded so the computers that read the student's history fire too. The rows
// come in Review's builds (a first walk on the graded plies, then the full
// walk, then the deep dive's rebuild): the last block of rows ending in
// `review-walk` rows is the build the student hears.
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { until } from './audit-lib/wedge-watch.mjs';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node scripts/everything-one-game.mjs <out.json> [game.json]'); process.exit(2); }
const BASE = process.env.EVERYTHING_URL ?? 'http://localhost:5173';
const OWN_ID = process.env.EVERYTHING_GAME_ID ?? null;
const game = OWN_ID ? { sans: [], studentSide: 'white' } : JSON.parse(readFileSync(process.argv[3] ?? 'src/test/fixtures/gotham-jelena.json', 'utf8'));
const WHITE = game.white ?? 'GothamChess';
const BLACK = game.black ?? 'JelenaKarleusa';
const RESULT = game.result ?? '1-0';
const movetext = game.sans.map((s, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${s}` : s)).join(' ');
const PGN = `[White "${WHITE}"]\n[Black "${BLACK}"]\n[Result "${RESULT}"]\n\n${movetext} ${RESULT}`;
const GID = OWN_ID ?? 'everything-one-game';
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
// Subscribe before the app runs: the same module instance the app imports.
await ctx.addInitScript(() => {
  window.__everything = [];
  import('/src/services/everythingEvents.ts').then((m) => {
    m.onEverything((r) => { try { window.__everything.push(JSON.parse(JSON.stringify(r))); } catch { /* skip */ } });
  }).catch((e) => { window.__everythingError = String(e); });
});
const page = await ctx.newPage();
page.on('pageerror', (e) => log(`pageerror: ${String(e).slice(0, 160)}`));

await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(8000);
const dismiss = async () => {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="first-run-skip"]']) {
    const b = page.locator(sel).first();
    if (await b.count()) await b.click({ timeout: 2000 }).catch(() => undefined);
  }
};
await dismiss();
if (OWN_ID) {
  const fx = await loadFixtureIntoIDB(page);
  log(`[record] ${fx.loaded ? `${fx.wrote} rows / ${fx.stores} stores` : `not loaded (${fx.reason})`}`);
  const own = await page.evaluate(async (gid) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const get = (store, key) => new Promise((res) => { const t = db.transaction(store, 'readonly'); const rq = key === null ? t.objectStore(store).getAll() : t.objectStore(store).get(key); rq.onsuccess = () => res(rq.result ?? null); rq.onerror = () => res(null); });
    const g = await get('games', gid);
    const profs = (await get('profiles', null)) ?? [];
    const handle = String(profs[0]?.preferences?.chessComUsername ?? '').toLowerCase();
    return g ? { ...g, handle } : null;
  }, OWN_ID);
  if (!own) { log(`game ${OWN_ID} is not in the record`); await browser.close(); process.exit(1); }
  game.pgn = own.pgn; game.white = own.white; game.black = own.black; game.result = own.result;
  game.studentSide = own.studentSide ?? (String(own.black).toLowerCase() === own.handle ? 'black' : 'white');
  const c = new Chess(); c.loadPgn(own.pgn); game.sans = c.history();
  log(`game ${own.white} – ${own.black} ${own.result}, ${game.sans.length} plies, student ${game.studentSide}`);
}
const seed = OWN_ID ? { own: true } : await page.evaluate(async ({ gid, pgn, side, white, black, result }) => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await open();
  const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
  const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  await put('games', { id: gid, studentSide: side, pgn, white, black, result, date: '2023.01.01', event: 'Live Chess', eco: null, whiteElo: 1500, blackElo: 1500, source: 'chesscom', termination: 'unknown', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
  const profs = await getAll('profiles');
  // The student is found by handle; marking the auto-import just-run keeps the
  // handle from starting a real chess.com import.
  for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = side === 'white' ? white : black; p.preferences.coachNarration = 'full'; p.preferences.lastChessComAutoImportAt = Date.now(); p.preferences.lastLichessAutoImportAt = Date.now(); await put('profiles', p); }
  return { profiles: profs.length };
}, { gid: GID, pgn: PGN, side: game.studentSide, white: WHITE, black: BLACK, result: RESULT });
log(`seed ${JSON.stringify(seed)}`);

await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(3000);
await dismiss();
const card = page.locator(`[data-testid="review-game-card-${GID}"]`).first();
await card.waitFor({ timeout: 60000 });
log(`listener: ${await page.evaluate(() => window.__everythingError ?? 'ok')}`);
await card.click();
await page.waitForURL(/\/coach\/review\//, { timeout: 15000 }).catch(() => undefined);
await dismiss();

// The walk, then every background pass: collect until a minute passes with no
// new row.
let last = -1;
let stable = 0;
await until(async () => {
  const n = await page.evaluate(() => window.__everything.length);
  const ready = await page.locator('[data-testid="start-walk-btn"]:not([disabled])').count();
  log(`rows ${n}, walk ready ${ready > 0}`);
  if (ready > 0 && n === last) stable += 1; else stable = 0;
  last = n;
  return stable >= 6;
}, 900000, 10000);
const rows = await page.evaluate(() => window.__everything);
// The gems the index holds on this game's line (Review does not run them yet).
const gems = await page.evaluate(async (sans) => {
  const m = await import('/src/services/clubGems.ts');
  const hits = await m.clubGemsOnLine(sans);
  return hits.map((h) => ({ atPly: h.atPly, gem: h.gem, mistake: m.clubGemToMistake(h) }));
}, game.sans).catch((e) => ({ error: String(e) }));
writeFileSync(OUT, JSON.stringify({ game, rows, gems }, null, 1));
log(`saved ${rows.length} rows to ${OUT}`);
await browser.close();
