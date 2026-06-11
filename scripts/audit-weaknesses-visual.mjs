/**
 * audit-weaknesses-visual
 * -----------------------
 * Desktop-viewport visual walk of EVERY /weaknesses window (David
 * 2026-06-11: "walk through every window and make sure that it is visually
 * accurate"). Seeds a realistic synthetic game set into IndexedDB —
 * including the D02 White/Black split that produced the 9-vs-23 drilldown
 * mismatch + two clock-comment PGNs to prove the move count isn't inflated
 * — then drives each tab (Overview / Openings / Mistakes / Tactics /
 * Patterns), opens the Queen's-Pawn drilldown, screenshots everything, and
 * cross-checks the numbers for internal consistency.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-weaknesses-visual.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SANDBOX = process.env.AUDIT_SANDBOX === '1';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/weaknesses-visual-${stamp}`;

const D02_PGN =
  '1. d4 d5 2. Nf3 Nf6 3. e3 e6 4. Bd3 c5 5. c3 Nc6 6. Nbd2 Bd6 7. O-O O-O ' +
  '8. dxc5 Bxc5 9. e4 dxe4 10. Nxe4 Nxe4 11. Bxe4 Qc7 12. Bd3 Rd8 13. Qe2 Bd7 14. Rd1';
// Same line but with chess.com-style {[%clk]} comments — the move count
// MUST still read 14, not be inflated by the comment tokens.
const D02_PGN_CLOCKS = D02_PGN
  .split(' ')
  .map((t) => (/^[a-hKQRBNO0-9]/.test(t) && !/^\d+\.$/.test(t) ? `${t} {[%clk 0:02:30]}` : t))
  .join(' ');
const C50_PGN =
  '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6 6. O-O O-O 7. Re1 a6 8. a4 Ba7 9. h3 h6 10. Nbd2';
const C00_PGN =
  '1. e4 e6 2. d4 d5 3. Nd2 Nf6 4. e5 Nfd7 5. Bd3 c5 6. c3 Nc6 7. Ne2 cxd4 8. cxd4 f6 9. exf6 Nxf6';

const USER = 'auditplayer';

function mkAnnotations(pgn, playerColor) {
  // Build per-ply annotations; tag a few of the player's moves as
  // blunder/mistake/inaccuracy so Err/Game + classification counts populate.
  const sans = pgn
    .replace(/\{[^}]*\}/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !/^\d+\.$/.test(t) && !/^(1-0|0-1|1\/2-1\/2|\*)$/.test(t));
  const bad = { 6: 'inaccuracy', 8: 'mistake', 10: 'blunder' };
  return sans.map((san, i) => {
    const color = i % 2 === 0 ? 'white' : 'black';
    const isPlayer = color === playerColor;
    const cls = isPlayer && bad[i] ? bad[i] : 'good';
    return {
      moveNumber: Math.floor(i / 2) + 1,
      color,
      san,
      evaluation: (i % 2 === 0 ? 20 : -20) + (bad[i] ? -180 : 0),
      bestMove: null,
      bestMoveEval: (i % 2 === 0 ? 25 : -15),
      classification: cls,
      comment: null,
    };
  });
}

function mkGame(id, { eco, pgn, playerColor, result, oppElo, date }) {
  const opp = `opp_${id}`;
  const white = playerColor === 'white' ? USER : opp;
  const black = playerColor === 'black' ? USER : opp;
  return {
    id,
    pgn,
    white,
    black,
    result,
    date,
    event: 'Live Chess',
    eco,
    whiteElo: playerColor === 'white' ? 1200 : oppElo,
    blackElo: playerColor === 'black' ? 1200 : oppElo,
    source: 'chesscom',
    termination: 'resigned',
    annotations: mkAnnotations(pgn, playerColor),
    coachAnalysis: null,
    isMasterGame: false,
    openingId: null,
    fullyAnalyzed: true,
  };
}

function buildSeedGames() {
  const games = [];
  let n = 0;
  const day = (i) => `2026-0${1 + (i % 5)}-${String(10 + (i % 18)).padStart(2, '0')}`;
  // D02 Queen's Pawn — player WHITE: 9 games (2 wins / 7 losses). This is
  // the aggregate entry the user clicks (shows "9 / 2W 7L").
  for (let i = 0; i < 9; i++) {
    const result = i < 2 ? '1-0' : '0-1';
    const pgn = i < 2 ? D02_PGN_CLOCKS : D02_PGN; // 2 with clock comments
    games.push(mkGame(`d02w_${n++}`, { eco: 'D02', pgn, playerColor: 'white', result, oppElo: 1000 + i * 7, date: day(i) }));
  }
  // D02 — player BLACK: 14 games. NOT in the White aggregate entry, but
  // getGamesByOpening('D02') returns them → the old list showed 23.
  for (let i = 0; i < 14; i++) {
    const result = i < 5 ? '0-1' : '1-0';
    games.push(mkGame(`d02b_${n++}`, { eco: 'D02', pgn: D02_PGN, playerColor: 'black', result, oppElo: 980 + i * 5, date: day(i + 9) }));
  }
  // C50 Italian — player WHITE: 6 games (4 wins / 2 losses).
  for (let i = 0; i < 6; i++) {
    const result = i < 4 ? '1-0' : '0-1';
    games.push(mkGame(`c50_${n++}`, { eco: 'C50', pgn: C50_PGN, playerColor: 'white', result, oppElo: 1100 + i * 9, date: day(i + 2) }));
  }
  // C00 French — player BLACK: 5 games (2 wins / 3 losses).
  for (let i = 0; i < 5; i++) {
    const result = i < 2 ? '0-1' : '1-0';
    games.push(mkGame(`c00_${n++}`, { eco: 'C00', pgn: C00_PGN, playerColor: 'black', result, oppElo: 1050 + i * 6, date: day(i + 4) }));
  }
  return games;
}

// Minimal-valid MistakePuzzle records tied to specific seed games so the
// Mistakes tab populates AND the drilldown's "drill these mistakes" scope
// can be verified. 3 belong to White D02 games (in the drilldown's 9), 2
// to other openings.
function buildSeedPuzzles() {
  const fen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const mk = (id, sourceGameId, openingName, cls) => ({
    id,
    fen,
    playerMove: 'f1c4',
    playerMoveSan: 'Bc4',
    bestMove: 'f3e5',
    bestMoveSan: 'Nxe5',
    moves: 'f3e5 c6e5',
    cpLoss: cls === 'blunder' ? 320 : cls === 'mistake' ? 160 : 80,
    classification: cls,
    gamePhase: 'opening',
    moveNumber: 6,
    sourceGameId,
    sourceMode: 'chesscom',
    playerColor: 'white',
    promptText: 'Find the better move.',
    narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
    createdAt: '2026-03-10T00:00:00.000Z',
    opponentName: 'opp',
    gameDate: '2026-03-10',
    openingName,
    evalBefore: 40,
    srsInterval: 0,
    srsEaseFactor: 2.5,
    srsRepetitions: 0,
    srsDueDate: '2026-03-11',
    srsLastReview: null,
    status: 'unsolved',
    attempts: 0,
    successes: 0,
  });
  return [
    mk('mp_d1', 'd02w_0', "Queen's Pawn Game", 'blunder'),
    mk('mp_d2', 'd02w_1', "Queen's Pawn Game", 'mistake'),
    mk('mp_d3', 'd02w_2', "Queen's Pawn Game", 'inaccuracy'),
    mk('mp_c1', 'c50_0', 'Italian Game', 'mistake'),
    mk('mp_c2', 'c00_0', 'French Defense', 'blunder'),
  ];
}

async function dismissOnboarding(page) {
  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bubble.count().catch(() => 0)) {
    await bubble.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => undefined);
    await bubble.first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count().catch(() => 0)) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath,
    args: SANDBOX ? ['--ignore-certificate-errors', '--no-sandbox'] : [],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 }, // desktop / "windows view"
    ignoreHTTPSErrors: true,
    userAgent: 'AuditWeaknessVisualBot/1.0 (chromium)',
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));

  const report = { base: BASE_URL, startedAt: stamp, checks: [], shots: [] };
  const shot = async (name) => {
    const p = join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: p, fullPage: true }).catch(() => undefined);
    report.shots.push(p);
    return p;
  };
  const check = (label, ok, detail) => {
    report.checks.push({ label, ok, detail });
    console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? ` → ${detail}` : ''}`);
  };

  // Boot, dismiss onboarding (creates the profile), then seed.
  await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 20_000 }).catch(() => undefined);
  await dismissOnboarding(page);
  await page.waitForTimeout(1000);

  const seedResult = await page.evaluate(async (payload) => {
    const { games, user } = payload;
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(new Error('idb open failed'));
    });
    const db = await open();
    // 1) point the active profile's chess.com username at our seed user.
    await new Promise((res, rej) => {
      const tx = db.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      const all = store.getAll();
      all.onsuccess = () => {
        const profs = all.result ?? [];
        for (const p of profs) {
          p.preferences = p.preferences ?? {};
          p.preferences.chessComUsername = user;
          store.put(p);
        }
        // No profile yet? create a minimal one.
        if (profs.length === 0) {
          store.put({ id: 'audit', name: user, preferences: { chessComUsername: user } });
        }
      };
      tx.oncomplete = () => res();
      tx.onerror = () => rej(new Error('profile write failed'));
    });
    // 2) bulk-put the games.
    await new Promise((res, rej) => {
      const tx = db.transaction('games', 'readwrite');
      const store = tx.objectStore('games');
      for (const g of games) store.put(g);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(new Error('games write failed'));
    });
    // 2b) bulk-put the mistake puzzles (Mistakes tab + drilldown scope).
    if (payload.puzzles && payload.puzzles.length) {
      await new Promise((res, rej) => {
        const tx = db.transaction('mistakePuzzles', 'readwrite');
        const store = tx.objectStore('mistakePuzzles');
        for (const p of payload.puzzles) store.put(p);
        tx.oncomplete = () => res();
        tx.onerror = () => rej(new Error('puzzles write failed'));
      });
    }
    const count = await new Promise((res) => {
      const tx = db.transaction('games', 'readonly');
      const c = tx.objectStore('games').count();
      c.onsuccess = () => res(c.result);
    });
    db.close();
    return { wrote: games.length, total: count };
  }, { games: buildSeedGames(), user: USER, puzzles: buildSeedPuzzles() });
  console.log(`[seed] wrote ${seedResult.wrote}, games store now ${seedResult.total}`);

  // Reload so the insights services re-read Dexie with our seed.
  await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 20_000 }).catch(() => undefined);
  await dismissOnboarding(page);
  // Let analysis settle.
  await page.waitForFunction(() => !document.querySelector('[data-testid="insights-loading"]'), { timeout: 30_000 }).catch(() => undefined);
  await page.waitForTimeout(2500);

  const tabText = async () => (await page.locator('[data-testid="game-insights-page"]').innerText().catch(() => '')).replace(/\s+/g, ' ');

  // ── Walk every tab ────────────────────────────────────────────────
  const tabs = ['overview', 'openings', 'mistakes', 'tactics', 'patterns'];
  for (const t of tabs) {
    console.log(`\n[tab] ${t}`);
    await page.locator(`[data-testid="tab-${t}"]`).click({ timeout: 6000 }).catch(() => undefined);
    // Patterns reads habits via an async (LLM-backed) pass — wait it out.
    if (t === 'patterns') {
      await page.waitForFunction(
        () => !/Reading your habits/i.test(document.querySelector('[data-testid="game-insights-page"]')?.textContent ?? ''),
        { timeout: 25_000 },
      ).catch(() => undefined);
    }
    await page.waitForTimeout(t === 'patterns' ? 2500 : 1800);
    await shot(`tab-${t}`);
    const txt = await tabText();
    check(`${t} tab renders without "NaN"/"undefined"`, !/\bNaN\b|undefined/.test(txt), txt.slice(0, 80));
    if (t === 'overview') {
      // Seed games are 14 / 10 / 9 full moves → avg ~12. The bug reported
      // PLIES (~24). Assert the FULL-move stat (David 2026-06-11).
      const mpg = (txt.match(/Moves per game\s*(\d+)/i) || [])[1];
      check('overview: Moves per game is full-moves not plies (≤ 16)', mpg !== undefined && Number(mpg) <= 16, `Moves per game = ${mpg ?? '?'}`);
    }
    if (t === 'patterns') {
      check('patterns finished loading (not stuck on "Reading your habits")', !/Reading your habits/i.test(txt), txt.slice(0, 60));
    }
    if (t === 'mistakes') {
      // 5 puzzles seeded → the Errors breakdown must be non-zero now.
      const errCount = (txt.match(/(\d+)\s*ERRORS/i) || [])[1];
      check('mistakes tab shows seeded errors (not stuck at 0)', errCount !== undefined && Number(errCount) > 0, `${errCount ?? '?'} errors`);
    }
    if (t === 'openings') {
      // The D02 seed must show ONE consistent name everywhere — the
      // proficiency matrix used to call it "London System: Poisoned Pawn
      // Variation" while the rest said "Queen's Pawn Game" (David 2026-06-11).
      check('openings: D02 named consistently ("Queen\'s Pawn Game", no "London System")',
        /Queen.?s Pawn Game/i.test(txt) && !/London System/i.test(txt),
        /London System/i.test(txt) ? 'still shows "London System"' : 'consistent');
    }
  }

  // ── Openings → Queen's-Pawn drilldown: the count-consistency check ─
  console.log(`\n[drilldown] Queen's Pawn (D02)`);
  await page.locator(`[data-testid="tab-openings"]`).click().catch(() => undefined);
  await page.waitForTimeout(1500);
  // Click the first opening row that mentions Queen's Pawn / D02.
  const row = page.locator('text=/Queen.?s Pawn|D02/i').first();
  await row.click({ timeout: 6000 }).catch(() => undefined);
  await page.locator('[data-testid="opening-drilldown"]').waitFor({ timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(2000);
  await shot('drilldown-queens-pawn');

  const dd = await page.locator('[data-testid="opening-drilldown"]').innerText().catch(() => '');
  // Summary "Games" number.
  const gamesStat = (dd.match(/(\d+)\s*Games/i) || [])[1] ?? '?';
  // "All Games (N)" list header.
  const listCount = (dd.match(/All Games\s*\((\d+)\)/i) || [])[1] ?? '?';
  // Err/Game.
  const errPerGame = (dd.match(/([\d.]+)\s*Err\/Game/i) || [])[1] ?? '?';
  check('drilldown: summary Games == list count (was 9 vs 23)', gamesStat !== '?' && gamesStat === listCount, `Games=${gamesStat} list=${listCount}`);
  check('drilldown: Err/Game is sane (≤ ~5 not ~14)', errPerGame !== '?' && Number(errPerGame) <= 6, `${errPerGame}/game`);

  // Move count: every "Moves" value on the cards should be ≤ ~40 (these
  // seeds are ≤14-move games; inflated-ply counts would read 27/19/etc.).
  const moveNums = [...dd.matchAll(/Moves\s+(\d+)/g)].map((m) => Number(m[1]));
  const maxMoves = moveNums.length ? Math.max(...moveNums) : 0;
  check('drilldown: move counts are full-moves not plies (≤ 20)', moveNums.length > 0 && maxMoves <= 20, `max=${maxMoves} of [${moveNums.join(',')}]`);

  // ── Scoped mistakes: CTA shows the count from THESE games (3 of 5), and
  //    clicking it opens the mistakes list scoped to those games (David). ─
  const ctaText = await page.locator('[data-testid="drill-opening-mistakes-btn"]').innerText().catch(() => '');
  const ctaCount = (ctaText.match(/Drill\s+(\d+)\s+mistake/i) || [])[1];
  check('drilldown: "drill these mistakes" CTA shows the scoped count (3)', ctaCount === '3', `CTA="${ctaText.trim()}"`);
  await page.locator('[data-testid="drill-opening-mistakes-btn"]').click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="opening-scope-badge"]').waitFor({ timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  await shot('mistakes-scoped-to-opening');
  const scopedCards = await page.locator('[data-testid="puzzle-card"]').count().catch(() => 0);
  const badge = await page.locator('[data-testid="opening-scope-badge"]').innerText().catch(() => '');
  check('scoped mistakes list shows ONLY these games\' mistakes (3, not 5)', scopedCards === 3, `${scopedCards} cards, badge="${badge.trim()}"`);

  report.numbers = { gamesStat, listCount, errPerGame, moveNums };
  report.pageErrors = pageErrors;
  check('no page errors during walk', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  const passed = report.checks.every((c) => c.ok);
  report.passed = passed;
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n[weaknesses-visual] ${passed ? 'ALL GREEN ✓' : 'ISSUES ✗'} — ${OUT_DIR}/report.json`);
  console.log(`[weaknesses-visual] screenshots: ${report.shots.length}, page errors: ${pageErrors.length}`);

  await browser.close();
  process.exit(passed ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
