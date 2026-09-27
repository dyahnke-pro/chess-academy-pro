#!/usr/bin/env node
/**
 * audit-search-depth-prod
 * -----------------------
 * The ASSERT half of `searchUntilStable` (David 2026-09-27: "Can we algo the
 * stockfish depth?"). The depth computer emits one `search-depth` row per
 * search; this audit drives a real question on /coach/teach and holds the
 * contract on those rows, off the app's own events (muted, route-captured).
 *
 * Position: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6, White to move, played on the real
 * board with the coach's replies dictated.
 *
 *   SD1  SEARCH DEPTH emitted — a candidate question produced a row
 *   SD2  "Is Bxf7+ sound?" was searched as a SACRIFICE, "What if I play d3?"
 *        as a QUESTION — the purpose follows the board (the bishop is left
 *        en prise), not the wording
 *   SD3  the sacrifice had to reach a HIGHER floor than the quiet move — the
 *        whole point of the policy; equal floors mean the sharpness/purpose
 *        split is not reaching the engine
 *   SD4  every row either settled or names why not, and an UNSETTLED search's
 *        answer said so ("hadn't settled") — a verdict off a search that was
 *        still changing its mind must never read as fact
 *
 * AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-search-depth-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { enableAuditCapture } from './audit-lib/enable-audit-capture.mjs';
import { clickMove, sleep } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const LINE = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'];

const events = [];
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(enableAuditCapture);
const page = await ctx.newPage();
await page.route('**/api/audit-stream**', async (route) => {
  const req = route.request();
  if (req.method() === 'POST') {
    try {
      const parsed = JSON.parse(req.postData() || '');
      for (const e of (Array.isArray(parsed) ? parsed : parsed.events || [parsed])) events.push(e);
    } catch { /* ignore */ }
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
});

const results = [];
const record = (id, pass, detail) => {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} — ${detail}`);
};

async function ask(text) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ state: 'visible', timeout: 30_000 });
  for (let i = 0; i < 90 && await box.isDisabled().catch(() => false); i++) await sleep(1000);
  await box.click();
  await box.pressSequentially(text, { delay: 12 });
  await page.keyboard.press('Enter');
}

async function lastAnswer() {
  return (await page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
}

/** Wait for a NEW `search-depth` row after `mark`, up to `ms`. */
async function nextRow(mark, ms) {
  for (let t = 0; t < ms; t += 500) {
    const row = events.slice(mark).find((e) => e?.kind === 'search-depth');
    if (row) { try { return JSON.parse(row.details); } catch { return null; } }
    await sleep(500);
  }
  return null;
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await sleep(4000);
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count()) await allow.first().click().catch(() => {});

  // Play the line: the student's moves on the board, the coach's by dictation.
  const chess = new Chess();
  for (let i = 0; i < LINE.length; i += 2) {
    if (LINE[i + 1]) await ask(`play ${LINE[i + 1]}`);
    const m = chess.move(LINE[i]);
    await clickMove(page, m, chess.fen());
    if (LINE[i + 1]) {
      chess.move(LINE[i + 1]);
      for (let t = 0; t < 45; t++) {
        const board = await page.evaluate(() => document.querySelectorAll('[data-piece]').length).catch(() => 0);
        if (board && (await page.locator('[data-testid="chat-text-input"]').isEnabled().catch(() => false))) break;
        await sleep(1000);
      }
      await sleep(3000);
    }
  }

  // ── The sacrifice question ────────────────────────────────────────────────
  const m1 = events.length;
  await ask('Is Bxf7+ sound?');
  const sac = await nextRow(m1, 60_000);
  await sleep(4000);
  const sacAnswer = await lastAnswer();

  // ── The quiet question ────────────────────────────────────────────────────
  const m2 = events.length;
  await ask('What if I play d3?');
  const quiet = await nextRow(m2, 60_000);
  await sleep(4000);
  const quietAnswer = await lastAnswer();

  record('SD1 SEARCH DEPTH emitted', !!sac && !!quiet,
    `sacrifice row ${sac ? 'present' : 'MISSING'}, quiet row ${quiet ? 'present' : 'MISSING'}`);
  record('SD2 purpose follows the board', sac?.purpose === 'sacrifice' && quiet?.purpose === 'question',
    `Bxf7+ → ${sac?.purpose ?? '?'}, d3 → ${quiet?.purpose ?? '?'}`);
  record('SD3 the sacrifice searched to a higher floor', !!sac && !!quiet && sac.minDepth > quiet.minDepth,
    `floors: sacrifice ${sac?.minDepth ?? '?'} (reached ${sac?.depthReached ?? '?'}), quiet ${quiet?.minDepth ?? '?'} (reached ${quiet?.depthReached ?? '?'})`);
  const honest = (row, answer) => !row || row.stable || (/hadn't settled/.test(answer) && ['budget', 'max-depth'].includes(row.reason));
  record('SD4 an unsettled search is said as a first read', honest(sac, sacAnswer) && honest(quiet, quietAnswer),
    `sac ${sac?.stable ? 'settled' : `unsettled (${sac?.reason})`}; quiet ${quiet?.stable ? 'settled' : `unsettled (${quiet?.reason})`}`);
  console.log(`\nBxf7+ → ${sacAnswer.slice(0, 300)}\nd3 → ${quietAnswer.slice(0, 300)}`);
  for (const r of [sac, quiet]) if (r) console.log(`  ${r.purpose}: ${r.steps.map((s) => `d${s.depth}:${s.bestMove}@${s.win.toFixed(1)}`).join(' ')}`);
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green`);
  if (failed.length) process.exitCode = 1;
}
