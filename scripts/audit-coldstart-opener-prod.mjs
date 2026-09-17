// Post-deploy check (David 2026-09-13): a NO-GAMES student entering the
// classroom must be told to upload+review games or ask to teach/play a certain
// opening — not shown a generic question set. A fresh Playwright context has an
// empty IndexedDB (no uploaded games), so it IS the cold-start case. MUTED (G1).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await p.addInitScript(muteTtsForAudit);
const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

async function dismiss() {
  for (const [g, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
  ]) { try { const G = p.locator(g); await G.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch {} }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

let saysUploadReview = false, saysTeachPlay = false, importChip = false, chipCount = -1, detail = '';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  await p.locator('[data-testid="chat-text-input"]').waitFor({ timeout: 20000 });
  // The cold-start line is set async (after the weakness read resolves empty).
  for (let i = 0; i < 15; i++) {
    await p.waitForTimeout(1500);
    const body = (await p.locator('body').innerText()).toLowerCase();
    saysUploadReview = /upload and review|upload .* games/.test(body);
    saysTeachPlay = /teach or play|teach me the|play the/.test(body);
    const chips = await p.locator('[data-testid^="coach-choice-chip-"]').allInnerTexts().catch(() => []);
    chipCount = chips.length;
    importChip = chips.some((c) => /import my games/i.test(c));
    if (saysUploadReview && saysTeachPlay && importChip) break;
  }
  detail = `uploadReview=${saysUploadReview} teachPlay=${saysTeachPlay} importChip=${importChip} chips=${chipCount}`;
} catch (e) { detail = 'ERROR ' + String(e).slice(0, 160); }

await b.close();
console.log('=== COLD-START OPENER (prod, muted, fresh no-games context) ===');
console.log(`says "upload and review your games": ${saysUploadReview ? '✓' : '✗'}`);
console.log(`says "ask to teach or play an opening": ${saysTeachPlay ? '✓' : '✗'}`);
console.log(`"Import my games" chip present: ${importChip ? '✓' : '✗'}`);
console.log(`opener chips <= 3: ${chipCount >= 0 && chipCount <= 3 ? '✓' : '✗'} (${chipCount})`);
console.log(`pageErrors: ${pageErrors.length}${pageErrors.length ? ' :: ' + pageErrors[0] : ''}`);
console.log(detail);
process.exit(saysUploadReview && saysTeachPlay && importChip && pageErrors.length === 0 ? 0 : 1);
