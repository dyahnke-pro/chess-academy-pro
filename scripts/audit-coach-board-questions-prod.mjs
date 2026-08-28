// HAMMER THE COACH WITH BOARD QUESTIONS (David 2026-08-28).
// Drives a real game, then fires a barrage of board-related questions a real
// player asks, capturing each REAL reply reliably (assistant-bubble count +
// text-stability — not the flaky transcript-line diff) and flagging the canned
// deflection / off-target answer. Finds every place the coach fails to answer.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `boardq-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

// Board-related questions a real player asks mid-game.
const QUESTIONS = [
  "What's the best move here?",
  'Why is that the best move?',
  'What does Bxe7 mean?',
  "What's my plan?",
  'What is the plan for white and black?',
  'Is anything hanging?',
  "What's the threat?",
  'Am I better or worse right now?',
  'What is my worst piece?',
  'Where should my knight go?',
  'Was my last move good?',
  'Why did they play that?',
  'Should I castle here?',
  'Is my king safe?',
  'Can I win material?',
  'What tactics are in the position?',
  'How do I attack the king?',
  'Should I trade queens?',
  'What file should my rook go on?',
  'What are the weaknesses in my position?',
  "What's the most forcing move?",
  'What should I be worried about?',
];

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-beginner"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

async function resolvePicker() {
  const tile = page.locator('[data-testid^="line-picker-"][data-fullname]').first();
  try { await tile.waitFor({ timeout: 4000 }); await tile.click(); await page.waitForTimeout(3000); return true; } catch { return false; }
}

const bubbles = () => page.locator('[data-testid="chat-message-assistant"]');

/** Type a question only when the input is truly ready, then wait for a NEW
 *  assistant bubble whose text has stopped growing (streaming finished). This
 *  is the reliable capture: bubble COUNT increase + text stability, never a
 *  transcript-line diff (which mis-attributed a stale line to every question). */
async function ask(question) {
  await resolvePicker();
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  // Wait until the textarea is actually editable (the prior turn re-enabled it).
  for (let i = 0; i < 60 && !(await box.isEditable().catch(() => false)); i++) await page.waitForTimeout(1000);
  const n0 = await bubbles().count();
  await box.click();
  await box.fill('');
  await box.pressSequentially(question, { delay: 8 });
  await box.press('Enter');
  // Wait for a new bubble to appear (up to 90s cold), then for it to stop growing.
  let last = '';
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    const n = await bubbles().count();
    if (n > n0) {
      const t = (await bubbles().last().innerText().catch(() => '')).trim();
      if (t && t === last && t.length >= 12) return t;      // stabilized
      last = t;
    }
  }
  return last;
}

const rows = [];
try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  await ask('Play the Italian with me as white');
  await resolvePicker();
  // Make a few real moves so questions land on a live middlegame, not move 1.
  for (const [from, to] of [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4'], ['e1', 'g1']]) {
    try {
      await page.locator(`[data-square="${from}"]`).click({ timeout: 4000 });
      await page.locator(`[data-square="${to}"]`).click({ timeout: 4000 });
      await page.waitForTimeout(2500);
    } catch { /* board may auto-play; keep going */ }
  }
  for (const q of QUESTIONS) {
    const reply = await ask(q);
    const canned = reply.toLowerCase().includes(CANNED);
    const empty = !reply || reply.length < 12;
    // "off-target" heuristic: a best-move readout served to a NON-best-move
    // question (the classic "ignored the question" failure).
    const bestReadout = /the best move is|stakes out the centre|clearly better|slightly better/i.test(reply);
    const askedBest = /best move|forcing|should i play|what.*move/i.test(q);
    const offTarget = bestReadout && !askedBest;
    rows.push({ q, reply, canned, empty, offTarget });
    const tag = canned ? '❌ CANNED' : empty ? '⚠ EMPTY' : offTarget ? '⚠ OFF-TARGET (best-move readout)' : '✔';
    console.log(`\nQ: ${q}\n  A: ${reply || '(none)'}\n  ${tag}`);
  }
} catch (e) {
  console.error('audit error:', e.message);
} finally {
  const canned = rows.filter((r) => r.canned).length;
  const empty = rows.filter((r) => r.empty).length;
  const off = rows.filter((r) => r.offTarget).length;
  console.log(`\n=== ${rows.length} asked | ${canned} canned | ${empty} empty | ${off} off-target | ${rows.length - canned - empty - off} ok ===`);
  await browser.close();
}
