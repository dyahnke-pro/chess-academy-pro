// Drive the SOFT beginner questions a real ~900-rated native-iOS user typed
// (from PostHog, 2026-08), against CURRENT main/prod, and print the real
// replies. The existing answers-questions audit covers "why play <move>" /
// "what's my plan"; the beginner shapes below (notation help, move-quality,
// opponent-move why, conversational) mostly deflect to the canned line or a
// generic best-move readout. This exercises those shapes so the gap is visible.
// NOTE: "substantive" here only means length>=20 && not-a-picker — READ the
// replies against the questions; a best-move readout to "do you understand me"
// is a non-answer even though it prints as substantive.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `rivertoe-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

// His real questions (lightly de-typo'd to how a person would type them).
const QUESTIONS = [
  'Why do you think they moved their queen there?',
  'How do I improve my middlegame?',
  'Do you understand me?',
  'What does Bxe7 mean?',
  'Was my knight to d5 a good move?',
  "Doesn't that mess up the structure?",
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
  // Get a real game on the board so questions land on a live position.
  await ask('Play the Italian with me as white');
  await resolvePicker();
  await page.waitForTimeout(3000);
  for (const q of QUESTIONS) {
    const reply = await ask(q);
    const canned = reply.toLowerCase().includes(CANNED);
    rows.push({ q, reply, canned });
    console.log(`\nQ: ${q}\nA: ${reply || '(no reply captured)'}\n   ${canned ? '❌ CANNED DEFLECTION' : reply ? '✔ substantive' : '⚠ empty'}`);
  }
} catch (e) {
  console.error('audit error:', e.message);
} finally {
  const canned = rows.filter((r) => r.canned).length;
  const empty = rows.filter((r) => !r.reply).length;
  console.log(`\n=== SUMMARY: ${rows.length} asked | ${canned} canned deflections | ${empty} empty | ${rows.length - canned - empty} substantive ===`);
  await browser.close();
}
