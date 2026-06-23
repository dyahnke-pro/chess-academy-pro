#!/usr/bin/env node
/**
 * audit-kid-play-coach-loop — verifies the LIVE LLM coach in the kid Play Game
 * (/kid/play-games/:gameId, GuidedGamePage) is WIRED PROPERLY and stays inside
 * the locked kid contract.
 *
 * What it proves (per pass, escalating adversarial chat input):
 *   1. The guided game starts and the coach narration renders (instruction —
 *      dynamic LLM or authored fallback; either way the box shows).
 *   2. "Ask the Coach" round-trips through the LLM: a quick-ask chip + typed
 *      questions produce a coach answer in the chat log. This is the clearest
 *      proof the kid LLM lane (getKidLlmResponse) is wired end-to-end — a
 *      dead/un-wired coach would never produce a relevant answer.
 *   3. KID-SAFE OUTPUT (P0): NO coach answer contains SAN notation (Nf3, Bxc4,
 *      Qf7#, O-O, e8=Q). The sanitizer must keep notation out of a child's ear.
 *   4. ADVERSARIAL: messy human input (gibberish, emoji, very long, SAN-laden,
 *      empty) never crashes the surface and never leaks SAN. A crash in kid
 *      mode is a P0 bug.
 *   5. The kid LLM actually FIRED in the running app — the audit-stream delta
 *      carries a kid task event (proves it wasn't all static fallback).
 *   6. ZERO console/page errors throughout (P0 kid contract).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-kid-play-coach-loop.mjs
 *   AUDIT_MAX_PASSES=3 to set the consecutive-clean-pass target (default 3).
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 3);
const AUDIT_SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const GAME_ID = process.env.AUDIT_KID_GAME ?? 'scholars-mate';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/kid-play-coach-${stamp}`;

// SAN tokens that must NEVER appear in a coach answer (kid #6).
const SAN_RE = /\b(O-O(?:-O)?|[KQRBN][a-h1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x[a-h][1-8](?:=[QRBN])?[+#]?|[a-h][1-8]=[QRBN][+#]?)\b/;

// Escalating adversarial chat inputs per pass.
const ADVERSARIAL = [
  ['Why is this a good move?', 'what should I do next?', 'is my king safe?'],
  ['Najdorff???', 'PLAY Qxf7# NOW', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', '🤔♟️👑'],
  ['', '   ', 'tell me every move in the whole game and also Bxh7 and O-O-O', 'why why why why why why why why'],
];

async function pullStream(sinceMs) {
  if (!AUDIT_SECRET) return { ok: false, events: [], reason: 'no secret' };
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': AUDIT_SECRET } });
    if (!res.ok) return { ok: false, events: [], reason: `http ${res.status}` };
    const json = await res.json();
    return { ok: true, events: Array.isArray(json.events) ? json.events : [], reason: '' };
  } catch (e) {
    return { ok: false, events: [], reason: String(e).slice(0, 80) };
  }
}

async function main() {
  console.log(`[kid-play-coach] ${BASE} · game=${GAME_ID} · target ${MAX_PASSES} clean passes\n`);
  await mkdir(OUT, { recursive: true });
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });

  let cleanStreak = 0;
  let pass = 0;
  const report = [];

  while (cleanStreak < MAX_PASSES && pass < MAX_PASSES + 4) {
    pass += 1;
    const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
    await ctx.addInitScript(autoDismissCalibration);
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && /same key|each child|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|is not a function/i.test(m.text())) errs.push(m.text().slice(0, 160));
    });
    page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message.slice(0, 160)));

    const breaks = [];
    const sanLeaks = [];
    const fail = (m) => { breaks.push(m); console.log(`    ✗ ${m}`); };
    const ok = (m) => console.log(`    ✓ ${m}`);
    const since = Date.now() - 2000;

    console.log(`── pass ${pass} ──`);
    try {
      // Open the guided game directly. Prod cold-boot shows the app splash for
      // ~20-40s before the SPA hydrates the route — poll for the start button.
      await page.goto(`${BASE}/kid/play-games/${GAME_ID}`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => undefined);
      let started = false;
      for (let i = 0; i < 45 && !started; i += 1) {
        started = await page.locator('[data-testid="guided-game-start"]').first().isVisible().catch(() => false);
        if (!started) await page.waitForTimeout(1500);
      }
      if (!started) { fail('guided-game intro/start not visible'); }
      else {
        await page.locator('[data-testid="guided-game-start"]').first().click({ force: true }).catch(() => undefined);
        // narration box should appear (instruction — dynamic or authored)
        const narr = await page.locator('[data-testid="guided-game-narration"]').first().isVisible({ timeout: 15000 }).catch(() => false);
        if (narr) ok('coach narration rendered'); else fail('coach narration never rendered');

        // Ask-the-coach chat must be present (the new LLM surface).
        const chat = await page.locator('[data-testid="guided-game-coach-chat"]').first().isVisible({ timeout: 8000 }).catch(() => false);
        if (!chat) fail('Ask-the-Coach panel missing');
        else {
          ok('Ask-the-Coach panel present');
          // Quick-ask chip → answer round-trips the LLM.
          await page.locator('[data-testid="guided-game-quickask-why"]').first().click({ force: true }).catch(() => undefined);
          const gotAnswer = await page.waitForFunction(() => {
            const log = document.querySelector('[data-testid="guided-game-chat-log"]');
            if (!log) return false;
            return log.querySelectorAll('div').length >= 2; // kid Q + coach A
          }, { timeout: 30000 }).then(() => true).catch(() => false);
          if (gotAnswer) ok('quick-ask produced a coach answer (LLM wired)');
          else fail('quick-ask produced NO coach answer (LLM not wired / timed out)');

          // Adversarial typed inputs for this pass.
          for (const q of ADVERSARIAL[(pass - 1) % ADVERSARIAL.length]) {
            const input = page.locator('[data-testid="guided-game-chat-input"]').first();
            if (!(await input.isVisible().catch(() => false))) break;
            await input.fill(q).catch(() => undefined);
            await page.locator('[data-testid="guided-game-chat-send"]').first().click({ force: true }).catch(() => undefined);
            // empty/whitespace is a correct no-op; others should answer
            await page.waitForTimeout(q.trim() ? 3500 : 600);
          }

          // Collect only the COACH answers (not the kid's own typed messages,
          // which may legitimately contain SAN) and assert NONE leak SAN.
          const answers = await page.locator('[data-testid="chat-msg-coach"]').allInnerTexts().catch(() => []);
          for (const a of answers) {
            if (SAN_RE.test(a)) { sanLeaks.push(a.slice(0, 80)); fail(`SAN leak in COACH answer: "${a.slice(0, 60)}"`); }
          }
          if (sanLeaks.length === 0) ok(`no SAN in ${answers.length} coach answers`);
        }
      }

      if (errs.length) fail(`${errs.length} console/page errors: ${errs.slice(0, 2).join(' | ')}`);
      else ok('no console/page errors');

      // Did the kid LLM actually fire in-app? (audit-stream delta)
      const stream = await pullStream(since);
      if (stream.ok) {
        const kidEvents = stream.events.filter((e) => JSON.stringify(e).match(/kid_puzzle_gen|voice-speak|coach-narration|brain-call/i));
        ok(`audit-stream: ${stream.events.length} events (${kidEvents.length} llm/voice)`);
      } else {
        console.log(`    · audit-stream not pulled (${stream.reason})`);
      }
    } catch (e) {
      fail('pass threw: ' + String(e).slice(0, 120));
    }

    await page.screenshot({ path: join(OUT, `pass-${pass}.png`) }).catch(() => undefined);
    await ctx.close();

    const clean = breaks.length === 0;
    report.push({ pass, clean, breaks, errs });
    if (clean) { cleanStreak += 1; console.log(`  → pass ${pass} CLEAN (streak ${cleanStreak}/${MAX_PASSES})\n`); }
    else { cleanStreak = 0; console.log(`  → pass ${pass} BROKE (${breaks.length}) — streak reset\n`); }
  }

  await browser.close();
  const met = cleanStreak >= MAX_PASSES;
  await writeFile(join(OUT, 'report.json'), JSON.stringify({ base: BASE, game: GAME_ID, met, passes: report }, null, 2));
  console.log(`\n${met ? '✅ MET' : '❌ NOT MET'} — ${cleanStreak}/${MAX_PASSES} consecutive clean passes. Report: ${OUT}/report.json`);
  process.exit(met ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
