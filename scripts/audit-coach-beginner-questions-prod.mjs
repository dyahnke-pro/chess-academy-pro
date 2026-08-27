// Beginner-question coach audit (David 2026-08-27, from native user Rivertoe85).
// Drives the SOFT plain-English questions a ~900 beginner actually types against
// the live coach and prints the real replies, flagging the canned deflection.
// Complements audit-coach-answers-questions-prod.mjs (which covers best-move /
// plan shapes). Reference: THE REAL-GAME EXPERIENCE AUDIT standard (§G1).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `beginnerq-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

// His real questions (lightly de-typo'd), tagged with the phase that should fix them.
const QUESTIONS = [
  { q: 'What does Bxe7 mean?', phase: 'P2-notation', want: /notation|bishop/i },
  { q: 'How do I improve my middlegame?', phase: 'P4-recommend', want: /play|game|middlegame/i },
  { q: 'Why do you think they moved their queen there?', phase: 'P6-opponent-why', want: null },
  { q: 'Do you understand me?', phase: 'P3-conversational', want: null },
  { q: 'Was my knight to d5 a good move?', phase: 'P5-move-quality', want: null },
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
  try { await tile.waitFor({ timeout: 4000 }); await tile.click(); await page.waitForTimeout(3500); return true; } catch { return false; }
}

async function ask(question) {
  await page.waitForTimeout(4000);
  await resolvePicker();
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => {
    const now = tally(ls); const out = [];
    for (const [line, n] of now) { const extra = n - (seen.get(line) ?? 0); for (let k = 0; k < extra; k++) out.push(line); }
    return out.filter((l) => !l.includes(question));
  };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUBSTANTIVE = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const fresh = freshFrom(await linesOf());
    if (fresh.some(SUBSTANTIVE)) { await page.waitForTimeout(2500); return freshFrom(await linesOf()).filter(SUBSTANTIVE).join(' '); }
  }
  return '';
}

const rows = [];
try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  await ask('Play the Italian with me as white');
  await resolvePicker();
  await page.waitForTimeout(3000);
  for (const { q, phase, want } of QUESTIONS) {
    const reply = await ask(q);
    const canned = reply.toLowerCase().includes(CANNED);
    const responsive = want ? want.test(reply) : !canned && reply.length >= 20;
    rows.push({ q, phase, reply, canned, responsive });
    console.log(`\n[${phase}] Q: ${q}\n  A: ${reply || '(no reply)'}\n  ${canned ? '❌ CANNED' : responsive ? '✔ responsive' : '⚠ non-canned but off-target'}`);
  }
} catch (e) {
  console.error('audit error:', e.message);
} finally {
  const canned = rows.filter((r) => r.canned).length;
  console.log(`\n=== ${rows.length} asked | ${canned} canned | ${rows.filter((r) => r.responsive).length} responsive ===`);
  await browser.close();
}
