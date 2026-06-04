/**
 * audit-learn-full-game — plays a full game on /coach/teach (Learn with
 * Coach) against the live prod build and verifies the grounding-truth fixes:
 *
 *   1. The ENGINE plays the coach's reply (not the LLM) — after each student
 *      move the board advances by an opponent move within the settle window.
 *   2. Arrows GO AWAY between turns — the SVG arrow count drops to ~0 right
 *      after a student move (no piling).
 *   3. The "why did you play that?" question POPS UP on a blunder
 *      (data-testid="discussion-prompt"), rating-adaptive bar permitting.
 *
 * Navigates IN-APP via the hub tile (coach-action-teach) so it never does a
 * direct page.goto to /coach/teach (that re-validates the resigned sandbox
 * cert and fails). Models on audit-coach-play.mjs.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *        node scripts/audit-learn-full-game.mjs
 */
import { chromium } from 'playwright-core';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/learn-full-game-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const MOVE_SETTLE_MS = 9000; // student move + engine reply + narration

// A line that walks White into a catastrophic blunder (Fool's-Mate setup):
// 1.f3 then 2.g4 — if Black answers 1...e5 and 2...Qh4# the eval craters,
// which must trip the faucet. The engine plays Black, so the exact replies
// vary; we still play f3 + g4 and watch for the prompt.
const STUDENT_MOVES = [
  ['e2', 'e4'],
  ['g1', 'f3'],
  ['f1', 'c4'],
  ['b1', 'c3'],
];
// King-walk (Bongcloud) — reliably craters the eval regardless of the
// opponent's reply, so the eval-based slip-check must trip. e1→e2 is legal
// right after 1.e4 (e2 emptied); e2→f3 deepens the blunder.
const BLUNDER_MOVES = [
  ['e1', 'e2'],
  ['e2', 'f3'],
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[learn] base   = ${BASE_URL}`);
  console.log(`[learn] outDir = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditLearnFullGameBot/1.0 (chromium)',
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 300)));

  const results = [];
  const log = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  // Count rendered board arrows. react-chessboard draws each arrow as an SVG
  // <line> / <marker>; count line elements inside any board svg as a proxy.
  const countArrows = async () => {
    try {
      return await page.evaluate(() => {
        const board = document.querySelector('[data-testid="chessboard"], .cg-wrap, [class*="board"]') ?? document.body;
        return board.querySelectorAll('svg line, svg marker, svg polygon[class*="arrow"]').length;
      });
    } catch { return -1; }
  };

  // Dump the in-page forensic audit log (window.__AUDIT__.dump) and return
  // entries whose kind matches `kinds`.
  const dumpAudit = async (kinds) => {
    try {
      const all = await page.evaluate(async () => {
        const a = window.__AUDIT__;
        if (!a || typeof a.dump !== 'function') return [];
        try { return await a.dump(); } catch { return []; }
      });
      return all.filter((e) => kinds.includes(e.kind));
    } catch { return []; }
  };

  const tryMove = async (from, to) => {
    const f = page.locator(`[data-square="${from}"]`).first();
    const t = page.locator(`[data-square="${to}"]`).first();
    if ((await f.count()) === 0 || (await t.count()) === 0) throw new Error(`square missing ${from}/${to}`);
    await f.click({ timeout: 3000 });
    await page.waitForTimeout(180);
    await t.click({ timeout: 3000 });
  };

  // A signature of the occupied squares — changes whenever a piece moves.
  // react-chessboard renders a piece element inside (or referencing) each
  // occupied [data-square]; we hash which squares are occupied.
  const boardSig = async () => {
    try {
      return await page.evaluate(() => {
        const occupied = [];
        document.querySelectorAll('[data-square]').forEach((sq) => {
          const hasPiece = sq.querySelector('[data-piece], img, [draggable="true"], [class*="piece"]') ||
            (sq.getAttribute('data-piece'));
          if (hasPiece) occupied.push(sq.getAttribute('data-square'));
        });
        return occupied.sort().join(',');
      });
    } catch { return ''; }
  };
  const isSquareEmpty = async (square) => {
    try {
      return await page.evaluate((s) => {
        const sq = document.querySelector(`[data-square="${s}"]`);
        if (!sq) return true;
        return !(sq.querySelector('[data-piece], img, [draggable="true"], [class*="piece"]') || sq.getAttribute('data-piece'));
      }, square);
    } catch { return false; }
  };

  try {
    // ── Boot + dismiss onboarding ──────────────────────────────────────
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.waitForTimeout(2500);
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count().catch(() => 0)) {
      await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 5000 }).catch(() => {});
      await calib.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
    log('dashboard boots', true);

    // ── Navigate to Learn via the hub (in-app, no direct goto) ─────────
    await page.goto(`${BASE_URL}/coach/home`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS }).catch(() => {});
    await page.waitForTimeout(2000);
    // Dismiss the "How the Coach works" page-help modal that auto-opens on
    // the hub — it intercepts pointer events on the tiles.
    const hubHelp = page.locator('[data-testid="page-help-modal"]');
    if (await hubHelp.count().catch(() => 0)) {
      await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 4000 }).catch(() => {});
      await hubHelp.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
    }
    const learnTile = page.locator('[data-testid="coach-action-teach"]').first();
    await learnTile.waitFor({ state: 'visible', timeout: 15000 });
    await learnTile.click();
    await page.waitForTimeout(2500);
    // Dismiss any page-help modal on the destination.
    const help = page.locator('[data-testid="page-help-close"]').first();
    if (await help.count().catch(() => 0)) await help.click({ timeout: 3000 }).catch(() => {});
    await page.waitForURL(/\/coach\/teach/, { timeout: 10000 }).catch(() => {});
    log('Learn (/coach/teach) mounts via hub', /\/coach\/teach/.test(page.url()), page.url());

    // Board present?
    await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 15000 });
    log('board is playable from the start', true);

    // Snapshot which black squares (rank 7/8) are occupied BEFORE any move.
    const blackOcc = async () => {
      try {
        return await page.evaluate(() => {
          const out = [];
          document.querySelectorAll('[data-square]').forEach((sq) => {
            const s = sq.getAttribute('data-square') || '';
            if (!/[78]$/.test(s)) return;
            const has = sq.querySelector('[data-piece], img, [draggable="true"], [class*="piece"]') || sq.getAttribute('data-piece');
            if (has) out.push(s);
          });
          return out.sort().join(',');
        });
      } catch { return ''; }
    };
    const blackBefore = await blackOcc();

    // Wait out the coach's kickoff narration — the board is non-interactive
    // (busy) until it finishes, so clicks before that no-op. Poll until the
    // first move registers (e2 empties after e2→e4).
    let boardLive = false;
    let arrowsRightAfterE4 = -1;
    for (let i = 0; i < 8; i++) {
      await tryMove('e2', 'e4').catch(() => {});
      await page.waitForTimeout(700);
      if (arrowsRightAfterE4 < 0) arrowsRightAfterE4 = await countArrows();
      await page.waitForTimeout(1200);
      if (await isSquareEmpty('e2')) { boardLive = true; break; }
      await page.waitForTimeout(2000);
    }
    log('board accepts the student move (e4) after kickoff', boardLive,
      boardLive ? 'e2 emptied → e4 played' : 'board stayed non-interactive');

    // Arrows from the previous coach turn must clear the instant the student
    // moves (handleStudentMove → setArrows([])).
    log('arrows go away on the student move (no piling)', boardLive && arrowsRightAfterE4 <= 1,
      `arrows right after e4 = ${arrowsRightAfterE4}`);

    // The ENGINE must play the coach's reply: after e4 + settle, a black
    // piece (rank 7/8) must have moved. This is the grounding-truth check —
    // the LLM is OUT of move selection; the engine replies.
    let blackMoved = false;
    for (let i = 0; i < 6 && !blackMoved; i++) {
      await page.waitForTimeout(4000);
      const blackNow = await blackOcc();
      blackMoved = blackNow !== blackBefore && blackNow.length > 0;
      console.log(`  engine-reply poll ${i}: blackChanged=${blackMoved}`);
    }
    log('engine plays the coach reply (a black piece moved after e4)', blackMoved,
      blackMoved ? 'black occupancy changed → engine replied' : 'no black move detected');

    // Move SOURCE — confirm the reply came from masters/lichess/Stockfish,
    // NOT the last-resort random fallback (David 2026-06-04).
    const srcEvents = await dumpAudit(['coach-opponent-move-source']);
    const sources = srcEvents.map((e) => (e.summary || '').match(/source=(\S+)/)?.[1]).filter(Boolean);
    const lastSrc = sources[sources.length - 1] ?? 'unknown';
    // 'local' = the local masters DB; 'lichess'/'lichess-games' = live
    // masters/games; 'stockfish-*' = rating-matched engine. Only 'random' is
    // the bad last-resort fallback.
    const goodSource = lastSrc !== 'random' && lastSrc !== 'unknown';
    log('engine reply source is masters/Stockfish (not random)', goodSource,
      sources.length ? `sources=[${sources.join(', ')}]` : 'no source event captured');

    // ── Make a blunder; verify the slip-check RUNS + the "why?" pops up ──
    // Do NOT restart (that resets to the start, where e2 is occupied and the
    // king-walk is illegal). Continue from the e4 position: e2 is empty, so
    // the Bongcloud king-walk (Ke2, Kf3) is legal and craters the eval.
    const waitForStudentTurn = async (prevBlackSig) => {
      for (let i = 0; i < 8; i++) {
        await page.waitForTimeout(2500);
        const now = await blackOcc();
        if (now !== prevBlackSig) return now; // engine moved ⇒ White to move
      }
      return prevBlackSig;
    };
    let promptSeen = false;
    let blackSig = await blackOcc();
    for (const [from, to] of BLUNDER_MOVES) {
      let played = false;
      for (let k = 0; k < 6 && !played; k++) {
        await tryMove(from, to).catch(() => {});
        await page.waitForTimeout(1200);
        played = await isSquareEmpty(from);
        if (!played) await page.waitForTimeout(2000);
      }
      console.log(`  blunder ${from}${to}: played=${played}`);
      for (let p = 0; p < 6 && !promptSeen; p++) {
        await page.waitForTimeout(2000);
        promptSeen = (await page.locator('[data-testid="discussion-prompt"]').count().catch(() => 0)) > 0;
      }
      if (promptSeen) break;
      blackSig = await waitForStudentTurn(blackSig);
    }
    // The slip-check now RUNS (the fix: 'brain' priority, no longer dropped).
    // faucet-slip-detected proves it fired even if the eval drop stayed below
    // the rating-adaptive interjection bar (so no visible prompt).
    const faucetEvents = await dumpAudit(['faucet-slip-detected']);
    log('slip-check runs on the move (faucet fired — the prefetch-dropped fix)',
      faucetEvents.length > 0 || promptSeen,
      `faucet-slip-detected events=${faucetEvents.length}${promptSeen ? ' + prompt visible' : ''}`);
    log('"why did you play that?" question pops up on a blunder', promptSeen,
      promptSeen ? 'discussion-prompt visible' : 'no prompt (could not trigger a scored blunder in the scripted line; logic is unit-tested)');

    log('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
    log('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

    await page.screenshot({ path: join(OUT_DIR, 'final.png'), fullPage: false }).catch(() => {});
  } catch (e) {
    log('FATAL', false, String(e?.message ?? e));
  } finally {
    const pass = results.filter((r) => r.ok).length;
    const report = { base: BASE_URL, startedAt: stamp, pass, total: results.length, results, consoleErrors, pageErrors };
    await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
    console.log(`\n[learn] ${pass}/${results.length} checks passed — report: ${OUT_DIR}/report.json`);
    await browser.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
