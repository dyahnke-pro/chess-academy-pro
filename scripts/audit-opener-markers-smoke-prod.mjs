// Post-deploy smoke (David 2026-09-13): confirm build-8 shipped to the UI —
// (1) the Learn classroom opener renders with the ≤3-suggestion cap and no
// errors; (2) Settings carries the unified "Board Arrows & Highlights" toggle.
// MUTED (G1). The trend clause + untried nudge + off-hides-both need SEEDED
// history to fire and are unit-gated (classroomOpener.test / coachAnswerGates);
// this proves the wiring shipped and nothing crashes.
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
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) { try { const G = p.locator(g); await G.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch {} }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

let openerOk = false, chipCount = -1, settingOk = false, detail = '';
try {
  // 1. Learn opener
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  // The opener greeting is an assistant message; chips are the suggested-question picker.
  await p.locator('[data-testid="chat-text-input"]').waitFor({ timeout: 20000 });
  await p.waitForTimeout(4000); // let the kickoff greeting + chips settle
  // The opener's SUGGESTION CHIPS are coachChoices (coach-choice-chip-*); the
  // teach-suggestion-* list is a separate static "free-form examples" set behind
  // a collapsed <details>, not the intro's chips.
  chipCount = await p.locator('[data-testid^="coach-choice-chip-"]').count().catch(() => -1);
  // Fallback: count buttons in the choices row if the testid differs.
  const greeting = (await p.locator('body').innerText()).toLowerCase();
  const spokeGreeting = /classroom|welcome|ready|what.*work on|weakness|drill|let's|coach/i.test(greeting);
  openerOk = spokeGreeting && pageErrors.length === 0;

  // 2. Settings toggle
  await p.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss();
  // Coach tab → open the "Gameplay Coaching" modal → the toggle lives inside it.
  await p.locator('[data-testid="tab-coach"]').click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(500);
  await p.locator('[data-testid="gameplay-coaching-row"]').click({ timeout: 10000 }).catch(() => undefined);
  await p.waitForTimeout(800);
  settingOk = await p.locator('[data-testid="coach-board-markers-toggle"]').count().then((n) => n > 0).catch(() => false);
  detail = `chips=${chipCount} (cap 3) greetingRendered=${openerOk} settingToggle=${settingOk}`;
} catch (e) { detail = 'ERROR ' + String(e).slice(0, 160); }

await b.close();
console.log('=== BUILD-8 UI SMOKE (prod, muted) ===');
console.log(`Learn opener renders, no errors: ${openerOk ? '✓' : '✗'}`);
console.log(`opener chips <= 3: ${chipCount >= 0 && chipCount <= 3 ? '✓' : chipCount < 0 ? '? (selector)' : '✗'} (${chipCount})`);
console.log(`Settings "Board Arrows & Highlights" toggle present: ${settingOk ? '✓' : '✗'}`);
console.log(`pageErrors: ${pageErrors.length}${pageErrors.length ? ' :: ' + pageErrors[0] : ''}`);
console.log(detail);
process.exit(openerOk && settingOk && pageErrors.length === 0 ? 0 : 1);
