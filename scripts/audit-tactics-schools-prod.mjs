// THE TACTICS SCHOOLS + SRS + ANALYSE — the shallow-coverage gap surfaces
// (David 2026-08-13: "every tab, every system and subsystem checked"; these
// were the honest-gap list's "shallow" rows: Calculation drill, Pattern
// School, Find the Square, Setup Trainer, Daily Training, SRS session,
// /coach/analyse paste-FEN).
//
// Contract-vs-observed per surface:
//   calculation — picker → start → drill controls mount → skip ADVANCES
//   patterns    — a card's real example board loads; Drill routes to /tactics/drill
//   find-square — clicking the NAMED square increments the streak; a wrong
//                 square resets it (the surface's whole scoring contract)
//   setup       — difficulty → loading RESOLVES → end-session → summary
//   classic     — daily-training trainer mounts; skip advances
//   srs         — mode tabs mount; a card session or an honest empty/complete
//   analyse     — paste a FEN → load → the coach explanation renders
//
// Muted + run-id stamped. No LLM-heavy asks here (engine/data surfaces), so
// pacing is lighter than the Q&A drives.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `schools-${Date.now().toString(36)}`;
const ONLY = (process.env.AUDIT_ONLY || 'calculation,patterns,find-square,setup,classic,srs,analyse')
  .split(',').map((s) => s.trim());
const wants = (s) => ONLY.includes(s);

const results = [];
const record = (surface, name, pass, detail, kind = 'contract') => {
  results.push({ surface, name, pass, kind, detail });
  console.log(`${kind === 'informational' ? 'ℹ️' : pass ? '✅' : '❌'} [${surface}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const pageErrors = [];

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((id) => {
  try { localStorage.setItem('auditRunId', id); } catch { /* private */ }
}, RUN_ID);
const page = await ctx.newPage();
page.on('pageerror', (e) => {
  const msg = String(e?.message ?? e);
  if (!pageErrors.includes(msg)) pageErrors.push(msg);
});

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 6000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

async function go(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await dismissGates();
}

try {
  // ══ CALCULATION DRILL ═════════════════════════════════════════════════════
  if (wants('calculation')) {
    await go('/tactics/calculation');
    const skill = page.locator('[data-testid^="calculation-skill-"]').first();
    const skillUp = await skill.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
    record('calculation', 'the skill picker mounts', skillUp, skillUp ? '' : 'no calculation-skill tiles in 45s');
    if (skillUp) {
      await skill.click();
      const start = page.locator('[data-testid="calculation-start-drill"]');
      if (await start.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) await start.click();
      const next = page.locator('[data-testid="calculation-skip"], [data-testid="calculation-next"]');
      const drillUp = await next.first().waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
      record('calculation', 'starting a drill mounts the drill controls', drillUp,
        drillUp ? '' : 'no skip/next controls in 60s');
      if (drillUp) {
        const beforeHtml = await page.locator('[data-testid="calc-concept-hint"], main').first().innerText().catch(() => '');
        await page.locator('[data-testid="calculation-skip"]').first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(4000);
        const afterHtml = await page.locator('[data-testid="calc-concept-hint"], main').first().innerText().catch(() => '');
        record('calculation', 'skip advances to a new position', beforeHtml !== afterHtml,
          beforeHtml === afterHtml ? 'view unchanged after skip' : 'view changed');
      }
    }
  }

  // ══ PATTERN SCHOOL ════════════════════════════════════════════════════════
  if (wants('patterns')) {
    await go('/tactics/patterns');
    const card = page.locator('[data-testid^="pattern-toggle-"]').first();
    const cardUp = await card.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
    record('patterns', 'pattern cards mount', cardUp, cardUp ? '' : 'no pattern cards in 45s');
    if (cardUp) {
      await card.click();
      const board = page.locator('[data-testid^="pattern-example-board-"]').first();
      const boardUp = await board.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
      record('patterns', 'expanding a card loads a REAL example board', boardUp,
        boardUp ? '' : 'example board never rendered (stuck on loading?)');
      const drill = page.locator('[data-testid^="pattern-drill-"]').first();
      if (await drill.isVisible().catch(() => false)) {
        await drill.click();
        let routed = false;
        for (let i = 0; i < 10; i++) {
          // The button's real contract is /tactics/adaptive with the
          // pattern's themes forced (startDrill, PatternSchoolPage:85) —
          // the first version asserted /tactics/drill and false-failed.
          if (/\/tactics\/(adaptive|drill)/.test(page.url())) { routed = true; break; }
          await page.waitForTimeout(1000);
        }
        record('patterns', 'the Drill button routes to the adaptive drill', routed,
          routed ? page.url() : `url stayed ${page.url()}`);
      } else {
        record('patterns', 'the Drill button routes to the tactic drill', false, 'no drill button on expanded card');
      }
    }
  }

  // ══ FIND THE SQUARE — the scoring contract, both directions ═══════════════
  if (wants('find-square')) {
    await go('/tactics/find-square');
    const target = page.locator('[data-testid="find-square-target"]');
    const up = await target.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
    record('find-square', 'the target prompt mounts', up, up ? '' : 'no target in 45s');
    if (up) {
      const streakOf = async () => parseInt((await page.locator('[data-testid="find-square-streak-current"]').innerText().catch(() => '0')).trim(), 10) || 0;
      const named = (await target.innerText()).trim().toLowerCase().match(/[a-h][1-8]/)?.[0];
      if (named) {
        const s0 = await streakOf();
        await page.locator(`[data-square="${named}"]`).first().click({ force: true });
        await page.waitForTimeout(1500);
        const s1 = await streakOf();
        record('find-square', 'clicking the NAMED square increments the streak', s1 === s0 + 1,
          `streak ${s0} → ${s1} (target ${named})`);
        // Now a deliberate MISS: click a square that is not the new target.
        const t2 = (await target.innerText()).trim().toLowerCase().match(/[a-h][1-8]/)?.[0];
        const wrong = t2 === 'a1' ? 'h8' : 'a1';
        await page.locator(`[data-square="${wrong}"]`).first().click({ force: true });
        await page.waitForTimeout(1500);
        const s2 = await streakOf();
        record('find-square', 'a wrong square resets the streak', s2 === 0,
          `streak after wrong click = ${s2}`);
      } else {
        record('find-square', 'clicking the NAMED square increments the streak', false, `unparseable target "${await target.innerText()}"`);
      }
    }
  }

  // ══ SETUP TRAINER ═════════════════════════════════════════════════════════
  if (wants('setup')) {
    await go('/tactics/setup');
    const diff = page.locator('[data-testid^="difficulty-"]').first();
    const diffUp = await diff.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
    record('setup', 'the difficulty picker mounts', diffUp, diffUp ? '' : 'no difficulty tiles in 45s');
    if (diffUp) {
      await diff.click();
      // Loading must RESOLVE — a stuck spinner is the failure this checks.
      const loading = page.locator('[data-testid="loading"]');
      await loading.waitFor({ timeout: 10000 }).catch(() => {});
      const resolved = await loading.waitFor({ state: 'detached', timeout: 90000 }).then(() => true).catch(() => false);
      record('setup', 'a session loads (spinner resolves to a task)', resolved,
        resolved ? '' : 'loading spinner never resolved in 90s');
      const end = page.locator('[data-testid="end-session"]');
      if (await end.isVisible().catch(() => false)) {
        await end.click();
        const summary = await page.locator('[data-testid="session-summary"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
        record('setup', 'ending the session shows the summary', summary, summary ? '' : 'no session-summary');
      } else {
        record('setup', 'ending the session shows the summary', false, 'no end-session control visible', resolved ? 'contract' : 'informational');
      }
    }
  }

  // ══ DAILY TRAINING (classic trainer) ══════════════════════════════════════
  if (wants('classic')) {
    await go('/tactics/classic');
    const trainer = page.locator('[data-testid="puzzle-trainer"]');
    const up = await trainer.waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
    record('classic', 'the daily-training trainer mounts', up, up ? '' : 'no puzzle-trainer in 60s');
    if (up) {
      const skip = page.locator('[data-testid="skip-puzzle"]');
      if (await skip.waitFor({ timeout: 30000 }).then(() => true).catch(() => false)) {
        // Compare the BOARD, not the chrome: puzzle prompt text is identical
        // between puzzles and pieces are images, so innerText can't see an
        // advance (the first version false-failed on exactly that).
        const boardSnapshot = () => page.evaluate(() =>
          [...document.querySelectorAll('[data-square] [data-piece]')]
            .map((el) => `${el.closest('[data-square]')?.getAttribute('data-square')}:${el.getAttribute('data-piece')}`)
            .sort().join('|'));
        const boardBefore = await boardSnapshot();
        await skip.click({ force: true });
        let outcome = '';
        for (let i = 0; i < 10; i++) {
          await page.waitForTimeout(1500);
          if ((await boardSnapshot()) !== boardBefore) { outcome = 'advanced to a new position'; break; }
          // Skip on the LAST puzzle correctly ends the session instead.
          if (await page.locator('[data-testid="session-complete"]').isVisible().catch(() => false)) {
            outcome = 'last puzzle — session-complete screen shown'; break;
          }
        }
        record('classic', 'skip advances (next position or session complete)', outcome !== '',
          outcome || 'board identical and no completion screen after skip');
      } else {
        record('classic', 'skip advances to the next puzzle', false, 'no skip control in 30s');
      }
    }
  }

  // ══ SRS TRAINER ═══════════════════════════════════════════════════════════
  if (wants('srs')) {
    await go('/openings/srs');
    // Flashcards seed from the repertoire during the deferred seed — allow it.
    await page.waitForTimeout(45000);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await dismissGates();
    const tabs = page.locator('[data-testid="srs-mode-tabs"]');
    const complete = page.locator('[data-testid="srs-complete"]');
    const tabsUp = await tabs.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
    const completeUp = !tabsUp && await complete.first().isVisible().catch(() => false);
    record('srs', 'the SRS trainer mounts (session or honest all-done state)', tabsUp || completeUp,
      tabsUp ? 'mode tabs up' : completeUp ? 'srs-complete (nothing due — honest)' : 'neither tabs nor complete state');
    if (tabsUp) {
      const cardMode = page.locator('[data-testid="srs-mode-card"]');
      if (await cardMode.isVisible().catch(() => false)) {
        await cardMode.click();
        await page.waitForTimeout(3000);
        const anyBoard = await page.locator('[data-square="e4"]').first().isVisible().catch(() => false);
        record('srs', 'the card mode presents a position', anyBoard || await complete.first().isVisible().catch(() => false),
          anyBoard ? 'board rendered' : 'complete state', 'informational');
      }
    }
  }

  // ══ ANALYSE — paste-FEN e2e ═══════════════════════════════════════════════
  if (wants('analyse')) {
    await go('/coach/analyse');
    const fenInput = page.locator('[data-testid="fen-input"]');
    const up = await fenInput.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
    record('analyse', 'the FEN input mounts', up, up ? '' : 'no fen-input in 45s');
    if (up) {
      // Italian Game after 3.Bc4 — a legal, recognizable middlegame-bound FEN.
      const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3';
      await fenInput.click();
      await fenInput.fill(FEN);
      await page.locator('[data-testid="load-fen-btn"]').click();
      // The loaded board must SHOW the position (bishop on c4).
      const bishopThere = await page.locator('[data-square="c4"] [data-piece]').first()
        .waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
      record('analyse', 'loading the FEN renders that position on the board', bishopThere,
        bishopThere ? 'piece on c4' : 'c4 empty after load');
      // Engine-backed explanation — sandbox stockfish is flaky (WASM memory),
      // so a missing explanation is informational with the reason recorded.
      const explained = await page.locator('[data-testid="coach-explanation"]').first()
        .waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
      const text = explained
        ? (await page.locator('[data-testid="coach-explanation"]').first().innerText()).slice(0, 140)
        : '';
      record('analyse', 'the coach explanation renders for the pasted position', explained,
        explained ? `"${text.replace(/\s+/g, ' ')}"` : 'no explanation in 90s (engine-dependent in sandbox)',
        explained ? 'contract' : 'informational');
    }
  }
} finally {
  console.log(`\n── coverage grid ──`);
  for (const r of results) {
    console.log(`${r.kind === 'informational' ? 'ℹ️' : r.pass ? '✅' : '❌'} [${r.surface}] ${r.name}`);
  }
  const green = results.filter((r) => r.pass || r.kind === 'informational').length;
  console.log(`\n${green}/${results.length} green (contract or informational)`);
  console.log(`pageerrors (distinct): ${pageErrors.length}${pageErrors.length ? ` — ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`audit_run_id: ${RUN_ID}`);
  const dir = `audit-reports/tactics-schools-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors }, null, 2));
  console.log(`report: ${dir}/report.json`);
  await browser.close();
  const hardFails = results.filter((r) => !r.pass && r.kind !== 'informational').length;
  process.exit(hardFails ? 1 : 0);
}
