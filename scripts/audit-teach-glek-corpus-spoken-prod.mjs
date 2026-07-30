// THE AUDIBLE PROOF (David 2026-07-30): "teach me the Glek" on LIVE prod must
// SPEAK corpus teaching, deterministically spliced. The corpus carries 4 notes
// landing exactly on the Glek spine (plies 4/10/14); openingGenerator splices
// their prose into the walkthrough's spoken narration at generation time.
// This probe types the real request, lets the real generation run, walks the
// lesson, and verifies a spliced corpus sentence reaches BOTH the on-screen
// narration and the voice pipeline (narration-listener sidecar; headless has
// no speakers, so the listener + tts-request evidence is the voice gate).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// Distinctive fragments from the corpus notes that land on the Glek spine —
// prose that exists NOWHERE in the app outside danya-teachings.json.
const CORPUS_MARKS = [
  'prophylactic moves like re1',
  'na4 is a common idea',
  'h5-e8 diagonal',
  'knight jump to d5 can be de',
];

const listener = await startAuditListener();
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
const ttsTexts = [];
p.on('request', (r) => {
  if (r.url().includes('/api/tts')) {
    try { ttsTexts.push(JSON.parse(r.postData() ?? '{}').text ?? ''); } catch { /* stream */ }
  }
});

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ }
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }
}

let seenOnScreen = null;
let seenSpoken = null;
let detail = '';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Point the app's audit stream at the local listener BEFORE any speech.
  await p.evaluate((url) => localStorage.setItem('auditStreamUrl', url), listener.url).catch(() => undefined);
  await dismiss(); await dismiss();

  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially('teach me the glek system', { delay: 12 });
  await box.press('Enter');

  // Cold generation is the real user wait — allow up to 3 minutes, then walk.
  // The walkthrough auto-advances; we just watch text + voice accumulate.
  const started = Date.now();
  while (Date.now() - started < 300000 && !(seenOnScreen && seenSpoken)) {
    await p.waitForTimeout(4000);
    const body = (await p.locator('body').innerText().catch(() => '')).toLowerCase();
    for (const mark of CORPUS_MARKS) {
      if (!seenOnScreen && body.includes(mark)) seenOnScreen = mark;
    }
    const spokenPool = [
      ...ttsTexts,
      ...listener.getCapturedEvents().map((e) => `${e.summary ?? ''} ${e.details ?? ''}`),
    ].join(' ').toLowerCase();
    for (const mark of CORPUS_MARKS) {
      if (!seenSpoken && spokenPool.includes(mark)) seenSpoken = mark;
    }
    // Nudge the walkthrough along if a continue/skip affordance is present.
    try {
      const skip = p.locator('[data-testid="walkthrough-skip"], button:has-text("Continue")').first();
      if (await skip.isVisible({ timeout: 500 })) await skip.click({ force: true });
    } catch { /* nothing to nudge */ }
  }
  detail = `onScreen=${seenOnScreen ?? 'NO'} spoken=${seenSpoken ?? 'NO'} tts=${ttsTexts.length} listener=${listener.getCapturedEvents().length} (${Math.round((Date.now() - started) / 1000)}s)`;
} catch (e) {
  detail = `ERROR ${String(e).slice(0, 140)}`;
}
await b.close();
await listener.stop().catch(() => undefined);

const ok = !!seenOnScreen && !!seenSpoken;
console.log(`${ok ? '✓ PASS' : '✗ FAIL'}: teach-me-Glek speaks the corpus — ${detail}`);
process.exit(ok ? 0 : 1);
