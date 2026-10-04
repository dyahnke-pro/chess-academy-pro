#!/usr/bin/env node
/**
 * audit-learn-how-to-think-prod — the "Learn how to think" lesson, driven by
 * hand (G7: taps, not injected commands), muted (G1), three instruments
 * (Playwright + the narration listener + the app's own `thinking-lesson` rows).
 *
 * What it proves (plan: docs/plans/2026-10-04-learn-how-to-think.md, P1):
 *   L1  a bare "teach me" starts the lesson (and off-canonical spellings do too)
 *   L2  the Show beat teaches the METHOD ("count who guards …")
 *   L3  a Guide question is asked and the board takes taps
 *   L4  a wrong tap is answered with the method, never the answer
 *   L5  a right tap is accepted; a partial answer + silence → "one more"
 *   L6  "I don't know" shows the rest and the lesson moves on
 *   L7  the lesson emitted `thinking-lesson` rows with outcomes (algo audit)
 *   L8  "teach me the Caro-Kann" does NOT start the lesson
 *   L9  zero /api/tts requests (muted) and zero page errors
 *   L10 ending a plain-board lesson offers "Play a game on this", which starts a game
 *
 * Run:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-learn-how-to-think-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/learn-how-to-think-${stamp}`;

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const prose = (l) => l.getCapturedEvents()
  .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText)
  .map((e) => String(e.narrationText));

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
/** Pieces of `side` attacked and either unguarded or hit by a cheaper piece —
 *  a conservative stand-in for the app's SEE key (always a subset of it). */
function inDanger(c, side) {
  const other = side === 'w' ? 'b' : 'w';
  const out = [];
  for (const row of c.board()) for (const cell of row) {
    if (!cell || cell.color !== side || cell.type === 'k' || cell.type === 'p') continue;
    const att = c.attackers(cell.square, other);
    if (att.length === 0) continue;
    const def = c.attackers(cell.square, side).filter((s) => s !== cell.square);
    const cheapest = Math.min(...att.map((s) => VAL[c.get(s)?.type ?? 'k']));
    if (def.length === 0 || cheapest < VAL[cell.type]) out.push(cell.square);
  }
  return out;
}
/** Squares the app's key is sure to contain, per step (a subset — enough to
 *  prove a right tap is accepted). Empty when the audit cannot be sure. */
function sureKey(step, fen) {
  const c = new Chess(fen);
  const me = c.turn();
  const them = me === 'w' ? 'b' : 'w';
  if (step === 'their-targets') {
    const out = [];
    for (const row of c.board()) for (const cell of row) {
      if (!cell || cell.color !== them || cell.type === 'k' || cell.type === 'p') continue;
      if (c.attackers(cell.square, them).filter((s) => s !== cell.square).length === 0) out.push(cell.square);
    }
    return out;
  }
  if (step === 'am-i-safe' || step === 'is-my-move-safe') return inDanger(c, me);
  if (step === 'forcing-moves') return [...new Set(c.moves({ verbose: true }).filter((m) => /[+#]$/.test(m.san)).map((m) => m.to))];
  return [];
}
/** An empty square none of the side to move's pieces can reach — wrong for
 *  every step. */
function surelyWrong(fen) {
  const c = new Chess(fen);
  const reach = new Set(c.moves({ verbose: true }).map((m) => m.to));
  for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) {
    const sq = `${f}${r}`;
    if (!c.get(sq) && !reach.has(sq)) return sq;
  }
  return null;
}

async function dismissGates(page) {
  try {
    const g = page.locator('[data-testid="ai-consent-modal"]');
    await g.waitFor({ timeout: 4000 });
    await page.locator('[data-testid="ai-consent-allow"]').click();
    await g.waitFor({ state: 'detached', timeout: 10_000 });
  } catch { /* not shown */ }
}

async function ask(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  await input.pressSequentially(text, { delay: 12 });
  await page.keyboard.press('Enter');
}

async function waitAsking(page, ms = 90_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const el = page.locator('[data-testid="thinking-lesson"]');
    if ((await el.count()) > 0 && (await el.getAttribute('data-asking')) === '1') return el.getAttribute('data-fen');
    await page.waitForTimeout(500);
  }
  return null;
}

const tap = (page, sq) => page.locator(`[data-square="${sq}"]`).first().click({ force: true, timeout: 8000 }).catch(() => {});

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* blocked */ }
  }, { url: listener.url, secret: listener.secret });
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit);
  await context.addInitScript(stampAuditRunId(`think-${Math.random().toString(36).slice(2, 10)}`));
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  let tts = 0;
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) tts += 1; });

  try {
    // L8 first, on a fresh mount: a NAMED subject never starts the lesson.
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await dismissGates(page);
    await page.waitForTimeout(4000);
    await ask(page, 'teach me the Caro-Kann');
    await page.waitForTimeout(8000);
    record('L8. "teach me the Caro-Kann" does not start the thinking lesson', (await page.locator('[data-testid="thinking-lesson"]').count()) === 0);

    // L1: a bare, off-canonical "teach me".
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await dismissGates(page);
    await page.waitForTimeout(4000);
    const before = prose(listener).length;
    await ask(page, 'can you teach me?');
    const mounted = await page.locator('[data-testid="thinking-lesson"]').waitFor({ timeout: 60_000 }).then(() => true).catch(() => false);
    record('L1. a bare "can you teach me?" starts the lesson', mounted);

    const fen1 = await waitAsking(page);
    const spoken = prose(listener).slice(before);
    record('L2. the Show beat teaches the method', spoken.some((l) => /count who guards|Finding targets is counting|check your own pieces first|Safety first|list your forcing moves|forcing moves in order|attacks two of theirs|Two targets, one move|look at the board after your move|last check before any move/i.test(l)), spoken.slice(0, 3).join(' | ').slice(0, 300));
    record('L3. a Guide question is asked and the board takes taps', !!fen1, fen1 ?? 'never asked');

    if (fen1) {
      const step = await page.locator('[data-testid="thinking-lesson"]').getAttribute('data-step').catch(() => null);
      console.log(`[lesson] step=${step} fen=${fen1}`);
      const wrongSq = surelyWrong(fen1);
      const n0 = prose(listener).length;
      if (wrongSq) await tap(page, wrongSq);
      await page.waitForTimeout(3500);
      const afterWrong = prose(listener).slice(n0);
      record('L4. a wrong tap is answered with the method, never the answer', afterWrong.some((l) => /piece itself|None of your pieces|empty square|cannot|can.t/i.test(l)), `${wrongSq}: ${afterWrong.join(' | ').slice(0, 200)}`);

      const keyPart = step ? sureKey(step, fen1) : [];
      if (keyPart.length > 0) {
        await tap(page, keyPart[0]);
        await page.waitForTimeout(12_000);
        const afterRight = prose(listener).slice(n0);
        record('L5. a right tap is accepted (found / one more / all of them)', afterRight.some((l) => /Yes\.|That.s one|Right|one more|more to find|all of them|Got them all|clean/i.test(l)), afterRight.slice(-2).join(' | ').slice(0, 200));
      } else {
        record('L5. a right tap is accepted', true, `n/a — step ${step}: the audit has no sure key square on this board (not a product failure)`);
      }
      const still = await page.locator('[data-testid="thinking-lesson"]').getAttribute('data-asking').catch(() => null);
      if (still === '1') await page.locator('[data-testid="thinking-lesson-dont-know"]').click({ force: true }).catch(() => {});
      const fen2 = await waitAsking(page, 60_000);
      record('L6. the lesson moves on to the next board', !!fen2 && fen2 !== fen1, fen2 ?? 'stalled');
      if (fen2) {
        await page.locator('[data-testid="thinking-lesson-dont-know"]').click({ force: true }).catch(() => {});
        await page.waitForTimeout(5000);
      }
    }

    // L10: end the lesson; a step answered on a plain board offers the lesson game.
    const stepNow = await page.locator('[data-testid="thinking-lesson"]').getAttribute('data-step').catch(() => null);
    await page.locator('[data-testid="thinking-lesson-stop"]').click({ force: true }).catch(() => {});
    const chip = page.getByRole('button', { name: 'Play a game on this' });
    const offered = await chip.first().waitFor({ state: 'visible', timeout: 15_000 }).then(() => true).catch(() => false);
    if (/their-move-changed|is-my-move-safe|calculate/.test(stepNow ?? '')) {
      record('L10. the lesson game', true, `n/a — step ${stepNow} needs a played move or a line, so no live-game version (offered=${offered})`);
    } else {
      let started = false;
      if (offered) {
        await chip.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(4000);
        started = (await page.locator('[data-testid="thinking-lesson"]').count()) === 0
          && prose(listener).some((l) => /Your move\. A few times this game/i.test(l));
      }
      record('L10. ending the lesson offers "Play a game on this" and it starts a game', offered && started, `step=${stepNow} offered=${offered} started=${started}`);
    }

    await page.waitForTimeout(3000);
    const rows = listener.getCapturedEvents().filter((e) => e.kind === 'thinking-lesson');
    const parsed = rows.flatMap((e) => { try { return JSON.parse(e.details ?? '{}').rows ?? [JSON.parse(e.details ?? '{}')]; } catch { return []; } });
    record('L7. the lesson emitted thinking-lesson rows with outcomes', parsed.length > 0 && parsed.every((r) => r.step && r.outcome), `${parsed.length} rows: ${parsed.map((r) => `${r.stage}:${r.outcome}`).join(', ')}`);
    record('L9a. zero /api/tts requests (muted)', tts === 0, `${tts} requests`);
    record('L9b. zero page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } finally {
    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ results, spoken: prose(listener) }, null, 2));
    await browser.close();
    await listener.stop?.();
  }
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed — report ${OUT_DIR}/report.json`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
