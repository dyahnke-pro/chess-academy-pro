// Focused probe: does a Thai lesson request on Learn actually START a lesson?
// The multilingual audit's 6s window could not tell "never started" from
// "still generating", and a walkthrough generates before it renders.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const ASK = process.env.PROBE_ASK ?? 'สอนฉันเปิดเกมอิตาลีให้หน่อย';
// A WARM-UP ask reproduces the audit's shape: it asks two other questions in the
// same context before the lesson row. The focused probe asked as the FIRST
// message and saw the lesson start; the audit, asking third, saw nothing. Two
// instruments disagreeing is a finding in itself — this makes the difference
// the ONE variable.
const WARMUP = process.env.PROBE_WARMUP ?? '';

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('  pageerror:', String(e).slice(0, 120)));

await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(11000);
for (const t of ['ai-consent-allow', 'page-help-modal-close', 'page-help-got-it']) {
  const el = page.locator(`[data-testid="${t}"]`).first();
  if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await page.waitForTimeout(300); }
}

const send = async (text) => {
  const box = page.locator('[data-testid="chat-text-input"]:visible:not([disabled])').first();
  await box.waitFor({ timeout: 90000 });
  await box.click({ force: true });
  await box.pressSequentially(text, { delay: 8 });
  await box.press('Enter');
};
if (WARMUP) {
  await send(WARMUP);
  console.log(`warm-up: "${WARMUP}"`);
  await page.waitForTimeout(30000);
}
await send(ASK);
console.log(`asked: "${ASK}"${WARMUP ? ' (as a FOLLOW-UP turn)' : ' (as the FIRST turn)'}`);

const WATCH = ['teach-kickoff-progress', 'teach-generation-progress', 'teach-nav-row', 'teach-nav-status',
               'walkthrough-choose-walkthrough', 'coach-teach-playout', 'walkthrough-backtrack'];
const seen = new Set();
for (let s = 5; s <= 120; s += 5) {
  await page.waitForTimeout(5000);
  for (const t of WATCH) {
    if (seen.has(t)) continue;
    if (await page.locator(`[data-testid="${t}"]`).first().isVisible().catch(() => false)) {
      seen.add(t); console.log(`  +${s}s  APPEARED: ${t}`);
    }
  }
  if (seen.has('teach-nav-row')) break;
}
const transcript = await page.locator('[data-testid="teach-transcript"]:visible').first().innerText().catch(() => '');
console.log('\n--- last transcript lines ---');
console.log(transcript.split('\n').filter((l) => l.trim().length > 8).slice(-6).join('\n'));
console.log(`\nVERDICT: ${seen.has('teach-nav-row') ? 'LESSON STARTED' : seen.size ? `PARTIAL (${[...seen].join(', ')})` : 'NO LESSON — the coach said it would and did not'}`);
console.log('url:', page.url());
await browser.close();
