// One live session, driven step by step — the buttons I press are the ones the
// previous dump actually showed, not a guessed happy path.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { autoDismissCalibration } from '../audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from '../audit-lib/mute-tts.mjs';

const BASE = 'https://chess-academy-pro.vercel.app';
const RUN = `adventure-${Date.now().toString(36)}`;
const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(RUN));
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));

const dump = async (label) => {
  const s = await page.evaluate(() => {
    const t = (e) => (e.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
    return {
      buttons: [...document.querySelectorAll('button,[role="button"]')]
        .filter((b) => b.offsetParent !== null)
        .map((b) => ({ id: b.getAttribute('data-testid'), t: t(b) }))
        .filter((b) => b.id || b.t),
      text: [...document.querySelectorAll('p,[class*="whitespace-pre"]')]
        .filter((e) => e.offsetParent !== null && (e.innerText ?? '').trim().length > 45)
        .map((e) => (e.innerText ?? '').trim().replace(/\s+/g, ' ').slice(0, 200)).slice(-3),
    };
  });
  console.log(`\n=== ${label} ===`);
  console.log('BTN ' + s.buttons.map((b) => b.id ?? b.t).filter(Boolean).join(' | ').slice(0, 700));
  s.text.forEach((x) => console.log('  • ' + x));
  return s;
};
const click = async (sel, wait = 8000) => {
  const l = page.locator(sel).first();
  if (!await l.count()) { console.log(`  (absent: ${sel})`); return false; }
  await l.click({ force: true, timeout: 10000 }).catch((e) => console.log('  click failed', String(e).slice(0, 60)));
  await page.waitForTimeout(wait);
  return true;
};

console.log(`[run] ${RUN}`);
await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(9000);
await click('[data-testid="ai-consent-allow"]', 2500);
await dump('1. opened');

await click('[data-testid="color-black-btn"]', 4000);
const box = page.locator('textarea').first();
await box.click();
await box.pressSequentially('teach me the Sicilian Defense', { delay: 15 });
await page.keyboard.press('Enter');
await page.waitForTimeout(35000);
const picker = await dump('2. asked for a broad opening');

const road = picker.buttons.find((b) => b.id?.startsWith('line-picker-B'));
if (!road) { console.log('NO FORK PICKER OFFERED'); }
else {
  console.log(`\n>>> taking the road: ${road.t}`);
  await click(`[data-testid="${road.id}"]`, 30000);
  await dump('3. walked into a branch');
  // Walk it a few beats.
  for (let i = 0; i < 4; i += 1) {
    const advanced = await click('[data-testid="walkthrough-skip"]', 6000)
      || await click('[data-testid="teach-continue-btn"]', 6000);
    if (!advanced) break;
  }
  await dump('4. after walking the branch');
  // THE ADVENTURE-BOOK QUESTION: is there any way back to the roads not taken?
  const back = await page.evaluate(() => [...document.querySelectorAll('button,[role="button"]')]
    .filter((b) => b.offsetParent !== null)
    .map((b) => `${b.getAttribute('data-testid') ?? ''} ${(b.innerText ?? '').trim()}`)
    .filter((s) => /other|another|back|explor|branch|line|variation|road|next fork/i.test(s)));
  console.log('\nWAYS BACK OFFERED:', back.length ? back.join(' | ') : 'NONE');
}
console.log('\nPAGE ERRORS:', errs.length ? errs.slice(0, 2) : 'none');
console.log(`[run] ${RUN}`);
await browser.close();
