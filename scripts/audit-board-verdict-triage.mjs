// Board-verdict prod triage (David 2026-09-02): on /coach/play, "is this a
// draw?" / "whose turn?" / "mate in how many?" / "what color am I?" collapse to
// the best-move readout. This drives the REAL surface (GameChatPanel →
// coachService.ask → getCoachChatResponse) and dumps the live debug audits
// (chat-panel-message-received, block-gate, board-verdict-debug) so we can see
// WHY computeLiveBoardVerdict returns null through the real path.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const KQVK = '4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1';
const START_PATH = `/coach/play?fen=${encodeURIComponent(KQVK)}`;
const QUESTIONS = [
  "what's the best move?",
  'whose turn is it?',
  'what color am I?',
  'is this a draw?',
  'how many moves until mate?',
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
  // Stockfish's WASM worker crashes intermittently in the sandbox ("worker
  // never signaled"). That is a sandbox artifact, not the thing under test, so
  // reload until the engine actually warms — otherwise every answer collapses to
  // the engine-down fallback and accuracy can't be read.
  let engineUp = false;
  for (let attempt = 0; attempt < 4 && !engineUp; attempt++) {
    events.length = 0;
    await p.goto(`${BASE}${START_PATH}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismiss(); await dismiss();
    for (let i = 0; i < 24; i++) {
      await p.waitForTimeout(2000);
      if (events.some((e) => e && e.kind === 'stockfish-cache-hit')) { engineUp = true; break; }
      if (events.some((e) => e && e.kind === 'stockfish-error')) break; // crashed — reload
    }
    console.log(`[warm] attempt ${attempt + 1}: engineUp=${engineUp}`);
  }
  if (!engineUp) { console.log('[warm] ABORT — Stockfish never warmed after 4 attempts (sandbox WASM crash); cannot evaluate accuracy this run.'); }

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

  const GROUND_TRUTH = {
    "what's the best move?": 'a winning move (KQvK: tablebase-optimal is Qd5; any queen move that keeps the win is acceptable)',
    'whose turn is it?': 'White to move',
    'what color am I?': 'White',
    'is this a draw?': 'NO — win for White',
    'how many moves until mate?': 'mate in 15 (dtm=15)',
  };
  const results = [];
  for (const q of QUESTIONS) {
    const before = events.length;
    const bubblesBefore = await p.locator('[data-testid="chat-message-assistant"]').count();
    await box.click();
    await box.pressSequentially(q, { delay: 10 });
    await box.press('Enter');
    // Wait for a NEW assistant bubble, then wait for its text to STABILIZE
    // (streaming done) — capture the FULL untruncated text.
    let full = '', stableCount = 0, prev = '';
    for (let i = 0; i < 40; i++) {
      await p.waitForTimeout(1500);
      const msgs = p.locator('[data-testid="chat-message-assistant"]');
      const c = await msgs.count();
      if (c <= bubblesBefore) continue;
      const t = (await msgs.nth(c - 1).innerText()).replace(/^C\s*/, '').replace(/\n+/g, ' ').trim();
      if (t.length < 4) continue;
      if (t === prev) { stableCount++; if (stableCount >= 2) { full = t; break; } }
      else { stableCount = 0; prev = t; full = t; }
    }
    results.push({ q, full, truth: GROUND_TRUTH[q] });
    void before;
  }
  console.log(`\n===== ACCURACY EVALUATION (full answers vs ground truth) =====`);
  for (const r of results) {
    console.log(`\nQ: ${r.q}`);
    console.log(`  TRUTH:  ${r.truth}`);
    console.log(`  ANSWER: ${r.full || '(no answer captured)'}`);
  }

  console.log(`\n[page errors] ${errs.length ? errs.join('\n  ') : 'none'}`);
  console.log(`[event kinds seen] ${[...new Set(events.map((e) => e && e.kind))].filter(Boolean).sort().join(', ')}`);
} catch (e) {
  console.log('ERROR ' + String(e).slice(0, 300));
} finally {
  await b.close();
}
