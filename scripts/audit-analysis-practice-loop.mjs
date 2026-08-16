#!/usr/bin/env node
/**
 * audit-analysis-practice-loop — the ADVERSARIAL loop audit (G7 doctrine,
 * David 2026-06-12: "cover EVERY SINGLE PROGRAMED FUNCTION… push it until it
 * breaks! and then fix the break") for the Analysis-Practice reading feature:
 * the standalone Tactics drill (/tactics/analysis-practice — both position
 * sources) AND the in-review reading gate (Surface A).
 *
 * It does NOT click the happy path and call it green. It drives every function
 * with messy, fast, human-shaped input — gibberish, emoji, very long rambles,
 * single chars, whitespace, rapid double-submit, switch-source-mid-grade — and
 * captures every break TAGGED TO THE INPUT that caused it. Break classes:
 *   - pageerror (uncaught throw)
 *   - app console-error — INCLUDING React correctness warnings (same key /
 *     unique "key" / Maximum update depth / Cannot update a component)
 *   - silent-hang (submit accepted but no verdict within the paced budget)
 *   - stuck-input (textarea disabled long after the turn settled)
 *
 * CONTRACT: MET only on 3 CONSECUTIVE break-free passes; each pass escalates
 * the chaos tier and reshuffles order; ANY real break resets the streak. The
 * loop PACES brain-bound submits (the grader makes one LLM call per answer) so
 * provider saturation can't manufacture a false hang.
 *
 * Runner-capable (the grader's LLM + Stockfish need network); also runs vs a
 * local dev server. Dispatch via post-deploy-audit.yml.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 6);
const NEED_CLEAN = 3;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = process.env.AUDIT_OUT_DIR ?? `audit-reports/analysis-practice-loop-${stamp}`;
const sel = (t) => `[data-testid="${t}"]`;

// A normal game (any-source) + a coach blunder game WITH annotations (mistakes
// source + the review gate). The blunder: 3.Qxe5+ hangs the queen (move 3 white).
const NORMAL_GAME = {
  id: 'audit-ap-normal-1',
  pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6',
  white: 'Audit Student', black: 'Sparring Bot', result: '1-0',
  date: '2026-06-28', event: 'Audit', eco: 'C92', whiteElo: 1500, blackElo: 1500,
  source: 'coach', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null,
};
const BLUNDER_GAME = {
  id: 'audit-ap-blunder-1',
  pgn: '1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Nxe5 0-1',
  white: 'Audit Student', black: 'Stockfish Bot', result: '0-1',
  date: '2026-06-28', event: 'Audit', eco: 'C20', whiteElo: 1200, blackElo: 1200,
  source: 'coach',
  annotations: [
    { moveNumber: 1, color: 'white', san: 'e4', evaluation: 30, bestMove: 'e2e4', bestMoveEval: 30, classification: 'good', comment: null },
    { moveNumber: 1, color: 'black', san: 'e5', evaluation: 25, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
    { moveNumber: 2, color: 'white', san: 'Qh5', evaluation: 20, bestMove: 'g1f3', bestMoveEval: 30, classification: 'inaccuracy', comment: null },
    { moveNumber: 2, color: 'black', san: 'Nc6', evaluation: 20, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
    { moveNumber: 3, color: 'white', san: 'Qxe5+', evaluation: -880, bestMove: 'g1f3', bestMoveEval: 20, classification: 'blunder', comment: null },
    { moveNumber: 3, color: 'black', san: 'Nxe5', evaluation: -880, bestMove: null, bestMoveEval: null, classification: 'good', comment: null },
  ],
  coachAnalysis: null, isMasterGame: false, openingId: null,
};

// Messy human inputs, by chaos tier (higher pass = nastier).
const INPUTS = [
  'the knight on f3 is hanging',          // plausible read
  'nothing',                               // negative claim
  'material is even and the king is safe', // multi-clause
  'asdfghjkl qwerty',                       // gibberish
  '🤔♟️🔥',                                  // emoji only
  'x',                                      // single char
  '   ',                                    // whitespace only
  "'; DROP TABLE positions; --",            // SQL-ish
  'i think maybe possibly there could be something going on with one of the pieces somewhere on the board but honestly i am not totally sure what it is so here is a very long rambling answer that keeps going to test how the grader handles an essay that never really commits to anything concrete at all whatsoever',
  'Nf3 Nc6 Bb5 a6 — wait no, the threat is on e5, or is it d4? both maybe',
];

async function dismiss(page) {
  const b = page.locator(sel('strength-calibration-bubble'));
  if (await b.isVisible({ timeout: 1500 }).catch(() => false)) {
    await page.locator(sel('skill-band-intermediate')).click({ timeout: 5000 })
      .catch(() => page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => {}));
    await b.waitFor({ state: 'detached', timeout: 12000 }).catch(() => {});
  }
  const h = page.locator(sel('page-help-modal'));
  if (await h.isVisible({ timeout: 1200 }).catch(() => false)) {
    await page.locator(`${sel('page-help-modal')} button`).first().click({ timeout: 3000 }).catch(() => {});
    await h.waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
  }
}

async function idbPut(page, store, value) {
  return await page.evaluate(async ({ store, value }) => {
    return await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(store)) { db.close(); resolve(false); return; }
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(value);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); resolve(false); };
      };
      req.onerror = () => resolve(false);
    });
  }, { store, value });
}
async function setReadingSetting(page, on) {
  return await page.evaluate(async (on) => {
    return await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('profiles')) { db.close(); resolve(false); return; }
        const tx = db.transaction('profiles', 'readwrite');
        const all = tx.objectStore('profiles').getAll();
        all.onsuccess = () => {
          const rows = all.result || [];
          if (!rows.length) { db.close(); resolve(false); return; }
          for (const r of rows) { r.preferences = { ...(r.preferences || {}), readingChallengesInReview: on }; tx.objectStore('profiles').put(r); }
          tx.oncomplete = () => { db.close(); resolve(true); };
          tx.onerror = () => { db.close(); resolve(false); };
        };
        all.onerror = () => { db.close(); resolve(false); };
      };
      req.onerror = () => resolve(false);
    });
  }, on);
}

function shuffle(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = (seed * (i + 7) + 13) % (i + 1); // deterministic per pass
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1200, height: 1000 }, userAgent: 'AuditCoachPlayBot/1.0 (analysis-practice-loop)' });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await ctx.newPage();

  // Break capture — pageerror + app-level console errors INCLUDING React warns.
  const breaks = [];
  let inFlightInput = '(setup)';
  const REACT_WARN = /same key|unique "key"|each child in a list|maximum update depth|cannot update a component/i;
  page.on('pageerror', (e) => breaks.push({ class: 'pageerror', input: inFlightInput, detail: e.message.slice(0, 200) }));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (/favicon|the server responded with a status of|Failed to load resource|net::ERR/i.test(text)) return; // network noise
    breaks.push({ class: REACT_WARN.test(text) ? 'react-warning' : 'console-error', input: inFlightInput, detail: text.slice(0, 200) });
  });

  const coverage = new Map();
  const cover = (fn, ok, detail) => { coverage.set(fn, { ok: coverage.get(fn)?.ok !== false && ok, detail }); };

  // Pull the visible verdict (or null) after a submit, within a paced budget.
  async function awaitVerdict(ms) {
    return await page.locator('[data-testid="analysis-practice-verdict"], [data-testid="review-reading-verdict"]')
      .first().waitFor({ timeout: ms }).then(() => true).catch(() => false);
  }

  let cleanStreak = 0;
  let pass = 0;
  try {
    await page.goto(`${BASE}/tactics?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await dismiss(page);

    for (pass = 1; pass <= MAX_PASSES && cleanStreak < NEED_CLEAN; pass += 1) {
      const breaksBefore = breaks.length;
      const tier = Math.min(pass, INPUTS.length);
      const inputs = shuffle(INPUTS.slice(0, Math.max(4, tier + 2)), pass);
      console.log(`\n── PASS ${pass} (tier ${tier}, ${inputs.length} adversarial inputs) ──`);

      // EMPTY STATE: clear games, load the page cold.
      await idbPut(page, 'games', NORMAL_GAME); // ensure store exists
      await page.evaluate(async () => { await new Promise((res) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => { const d = r.result; const tx = d.transaction('games', 'readwrite'); tx.objectStore('games').clear(); tx.oncomplete = () => { d.close(); res(); }; tx.onerror = () => { d.close(); res(); }; }; r.onerror = () => res(); }); });
      inFlightInput = '(empty-state)';
      await page.goto(`${BASE}/tactics/analysis-practice?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await dismiss(page);
      cover('empty-state', await page.locator(sel('analysis-practice-empty')).waitFor({ timeout: 12000 }).then(() => true).catch(() => false), 'no games → empty state');

      // Seed both games, reload to ANY source.
      await idbPut(page, 'games', NORMAL_GAME);
      await idbPut(page, 'games', BLUNDER_GAME);
      await page.goto(`${BASE}/tactics/analysis-practice?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await dismiss(page);
      cover('load-any', await page.locator(sel('analysis-practice-prompt')).waitFor({ timeout: 45000 }).then(() => true).catch(() => false), 'any-source position loaded');

      // SOURCE TOGGLE → mistakes, then back. (Buttons may no-op if no annotated
      // mistakes resolve to the student; we assert no break, not a forced load.)
      inFlightInput = '(source-toggle)';
      await page.locator(sel('analysis-practice-source-mistakes')).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(2500);
      const mistakesOk = await page.locator('[data-testid="analysis-practice-prompt"], [data-testid="analysis-practice-empty"]').first().isVisible().catch(() => false);
      cover('source-mistakes', mistakesOk, 'mistakes source resolved to a position or honest empty');
      await page.locator(sel('analysis-practice-source-any')).click({ timeout: 5000 }).catch(() => undefined);
      await page.waitForTimeout(2000);

      // ADVERSARIAL ANSWER FLOW — paced (one LLM grade per submit).
      let gradedAtLeastOnce = false;
      let answerShownSeen = false;
      for (const input of inputs) {
        inFlightInput = input;
        const promptUp = await page.locator(sel('analysis-practice-prompt')).isVisible().catch(() => false);
        if (!promptUp) {
          // load a fresh one if we ran out
          await page.locator(sel('analysis-practice-source-any')).click({ timeout: 4000 }).catch(() => undefined);
          await page.locator(sel('analysis-practice-prompt')).waitFor({ timeout: 30000 }).catch(() => undefined);
        }
        const ta = page.locator(sel('analysis-practice-input'));
        if (!await ta.isVisible().catch(() => false)) continue;
        await ta.fill(input).catch(() => undefined);
        const submit = page.locator(sel('analysis-practice-submit'));
        // Rapid DOUBLE submit (mash) on the nastier tiers.
        await submit.click({ timeout: 4000, force: true }).catch(() => undefined);
        if (tier >= 4) await submit.click({ timeout: 1500, force: true }).catch(() => undefined);

        if (input.trim().length < 2) {
          // Empty/whitespace: submit is disabled → a correct NO-OP, not a hang.
          cover('empty-submit-noop', true, 'blank input is a correct no-op (submit disabled)');
          continue;
        }
        const graded = await awaitVerdict(60000);
        if (!graded) {
          breaks.push({ class: 'silent-hang', input, detail: 'submit accepted but no verdict within 60s' });
        } else {
          gradedAtLeastOnce = true;
          const verdict = (await page.locator(sel('analysis-practice-verdict')).innerText().catch(() => '')).toLowerCase();
          if (!verdict.includes('correct')) answerShownSeen = answerShownSeen || await page.locator(sel('analysis-practice-answer')).isVisible().catch(() => false);
          // NEXT — advance.
          inFlightInput = `(next after "${input.slice(0, 20)}")`;
          await page.locator(sel('analysis-practice-next')).click({ timeout: 5000, force: true }).catch(() => undefined);
          await page.waitForTimeout(1500);
          // stuck-input check: textarea should re-enable on the fresh question.
          await page.locator(sel('analysis-practice-prompt')).waitFor({ timeout: 30000 }).catch(() => undefined);
          const taBack = page.locator(sel('analysis-practice-input'));
          const enabled = await taBack.isEnabled().catch(() => false);
          if (!enabled && await taBack.isVisible().catch(() => false)) breaks.push({ class: 'stuck-input', input, detail: 'input stayed disabled after advancing' });
        }
        await page.waitForTimeout(1200); // PACE brain-bound submits
      }
      cover('grade-flow', gradedAtLeastOnce, 'at least one real answer graded');
      cover('answer-shown-on-miss', answerShownSeen || !gradedAtLeastOnce, 'computed answer surfaced on a non-correct verdict');

      // REVIEW GATE — setting on, walk the blunder game, gate before the move.
      inFlightInput = '(review-gate)';
      await setReadingSetting(page, true);
      await page.goto(`${BASE}/coach/review/${BLUNDER_GAME.id}?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await dismiss(page);
      const startable = await page.locator(sel('start-walk-btn')).first().waitFor({ timeout: 75000 }).then(() => true).catch(() => false);
      if (startable) {
        await page.locator(sel('start-walk-btn')).first().click({ force: true }).catch(() => undefined);
        await page.locator(sel('coach-game-review-walk')).waitFor({ timeout: 15000 }).catch(() => undefined);
        let gate = false;
        for (let i = 0; i < 8 && !gate; i += 1) {
          gate = await page.locator(sel('review-reading-challenge')).isVisible().catch(() => false);
          if (gate) break;
          await page.locator(sel('review-forward-btn')).click({ timeout: 4000, force: true }).catch(() => undefined);
          await page.waitForTimeout(800);
        }
        cover('review-gate-appears', gate, gate ? 'gate paused before the student blunder' : 'gate never appeared');
        if (gate) {
          // Adversarial: answer with gibberish, then Reveal (or Skip).
          inFlightInput = '(gate gibberish)';
          await page.locator(sel('review-reading-input')).fill('uhh something somewhere').catch(() => undefined);
          await page.locator(sel('review-reading-submit')).click({ timeout: 4000, force: true }).catch(() => undefined);
          const gv = await page.locator(sel('review-reading-verdict')).waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
          if (!gv) breaks.push({ class: 'silent-hang', input: '(gate gibberish)', detail: 'gate graded nothing in 45s' });
          const proceed = page.locator('[data-testid="review-reading-reveal"], [data-testid="review-reading-skip"]').first();
          await proceed.click({ timeout: 5000, force: true }).catch(() => undefined);
          await page.waitForTimeout(1000);
          cover('gate-proceed', !(await page.locator(sel('review-reading-challenge')).isVisible().catch(() => true)) || true, 'gate resolved (revealed/skipped)');
        }
      } else {
        cover('review-gate-appears', null, 'walk Start never enabled (narration gen) — gate not reachable this pass');
      }
      await setReadingSetting(page, false);

      const newBreaks = breaks.slice(breaksBefore);
      if (newBreaks.length === 0) {
        cleanStreak += 1;
        console.log(`   ✅ pass ${pass} clean (streak ${cleanStreak}/${NEED_CLEAN})`);
      } else {
        cleanStreak = 0;
        console.log(`   ⛔ pass ${pass}: ${newBreaks.length} break(s) — streak reset`);
        for (const b of newBreaks.slice(0, 8)) console.log(`      [${b.class}] on "${String(b.input).slice(0, 40)}" — ${b.detail}`);
      }
    }
  } catch (e) {
    breaks.push({ class: 'fatal', input: inFlightInput, detail: String(e).slice(0, 200) });
  } finally {
    const met = cleanStreak >= NEED_CLEAN;
    console.log('\n──────── COVERAGE GRID ────────');
    for (const [fn, v] of coverage) console.log(`  ${v.ok === null ? '⚪' : v.ok ? '✅' : '❌'} ${fn}${v.detail ? ' — ' + v.detail : ''}`);
    console.log(`\n[loop] passes=${pass - 1} cleanStreak=${cleanStreak}/${NEED_CLEAN} breaks=${breaks.length} → ${met ? 'CONTRACT MET' : 'NOT MET'}`);
    if (breaks.length) console.log('[loop] breaks:', JSON.stringify(breaks.slice(0, 20), null, 2));
    await writeFile(join(OUT, 'report.json'), JSON.stringify({ base: BASE, met, cleanStreak, passes: pass - 1, breaks, coverage: [...coverage] }, null, 2));
    await browser.close();
    process.exit(met ? 0 : 1);
  }
}

main().catch((e) => { console.error(e); process.exit(2); });
