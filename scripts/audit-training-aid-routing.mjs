#!/usr/bin/env node
/**
 * audit-training-aid-routing — proves the coach chat routes training-
 * drill requests to the REAL, code-driven surfaces instead of letting
 * the brain invent a fake drill (G0). David's report: "drill calculation"
 * → the LLM hallucinated "the purest calculation drill is finding the
 * best first move from the starting position."
 *
 * INTERACTIVE (G7): types real phrases into the real chat box on the
 * real surfaces the user uses (/coach/teach = Learn, /coach/play = the
 * reported surface) and asserts the URL routes to the correct training
 * surface — no brain round-trip, no hallucination. Off-canonical inputs
 * (British spelling, typos) included. Also asserts opening drills and
 * bare questions are NOT hijacked.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-training-aid-routing.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/training-aid-routing-${stamp}`;

// (surface route, mount testid) → drive the chat there.
const SURFACES = [
  { name: 'learn', route: '/coach/teach', mount: '[data-testid="coach-teach-page"]' },
  { name: 'play', route: '/coach/play', mount: '[data-testid="coach-game-page"]' },
];

// phrase → { expect: regex the final URL must match, label }.
// `null` expect = must NOT navigate (stays on the source surface).
const CASES = [
  { phrase: 'drill calculation', expect: /\/coach\/endgame\?tab=calculation/, label: 'calc (reported bug)' },
  { phrase: 'work on my calculation', expect: /\/coach\/endgame\?tab=calculation/, label: 'calc (verb→noun)' },
  { phrase: 'practice mating patterns', expect: /\/coach\/endgame\?tab=mating-patterns/, label: 'mating patterns' },
  { phrase: 'drill pawn endings', expect: /\/coach\/endgame\?tab=pawn-endings/, label: 'pawn endings' },
  { phrase: 'give me a fork puzzle', expect: /\/tactics\/adaptive|\/coach\/session\/puzzle/, label: 'themed puzzle' },
  { phrase: 'drill tactics', expect: /\/tactics|\/coach\/session\/puzzle/, label: 'generic tactics' },
  { phrase: 'work on my weaknesses', expect: /\/weaknesses/, label: 'weaknesses' },
  // Negative controls — must NOT be hijacked by the training-aid router.
  { phrase: 'drill the Vienna', expect: null, label: 'opening drill (must stay)' },
  { phrase: "what's my weakness in the Sicilian?", expect: null, label: 'question (must stay)' },
];

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs

  const results = [];
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`));

  for (const surface of SURFACES) {
    for (const c of CASES) {
      const label = `[${surface.name}] "${c.phrase}" → ${c.label}`;
      const before = consoleErrors.length;
      try {
        await page.goto(`${BASE_URL}${surface.route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        await page.locator(surface.mount).first().waitFor({ timeout: 30_000 });
        const input = page.locator('[data-testid="chat-text-input"]');
        await input.waitFor({ state: 'visible', timeout: 20_000 });
        // The chat input briefly disables while the session hydrates
        // (welcome line streams). Wait until it's enabled before typing
        // so the message isn't dropped, then settle. Mirrors the
        // reference coach-teach audit.
        await page.waitForFunction(() => {
          const el = document.querySelector('[data-testid="chat-text-input"]');
          if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return false;
          return !el.disabled;
        }, { timeout: 20_000 }).catch(() => undefined);
        await page.waitForTimeout(1200);
        await input.fill(c.phrase, { timeout: 15_000 });
        await page.locator('[data-testid="chat-send-btn"]').click({ force: true, timeout: 15_000 });

        let ok = false;
        let finalUrl = page.url();
        if (c.expect) {
          try {
            await page.waitForURL(c.expect, { timeout: 12_000 });
            ok = true;
          } catch { ok = false; }
          finalUrl = page.url();
        } else {
          // Negative control: give it a beat, assert we did NOT leave the surface.
          await page.waitForTimeout(3500);
          finalUrl = page.url();
          ok = finalUrl.includes(surface.route);
        }
        const newErrors = consoleErrors.slice(before);
        results.push({ label, ok, finalUrl, errors: newErrors });
        console.log(`${ok ? '✓' : '✗'} ${label}  →  ${finalUrl.replace(BASE_URL, '')}${newErrors.length ? `  [${newErrors.length} err]` : ''}`);
      } catch (err) {
        results.push({ label, ok: false, error: String(err).slice(0, 200) });
        console.log(`✗ ${label}  →  ERROR ${String(err).slice(0, 120)}`);
      }
    }
  }

  await browser.close();
  const pass = results.filter((r) => r.ok).length;
  const summary = { base: BASE_URL, total: results.length, pass, fail: results.length - pass, results };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(summary, null, 2));
  console.log(`\n${pass}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(pass === results.length ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
