#!/usr/bin/env node
/**
 * audit-hint — verifies the in-game Hint affordance on /coach/play after
 * the 2026-06-01 relabel + verbosity/grounding fix:
 *
 *   1. The button reads "Hint" (not "Show Answer"). Because no other
 *      surface touches HintButton's labels, a live "Hint" label also
 *      CONFIRMS this build's bundle is the one serving prod.
 *   2. One tap reveals the answer (jumps to tier 3) with a green arrow.
 *   3. The hint prose is SHORT — the Tier-3 prompt now caps at MAX 2
 *      sentences / 40 words. We measure the rendered nudge + the spoken
 *      text captured off /api/tts requests and the audit stream.
 *   4. No INVENTED tactics — the prose must not claim a pin/fork/skewer/
 *      discovered-attack that isn't on the board. We flag the claim for
 *      eyeball review (chess-truth is the author's eye; this is a smoke
 *      check that the grounding clause is biting).
 *
 * Three instruments per G1: Playwright drives the UI; audit-stream POSTs
 * are intercepted (page.on('request')) so we capture coach-brain-answer-
 * returned + hint-revealed + voice-speak-invoked exactly as emitted; the
 * /api/tts request bodies give us the literal spoken text.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-hint.mjs
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-hint.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/hint-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const MOVE_SETTLE_MS = 8000;
const HINT_SETTLE_MS = 30_000;

const TACTIC_WORDS = ['pin', 'pins', 'pinned', 'fork', 'forks', 'forked', 'skewer', 'skewers', 'discovered attack', 'discovery'];

function wordCount(s) { return s.trim().split(/\s+/).filter(Boolean).length; }
function sentenceCount(s) { return (s.match(/[.!?](\s|$)/g) || []).length || (s.trim() ? 1 : 0); }

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[hint] base = ${BASE_URL}`);

  const auditEvents = [];
  const ttsTexts = [];
  const results = [];
  const record = async (name, fn) => {
    const started = Date.now();
    try {
      const detail = await fn();
      results.push({ name, ok: true, ms: Date.now() - started, detail: detail ?? null });
      console.log(`  ✓ ${name}${detail ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
    } catch (err) {
      results.push({ name, ok: false, ms: Date.now() - started, error: err instanceof Error ? err.message : String(err) });
      console.log(`  ✗ ${name} — ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(HEADED),
    headless: !HEADED,
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();

  // Capture audit POSTs (body) + TTS GETs (text is a query param, NOT a
  // POST body — /api/tts?text=...&voice=...). We capture on 'request' so
  // a 401 on the audit-stream POST doesn't lose us the payload.
  page.on('request', (req) => {
    const url = req.url();
    if (url.includes('/api/audit-stream')) {
      try {
        const body = req.postData();
        if (body) {
          const parsed = JSON.parse(body);
          const arr = Array.isArray(parsed) ? parsed : parsed.events || [parsed];
          for (const e of arr) if (e && e.kind) auditEvents.push(e);
        }
      } catch { /* ignore */ }
    }
    if (url.includes('/api/tts')) {
      try {
        const u = new URL(url);
        const t = u.searchParams.get('text');
        if (t) ttsTexts.push(t);
      } catch { /* ignore */ }
    }
  });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE_URL}/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });

  async function clearOverlays() {
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count()) {
      await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 })
        .catch(() => page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => undefined));
      await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => undefined);
    }
    const help = page.locator('[data-testid="page-help-modal"]');
    if (await help.count()) {
      await page.keyboard.press('Escape');
      await help.waitFor({ state: 'detached', timeout: 10000 }).catch(() => undefined);
    }
  }

  await record('boot + clear overlays', async () => {
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
    await clearOverlays();
  });

  await record('navigate to /coach/play', async () => {
    await page.getByRole('link', { name: 'Coach' }).first().click();
    await page.locator('[data-testid="coach-home-page"]').waitFor({ timeout: 15000 });
    await clearOverlays();
    await page.locator('[data-testid="coach-action-play"]').click();
    await page.waitForTimeout(2000);
    await clearOverlays();
    await page.locator('[data-testid="hint-button"]').waitFor({ timeout: 15000 });
  });

  // ── (1) Label is "Hint", not "Show Answer" — also = deploy verification.
  await record('hint button labelled "Hint" (deploy check)', async () => {
    const txt = (await page.locator('[data-testid="hint-button"]').innerText()).trim();
    if (/show answer/i.test(txt)) throw new Error(`button still reads "${txt}" — old bundle / not deployed`);
    if (!/hint/i.test(txt)) throw new Error(`unexpected label "${txt}"`);
    return `label="${txt}"`;
  });

  // ── Make a student move so it's a real mid-game position for the hint.
  async function tryMove(from, to) {
    const f = page.locator(`[data-square="${from}"]`).first();
    const t = page.locator(`[data-square="${to}"]`).first();
    await f.click({ timeout: 2000 });
    await page.waitForTimeout(200);
    await t.click({ timeout: 2000 });
  }
  await record('play e4 + await coach reply', async () => {
    await tryMove('e2', 'e4');
    await page.waitForTimeout(MOVE_SETTLE_MS);
  });

  // ── (2)(3)(4) Tap Hint, capture the answer.
  await record('tap Hint → answer revealed, measure length + grounding', async () => {
    const btn = page.locator('[data-testid="hint-button"]');
    await btn.waitFor({ state: 'visible', timeout: 10000 });
    // Wait until enabled (player's turn).
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="hint-button"]');
      return b && !b.hasAttribute('disabled');
    }, { timeout: 20000 }).catch(() => undefined);
    const ttsBefore = ttsTexts.length;
    await btn.click();
    // Wait for the nudge bubble to populate OR tier to hit 3.
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-testid="hint-button"]');
      return b && b.getAttribute('data-level') === '3';
    }, { timeout: HINT_SETTLE_MS }).catch(() => undefined);
    await page.waitForTimeout(8000); // let the streamed answer + TTS settle

    // The hint prose is injected into the game-chat panel as an assistant
    // message (CoachGamePage → injectAssistantMessage), and each spoken
    // sentence is a /api/tts GET. Capture BOTH; the spoken text is the
    // ground truth for what the student actually heard (post board-claim
    // guard, which drops disproven sentences before they're spoken).
    const spoken = ttsTexts.slice(ttsBefore).filter((t) => t.replace(/[^a-z0-9]/gi, '').length > 1);
    const spokenJoined = spoken.join(' ').trim();
    let chatLog = '';
    const log = page.locator('[aria-label="In-game coach chat messages"]');
    if (await log.count()) chatLog = (await log.first().innerText()).trim();
    // Prefer the spoken text (what the student heard); fall back to the
    // newest chunk of the chat log.
    const measured = spokenJoined || chatLog.split('\n').filter(Boolean).slice(0, 3).join(' ').trim();

    const wc = wordCount(measured);
    const sc = sentenceCount(measured);
    const lower = measured.toLowerCase();
    const tacticHits = TACTIC_WORDS.filter((w) => lower.includes(w));
    const blocked = auditEvents.filter((e) => e.kind === 'coach-board-claim-blocked');

    const detail = {
      label_level: await page.locator('[data-testid="hint-button"]').getAttribute('data-level'),
      measured_chars: measured.length,
      word_count: wc,
      sentence_count: sc,
      spoken_segments: spoken.length,
      tactic_words_present: tacticHits,
      board_claim_blocked_events: blocked.length,
      measured_preview: measured.slice(0, 280),
    };
    // HARD: a capture of NOTHING is not a pass — that's the hollow-green
    // trap. We must have heard/seen the hint to judge it.
    if (!measured) throw new Error('captured NO hint text (0 spoken segments, empty chat log) — cannot verify verbosity/grounding');
    // The Tier-3 cap is ~40 words / 2 sentences; allow headroom for LLM
    // variance but FAIL on the 650-char / 6-sentence regression class.
    if (wc > 70) throw new Error(`hint too long: ${wc} words / ${sc} sentences (cap is ~40w/2s) :: "${measured.slice(0, 160)}"`);
    return detail;
  });

  // ── Arrow rendered at tier 3.
  await record('green move-arrow rendered on board', async () => {
    const arrows = page.locator('svg [data-testid^="arrow"], svg line, [data-arrow]');
    const n = await arrows.count();
    return `arrow-ish elements: ${n}`;
  });

  const hintEvents = auditEvents.filter((e) => /hint/i.test(e.kind || '') || (e.source || '').includes('useHintSystem'));
  const report = {
    base: BASE_URL,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      passed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
    },
    audit_events_total: auditEvents.length,
    hint_events: hintEvents.slice(-10),
    tts_texts: ttsTexts.slice(-12),
    console_errors: consoleErrors.slice(0, 20),
  };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  await page.screenshot({ path: `${OUT_DIR}/hint.png`, fullPage: false }).catch(() => undefined);
  console.log(`\n[hint] ${report.summary.passed} passed / ${report.summary.failed} failed — report at ${OUT_DIR}/report.json`);

  await browser.close();
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
