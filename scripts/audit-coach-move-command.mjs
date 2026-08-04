#!/usr/bin/env node
/**
 * audit-coach-move-command — post-deploy audit of the dictated-coach-move
 * channel + the step-narration voicing fix (2026-07-12, David's live Benko
 * session: "Coach can't play d4 when I told it to" + every coach reply
 * speaking the stock "I can't verify that precisely" line).
 *
 * Scenarios (interactive, per G7 — off-canonical forms probed too):
 *   1. "play d4" on a fresh board (student=White) → SIDE SWAP: the coach
 *      takes White, d4 lands on the board, orientation flips to black.
 *   2. Fresh context: flip the color toggle to Black → the coach OPENS
 *      automatically (a white piece has moved within the wait window).
 *   3. Off-canonical dictation: "ok now play knight to f3" → Nf3 plays.
 *   4. "play the Benko Gambit" must NOT move any piece (opening request,
 *      not a move command).
 *   5. Step-narration: play a student move, wait for the coach's reply
 *      narration — the transcript must NOT contain "can't verify".
 *   6. Mid-game dictation: "play Nc3" on the student's turn → armed; after
 *      the student's next move the coach's reply IS Nc3.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-coach-move-command.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-move-command-${stamp}`;

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function fenOnBoard(page) {
  // Read the live position from the DOM: every piece img alt/testid isn't
  // stable across sets, so read the square occupancy via data-square nodes
  // that contain a piece element.
  return page.evaluate(() => {
    const squares = {};
    for (const el of document.querySelectorAll('[data-square]')) {
      const sq = el.getAttribute('data-square');
      const piece = el.querySelector('[data-piece]')?.getAttribute('data-piece') ?? (el.querySelector('img, svg') ? '?' : null);
      if (sq && piece) squares[sq] = piece;
    }
    return squares;
  });
}

async function clickMove(page, from, to) {
  await page.locator(`[data-square="${from}"]`).first().click({ force: true });
  await page.waitForTimeout(250);
  await page.locator(`[data-square="${to}"]`).first().click({ force: true });
}

async function send(page, text) {
  const input = page.locator('textarea, input[placeholder*="sk" i], input[placeholder*="Ask" i]').first();
  await input.waitFor({ state: 'visible', timeout: 15_000 });
  await input.fill(text);
  await input.press('Enter');
}

async function transcriptText(page) {
  return page.evaluate(() => document.body.innerText);
}

async function waitFor(pred, timeoutMs, pollMs = 500) {
  const start = Date.now();
  for (;;) {
    const v = await pred();
    if (v) return v;
    if (Date.now() - start > timeoutMs) return null;
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

async function freshTeachPage(ctx) {
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000); // greeting + board mount
  return page;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });

  const newCtx = async () => {
    const ctx = await browser.newContext({
      ...sandboxContextOptions(),
      viewport: { width: 414, height: 896 },
      userAgent: 'AuditCoachMoveCmdBot/1.0 (chromium)',
    });
    await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
    await ctx.addInitScript(() => {
      const sweep = () => {
        const allow = document.querySelector('[data-testid="ai-consent-allow"]');
        if (allow instanceof HTMLElement) allow.click();
      };
      const start = () => {
        if (!document.body) { setTimeout(start, 50); return; }
        new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true });
        sweep();
      };
      start();
      setInterval(sweep, 400);
    });
    return ctx;
  };

  // ── Scenario 1+3+4+5+6 in one session ─────────────────────────────────
  {
    const ctx = await newCtx();
    const page = await freshTeachPage(ctx);

    // 4 first (board must stay untouched): opening request is NOT a command.
    await send(page, 'play the Benko Gambit');
    await page.waitForTimeout(5000);
    let sq = await fenOnBoard(page);
    record('opening request does not move the board', !!sq.e2 && !!sq.d2 && !sq.d4, `d2=${sq.d2 ?? '∅'} d4=${sq.d4 ?? '∅'}`);

    // 1: "play d4" → side swap + d4 on the board.
    await send(page, 'play d4');
    const d4Landed = await waitFor(async () => {
      const s = await fenOnBoard(page);
      return s.d4 && !s.d2 ? s : null;
    }, 15_000);
    record('"play d4" — coach takes White and plays d4', !!d4Landed, d4Landed ? 'd4 occupied, d2 empty' : 'd4 never landed');

    // 5: student (now Black) replies Nf6; coach must reply + narration must
    // not stock-out with "can't verify".
    if (d4Landed) {
      const before = await transcriptText(page);
      const cantVerifyBefore = (before.match(/can't verify/gi) ?? []).length;
      await clickMove(page, 'g8', 'f6');
      const coachReplied = await waitFor(async () => {
        const s = await fenOnBoard(page);
        // any second white move: c4/Nf3/g3/e3/Bf4… detect by counting white
        // pawns/pieces off their home squares beyond d-pawn
        return (s.c4 || s.f3 || s.g3 || s.e3 || s.f4 || s.c3 || s.d5) ? s : null;
      }, 45_000, 1000);
      record('coach replies to the student move', !!coachReplied);
      await page.waitForTimeout(8000); // let the narration land
      const after = await transcriptText(page);
      const cantVerifyAfter = (after.match(/can't verify/gi) ?? []).length;
      record('no "can\'t verify" stock-out on the narration turn', cantVerifyAfter <= cantVerifyBefore, `before=${cantVerifyBefore} after=${cantVerifyAfter}`);

      // 6: dictate the coach's NEXT reply mid-game, then move and verify.
      await send(page, 'play Nc3');
      await page.waitForTimeout(4000);
      const armedText = await transcriptText(page);
      record('mid-game dictation acknowledged', /after your move|I'll play/i.test(armedText));
      await clickMove(page, 'e7', 'e6');
      const nc3 = await waitFor(async () => {
        const s = await fenOnBoard(page);
        return s.c3 && String(s.c3).toLowerCase().includes('n') ? s : (s.c3 === '?' ? s : null);
      }, 45_000, 1000);
      record('dictated pending move played as the coach reply (Nc3)', !!nc3, nc3 ? 'knight on c3' : 'c3 empty/not knight');
    }
    await ctx.close();
  }

  // ── Scenario 3: off-canonical spoken-form dictation, fresh context ────
  {
    const ctx = await newCtx();
    const page = await freshTeachPage(ctx);
    await send(page, 'ok now play knight to f3');
    const nf3 = await waitFor(async () => {
      const s = await fenOnBoard(page);
      return s.f3 && !s.g1 ? s : null;
    }, 15_000);
    record('"ok now play knight to f3" — Nf3 plays (side swap)', !!nf3, nf3 ? 'f3 occupied, g1 empty' : 'Nf3 never landed');
    await ctx.close();
  }

  // ── Scenario 2: flip to Black on a fresh board → coach auto-opens ─────
  {
    const ctx = await newCtx();
    const page = await freshTeachPage(ctx);
    const blackBtn = page.locator('[data-testid="color-black-btn"]');
    await blackBtn.waitFor({ state: 'visible', timeout: 15_000 });
    await blackBtn.click({ force: true });
    const opened = await waitFor(async () => {
      const s = await fenOnBoard(page);
      // any white first move: a vacated white home square OR a center landing
      const vacated = !s.e2 || !s.d2 || !s.c2 || !s.g1 || !s.b1 || !s.g2 || !s.b2 || !s.f2;
      return vacated ? s : null;
    }, 20_000, 1000);
    record('flip to Black on fresh board — coach opens automatically', !!opened);
    await ctx.close();
  }

  await browser.close();
  const passed = results.filter((r) => r.ok).length;
  const report = { baseUrl: BASE_URL, at: new Date().toISOString(), passed, total: results.length, results };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\n[coach-move-command] ${passed}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
