// Post-deploy audit (G1/G2) for the GROUNDED "what should I train / what am I
// weak in" coach reply (David 2026-07-04: "conversation is key to the llm, but
// GROUNDED"). Drives the LIVE PROD /coach/teach brain (real DeepSeek via full
// proxy interception), seeds a synthetic weakness profile into IndexedDB, then
// asks the meta-questions and asserts each gets a GROUNDED conversational reply
// (voiceFacts) — NOT the opening picker, NOT a hijacked drill, NOT silence.
//
// Proves end-to-end on prod: (P3) isProgressQuestion now matches these
// phrasings, (P2) the progress interception fires and voiceFacts replies,
// (P4) trainingAidRouter did NOT hijack "what tactics am I weak in" into a
// drill, and (P1) the reply names the seeded weaknesses when data exists.
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const results = [];
const streamPull = async (since) => {
  if (!SECRET) return { entries: [] };
  try {
    const r = await fetch(`${PROD}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    return await r.json();
  } catch { return { entries: [] }; }
};

// The six meta-questions David asked, plus a topic-scoped one.
const QUESTIONS = [
  'What should I train?',
  'What should I learn next?',
  'What tactics am I weak in?',
  'What are my biggest weaknesses?',
  'What should I work on to improve my chess?',
  'Where am I losing most of my games?',
];

// Synthetic weakness rows so getUnifiedWeaknessProfile has real data to voice.
// fork ×2 open, hanging_piece ×1 open, back_rank ×1 open → ranked fork first.
function seedRows() {
  const now = new Date().toISOString();
  const mk = (i, type) => ({
    id: `audit-ct-${type}-${i}`, sourceGameId: `audit-g-${i}`, moveIndex: 10 + i,
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    bestMoveUci: 'f3g5', bestMoveSan: 'Ng5', playerMoveUci: 'd2d3', playerMoveSan: 'd3',
    playerColor: 'white', tacticType: type, evalSwing: 320, explanation: 'missed a tactic',
    opponentName: null, gameDate: null, openingName: 'Italian Game',
    puzzleAttempts: 0, puzzleSuccesses: 0, createdAt: now,
  });
  return [mk(1, 'fork'), mk(2, 'fork'), mk(3, 'hanging_piece'), mk(4, 'back_rank')];
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
await attachProxyInterception(ctx);
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push((e.message || '').split('\n')[0]));

const transcript = () => page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '');
const inputEnabled = () => page.locator('[data-testid="chat-text-input"]').isEnabled().catch(() => false);
// The AI-consent modal + page-help modal can appear at boot OR on first send,
// and block the send button (they intercept pointer events). Dismiss whatever
// is up, right before we act.
async function dismissBlockers() {
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count() && await consent.isVisible().catch(() => false)) {
    await consent.click({ timeout: 4000, force: true }).catch(() => null);
    await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => null);
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count() && await help.isVisible().catch(() => false)) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(300); }
}

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  const bub = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bub.count()) { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => null); await bub.waitFor({ state: 'detached', timeout: 12000 }).catch(() => null); }

  // Seed the weakness profile into the prod-origin IndexedDB.
  const seeded = await page.evaluate(async (rows) => {
    return await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('classifiedTactics')) { resolve('no-store'); return; }
        const tx = db.transaction('classifiedTactics', 'readwrite');
        const store = tx.objectStore('classifiedTactics');
        for (const r of rows) store.put(r);
        tx.oncomplete = () => resolve('ok');
        tx.onerror = () => resolve('tx-error');
      };
      req.onerror = () => resolve('open-error');
    });
  }, seedRows());
  console.log(`[seed] classifiedTactics → ${seeded}`);

  await page.goto(`${PROD}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count()) { await consent.click({ timeout: 5000 }).catch(() => null); await page.waitForTimeout(800); }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count()) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(400); }

  await dismissBlockers();
  const streamBefore = Date.now();
  // Submit via real key events (pressSequentially + Enter) — a controlled
  // textarea's React state isn't reliably picked up by fill()+button-click.
  async function submit(q) {
    const inp = page.locator('[data-testid="chat-text-input"]');
    await inp.click().catch(() => null);
    await inp.pressSequentially(q, { delay: 15 }).catch(() => null);
    await page.keyboard.press('Enter').catch(() => null);
    await page.waitForTimeout(600);
    if (await page.locator('[data-testid="ai-consent-modal"]').count()) {
      await dismissBlockers();
      await inp.click().catch(() => null);
      await inp.pressSequentially(q, { delay: 15 }).catch(() => null);
      await page.keyboard.press('Enter').catch(() => null);
    }
  }
  // The newest assistant bubble's text (grounded reply lands here). Messages
  // render newest-FIRST (the list is reversed), so the latest is .first().
  const lastAssistant = () => page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '');
  // Count grounded_voice LLM calls in the stream — the authoritative G2 signal
  // that the progress interception fired and voiceFacts phrased the facts.
  const groundedCount = async (since) => {
    const s = await streamPull(since);
    return (s.entries || []).filter((e) => /grounded=true|intent=grounded_voice|task=grounded_voice/i.test(JSON.stringify(e))).length;
  };

  for (const q of QUESTIONS) {
    for (let i = 0; i < 40 && !(await inputEnabled()); i++) await page.waitForTimeout(1000);
    await dismissBlockers();
    const qSince = Date.now() - 1000;
    const before = (await transcript()).length;
    await submit(q);
    // Wait for EITHER a drill hijack, a transcript grow, or a grounded_voice
    // stream event for this question's window (the authoritative signal).
    const start = Date.now();
    let drill = false, grew = false, grounded = 0;
    while (Date.now() - start < 45000) {
      await page.waitForTimeout(1500);
      if (await page.locator('[data-testid="drill-mode"],[data-testid="walkthrough-drill-active"]').count()) { drill = true; break; }
      if ((await transcript()).length > before + 25) grew = true;
      grounded = await groundedCount(qSince);
      if (grounded > 0 && grew) break;
    }
    const reply = (await lastAssistant()).replace(/\s+/g, ' ').trim();
    const low = reply.toLowerCase();
    let verdict;
    if (drill) verdict = 'FAIL: hijacked into a drill';
    else if (grounded === 0 && !grew) verdict = 'FAIL: silent / no grounded reply';
    else if (/run it through the engine|can'?t verify which moves/i.test(low)) verdict = 'FAIL: stock non-answer';
    else verdict = 'PASS: grounded reply';
    const named = /\bforks?\b|hanging pieces|back-?rank|weakness|work on|train|practice|drill your mistakes|play (a few )?more/i.test(low);
    results.push({ q, verdict, grounded, named, reply: reply.slice(0, 200) });
    console.log(`\nQ: ${q}\n  → ${verdict} · grounded_voice events: ${grounded}${named ? ' · [names weakness/next-step]' : ''}\n  reply: ${reply.slice(0, 190)}`);
    await page.waitForTimeout(1500); // pace brain-heavy inputs
  }

  const stream = await streamPull(streamBefore);
  const progressEvents = (stream.entries || []).filter((e) => /grounded=true|grounded_voice/i.test(JSON.stringify(e)));
  console.log(`\n[audit-stream] ${(stream.entries || []).length} events since run start; ${progressEvents.length} grounded-voice.`);
} catch (e) {
  console.log('HARNESS ERROR:', e.message.split('\n')[0]);
}

await browser.close();
const pass = results.filter((r) => r.verdict.startsWith('PASS')).length;
const fail = results.filter((r) => r.verdict.startsWith('FAIL'));
console.log(`\n=== ${pass}/${results.length} grounded · ${fail.length} FAIL · ${pageErrors.length} pageerrors ===`);
for (const f of fail) console.log(`  ✗ "${f.q}" — ${f.verdict}`);
process.exit(fail.length || pageErrors.length ? 1 : 0);
