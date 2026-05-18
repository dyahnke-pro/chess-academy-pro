#!/usr/bin/env node
/**
 * Audit-coach-tactic-narration — rigorous interactive verification
 * that the coach actually NAMES tactics by canonical pattern when
 * it sees them in the TacticsLiveContext block.
 *
 * Drives /coach/analyse against curated Lichess-puzzle positions
 * tagged with known themes (fork, pin, skewer, backRankMate,
 * hangingPiece), captures the Anthropic-streamed coach reply, and
 * asserts the reply contains the canonical tactic vocabulary.
 *
 * Phase 5 of WO-COACH-TACTICAL-AWARENESS. Closes the verification
 * gap between "envelope wiring shipped" (audit-coach-tactical-
 * awareness.mjs) and "brain actually narrates the tactic"
 * (this script). Requires an LLM key with credits; without one
 * each scenario records the failure and the report explains why.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/audit-coach-tactic-narration.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-tactic-narration-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const HYDRATE_SETTLE_MS = 2000;
const BRAIN_WAIT_MS = 120_000; // Anthropic streaming can take 30-60s

/**
 * Curated tactical positions from src/data/puzzles.json — each tagged
 * with a single dominant theme. The position is loaded into
 * /coach/analyse and the coach is asked to comment; the assertion
 * is that the response names the expected tactic by pattern.
 *
 * `expectedNames` is the set of pattern names the brain is allowed
 * to use to satisfy the assertion (synonyms accepted).
 *
 * `description` is what the test prints — purely cosmetic.
 */
const TACTIC_POSITIONS = [
  {
    name: 'back_rank_mate',
    fen: '5rk1/p5pp/2ppp3/4p2R/4N1q1/5Q2/PPP3P1/1K6 w - - 3 22',
    expectedNames: [/back[- ]rank/i, /back rank mate/i],
    question: "What's the tactic here? Be specific about the pattern name.",
    description: 'Lichess puzzle 01qIp — backRankMate (rating 400)',
  },
  {
    name: 'hanging_piece',
    fen: 'rnb1k2r/p2pppbp/6p1/qB2P3/3P4/2Q2N2/PP3PPP/R1B1K2R b KQkq - 0 10',
    expectedNames: [/hang(?:ing|s)/i, /undefended/i, /loose piece/i],
    question: "Is there a hanging piece or any tactic here? Name the pattern.",
    description: 'Lichess puzzle 09YeT — hangingPiece (rating 400)',
  },
  {
    name: 'fork',
    fen: '5rk1/3R1pbp/4p1p1/4P3/2p2B2/P1N4P/1P3PP1/1bn3K1 w - - 0 26',
    expectedNames: [/fork(?:ing|s|ed)?/i, /double[- ]attack/i],
    question: "What's the tactical pattern in this position? Name it.",
    description: 'Lichess puzzle 08nbU — fork (rating 542)',
  },
  {
    name: 'skewer',
    fen: '8/3k1p1p/r2P2p1/pp6/2p5/2P1KP2/P1P3PP/3R4 w - - 3 26',
    expectedNames: [/skewer(?:ing|s|ed)?/i],
    question: "What tactical pattern can White exploit here? Name it.",
    description: 'Lichess puzzle 07xxw — skewer (rating 624)',
  },
  {
    name: 'pin',
    fen: '7r/pQ3Npk/1b4bp/4r3/8/8/PP3qPP/R1B2RK1 w - - 0 25',
    expectedNames: [/pin(?:ning|s|ned)?/i, /absolute pin/i],
    question: "What's the tactical pattern here? Name it specifically.",
    description: 'Lichess puzzle 0MqeM — pin (rating 643)',
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[narration] base       = ${BASE_URL}`);
  console.log(`[narration] outDir     = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachTacticNarrationBot/1.0 (chromium)',
  });
  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch {
        /* ignore */
      }
    },
    { url: listener.url, secret: listener.secret },
  );

  const page = await ctx.newPage();
  const intercepted = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        if (body && typeof body === 'object') {
          const events = Array.isArray(body) ? body : (body.events ?? [body]);
          for (const ev of events) intercepted.push(ev);
        }
      } catch {
        /* ignore */
      }
    }
  });
  page.on('console', () => undefined);
  page.on('pageerror', () => undefined);

  const report = {
    base: BASE_URL,
    startedAt: stamp,
    listenerUrl: listener.url,
    positions: [],
  };

  async function snapshot(name) {
    const p = join(OUT_DIR, `${name}.png`);
    try { await page.screenshot({ path: p, fullPage: false }); } catch { /* ignore */ }
    return p;
  }

  for (const pos of TACTIC_POSITIONS) {
    console.log(`\n[narration] ${pos.name} — ${pos.description}`);
    const startIdx = intercepted.length;
    const t0 = Date.now();
    let coachReply = '';
    let error = null;
    try {
      // Fresh page mount per scenario so streaming state doesn't bleed.
      await page.goto(`${BASE_URL}/coach/analyse`, {
        waitUntil: 'domcontentloaded',
        timeout: BOOT_TIMEOUT_MS,
      });
      await page.locator('[data-testid="coach-analyse-page"]').waitFor({ timeout: 30_000 });
      await page.waitForTimeout(HYDRATE_SETTLE_MS);

      // Paste the FEN + click load.
      await page.locator('[data-testid="fen-input"]').click();
      await page.locator('[data-testid="fen-input"]').fill(pos.fen);
      await page.locator('[data-testid="load-fen-btn"]').click();

      // Wait for the streamed coach explanation to land.
      const replyDeadline = Date.now() + BRAIN_WAIT_MS;
      let lastTextLen = -1;
      let stableCount = 0;
      while (Date.now() < replyDeadline) {
        const text = await page
          .locator('[data-testid="coach-explanation"]')
          .innerText({ timeout: 1500 })
          .catch(() => '');
        if (text && text.length > 30) {
          if (text.length === lastTextLen) {
            stableCount++;
            if (stableCount >= 3) {
              coachReply = text;
              break;
            }
          } else {
            stableCount = 0;
            lastTextLen = text.length;
          }
        }
        await page.waitForTimeout(1000);
      }
      if (!coachReply) {
        coachReply = await page
          .locator('[data-testid="coach-explanation"]')
          .innerText({ timeout: 2000 })
          .catch(() => '');
      }
    } catch (e) {
      error = String(e?.message ?? e);
      console.log(`  [error] ${error.slice(0, 200)}`);
    }
    const screenshotPath = await snapshot(pos.name);
    const events = intercepted.slice(startIdx);
    const durationMs = Date.now() - t0;

    // ── Assertions ────────────────────────────────────────────────
    const tacticsCtxEv = events.find(
      (e) =>
        e.kind === 'coach-surface-migrated' &&
        (e.summary ?? '').startsWith('tactics ctx:'),
    );
    const brainAnswerEv = events.find((e) => e.kind === 'coach-brain-answer-returned');
    const claimTripEv = events.find((e) => e.kind === 'claim-validator-trip');

    const nameMatches = pos.expectedNames.map((re) => ({
      pattern: re.toString(),
      hit: re.test(coachReply),
    }));
    const namedTactic = nameMatches.some((m) => m.hit);

    const result = {
      name: pos.name,
      description: pos.description,
      fen: pos.fen,
      durationMs,
      coachReplyLength: coachReply.length,
      coachReplyPreview: coachReply.slice(0, 600),
      tacticsCtxFired: !!tacticsCtxEv,
      tacticsCtxSummary: tacticsCtxEv?.summary ?? null,
      brainAnswerFired: !!brainAnswerEv,
      brainAnswerSummary: brainAnswerEv?.summary ?? null,
      claimValidatorTripped: !!claimTripEv,
      claimValidatorSummary: claimTripEv?.summary ?? null,
      nameMatches,
      namedTactic,
      screenshot: screenshotPath,
      error,
    };

    // Console output
    console.log(`  events=${events.length}  duration=${durationMs}ms`);
    console.log(`  tactics ctx: ${result.tacticsCtxSummary ?? '(absent)'}`);
    console.log(`  brain answer: ${result.brainAnswerSummary ?? '(absent)'}`);
    if (claimTripEv) {
      console.log(`  ⚠ claim-validator-trip: ${claimTripEv.summary}`);
    }
    console.log(`  reply (${coachReply.length} chars): ${coachReply.slice(0, 200).replace(/\n+/g, ' ')}`);
    console.log(`  ${namedTactic ? '✓' : '✗'} named the tactic (any of ${nameMatches.map((m) => m.pattern).join(' | ')})`);
    console.log(`  ${result.brainAnswerFired ? '✓' : '✗'} brain answer fired`);
    console.log(`  ${result.tacticsCtxFired ? '✓' : '✗'} tactics ctx fired`);

    report.positions.push(result);
  }

  // ── Aggregate summary ────────────────────────────────────────
  const total = report.positions.length;
  const named = report.positions.filter((p) => p.namedTactic).length;
  const brained = report.positions.filter((p) => p.brainAnswerFired).length;
  const tripped = report.positions.filter((p) => p.claimValidatorTripped).length;
  report.summary = { total, named, brained, claimTripped: tripped };

  console.log(`\n[narration] === aggregate ===`);
  console.log(`  brain answer rate:  ${brained}/${total}`);
  console.log(`  named-tactic rate:  ${named}/${total}`);
  console.log(`  claim-validator trips: ${tripped}/${total}`);

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');
  await writeFile(join(OUT_DIR, 'all-events.json'), JSON.stringify(intercepted, null, 2), 'utf-8');
  console.log(`\n[narration] DONE — report: ${OUT_DIR}/report.json`);

  await browser.close();
  await listener.stop();
}

main().catch((err) => {
  console.error('[narration] FATAL', err);
  process.exit(1);
});
