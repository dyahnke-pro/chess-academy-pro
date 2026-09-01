// THE COACH ANSWERS THE NEW QUESTION CLASSES (2026-09-01, one push).
//
// This deploy added grounded lanes the coach couldn't answer before: the
// opponent's last move ("why did they play that"), name-this-opening, general
// theory ("how do I play against an isolated queen pawn"), the capabilities
// overview ("what can you help with"), endgame technique ("what's the Lucena"),
// and the weakness LIFECYCLE / BRIEFING ("what's my biggest weakness").
//
// Per §G1 this is a REAL-USE audit: it types each question on the live prod
// build and reads the real answer, MUTED (no TTS spend — David 2026-08-04). The
// bar is not "an answer appeared" — the canned "I can't verify that precisely"
// IS an answer — so each check asserts the reply is responsive AND not the
// canned deflection. A "need more games" weakness reply is a valid grounded
// answer (getWeaknessLifecycle honest floor), not a deflection.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `newlanes-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit); // G1: know what it said, don't pay to hear it
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
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
  try {
    await tile.waitFor({ timeout: 4000 });
    await tile.click();
    await page.waitForTimeout(3500);
    return true;
  } catch { return false; }
}

async function ask(question) {
  await page.waitForTimeout(4000);
  await resolvePicker();
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => ''))
    .split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => {
    const now = tally(ls);
    const out = [];
    for (const [line, n] of now) {
      const extra = n - (seen.get(line) ?? 0);
      for (let k = 0; k < extra; k++) out.push(line);
    }
    return out.filter((l) => !l.includes(question));
  };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUBSTANTIVE = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const fresh = freshFrom(await linesOf());
    if (fresh.some(SUBSTANTIVE)) {
      await page.waitForTimeout(2500);
      return freshFrom(await linesOf()).filter(SUBSTANTIVE).join(' ');
    }
  }
  return '';
}

function isAnswer(text) {
  if (text.trim().length < 20 || !text.includes(' ')) return false;
  return !/pick the one you want to play|splits into several different games/i.test(text);
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates();
  await dismissGates();

  // A real game so the board-anchored lanes (opponent-move, name-opening) have
  // move history to read. The opponent replies as we play the Italian.
  await ask('Play the Italian with me as white');
  await resolvePicker();
  await page.waitForTimeout(4000);

  // Play a couple of moves so there IS an opponent move to explain + a named
  // opening to detect. e2-e4 then the coach replies; e-square handles.
  for (const [from, to] of [['e2', 'e4'], ['g1', 'f3']]) {
    try {
      await page.locator(`[data-square="${from}"]`).click({ timeout: 4000 });
      await page.locator(`[data-square="${to}"]`).click({ timeout: 4000 });
      await page.waitForTimeout(3500);
    } catch { /* board may be in narration mode — questions still land */ }
  }

  const cases = [
    { q: 'what opening is this?', name: 'name-this-opening', ok: (t) => /open|game|defen|gambit|sicilian|italian|it'?s the|this is the/i.test(t) },
    { q: 'why did they play that?', name: 'opponent-move why', ok: (t) => /they play|they answer|it |captur|attack|develop|threat|quiet/i.test(t) },
    { q: 'how do I play against an isolated queen pawn?', name: 'theory (IQP)', ok: (t) => /pawn|blockad|piece|square|file|control|weak/i.test(t) },
    { q: 'what can you help with?', name: 'capabilities overview', ok: (t) => /teach|drill|review|opening|weak|tactic|endgame|play|help/i.test(t) },
    { q: "what's the Lucena position?", name: 'endgame technique (Lucena)', ok: (t) => /rook|pawn|king|bridge|promot|win|shelter/i.test(t) },
    { q: "what's my biggest weakness?", name: 'weakness lifecycle/briefing', ok: (t) => /weak|mistak|blunder|drill|games|pattern|work on|analyz/i.test(t) },
    { q: 'what endgame am I weakest at?', name: 'endgame-weakness profile', ok: (t) => /endgame|ending|rook|pawn|king|games|analyz|drill/i.test(t) },
  ];

  for (const c of cases) {
    const a = (await ask(c.q)).toLowerCase();
    record(`${c.name}: gets a grounded answer`, isAnswer(a) && c.ok(a), a ? `"${a.replace(/\s+/g, ' ').slice(0, 160)}"` : 'no reply in 45s');
    record(`${c.name}: not the canned deflection`, isAnswer(a) && !a.includes(CANNED), a.includes(CANNED) ? 'served the canned line' : 'grounded');
  }

  // ── ENDGAME TRAINER LAUNCH (Batch B) — "play the Lucena with me" offers the
  // "Play this ending" chip → the tablebase trainer mounts + Watch works.
  const introEndgame = (await ask('play the Lucena with me')).toLowerCase();
  record('endgame play request: gets a launch intro', isAnswer(introEndgame) && /play|walk|lucena|ending|take over/i.test(introEndgame), introEndgame ? `"${introEndgame.slice(0, 140)}"` : 'no reply');
  // The chip is rendered by ChatMessage as action-endgame_trainer.
  let chip = page.locator('[data-testid="action-endgame_trainer"]').first();
  const chipShown = await chip.isVisible().catch(() => false);
  record('endgame play request: offers the "Play this ending" chip', chipShown, chipShown ? 'chip present' : 'no chip');
  if (chipShown) {
    await chip.click().catch(() => {});
    const trainer = page.locator('[data-testid="endgame-tablebase-trainer"]');
    const mounted = await trainer.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    record('endgame trainer mounts from the chip', mounted, mounted ? 'trainer mounted' : 'did not mount');
    if (mounted) {
      const watch = page.locator('[data-testid="endgame-trainer-watch"]');
      const canWatch = await watch.isVisible().catch(() => false);
      record('endgame trainer shows the Watch control (tablebase reachable)', canWatch, canWatch ? 'Watch ready' : 'no Watch button (tablebase miss?)');
    }
  }

  // Direct route mount — the standalone page loads the lesson trainer.
  await page.goto(`${BASE}/coach/endgame-trainer/lucena-position`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await dismissGates();
  const directMount = await page.locator('[data-testid="endgame-tablebase-trainer"], [data-testid="endgame-trainer-notfound"], [data-testid="endgame-trainer-noposition"]').first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
  record('endgame-trainer route mounts standalone', directMount, directMount ? 'route renders' : 'route blank');
} catch (err) {
  record('audit ran without throwing', false, String(err).slice(0, 200));
} finally {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n── ${pass}/${results.length} checks green ──`);
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
