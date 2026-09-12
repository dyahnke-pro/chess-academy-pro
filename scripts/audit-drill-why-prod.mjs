#!/usr/bin/env node
/**
 * audit-drill-why-prod — verifies the drills/weaknesses teaching contract
 * David locked 2026-09-12: "When coach is training drills/weaknesses I want the
 * why spoken! Why was that the best move."
 *
 * Seeds a REAL, verified tactical mistake puzzle (a clean, non-recapturable
 * Nxe5 knight win), drives My Mistakes solve mode by CLICKING the board to
 * solve it, and asserts that on the solve the coach AUTO-SPEAKS the GROUNDED
 * "why this was the best move" — captured off the app's own audit events
 * (coach-narration-spoken / voice-speak-invoked source=voiceService.speakGrounded),
 * NOT just that some text rendered. It also asserts the run stayed MUTED (zero
 * /api/tts requests — G1) so the audit never spends TTS money.
 *
 * This is the "a wire that does not fire is not a wire" gate for the auto-why:
 * before this change the grounded why was gated behind the "Explain why" button.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *     AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-drill-why-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { enableAuditCapture } from './audit-lib/enable-audit-capture.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/drill-why-${stamp}`;

// A real, chess.js-verified tactic: White to move, Nf3xe5 wins a knight that
// Black cannot recapture (0 black attackers of e5 after Nxe5). The grounded
// why should describe a material win / capture geometry.
const SEED = {
  id: 'audit-why-nxe5',
  fen: 'r1bqkbnr/pppp1ppp/8/4n3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
  playerMove: 'f3g5',           // a plausible sub-optimal move the "player" made
  playerMoveSan: 'Ng5',
  bestMove: 'f3e5',
  bestMoveSan: 'Nxe5',
  moves: 'f3e5',                // single student move — clean, no opponent reply
  cpLoss: 300,
  classification: 'blunder',
  gamePhase: 'opening',
  moveNumber: 4,
  sourceGameId: 'audit-why-game',
  sourceMode: 'lichess',
  playerColor: 'white',
  promptText: 'Find the best move.',
  narration: {
    intro: 'You have a free piece here.',
    conceptHint: 'Look for an undefended piece.',
    outro: 'Nxe5 grabs the loose knight.',
    moveNarrations: [], // required field (string[]); empty = no per-move line
  },
  createdAt: new Date().toISOString(),
  opponentName: 'auditbot',
  gameDate: new Date().toISOString().split('T')[0],
  openingName: null,
  evalBefore: 0.1,
  srsInterval: 0,
  srsEaseFactor: 2.5,
  srsRepetitions: 0,
  srsDueDate: new Date().toISOString().split('T')[0],
  srsLastReview: null,
  status: 'unsolved',
  attempts: 0,
  successes: 0,
  tacticType: null,
};

const results = [];
function check(label, pass, detail = '') {
  results.push({ label, pass: !!pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[drill-why] base   = ${BASE_URL}`);
  console.log(`[drill-why] outDir = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditDrillWhyBot/1.0 (chromium)',
  });
  await ctx.addInitScript(muteTtsForAudit);     // G1 — never spend TTS money
  await ctx.addInitScript(enableAuditCapture);  // make the app EMIT so we can capture

  const page = await ctx.newPage();

  // ── Instruments ──────────────────────────────────────────────────────────
  const events = [];            // flattened app audit events (the stream/listener)
  let ttsRequestCount = 0;      // MUST stay 0 — mute contract (G1)

  await page.route('**/api/audit-stream**', async (route) => {
    try {
      const body = route.request().postData();
      if (body) {
        const parsed = JSON.parse(body);
        for (const ev of Array.isArray(parsed) ? parsed : [parsed]) events.push(ev);
      }
    } catch { /* non-JSON body — ignore */ }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  page.on('request', (req) => {
    if (/\/api\/tts/.test(req.url())) ttsRequestCount += 1;
  });

  try {
    // ── Boot + dismiss the onboarding gates ────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('[data-testid="ai-consent-allow"]').click({ timeout: 4000 }).catch(() => {});
    // Strength-calibration bubble (CSS-dismiss safe path per CLAUDE.md G1).
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.count().catch(() => 0)) {
      await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
    }
    await page.waitForTimeout(2500); // let boot + Dexie open settle

    // ── Seed the mistake puzzle straight into Dexie ────────────────────────
    const seeded = await page.evaluate((puzzle) => new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('mistakePuzzles')) { resolve('no-store'); return; }
        const tx = db.transaction('mistakePuzzles', 'readwrite');
        tx.objectStore('mistakePuzzles').put(puzzle);
        tx.oncomplete = () => resolve('ok');
        tx.onerror = () => resolve('tx-error');
      };
      req.onerror = () => resolve('open-error');
    }), SEED);
    check('seeded mistake puzzle into Dexie', seeded === 'ok', String(seeded));

    // ── Open My Mistakes, enter solve mode ─────────────────────────────────
    await page.goto(`${BASE_URL}/tactics/mistakes`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 2000 }).catch(() => {});
    await page.locator('[data-testid="my-mistakes-page"]').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

    const solveBtn = page.locator('[data-testid="solve-button"]').first();
    const haveCard = await solveBtn.count().catch(() => 0);
    check('seeded puzzle appears in My Mistakes list', haveCard > 0);
    if (!haveCard) throw new Error('no solve-button — seeded puzzle not listed');

    await solveBtn.click({ timeout: 8000 });
    await page.locator('[data-testid="mistake-puzzle-board"]').waitFor({ state: 'visible', timeout: 10_000 });
    check('entered solve mode (mistake-puzzle-board mounted)', true);

    // Let the board reach the interactive 'playing' state (intro fires there).
    await page.waitForTimeout(1500);

    // ── Solve by CLICKING the board (Nf3 -> e5) ────────────────────────────
    // Proven headless click-to-move pattern (audit-coach-full-games): .first(),
    // force:true, and a gap so the source-square selection registers before the
    // target click.
    await page.locator('[data-square="f3"]').first().click({ timeout: 8000, force: true });
    await page.waitForTimeout(200);
    await page.locator('[data-square="e5"]').first().click({ timeout: 8000, force: true });

    // Correct state.
    const correct = await page.locator('[data-testid="puzzle-correct"]')
      .waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
    check('puzzle solved (correct state shown)', correct);

    // ── Wait for the auto-why (fires ~800ms after solve, then phrasing) ─────
    // The grounded why routes through voiceService.speakGrounded — its
    // voice-speak-invoked has source `voiceService.speakGrounded`. The seed's
    // intro uses plain speak(), so keying on speakGrounded cleanly excludes it:
    // a match PROVES the grounded why (not the canned intro) auto-fired.
    const grabWhy = () => events.filter((e) =>
      e && e.kind === 'voice-speak-invoked' && /speakGrounded/.test(String(e.source ?? '')),
    );
    let whyEvents = [];
    for (let i = 0; i < 30; i++) { // up to ~15s (800ms delay + phrasing + flush)
      whyEvents = grabWhy();
      if (whyEvents.length > 0) break;
      await page.waitForTimeout(500);
    }

    const whyText = whyEvents
      .map((e) => String(e.summary ?? e.narrationText ?? e.details ?? ''))
      .find((t) => t && t.length > 8) ?? '';

    check('grounded WHY auto-fired on solve (speakGrounded, no button tap)', whyEvents.length > 0,
      whyEvents.length ? `${whyEvents.length} event(s)` : 'no speakGrounded after solve');
    check('the WHY carries real teaching text', whyText.length > 8,
      whyText ? `"${whyText.slice(0, 90)}"` : 'empty');

    // ── Mute contract (G1) ─────────────────────────────────────────────────
    check('MUTED — zero /api/tts synthesis requests', ttsRequestCount === 0, `${ttsRequestCount} tts request(s)`);

    await page.screenshot({ path: join(OUT_DIR, 'solved.png') }).catch(() => {});
  } catch (err) {
    check('audit ran without a fatal error', false, String(err?.message ?? err));
  } finally {
    await browser.close().catch(() => {});
  }

  const pass = results.filter((r) => r.pass).length;
  const total = results.length;
  const ok = results.every((r) => r.pass);
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify({ base: BASE_URL, pass, total, ok, results, at: new Date().toISOString() }, null, 2));
  console.log(`\n[drill-why] ${pass}/${total} ${ok ? 'ALL GREEN' : 'FAILURES'} — report at ${OUT_DIR}/report.json`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
