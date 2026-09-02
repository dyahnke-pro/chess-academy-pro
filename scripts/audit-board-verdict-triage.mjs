// Board-verdict prod triage (David 2026-09-02): on /coach/play, "is this a
// draw?" / "whose turn?" / "mate in how many?" / "what color am I?" collapse to
// the best-move readout. This drives the REAL surface (GameChatPanel →
// coachService.ask → getCoachChatResponse) and dumps the live debug audits
// (chat-panel-message-received, block-gate, board-verdict-debug) so we can see
// WHY computeLiveBoardVerdict returns null through the real path.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { degrade, describeDegradations } from './audit-lib/degrade.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const KQVK = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';
const START_PATH = `/coach/play?fen=${encodeURIComponent(KQVK)}`;
// One phrasing per registry entry in src/coach/boardQuestions.ts. `assessment`
// was added 2026-09-02 after the dead-engine probe found "am I winning?" being
// captured by the OPENING-NAME PICKER ("I don't have that exact opening mapped
// — did you mean one of these?") with positionAssessmentQuestion already true.
// Two phrasings for it on purpose: one that hit the picker and one that hit the
// stock refusal — different failure modes, both must be gone.
const QUESTIONS = [
  "what's the best move?",
  'whose turn is it?',
  'what color am I?',
  'is this a draw?',
  'how many moves until mate?',
  'am I winning?',
  "who's better here?",
];

const events = [];
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(muteTtsForAudit);
const p = await ctx.newPage();

// Capture the app's own audit POSTs (instrument 2) — we read them locally
// instead of pulling the prod stream, so nothing depends on the secret.
await p.route('**/api/audit-stream**', async (route) => {
  const req = route.request();
  if (req.method() === 'POST') {
    try {
      const body = req.postData() || '';
      const parsed = JSON.parse(body);
      const arr = Array.isArray(parsed) ? parsed : parsed.events || [parsed];
      for (const e of arr) events.push(e);
    } catch { /* ignore */ }
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
});

// DETERMINISTIC DEAD ENGINE: block the Stockfish worker scripts so the engine
// can NEVER init. This reproduces the collapse condition on demand (instead of
// waiting for the intermittent sandbox WASM crash) so we can read the mechanism.
// Dependency failure is now a shared axis (audit-lib/degrade.mjs), not an
// inline one-off. KILL_ENGINE=1 is kept as the established entry point;
// DEGRADE=engine,llm,tablebase,... reaches the rest without editing this file.
const KILL_ENGINE = process.env.KILL_ENGINE === '1';
const degraded = await degrade(p, [
  ...(KILL_ENGINE ? ['engine'] : []),
  ...(process.env.DEGRADE ? process.env.DEGRADE.split(',') : []),
]);
console.log(describeDegradations(degraded));

const errs = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 160)));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

function drain(kind) {
  const out = events.filter((e) => e && e.kind === kind);
  return out;
}

try {
  await p.goto(`${BASE}${START_PATH}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  if (!KILL_ENGINE) {
    for (let i = 0; i < 20; i++) { await p.waitForTimeout(2000); if (events.some((e) => e && e.kind === 'stockfish-cache-hit')) break; }
  }
  console.log(`[engine] KILL_ENGINE=${KILL_ENGINE} cache-hit-seen=${events.some((e) => e && e.kind === 'stockfish-cache-hit')}`);

  // How many chat inputs are on the page (the drawer duplicate David flagged)?
  await p.waitForTimeout(3000);
  const allInputs = p.locator('[data-testid="chat-input"] textarea');
  const n = await allInputs.count();
  console.log(`\n[topology] chat-input textareas on /coach/play: ${n}`);
  for (let i = 0; i < n; i++) {
    const inDrawer = await allInputs.nth(i).evaluate((el) => !!el.closest('[data-testid="global-coach-drawer"],[data-testid="mobile-chat-drawer"]'));
    const inGamePanel = await allInputs.nth(i).evaluate((el) => !!el.closest('[data-testid="game-chat-panel"]'));
    const vis = await allInputs.nth(i).isVisible();
    console.log(`  input[${i}] visible=${vis} inGamePanel=${inGamePanel} inDrawer=${inDrawer}`);
  }

  // Target the GAME PANEL input (not the drawer).
  let box = p.locator('[data-testid="game-chat-panel"]:not([data-testid="global-coach-drawer"] *) [data-testid="chat-input"] textarea').first();
  if (!(await box.count())) box = allInputs.first();
  await box.waitFor({ timeout: 15000 });

  for (const q of QUESTIONS) {
    const before = events.length;
    await box.click();
    await box.pressSequentially(q, { delay: 10 });
    await box.press('Enter');
    // Wait until this question's coach answer lands in chat memory (reliable).
    for (let i = 0; i < 30; i++) {
      await p.waitForTimeout(1500);
      if (events.slice(before).some((e) => e && e.kind === 'coach-memory-conversation-appended' && /\/coach:/.test(String(e.summary)))) break;
    }
    const slice = events.slice(before);
    const enteredBV = slice.filter((e) => e && e.kind === 'board-verdict-debug' && /entered/.test(String(e.summary))).map((e) => e.summary);
    const coverage = slice.filter((e) => e && e.kind === 'coach-grounding-coverage' && /board-verdict/.test(String(e.summary))).length;
    const answered = slice.filter((e) => e && e.kind === 'coach-brain-answered').map((e) => e.summary);
    const coachText = slice.filter((e) => e && e.kind === 'coach-memory-conversation-appended' && /\/coach:/.test(String(e.summary))).map((e) => String(e.summary));
    console.log(`\n=== Q: "${q}" ===`);
    console.log(`  computeLiveBoardVerdict entered: ${enteredBV.length ? 'YES — ' + enteredBV[0].replace(/^entered /, '') : 'NO'}`);
    console.log(`  early-return fired (coverage board-verdict): ${coverage > 0 ? 'YES' : 'NO — reached seal'}`);
    console.log(`  coach-brain-answered: ${answered.join(' | ') || '(none)'}`);
    console.log(`  coach text rendered:  ${coachText.join(' | ') || '(none)'}`);
  }

  console.log(`\n[page errors] ${errs.length ? errs.join('\n  ') : 'none'}`);
  console.log(`[event kinds seen] ${[...new Set(events.map((e) => e && e.kind))].filter(Boolean).sort().join(', ')}`);
} catch (e) {
  console.log('ERROR ' + String(e).slice(0, 300));
} finally {
  await b.close();
}
