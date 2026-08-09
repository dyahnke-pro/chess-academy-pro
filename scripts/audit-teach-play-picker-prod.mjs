#!/usr/bin/env node
// Ask to PLAY a family; pick a subline; check a real game started on it.
//
// David 2026-08-09: "add pickers for sublines when player requests an opening
// to be played." The unit gates prove which requests raise a picker and which
// side a tile lands the student on. Only driving it proves the tile actually
// starts a game — the thing that was broken is that the picker never appeared
// on this path at all, which no amount of green service tests would have shown.
//
// Driven by hand per the audit standard: real clicks on the real tiles, the
// overlays dismissed as they appear. MUTED (`muteTtsForAudit`) — same narration
// events, same text, zero synthesis spend.
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { pickStudentMove } from './audit-lib/student-player.mjs';
import OPENINGS_DB from '../src/data/openings-lichess.json' with { type: 'json' };
import { clickMove, awaitCoachReply, outcomeOf, appEndedGame } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `play-picker-${Math.random().toString(36).slice(2, 10)}`;
// A real game runs long; the cap is a runaway guard, not a target.
const MAX_PLIES = Number(process.env.AUDIT_MAX_PLIES ?? 200);
const OUT = `audit-reports/teach-play-picker-${new Date().toISOString().replace(/[:.]/g, '-')}`;

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const OVERLAYS = [
  ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
  ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
];

/** The overlays do NOT all mount at once — the consent gate arrives after the
 *  calibration bubble is answered, so a single pass dismisses two of three and
 *  every later click dies on "intercepts pointer events". Keep sweeping until
 *  a pass finds nothing left. */
async function dismissOverlays(page, rounds = 6) {
  for (let i = 0; i < rounds; i += 1) {
    let found = false;
    for (const [gate, button] of OVERLAYS) {
      if (await page.locator(gate).count().catch(() => 0)) {
        found = true;
        await page.locator(button).first().click({ timeout: 8000 }).catch(() => {});
        await page.locator(gate).first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
      }
    }
    if (!found && i > 0) return;
    await sleep(1500);
  }
}

/** The React textarea needs REAL key events — `fill` leaves send disabled. */
async function ask(page, text) {
  await dismissOverlays(page, 3);
  const box = page.locator('textarea').first();
  await box.waitFor({ state: 'visible', timeout: 30_000 });
  await box.click({ timeout: 8000 });
  await box.pressSequentially(text, { delay: 12 });
  await box.press('Enter');
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const results = [];
  const check = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript((id) => { localStorage.setItem('auditRunId', id); }, RUN_ID);
  const page = await ctx.newPage();
  const pageErrors = [];
  const tiers = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  // WHICH TIER taught each ply, straight from the app's own fact bundle. The
  // question "are the corpus notes firing" was answered three times by hand
  // before the app was simply asked.
  page.on('request', (req) => {
    if (!req.url().includes('/api/audit')) return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      for (const e of (body.events ?? body.entries ?? [body])) {
        if (e.source !== 'CoachTeachPage.turnFacts' || !e.details) continue;
        const t = JSON.parse(e.details).teaching;
        if (t) tiers.push(t);
      }
    } catch { /* not ours */ }
  });

  console.log(`[audit-run-id] ${RUN_ID}`);
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  await dismissOverlays(page);

  // ── 1. A FAMILY raises the picker, in PLAY intent ──────────────────────
  await ask(page, 'play the Sicilian against me');
  const picker = page.locator('[data-testid="line-picker"]');
  // A cold deploy's first canonicalization runs long; 60s was marginal and the
  // first run of this audit failed on a picker the probe then saw at ~35s.
  await picker.waitFor({ state: 'visible', timeout: 150_000 }).catch(() => {});
  const raised = await picker.count().catch(() => 0);
  check('a request to PLAY a family raises the subline picker', raised > 0);
  if (!raised) {
    writeFileSync(`${OUT}/report.json`, JSON.stringify({ runId: RUN_ID, results, pageErrors }, null, 2));
    await browser.close();
    process.exit(1);
  }

  const intent = await picker.getAttribute('data-picker-intent');
  check('the picker knows it is choosing a line to PLAY', intent === 'play', `intent=${intent}`);

  const header = (await picker.locator('div').first().innerText().catch(() => '')).trim();
  check('the header says play, not learn', /to play/i.test(header), header.slice(0, 60));

  // The Play/Face toggle is a teaching choice — meaningless once the student
  // has said they want to play the line.
  const toggleShown = await picker.locator('[data-testid="line-picker-mode-play"]').isVisible().catch(() => false);
  check('the learn/face toggle is hidden on a play pick', !toggleShown);

  // Keyed on the tile's own attribute rather than the shared testid prefix,
  // which the mode toggle's buttons also carry.
  const tiles = picker.locator('[data-fullname]');
  const tileCount = await tiles.count();
  check('it offers real sublines to choose between', tileCount >= 2, `${tileCount} tiles`);

  // ── 2. TAPPING A TILE STARTS A GAME on that line ───────────────────────
  const chosen = await tiles.first().getAttribute('data-fullname');
  await tiles.first().click({ timeout: 10_000, force: true });
  check('a tile is tappable', Boolean(chosen), chosen ?? 'no name');

  await picker.waitFor({ state: 'detached', timeout: 20_000 }).catch(() => {});
  check('the picker closes on the pick', (await picker.count().catch(() => 1)) === 0);

  // The game is real when the coach says whose side it is, and — because the
  // Sicilian is Black's and it was asked for "against me" — the student is
  // White. Read from the transcript rather than inferred.
  let started = '';
  for (let i = 0; i < 30 && !started; i += 1) {
    const text = await page.locator('body').innerText().catch(() => '');
    const m = /You're (White|Black) — (?:I'll play the|play the) ([^\n.]+)/.exec(text);
    if (m) started = `${m[1]}|${m[2]}`;
    if (!started) await sleep(2000);
  }
  check('tapping a subline STARTS A GAME', Boolean(started), started || 'no game-start line in the transcript');
  const [side, named] = started.split('|');
  check(
    'the game is on the line that was picked, not the family',
    Boolean(named) && !/^Sicilian Defense$/i.test(named.trim()),
    named ?? '—',
  );
  check(
    '"against me" put the student on the other side of it',
    side === 'White',
    `student=${side}`,
  );

  // ── 3. PLAY THE PICKED LINE TO THE END ─────────────────────────────────
  //
  // David 2026-08-09: "make sure to play a game to the end." A picker that
  // opens a game and a game that finishes are different claims, and only the
  // second one says the pick produced a real playable session rather than a
  // board that stalls three moves in.
  // 🔒 PLAY THE OPENING YOU ASKED FOR. The first version of this drove a
  // material-and-development bot from move one, so a run that asked for the
  // Dragon opened 1.Nc3 and never played e4 — the Dragon existed only on the
  // coach's side of the board. Every conclusion drawn from that run about how
  // fast a game leaves theory was really a measurement of the bot refusing to
  // play the opening. The student now plays the chosen line's own moves while
  // the game is on it, which is what the person who tapped that tile would do.
  const dbEntry = (Array.isArray(OPENINGS_DB) ? OPENINGS_DB : [])
    .find((e) => e.name === chosen);
  const LINE = dbEntry ? dbEntry.pgn.split(/\s+/).filter(Boolean) : [];
  console.log(`   line: ${LINE.length ? LINE.join(' ') : 'no DB entry for this tile'}`);
  const lineMove = (history) => {
    if (history.length >= LINE.length) return null;
    for (let i = 0; i < history.length; i += 1) if (LINE[i] !== history[i]) return null;
    return LINE[history.length];
  };

  const chess = new Chess();
  // The coach opens when the student is Black. Here the student is White, so
  // the first move is ours — but read the board first either way rather than
  // assume whose turn it is.
  for (let i = 0; i < 20; i += 1) {
    const reply = await awaitCoachReply(page, chess, { firstMove: true });
    if (reply) { chess.move(reply); break; }
    if (side === 'White') break;
    await sleep(2000);
  }

  let plies = chess.history().length;
  let stalledAt = null;
  let appOutcome = null;
  while (plies < MAX_PLIES && !chess.isGameOver()) {
    let mine = null;
    const onLine = lineMove(chess.history());
    if (onLine) {
      const m = chess.moves({ verbose: true }).find((v) => v.san === onLine);
      if (m) mine = { from: m.from, to: m.to, san: m.san };
    }
    mine ??= pickStudentMove(chess.fen(), chess.history().length);
    if (!mine) { stalledAt = 'no legal student move'; break; }
    const probe = new Chess(chess.fen());
    probe.move(mine.san);
    const landed = await clickMove(page, mine, probe.fen());
    if (!landed) {
      // The audit's own dropped click, not the coach's silence. Said plainly
      // so a stall is never mis-attributed.
      await page.screenshot({ path: `${OUT}/rejected-ply-${plies + 1}.png`, fullPage: true }).catch(() => {});
      stalledAt = `the board did not accept ${mine.san} at ply ${plies + 1}`;
      break;
    }
    chess.move(mine.san);
    plies += 1;
    if (chess.isGameOver()) break;

    const reply = await awaitCoachReply(page, chess, { firstMove: plies === 1 });
    if (!reply) {
      // Before calling it a stall, ask the app. A finished game hands off to
      // post-game review, whose progress screen replaces the board — so the
      // board going still is what a COMPLETED game looks like from here.
      const ended = await appEndedGame(page);
      if (ended) { appOutcome = ended; break; }
      // WHY it stopped, in the same run. A silent stall is the least
      // actionable failure there is, and re-running to find out costs another
      // full game. The likeliest benign cause is that the APP ended the game
      // (overlay up, no more moves to render) while the mirror still thinks
      // it is someone's turn — so ask the page before calling it a stall.
      const body = await page.locator('body').innerText().catch(() => '');
      const over = /game over|checkmate|stalemate|draw|resign|you (?:win|won|lost)/i.test(body);
      await page.screenshot({ path: `${OUT}/stall-ply-${plies}.png`, fullPage: true }).catch(() => {});
      // The transcript renders NEWEST FIRST, so the tail of the page is the
      // oldest thing on it. Taking `slice(-1500)` handed back the opening
      // greeting and read as though the surface had reset.
      writeFileSync(
        `${OUT}/stall.txt`,
        `ply ${plies}\nfen ${chess.fen()}\nappSaysOver=${over}\n\n--- newest first ---\n${body.slice(0, 2500)}`,
      );
      stalledAt = `coach stopped replying at ply ${plies}${over ? ' (the app says the game is over)' : ''}`;
      break;
    }
    chess.move(reply);
    plies += 1;
    if (plies % 10 === 0) console.log(`   …${plies} plies`);
  }

  // The mirror sees a natural end only when the LAST move it played made one.
  // The app is the other witness, and on this surface the more common one: the
  // game ends, review takes the screen, and the board stops changing.
  const outcome = appOutcome ?? outcomeOf(chess);
  const finished = chess.isGameOver() || Boolean(appOutcome);
  console.log(`   game: ${plies} plies, ${outcome}${stalledAt ? ` (${stalledAt})` : ''}`);
  check(
    'the picked line plays a whole game through to a natural end',
    finished,
    `${plies} plies, ${outcome}${stalledAt ? ` — ${stalledAt}` : ''}`,
  );
  check('the coach answered every move', stalledAt === null, stalledAt ?? 'no stall');

  // Did the game actually BECOME the opening that was picked?
  const onLinePlies = (() => {
    const h = chess.history(); let n = 0;
    while (n < h.length && n < LINE.length && h[n] === LINE[n]) n += 1;
    return n;
  })();
  check(
    'the game actually played the line that was picked',
    LINE.length > 0 && onLinePlies === LINE.length,
    `${onLinePlies}/${LINE.length} plies of ${chosen}`,
  );

  const mix = tiers.reduce((acc, t) => { acc[t] = (acc[t] ?? 0) + 1; return acc; }, {});
  console.log(`   teaching tiers: ${Object.entries(mix).map(([k, v]) => `${k}=${v}`).join(' ') || 'none recorded'}`);

  // ── 4. AN ALREADY-NAMED LINE STILL STARTS IMMEDIATELY ──────────────────
  // The gate that keeps this from costing a tap for a student who already
  // said what they wanted.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  await dismissOverlays(page);
  await ask(page, 'play the Latvian Gambit against me');
  let direct = '';
  for (let i = 0; i < 30 && !direct; i += 1) {
    const text = await page.locator('body').innerText().catch(() => '');
    if (/You're (White|Black) —/.test(text)) direct = /You're (White|Black) —/.exec(text)[1];
    if (!direct) await sleep(2000);
  }
  const pickerAppeared = await page.locator('[data-testid="line-picker"]').count().catch(() => 0);
  check('a named line starts with no extra tap', Boolean(direct) && pickerAppeared === 0, `student=${direct || '—'}`);

  await page.screenshot({ path: `${OUT}/final.png`, fullPage: true }).catch(() => {});
  await browser.close();

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n──────── ${passed}/${results.length} ────────`);
  console.log(`report ${OUT}/report.json`);
  writeFileSync(`${OUT}/report.json`, JSON.stringify({
    runId: RUN_ID, base: BASE, results, pageErrors,
    picked: chosen, studentSide: side, plies, outcome, pgn: chess.pgn(),
    line: LINE, onLinePlies, teachingTiers: mix,
  }, null, 2));
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
