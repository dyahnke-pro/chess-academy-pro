#!/usr/bin/env node
/**
 * audit-counter-repertoire — post-deploy proof for the coach's
 * counter-repertoire recommender (David 2026-07-15).
 *
 * THE REGRESSION THIS GUARDS: the live coach answered "What should I play
 * against the Pirc?" with a bare best-move eval ("The best move is e4…
 * White is slightly better (about 0.6 pawns)") and deflected the KID ask
 * entirely. The recommender must answer with the curated line instead.
 *
 * Drives /coach/chat on the deployed app, types the EXACT asks from David's
 * screenshots + off-canonical variants (G7), and asserts on the reply text:
 *   - Pirc ask   → names the Austrian Attack, does NOT read as a bare
 *                  best-move eval ("best move is e4" / "0.6 pawns").
 *   - KID ask    → names the Sämisch.
 *   - Sicilian   → names BOTH the Alapin and the Rossolimo (two-rec family).
 *   - Grob ask   → honest no-prep answer (never an invented line).
 * These go through the real brain (voiceFacts rephrase) — assertions accept
 * either the raw computed facts or a faithful rephrase carrying the line name.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-counter-repertoire.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 AUDIT_SANDBOX=1 node scripts/audit-counter-repertoire.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/counter-repertoire-${stamp}`;

// A brain round-trip (DeepSeek voiceFacts rephrase) can take a while cold.
// Generous: on a COLD localhost context the deferred seed + every-boot
// reconcile loaders hammer IndexedDB for ~60s and grounded reads queue behind
// them (the in-sequence stalls of 2026-07-15). Prod/warm devices answer in
// seconds; the timeout just rides out cold-seed contention.
const REPLY_TIMEOUT_MS = 150_000;

const SCENARIOS = [
  {
    id: 'pirc-exact',
    ask: 'What should I play against the Pirc?',
    mustMatch: [/austrian/i],
    mustNotMatch: [/best move is e4/i, /0\.6 pawns/i, /slightly better \(about/i],
  },
  {
    id: 'kid-exact',
    ask: 'I struggle against the KID. Which opening do you suggest I play against it and why?',
    mustMatch: [/s(ä|a|ae)misch/i],
    mustNotMatch: [/recurring mistakes in/i],
  },
  {
    id: 'sicilian-two-recs',
    ask: 'what do you recommend against the sicilian',
    mustMatch: [/alapin/i, /rossolimo/i],
    mustNotMatch: [/best move is/i],
  },
  {
    id: 'caro-british-typo',           // off-canonical input (G7)
    ask: 'how do I meet the caro cann?',
    mustMatch: [/fantasy/i],
    mustNotMatch: [],
  },
  {
    id: 'grob-honest-no-prep',
    ask: 'What should I play against the Grob?',
    mustMatch: [/(don'?t|do not) have a prepared/i],
    mustNotMatch: [/\b1\.\s?[a-h]4\b/],
  },
  // NO pro names, EVER, on any recommendation reply (checked on every scenario
  // via the shared assertion below as well — this one just pins the doctrine).
];

const NAME_LEAK = /naroditsky|gotham|hikaru|nakamura|carlsen|caruana|eric rosen|hambleton|samay/i;

async function lastAssistantText(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('[data-testid="chat-message-assistant"], [data-role="assistant"], .chat-message.assistant'));
    const last = nodes[nodes.length - 1];
    return last ? (last.textContent ?? '') : '';
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[counter-rep] base = ${BASE_URL}`);
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const results = [];

  try {
    for (const s of SCENARIOS) {
      // FRESH CONTEXT per scenario — shared-context runs proved positionally
      // flaky (restored chat session + IndexedDB reseed swallowing sends)
      // while every ask answers correctly in an isolated context. Full
      // isolation is the only configuration that reproduced 100% (2026-07-15).
      const context = await browser.newContext(sandboxContextOptions());
      await context.addInitScript(autoDismissCalibration);
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/coach/chat`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForTimeout(6_000); // store hydration (see audit-coach-chat)
      // FRESHNESS GUARD: a slow previous reply (or the typing-indicator node)
      // can satisfy a count-based wait and get scraped as THIS scenario's
      // answer (the 2026-07-15 first run's off-by-one). Track the last
      // assistant TEXT before sending and wait for it to CHANGE.
      const beforeText = (await lastAssistantText(page)).trim();
      // The chat input DISABLES while a turn is busy; a send fired into a
      // disabled input silently no-ops and reads as a false hang (audit
      // doctrine: pace the harness, don't manufacture hangs). Wait for it.
      await page.waitForFunction(() => {
        const el = document.querySelector('textarea') ?? document.querySelector('input[type="text"]');
        return !!el && !el.disabled;
      }, { timeout: 60_000 }).catch(() => {});
      const input = page.locator('textarea, input[type="text"]').first();
      await input.fill(s.ask);
      await input.press('Enter');

      let reply = '';
      const deadline = Date.now() + REPLY_TIMEOUT_MS;
      while (Date.now() < deadline) {
        await page.waitForTimeout(2_000);
        const nowText = (await lastAssistantText(page)).trim();
        if (nowText.length > 20 && nowText !== beforeText) {
          reply = nowText;
          // let streaming settle, then take the final text
          await page.waitForTimeout(1_500);
          reply = (await lastAssistantText(page)).trim();
          break;
        }
      }

      const failures = [];
      if (!reply.trim()) failures.push('no reply within timeout');
      for (const re of s.mustMatch) if (!re.test(reply)) failures.push(`missing ${re}`);
      for (const re of s.mustNotMatch) if (re.test(reply)) failures.push(`FORBIDDEN matched ${re}`);
      if (NAME_LEAK.test(reply)) failures.push('PRO NAME LEAKED into coach reply');

      const pass = failures.length === 0;
      results.push({ id: s.id, ask: s.ask, pass, failures, reply: reply.slice(0, 500) });
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${s.id}${failures.length ? ' — ' + failures.join('; ') : ''}`);
      await context.close();
    }
  } finally {
    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ baseUrl: BASE_URL, when: stamp, results }, null, 2));
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[counter-rep] ${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
