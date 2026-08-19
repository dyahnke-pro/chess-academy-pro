#!/usr/bin/env node
/**
 * audit-learn-voice-transcript — play a real game on /coach/teach and write down
 * EVERY line the coach speaks, with the board it was spoken over.
 *
 * David 2026-08-18: *"I think the computed voice is also still bad... Play a
 * game under learn and find all irrelevant computed phrases and cut them out."*
 *
 * The other Learn audits ASSERT things — board truth, side truth, that a tactic
 * got named. All of those can pass on a game whose narration is nonetheless
 * tedious to sit through, because "true" and "worth saying" are different
 * questions and only the first one is checkable. This script asserts almost
 * nothing. It produces the TRANSCRIPT, ply by ply, so the relevance question can
 * be answered by reading what a student actually hears.
 *
 * MUTED. `muteTtsForAudit` — the spoken text comes out of the app's own
 * `coach-narration-spoken` event, which carries the full line, so synthesising
 * it would buy nothing and bill for it.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-learn-voice-transcript.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { clickMove, awaitCoachReply, appEndedGame, sleep } from './audit-lib/board-drive.mjs';
import { pickStudentMove } from './audit-lib/student-player.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const MAX_PLIES = Number(process.env.AUDIT_MAX_PLIES ?? 60);
// Optional scripted student opening — SAN list consumed one per STUDENT turn.
// Each entry is played when legal on the live board and skipped otherwise (the
// coach's replies cannot be scripted, so a scripted move may arrive at a board
// where it no longer applies). Lets a run steer INTO a corpus line so the
// reason lane's firing can be proven E2E, instead of hoping a free game
// wanders onto one of the ~25% of taught plies the checked reasons cover.
const SCRIPT = (process.env.AUDIT_SCRIPT_SANS ?? '').split(/\s+/).filter(Boolean);

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

/** Spoken lines, in order, tagged with the ply they landed on. */
const spoken = [];
let ply = 0;

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* gate absent on this context */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* no help modal */ }
}

/** Drain the listener into the transcript, tagging each new line with the ply
 *  and the FEN in force. Called after every ply so the pairing is right. */
let drained = 0;
function drain(fen) {
  const all = listener.getCapturedEvents();
  for (const e of all.slice(drained)) {
    if (e.kind !== 'coach-narration-spoken') continue;
    const text = (e.summary ?? '').trim();
    if (!text) continue;
    spoken.push({ ply, fen, source: e.source ?? '?', text });
  }
  drained = all.length;
}

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, LOCAL_LISTENER_SECRET]);

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  await page.locator('[data-square]').first().waitFor({ timeout: 45000 });

  const game = new Chess();

  let scriptIdx = 0;
  while (ply < MAX_PLIES && !game.isGameOver()) {
    let move = null;
    if (scriptIdx < SCRIPT.length) {
      const want = SCRIPT[scriptIdx];
      scriptIdx += 1;
      const legal = new Chess(game.fen()).moves({ verbose: true }).find((m) => m.san === want);
      if (legal) move = legal;
      else console.log(`[transcript] scripted ${want} not legal at ply ${ply} — falling back`);
    }
    move = move ?? pickStudentMove(game.fen(), ply);
    if (!move) { console.log(`[transcript] the student had no move at ply ${ply}`); break; }
    const probe = new Chess(game.fen());
    probe.move(move.san);
    const ok = await clickMove(page, move, probe.fen());
    if (!ok) { console.log(`[transcript] click refused at ply ${ply}: ${move.san}`); break; }
    game.move(move.san);
    ply += 1;
    drain(game.fen());
    if (await appEndedGame(page)) break;

    const reply = await awaitCoachReply(page, game, { firstMove: ply === 1 });
    if (!reply) { console.log(`[transcript] no coach reply after ${move.san} (ply ${ply})`); break; }
    game.move(reply);
    ply += 1;
    drain(game.fen());
    if (await appEndedGame(page)) break;
    await sleep(400);
  }
  // Late lines (the warm teaching beat lands after the reply renders).
  await sleep(6000);
  drain(game.fen());

  const dir = `audit-reports/learn-voice-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/transcript.json`, JSON.stringify({ base: BASE, plies: ply, pgn: game.pgn(), spoken, pageErrors }, null, 2));

  console.log(`\n── ${spoken.length} spoken line(s) over ${ply} plies ──`);
  for (const s of spoken) console.log(`ply${String(s.ply).padStart(3)} [${s.source}] ${s.text}`);
  console.log(`\npgn: ${game.pgn()}`);
  console.log(`page errors: ${pageErrors.length}`);
  console.log(`report: ${dir}/transcript.json`);
} finally {
  try { await browser.close(); } catch { /* teardown must not lose the transcript */ }
  try { await listener.stop(); } catch { /* ditto */ }
}
